/**
 * Revenue State Engine — classify leads for loss prevention.
 * State transitions from time decay, inactivity, call outcomes, engagement shifts.
 * Replaces fixed follow-ups: predict when lead moves toward AT_RISK and intervene before.
 */

import type { DealStateVector } from "@/lib/engines/perception";
import type { RevenueState, RevenueStateResult } from "./types";

/** Compute when a lead will move toward REVENUE_AT_RISK (hours from now). */
function predictTransitionToRisk(v: DealStateVector): number | null {
  const decay = v.engagement_decay_hours ?? 0;
  const silence = v.silence_risk ?? 0;
  const attendance = v.attendance_probability ?? 0.5;
  const state = v.state as string;

  if (state === "BOOKED") {
    if (attendance < 0.4) return 0; // Already at risk
    if (attendance < 0.55) return 12; // Will degrade
    if (decay > 48) return 24;
    return 48; // Default: 2 days to check
  }

  if (state === "QUALIFIED" || state === "ENGAGED") {
    if (silence > 0.7) return 0;
    if (decay > 72) return 0;
    if (decay > 48) return 12;
    if (decay > 24) return 24;
    return 72; // 3 days to next check
  }

  if (state === "CONTACTED") {
    if (silence > 0.5) return 0;
    if (decay > 48) return 6;
    if (decay > 24) return 18;
    return 36;
  }

  if (state === "REACTIVATE" || state === "LOST") {
    if (decay > 96) return 0; // Already lost
    return Math.max(24, 72 - decay); // Recovery window
  }

  return null;
}

