/**
 * Unsafe write guard: only allow writes to protected tables from allowed code paths.
 * Prevents accidental mutation outside: signal consumer, closure, reconciliation, delivery, integrity.
 * Uses AsyncLocalStorage from Node.js async_hooks for context tracking.
 *
 * NOTE: We import AsyncLocalStorage at the top level. Next.js automatically externalises
 * `node:async_hooks` for serverless functions. For edge/client bundles where it is not
 * available, we fall back to a no-op implementation.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
let _AsyncLocalStorage: (new <T>() => { run<R>(ctx: T, fn: () => R): R; getStore(): T | undefined }) | null = null;
try {
  // Try the node: protocol first (works reliably in Next.js 14+ serverless)
   
  const mod = require("node:async_hooks") as { AsyncLocalStorage: typeof _AsyncLocalStorage };
  _AsyncLocalStorage = mod.AsyncLocalStorage;
} catch {
  try {
    // Fallback: try without node: prefix
     
    const mod = require("async_hooks") as { AsyncLocalStorage: typeof _AsyncLocalStorage };
    _AsyncLocalStorage = mod.AsyncLocalStorage;
  } catch {
    // Not in Node.js (edge runtime or client) — will use no-op below
  }
}
/* eslint-enable @typescript-eslint/no-require-imports */

const PROTECTED_TABLES = ["leads", "canonical_signals", "escalation_logs", "action_commands"] as const;
const ALLOWED_CONTEXTS = [
  "signal_consumer",
  "closure",
  "reconciliation",
  "delivery",
  "integrity",
  "api",
] as const;

export type WriteContext = (typeof ALLOWED_CONTEXTS)[number];

type StorageLike = {
  run<T>(ctx: WriteContext, fn: () => T): T;
  getStore(): WriteContext | undefined;
};

let _storage: StorageLike | null = null;
let _hasRealStorage = false;

function getStorage(): StorageLike {
  if (_storage !== null) return _storage;
  if (_AsyncLocalStorage) {
    const s = new _AsyncLocalStorage<WriteContext>();
    _storage = { run: (ctx, fn) => s.run(ctx, fn), getStore: () => s.getStore() };
    _hasRealStorage = true;
  } else {
    // Edge/client fallback — no context tracking, allow all writes
    _storage = { run: (_c, fn) => fn(), getStore: () => undefined };
  }
  return _storage;
}

export class UnsafeWriteError extends Error {
  constructor(
    public readonly table: string,
    public readonly context: string | undefined
  ) {
    super(`Unsafe write to ${table} outside allowed context (current: ${context ?? "none"})`);
    this.name = "UnsafeWriteError";
  }
}

export function getWriteContext(): WriteContext | undefined {
  return getStorage().getStore();
}

/** Run fn with the given write context. Required for any code path that writes to protected tables. */
export function runWithWriteContext<T>(context: WriteContext, fn: () => T): T {
  return getStorage().run(context, fn);
}

/** Run fn with the given write context (async). */
export async function runWithWriteContextAsync<T>(context: WriteContext, fn: () => Promise<T>): Promise<T> {
  return getStorage().run(context, fn);
}

export function checkUnsafeWrite(table: string): void {
  if (!PROTECTED_TABLES.includes(table as (typeof PROTECTED_TABLES)[number])) return;
  // Initialise storage lazily so _hasRealStorage is set
  getStorage();
  // If AsyncLocalStorage is not available we cannot track context — allow all writes.
  // The guard only enforces when we have a working context tracker.
  if (!_hasRealStorage) return;
  const ctx = getWriteContext();
  if (!ctx || !ALLOWED_CONTEXTS.includes(ctx)) {
    throw new UnsafeWriteError(table, ctx);
  }
}

type SchemaClient = { from: (table: string) => unknown };

function wrapBuilder(builder: unknown, table: string): unknown {
  if (builder == null || typeof builder !== "object") return builder;
  const b = builder as Record<string, (...a: unknown[]) => unknown>;
  const methods = ["insert", "update", "upsert", "delete"];
  const proxy = new Proxy(builder as object, {
    get(target, prop: string) {
      if (methods.includes(prop)) {
        return (...args: unknown[]) => {
          checkUnsafeWrite(table);
          return (b[prop] as (...a: unknown[]) => unknown).call(b, ...args);
        };
      }
      return (target as Record<string, unknown>)[prop];
    },
  });
  return proxy;
}

/**
 * Wrap the schema client so that insert/update/upsert/delete to protected tables
 * only succeed when run inside runWithWriteContext.
 */
export function wrapSchemaForGuards<T extends SchemaClient>(schema: T): T {
  const from = schema.from.bind(schema);
  return new Proxy(schema, {
    get(target, prop: string) {
      if (prop === "from") {
        return (table: string) => wrapBuilder(from(table), table);
      }
      return (target as Record<string, unknown>)[prop];
    },
  }) as T;
}

/** Map job payload type to allowed write context for process-queue. */
export function getJobWriteContext(payload: { type?: string }): WriteContext {
  switch (payload?.type) {
    case "process_signal":
      return "signal_consumer";
    case "closure_reconciliation":
      return "reconciliation";
    case "handoff_notify":
    case "handoff_notify_batch":
    case "action":
    case "decision":
    case "no_reply":
    case "no_show_reminder":
    case "reactivation":
      return "delivery";
    default:
      return "delivery";
  }
}
