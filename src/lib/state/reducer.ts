/**
 * State Layer — Deterministic reducer.
 * (prevState, signal) => nextState. Replayable; no message-content dependency.
 */

import type { CanonicalSignalType } from "@/lib/signals/types";
import type { LifecycleState } from "./types";

export interface SignalForReducer {
  signal_type: CanonicalSignalType;
  payload: Record<string, unknown>;
  occurred_at: string;
}

/** Deterministic: (currentState, signal) => nextState. Monotonic: never throw; missing prior history falls back to prevState. */
export function reduceLeadState(
  prevState: LifecycleState,
  signal: SignalForReducer
): LifecycleState {
  const s = signal.signal_type;
  const p = signal.payload;

  switch (s) {
    case "InboundMessageReceived":
    case "CustomerReplied":
      if (prevState === "NEW") return "ENGAGED";
      if (prevState === "LOST" || prevState === "REACTIVATED") return "ENGAGED";
      if (prevState === "NO_SHOW") return "ENGAGED";
      return prevState;

    case "CustomerInactiveTimeout":
      if (prevState === "ENGAGED" || prevState === "QUALIFIED") return "REACTIVATED";
      if (prevState === "BOOKED" || prevState === "SCHEDULED") return "REACTIVATED";
      return prevState;

    case "BookingCreated":
      if (prevState === "ENGAGED" || prevState === "QUALIFIED") return "BOOKED";
      return prevState;

    case "AppointmentStarted":
      if (prevState === "BOOKED") return "SCHEDULED";
      return prevState;

    case "AppointmentCompleted":
      if (prevState === "BOOKED" || prevState === "SCHEDULED") return "ATTENDED";
      if (prevState === "REPEAT") return "REPEAT";
      return prevState;

    case "AppointmentMissed":
      if (prevState === "BOOKED" || prevState === "SCHEDULED") return "NO_SHOW";
      return prevState;

    case "BookingCancelled":
      if (prevState === "BOOKED" || prevState === "SCHEDULED") return "ENGAGED";
      return prevState;

    case "PaymentCaptured":
      if (prevState === "ATTENDED") return "REPEAT";
      if (prevState === "REPEAT") return "REPEAT";
      return prevState;

    case "OutboundMessageSent":
      return prevState;

    case "InboundMessageDiscovered":
      if (prevState === "NEW") return "ENGAGED";
      if (prevState === "LOST" || prevState === "REACTIVATED") return "ENGAGED";
      if (prevState === "NO_SHOW") return "ENGAGED";
      return prevState;

    case "BookingModified":
      return prevState;

    case "HumanReplyDiscovered":
      return prevState;

    case "RefundIssued":
      return prevState;

    default:
      return prevState;
  }
}
