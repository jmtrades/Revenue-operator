/**
 * POST /api/voice/search-knowledge — Called by the voice server when the AI
 * agent uses the `search_knowledge` tool during a live call.
 *
 * Searches the workspace's knowledge base (FAQ + uploaded document chunks)
 * and returns the best matching answer so the agent can respond naturally.
 *
 * This is THE most important tool for preventing "I don't know" responses.
 * If the answer exists in the knowledge base, the agent WILL find it.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";
import { assertSameOrigin } from "@/lib/http/csrf";
import { createHmac, timingSafeEqual } from "crypto";

interface SearchKnowledgeBody {
  workspace_id: string;
  query: string;
  category?: "pricing" | "hours" | "services" | "policies" | "location" | "staff" | "general";
  /** Maximum results to return */
  limit?: number;
}

interface SearchResult {
  source: "faq" | "document";
  content: string;
  relevance: number;
  document_name?: string;
}

/**
 * Simple keyword-overlap relevance scoring.
 * Fast enough for real-time voice calls (<50ms).
 * No embedding model needed — works on keyword overlap with TF-IDF-like weighting.
 */
function scoreRelevance(query: string, content: string): number {
  const queryTokens = query
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const contentLower = content.toLowerCase();
  const contentTokens = contentLower
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((t) => t.length > 2);

  if (queryTokens.length === 0) return 0;

  let matchCount = 0;
  let exactPhraseBonus = 0;

  // Check for exact phrase match (huge signal)
  if (contentLower.includes(query.toLowerCase().trim())) {
    exactPhraseBonus = 0.4;
  }

  // Token overlap scoring with position weighting
  const contentSet = new Set(contentTokens);
  for (const qt of queryTokens) {
    if (contentSet.has(qt)) {
      matchCount += 1;
    }
    // Partial match bonus (e.g., "appointment" matches "appointments")
    for (const ct of contentTokens) {
      if (ct.startsWith(qt) || qt.startsWith(ct)) {
        matchCount += 0.3;
        break;
      }
    }
  }

  const overlapScore = queryTokens.length > 0 ? matchCount / queryTokens.length : 0;
  return Math.min(1, overlapScore * 0.6 + exactPhraseBonus);
}

/**
 * Verify HMAC signature from the voice server.
 * Falls back to CSRF-only in local dev when no secret is configured.
 */
