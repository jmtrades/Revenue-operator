/**
 * POST /api/knowledge/upload — Upload a document file for the knowledge base.
 * Extracts text (PDF/DOCX/TXT), stores document + token chunks for future RAG.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/http/csrf";
import { log } from "@/lib/logger";

function normalizeText(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function tokenizeApprox(text: string): string[] {
  // Simple whitespace token approximation for chunking (RAG-friendly; avoids extra deps).
  return text.split(/\s+/).map((t) => t.trim()).filter(Boolean);
}

function chunkByTokens({ text, chunkSize, overlap }: { text: string; chunkSize: number; overlap: number }) {
  const tokens = tokenizeApprox(text);
  const chunks: Array<{ chunk_index: number; content: string; token_count: number }> = [];

  let start = 0;
  let chunkIndex = 0;
  while (start < tokens.length) {
    const end = Math.min(start + chunkSize, tokens.length);
    const partTokens = tokens.slice(start, end);
    const content = partTokens.join(" ");
    chunks.push({
      chunk_index: chunkIndex,
      content,
      token_count: partTokens.length,
    });
    chunkIndex += 1;
    if (end >= tokens.length) break;
    start = Math.max(0, end - overlap);
  }

  return chunks;
}

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const workspaceId = session.workspaceId;
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const _ip = getClientIp(req);
  const rl = await checkRateLimit(`upload:${workspaceId}`, 10, 60_000);
  if (!rl.allowed) {
    const retryAfterSeconds = Math.ceil((rl.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.max(0, retryAfterSeconds)) } }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Supported: PDF, DOCX/DOC, TXT" }, { status: 400 });
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large. Max size: 10MB" }, { status: 400 });
    }

    const ab = await file.arrayBuffer();
    const buffer = Buffer.from(ab);

    let extractedText = "";
    if (file.type === "application/pdf") {
      const pdfParseMod = await import("pdf-parse");
      const pdfParse = (pdfParseMod as any).default ?? pdfParseMod;
      const data = await pdfParse(buffer);
      extractedText = (data?.text as string) ?? "";
    } else if (
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.type === "application/msword"
    ) {
      const mammothMod = await import("mammoth");
      const result = await (mammothMod as any).extractRawText({ buffer });
      extractedText = (result?.value as string) ?? "";
    } else if (file.type === "text/plain") {
      extractedText = buffer.toString("utf8");
    } else {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    extractedText = normalizeText(extractedText);
    if (!extractedText || extractedText.length < 50) {
      return NextResponse.json({ error: "Could not extract enough text from the file." }, { status: 400 });
    }

    const chunkSizeTokens = 512;
    const overlapTokens = 50;
    const chunks = chunkByTokens({ text: extractedText, chunkSize: chunkSizeTokens, overlap: overlapTokens });

    const db = getDb();

    const { data: documentRow, error: documentErr } = await db
      .from("knowledge_documents")
      .insert({
        workspace_id: workspaceId,
        filename: file.name.replace(/[/\\:*?"<>|]/g, "_").slice(0, 255),
        file_type: file.type,
        content_text: extractedText,
        chunk_count: chunks.length,
      })
      .select("id")
      .maybeSingle();

    if (documentErr || !documentRow) {
      return NextResponse.json({ error: "Failed to save document" }, { status: 500 });
    }

    const documentId = (documentRow as { id: string }).id;

    if (chunks.length > 0) {
      const rows = chunks.map((c) => ({
        document_id: documentId,
        workspace_id: workspaceId,
        chunk_index: c.chunk_index,
        content: c.content,
        token_count: c.token_count,
      }));

      const { error: chunksErr } = await db.from("knowledge_chunks").insert(rows);
      if (chunksErr) {
        return NextResponse.json({ error: "Failed to save chunks" }, { status: 500 });
      }
    }

    return NextResponse.json({
      ok: true,
      uploadId: documentId,
      fileName: file.name,
      chunkCount: chunks.length,
      message: "File uploaded successfully and chunked for analysis",
    });
  } catch (error) {
    log("error", "Knowledge upload error:", { error: error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
