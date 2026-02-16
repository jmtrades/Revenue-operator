/**
 * Runtime bootstrap for API routes. Import at top of cron routes.
 * Validation runs on first cron request (inside assertCronAuthorized), not at module load, so build can complete without env.
 */

export { validateEnvironment } from "./validate-environment";
export { assertCronAuthorized } from "./cron-auth";
export { recordCronHeartbeat, getCronHeartbeats } from "./cron-heartbeat";
