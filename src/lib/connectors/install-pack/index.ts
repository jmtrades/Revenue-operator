export type {
  EmailConnector,
  CalendarConnector,
  MessagingConnector,
  WebhookConnector,
  ConnectorKind,
  ConnectorImpl,
} from "./interfaces";
export { registerConnector, getConnector, hasConnector } from "./registry";
export {
  appendConnectorInboxEvent,
  getUnprocessedInboxEvents,
  markInboxEventProcessed,
} from "./webhook-inbox";
export { mapInboxEventToSignal } from "./inbox-mapper";
