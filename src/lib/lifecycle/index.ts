/**
 * Revenue Lifecycle — 6-layer model
 * All features and UI map to these financial control layers.
 */

export {
  REVENUE_LAYERS,
  REVENUE_LAYER_DEFINITIONS,
  RECEPTIONIST_PERFORMANCE_METRICS,
  LIFECYCLE_DASHBOARD_METRICS,
  leadStateToLayer,
  getLayerDefinition,
  getLayerOrder,
} from "./layers";
export type { RevenueLayerId, RevenueLayer } from "./layers";
