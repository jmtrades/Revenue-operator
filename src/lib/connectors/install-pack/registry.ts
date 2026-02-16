/**
 * Connector registry: register and resolve by kind. No business logic in connectors.
 */

import type { ConnectorKind, ConnectorImpl } from "./interfaces";

const registry = new Map<ConnectorKind, ConnectorImpl>();

export function registerConnector(kind: ConnectorKind, impl: ConnectorImpl): void {
  registry.set(kind, impl);
}

export function getConnector<K extends ConnectorKind>(kind: K): (ConnectorImpl & { kind: K }) | null {
  const impl = registry.get(kind);
  return impl ? (impl as ConnectorImpl & { kind: K }) : null;
}

export function hasConnector(kind: ConnectorKind): boolean {
  return registry.has(kind);
}
