/**
 * Re-exports from canonical previews lib. Backward compat: getPreviews = listPendingPreviews.
 */

import {
  setPendingPreview,
  removePreview,
  hasExecutedActionType,
  markExecutedActionType,
  listPendingPreviews,
} from "@/lib/previews";

export { setPendingPreview, removePreview, hasExecutedActionType, markExecutedActionType, listPendingPreviews };

export const getPreviews = listPendingPreviews;
