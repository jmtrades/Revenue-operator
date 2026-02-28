/**
 * Preset builder layer — composes execution flows from business type. No user configuration.
 * User never configures. Recall-Touch is a pre-trained digital employee.
 */

export { getPresetForBusinessType, listBusinessTypes, DEFAULT_PRESET, VERTICAL_PRESETS } from "./presets";
export { applyPresetToWorkspace } from "./apply";
export {
  PIPELINE_STAGE_DISPLAY,
  PIPELINE_STAGE_ORDER,
  type RevenuePreset,
  type PresetAutomation,
  type AutomationKey,
} from "./types";
