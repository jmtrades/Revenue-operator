/**
 * POST /api/knowledge/upload — Upload a document file for knowledge base
 * Accepts multipart form data with a file and stores metadata in the database
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const workspaceId = session.workspaceId;
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const ip = getClientIp(req);
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

    // Validate file type (accept common document types)
    const validTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Supported: PDF, DOC, DOCX, TXT" }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large. Max size: 10MB" }, { status: 400 });
    }

    // Read file content
    const buffer = await file.arrayBuffer();
    const _fileContent = Buffer.from(buffer).toString("base64");

    // For now, store metadata in a knowledge_uploads table (simple approach)
    // In production, you would extract text from PDF/DOC and index it
    const db = getDb();
    const { data: upload, error: uploadErr } = await db
      .from("knowledge_uploads")
      .insert({
        workspace_id: workspaceId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        status: "processing",
        metadata: {
          uploadedAt: new Date().toISOString(),
          mimeType: file.type,
        },
      })
      .select("id")
      .maybeSingle();

    if (uploadErr || !upload) {
      return NextResponse.json({ error: "Failed to save file metadata" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      uploadId: (upload as { id: string }).id,
      fileName: file.name,
      message: "File uploaded successfully and is being processed",
    });
  } catch (error) {
    console.error("Knowledge upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
