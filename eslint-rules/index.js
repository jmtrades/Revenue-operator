/**
 * UI doctrine ESLint plugin — enforcement for operational infrastructure.
 * No dashboard patterns (Chart, Metric, etc.); no live UI (polling, refetch, websocket).
 */
/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS plugin config */
const noDashboardPatterns = require("./no-dashboard-patterns");
const noLiveUi = require("./no-live-ui");

module.exports = {
  rules: {
    "no-dashboard-patterns": noDashboardPatterns,
    "no-live-ui": noLiveUi,
  },
};
