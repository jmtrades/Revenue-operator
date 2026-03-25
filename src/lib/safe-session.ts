/**
 * Safe session utilities - never crash, always return status
 */

export interface SafeSessionResult {
  status: "loading" | "ready" | "missing" | "error";
  session?: {
    userId: string;
    workspaceId?: string;
  };
  error?: string;
}

export async function getSessionSafe(): Promise<SafeSessionResult> {
  try {
    const res = await fetch("/api/auth/session", {
      credentials: "include",
      cache: "no-store",
    });

    if (!res.ok) {
      return { status: "error", error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    
    if (data?.session?.userId) {
      return {
        status: "ready",
        session: {
          userId: data.session.userId,
          workspaceId: data.session.workspaceId,
        },
      };
    }

    return { status: "missing" };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
