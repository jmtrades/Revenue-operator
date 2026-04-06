"use client";

import { useEffect, useRef } from "react";
import { useWorkspace } from "@/components/WorkspaceContext";
import { getWorkspaceMeSnapshotSync } from "@/lib/client/workspace-me";

/**
 * Resolves workspace id from WorkspaceProvider, falling back to the primed
 * `/api/workspace/me` snapshot when context is briefly empty (e.g. workspace
 * list fetch failed but the shell already knows the active workspace).
 */
export function useResolvedWorkspaceId(): {
  workspaceId: string;
  contextWorkspaceId: string;
  loading: boolean;
} {
  const { workspaceId: ctxId, loading } = useWorkspace();
  const snap = getWorkspaceMeSnapshotSync() as { id?: string | null } | null;
  const snapshotId = snap?.id?.trim() ?? "";
  const workspaceId = ctxId || snapshotId;

  const misalignLogged = useRef(false);
  useEffect(() => {
    if (!loading && !ctxId && snapshotId && !misalignLogged.current) {
      misalignLogged.current = true;
      console.warn("[workspace] context empty while workspace snapshot has id", { snapshotId });
    }
  }, [loading, ctxId, snapshotId]);

  return { workspaceId, contextWorkspaceId: ctxId, loading };
}
