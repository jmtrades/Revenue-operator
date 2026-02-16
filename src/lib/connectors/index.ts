/**
 * Connector layer — all channels normalize into Universal Conversation Model.
 * SourceAdapter: verify → normalize → pipeline.
 * DestinationAdapter: send message, update CRM, append note.
 * Install-pack: webhook inbox (signals only), registry.
 */

export type { SourceAdapter, SourceAdapterResult, VerifyRequest, NormalizeInbound } from "./source-adapter";
export type { DestinationAdapter, SendMessageInput, DestinationAdapterResult } from "./destination-adapter";
export { processNormalizedInbound } from "./normalize-to-pipeline";

export type { EmailConnector, CalendarConnector, MessagingConnector, WebhookConnector, ConnectorKind } from "./install-pack";
export { registerConnector, getConnector, hasConnector } from "./install-pack";