function verifyVoiceServerSignature(body: string, signature: string | null): boolean {
  const secret = process.env.VOICE_WEBHOOK_SECRET;
  if (!secret) {
    const isDeployed = Boolean(process.env.VERCEL_ENV) || process.env.NODE_ENV === "production";
    if (isDeployed) {
      log("error", "voice.search_knowledge.secret_not_configured", {
        message: "rejecting request — VOICE_WEBHOOK_SECRET must be set in all deployed environments",
      });
      return false;
    }
    return true; // local dev only
  }
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(body, "utf-8").digest("hex");
  if (expected.length !== signature.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, "utf-8"), Buffer.from(signature, "utf-8"));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  // Accept requests from voice server (HMAC) OR same-origin browser (CSRF).
  const sig = req.headers.get("x-voice-webhook-signature");
  const bodyText = await req.text();

  if (sig) {
    // Voice server path: verify HMAC
    if (!verifyVoiceServerSignature(bodyText, sig)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    // Browser path: verify CSRF
    const csrfBlock = assertSameOrigin(req);
    if (csrfBlock) return csrfBlock;
  }

  let payload: SearchKnowledgeBody;
  try {
    payload = JSON.parse(bodyText) as SearchKnowledgeBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { workspace_id, query, limit: rawLimit } = payload;

  if (!workspace_id || typeof workspace_id !== "string" || !query || typeof query !== "string") {
    return NextResponse.json(
      { error: "workspace_id and query are required" },
      { status: 400 },
    );
  }

  // Sanitize inputs
  const sanitizedQuery = query.trim().slice(0, 500); // Cap query length
  const limit = Math.min(Math.max(1, rawLimit ?? 3), 10); // Clamp 1-10

  if (sanitizedQuery.length < 2) {
    return NextResponse.json(
      { error: "Query too short" },
      { status: 400 },
    );
  }

  const db = getDb();
  const results: SearchResult[] = [];

  try {
    // 1. Search agent FAQ (fast path — most common answers live here)
    const { data: agents } = await db
      .from("agents")
      .select("knowledge_base")
      .eq("workspace_id", workspace_id)
      .eq("is_primary", true)
      .maybeSingle();

    if (agents) {
      const agentRow = agents as { knowledge_base?: Array<{ q?: string; a?: string }> | null };
      const faq = agentRow.knowledge_base ?? [];

      for (const item of faq) {
        if (!item.q || !item.a) continue;

        const combinedContent = `${item.q} ${item.a}`;
        const relevance = scoreRelevance(sanitizedQuery, combinedContent);

        if (relevance > 0.15) {
          results.push({
            source: "faq",
            content: `Q: ${item.q}\nA: ${item.a}`,
            relevance,
          });
        }
      }
    }

    // 2. Search knowledge document chunks (uploaded PDFs, DOCX, TXT)
    const { data: chunks } = await db
      .from("knowledge_chunks")
      .select("content, token_count, document_id")
      .eq("workspace_id", workspace_id)
      .limit(200); // Cap to prevent slow queries

    if (chunks && Array.isArray(chunks)) {
      // Get document names for attribution
      const docIds = new Set(
        (chunks as Array<{ document_id?: string }>)
          .map((c) => c.document_id)
          .filter(Boolean),
      );

      const docNameMap: Record<string, string> = {};
      if (docIds.size > 0) {
        const { data: docs } = await db
          .from("knowledge_documents")
          .select("id, filename")
          .in("id", Array.from(docIds));

        if (docs) {
          for (const doc of docs as Array<{ id: string; filename: string }>) {
            docNameMap[doc.id] = doc.filename;
          }
        }
      }

      for (const chunk of chunks as Array<{
        content: string;
        token_count?: number;
        document_id?: string;
      }>) {
        if (!chunk.content) continue;
        const relevance = scoreRelevance(sanitizedQuery, chunk.content);
        if (relevance > 0.15) {
          results.push({
            source: "document",
            content: chunk.content,
            relevance,
            document_name: chunk.document_id
              ? docNameMap[chunk.document_id]
              : undefined,
          });
        }
      }
    }

    // 3. Search workspace-level knowledge (business info, services, etc.)
    const { data: workspace } = await db
      .from("workspaces")
      .select("business_name, services, address, phone, industry")
      .eq("id", workspace_id)
      .maybeSingle();

    if (workspace) {
      const ws = workspace as {
        business_name?: string;
        services?: string;
        address?: string;
        phone?: string;
        industry?: string;
      };

      // Build a synthetic "about us" chunk from workspace fields
      const aboutParts: string[] = [];
      if (ws.business_name) aboutParts.push(`Business name: ${ws.business_name}`);
      if (ws.services) aboutParts.push(`Services: ${ws.services}`);
      if (ws.address) aboutParts.push(`Location: ${ws.address}`);
      if (ws.phone) aboutParts.push(`Phone: ${ws.phone}`);
      if (ws.industry) aboutParts.push(`Industry: ${ws.industry}`);

      if (aboutParts.length > 0) {
        const aboutContent = aboutParts.join(". ");
        const relevance = scoreRelevance(sanitizedQuery, aboutContent);
        if (relevance > 0.1) {
          results.push({
            source: "faq",
            content: aboutContent,
            relevance: relevance + 0.05, // Small boost for authoritative workspace data
          });
        }
      }
    }

    // Sort by relevance and take top N
    results.sort((a, b) => b.relevance - a.relevance);
    const topResults = results.slice(0, limit);

    // Format response for voice server
    const answer =
      topResults.length > 0
        ? topResults.map((r) => r.content).join("\n\n")
        : null;

    log("info", "voice.search_knowledge", {
      workspace_id,
      query: sanitizedQuery.slice(0, 100),
      results_found: topResults.length,
      top_relevance: topResults[0]?.relevance ?? 0,
    });

    return NextResponse.json({
      ok: true,
      answer,
      results: topResults.map((r) => ({
        source: r.source,
        content: r.content.slice(0, 500),
        relevance: Math.round(r.relevance * 100) / 100,
        document_name: r.document_name,
      })),
      query: sanitizedQuery,
    });
  } catch (err) {
    log("error", "voice.search_knowledge_error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Knowledge search failed" },
      { status: 500 },
    );
  }
}