/** Compute top-level revenue state from deal_state_vector. */
export function computeRevenueState(
  vector: DealStateVector
): RevenueStateResult {
  const state = vector.state as string;
  const optOut = vector.opt_out ?? false;
  const decay = vector.engagement_decay_hours ?? 999;
  const silence = vector.silence_risk ?? 0;
  const attendance = vector.attendance_probability ?? 0.5;
  const dealProb = vector.deal_probability ?? 0;
  const readiness = vector.readiness ?? 0;
  const riskFactors: string[] = [...(vector.risk_factors ?? [])];

  if (optOut) {
    return {
      state: "REVENUE_LOST",
      confidence_of_loss: 1,
      transition_toward_risk_at: null,
      risk_factors: ["Opted out"],
    };
  }

  // REVENUE_SECURED: won, closed, showed with momentum
  if (state === "WON" || state === "CLOSED") {
    return {
      state: "REVENUE_SECURED",
      confidence_of_loss: 0,
      transition_toward_risk_at: null,
      risk_factors: [],
    };
  }

  if (state === "SHOWED" && readiness >= 60) {
    return {
      state: "REVENUE_SECURED",
      confidence_of_loss: 0.1,
      transition_toward_risk_at: null,
      risk_factors: [],
    };
  }

  // REVENUE_LOST: severe decay, lost state
  if (state === "LOST") {
    return {
      state: "REVENUE_LOST",
      confidence_of_loss: 0.95,
      transition_toward_risk_at: null,
      risk_factors: [...riskFactors, "Deal lost"],
    };
  }

  if (decay > 168) {
    return {
      state: "REVENUE_LOST",
      confidence_of_loss: 0.9,
      transition_toward_risk_at: null,
      risk_factors: [...riskFactors, "7+ days inactive"],
    };
  }

  // BOOKED: attendance drives state
  if (state === "BOOKED") {
    if (attendance < 0.35) {
      return {
        state: "REVENUE_AT_RISK",
        confidence_of_loss: 0.85,
        transition_toward_risk_at: null,
        risk_factors: [...riskFactors, "Low attendance probability"],
      };
    }
    if (attendance < 0.55) {
      const hrs = predictTransitionToRisk(vector);
      return {
        state: "REVENUE_FRAGILE",
        confidence_of_loss: 0.5,
        transition_toward_risk_at: hrs != null ? new Date(Date.now() + hrs * 60 * 60 * 1000).toISOString() : null,
        risk_factors: [...riskFactors, "Attendance fragile"],
      };
    }
    const hrs = predictTransitionToRisk(vector);
    return {
      state: "REVENUE_INCOMING",
      confidence_of_loss: 0.2,
      transition_toward_risk_at: hrs != null ? new Date(Date.now() + hrs * 60 * 60 * 1000).toISOString() : null,
      risk_factors: riskFactors,
    };
  }

  // QUALIFIED / ENGAGED: deal prob + decay
  if (state === "QUALIFIED" || state === "ENGAGED") {
    if (silence > 0.7 || decay > 72) {
      return {
        state: "REVENUE_AT_RISK",
        confidence_of_loss: 0.75,
        transition_toward_risk_at: null,
        risk_factors: [...riskFactors, "Reply window closing", "Engagement cooling"],
      };
    }
    if (decay > 48 || dealProb < 0.4) {
      const hrs = predictTransitionToRisk(vector);
      return {
        state: "REVENUE_FRAGILE",
        confidence_of_loss: 0.45,
        transition_toward_risk_at: hrs != null ? new Date(Date.now() + hrs * 60 * 60 * 1000).toISOString() : null,
        risk_factors: [...riskFactors, "Momentum cooling"],
      };
    }
    const hrs = predictTransitionToRisk(vector);
    return {
      state: "REVENUE_INCOMING",
      confidence_of_loss: 0.25,
      transition_toward_risk_at: hrs != null ? new Date(Date.now() + hrs * 60 * 60 * 1000).toISOString() : null,
      risk_factors: riskFactors,
    };
  }

  // CONTACTED / REACTIVATE
  if (state === "REACTIVATE") {
    const recovery = vector.recovery_probability ?? 0;
    if (decay > 96 || recovery < 0.2) {
      return {
        state: "REVENUE_LOST",
        confidence_of_loss: 0.9,
        transition_toward_risk_at: null,
        risk_factors: [...riskFactors, "Recovery unlikely"],
      };
    }
    if (recovery < 0.4) {
      return {
        state: "REVENUE_AT_RISK",
        confidence_of_loss: 0.7,
        transition_toward_risk_at: null,
        risk_factors: [...riskFactors, "Recovery fragile"],
      };
    }
    const hrs = predictTransitionToRisk(vector);
    return {
      state: "REVENUE_FRAGILE",
      confidence_of_loss: 0.5,
      transition_toward_risk_at: hrs != null ? new Date(Date.now() + hrs * 60 * 60 * 1000).toISOString() : null,
      risk_factors: riskFactors,
    };
  }

  if (state === "CONTACTED") {
    if (silence > 0.6) {
      return {
        state: "REVENUE_AT_RISK",
        confidence_of_loss: 0.65,
        transition_toward_risk_at: null,
        risk_factors: [...riskFactors, "Reply window closing"],
      };
    }
    if (decay > 36) {
      const hrs = predictTransitionToRisk(vector);
      return {
        state: "REVENUE_FRAGILE",
        confidence_of_loss: 0.4,
        transition_toward_risk_at: hrs != null ? new Date(Date.now() + hrs * 60 * 60 * 1000).toISOString() : null,
        risk_factors: riskFactors,
      };
    }
    const hrs = predictTransitionToRisk(vector);
    return {
      state: "REVENUE_INCOMING",
      confidence_of_loss: 0.2,
      transition_toward_risk_at: hrs != null ? new Date(Date.now() + hrs * 60 * 60 * 1000).toISOString() : null,
      risk_factors: riskFactors,
    };
  }

  if (state === "NEW") {
    return {
      state: "REVENUE_INCOMING",
      confidence_of_loss: 0.1,
      transition_toward_risk_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      risk_factors: [],
    };
  }

  // Default: fragile
  return {
    state: "REVENUE_FRAGILE",
    confidence_of_loss: 0.5,
    transition_toward_risk_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    risk_factors: riskFactors,
  };
}
