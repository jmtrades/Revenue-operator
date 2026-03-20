/**
 * Legacy re-export layer. All voice data now lives in recall-voices.ts.
 * This file exists for backward compatibility — new code should import from recall-voices.ts directly.
 */

export type { RecallVoice as CuratedVoice } from "./recall-voices";
export { RECALL_VOICES as CURATED_VOICES, DEFAULT_RECALL_VOICE_ID as DEFAULT_VOICE_ID } from "./recall-voices";
