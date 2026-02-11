/**
 * Queue abstraction. Redis when available, else DB-backed for single instance.
 */

import { getDb } from "@/lib/db/queries";

export type JobPayload =
  | { type: "process_webhook"; webhookId: string }
  | { type: "decision"; leadId: string; workspaceId: string; eventId: string }
  | { type: "no_reply"; leadId: string }
  | { type: "no_show_reminder"; leadId: string }
  | { type: "reactivation"; leadId: string }
  | { type: "billing"; workspaceId: string }
  | { type: "zoom_webhook"; webhookId: string; workspaceId: string; meetingId: string; meetingUuid: string; event: string }
  | { type: "fetch_zoom_recording"; callSessionId: string; workspaceId: string; meetingId: string }
  | { type: "analyze_call"; callSessionId: string; workspaceId: string }
  | { type: "execute_post_call_plan"; callSessionId: string; workspaceId: string; leadId: string }
  | { type: "calendar_call_ended"; callSessionId: string }
  | { type: "post_call_unknown_checkin"; leadId: string; workspaceId: string; callSessionId: string };

let redisClient: import("ioredis").Redis | null = null;

async function getRedis(): Promise<import("ioredis").Redis | null> {
  if (redisClient) return redisClient;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    const Redis = (await import("ioredis")).default;
    redisClient = new Redis(url);
    return redisClient;
  } catch {
    return null;
  }
}

const QUEUE_NAME = "ro:jobs";
const DLQ_NAME = "ro:dlq";

/** Enqueue job. Uses Redis if available, else DB. */
export async function enqueue(payload: JobPayload): Promise<string> {
  const redis = await getRedis();
  const jobId = crypto.randomUUID();
  const job = JSON.stringify({ id: jobId, payload, enqueuedAt: new Date().toISOString() });

  if (redis) {
    await redis.lpush(QUEUE_NAME, job);
    return jobId;
  }

  const db = getDb();
  const { data: inserted } = await db.from("job_queue").insert({
    job_type: payload.type,
    payload,
    status: "pending",
  }).select("id").single();
  return (inserted as { id?: string })?.id ?? jobId;
}

/** Process one job with advisory lock. Returns job payload or null if empty. */
export async function dequeue(workerId?: string): Promise<{ id: string; payload: JobPayload } | null> {
  const redis = await getRedis();
  if (redis) {
    const raw = await redis.rpop(QUEUE_NAME);
    if (!raw) return null;
    const job = JSON.parse(raw) as { id: string; payload: JobPayload };
    return job;
  }

  const db = getDb();
  const wId = workerId ?? `worker-${crypto.randomUUID().slice(0, 8)}`;

  const { data: row } = await db
    .from("job_queue")
    .select("id, payload, job_type")
    .eq("status", "pending")
    .is("locked_by", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!row) return null;
  const r = row as { id: string; payload: unknown; job_type: string };

  const { data: locked } = await db
    .from("job_queue")
    .update({
      status: "processing",
      locked_by: wId,
      locked_at: new Date().toISOString(),
      attempts: 1,
    })
    .eq("id", r.id)
    .eq("status", "pending")
    .is("locked_by", null)
    .select("id")
    .single();

  if (!locked) return null;

  const payload = (typeof r.payload === "object" && r.payload !== null ? r.payload : {}) as JobPayload;
  if (!payload.type) (payload as { type: string }).type = r.job_type;
  return { id: r.id, payload };
}

/** Move failed job to DLQ. */
export async function toDLQ(jobId: string, error: string): Promise<void> {
  const redis = await getRedis();
  if (redis) {
    await redis.lpush(DLQ_NAME, JSON.stringify({ jobId, error, at: new Date().toISOString() }));
    return;
  }
  const db = getDb();
  await db
    .from("job_queue")
    .update({ status: "dlq", error })
    .eq("id", jobId);
}

/** Mark job completed (DB-backed queue only). Idempotent via completion_id. */
export async function complete(jobId: string, completionId?: string): Promise<void> {
  try {
    const db = getDb();
    const cid = completionId ?? crypto.randomUUID();
    await db
      .from("job_queue")
      .update({
        status: "completed",
        processed_at: new Date().toISOString(),
        completion_id: cid,
        locked_by: null,
        locked_at: null,
      })
      .eq("id", jobId);
  } catch {
    // Redis jobs have no DB row
  }
}

/** Mark job failed (DB-backed queue only). */
export async function fail(jobId: string, error: string): Promise<void> {
  try {
    const db = getDb();
    await db
      .from("job_queue")
      .update({ status: "failed", error })
      .eq("id", jobId);
  } catch {
    // Redis jobs have no DB row
  }
}
