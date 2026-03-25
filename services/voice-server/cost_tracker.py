"""
Cost Tracking Engine for Voice Synthesis

Tracks GPU compute time, calculates synthesis costs, and compares against
external provider pricing. Useful for ROI analysis and cost projections.
"""

import logging
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from enum import Enum

logger = logging.getLogger(__name__)


class VoiceModel(Enum):
    """Supported voice models."""
    ORPHEUS_H100 = "orpheus_h100"
    ORPHEUS_A100 = "orpheus_a100"
    KOKORO_CPU = "kokoro_cpu"


class ExternalProvider(Enum):
    """External voice provider benchmarks."""
    BLAND_AI = "bland_ai"
    VAPI = "vapi"
    SYNTHFLOW = "synthflow"
    ELEVENLABS = "elevenlabs"


# External provider costs per minute of audio (2026 pricing)
PROVIDER_COSTS = {
    ExternalProvider.BLAND_AI.value: 0.09,
    ExternalProvider.VAPI.value: 0.15,  # $0.05 orchestration + STT/TTS/LLM pass-through
    ExternalProvider.SYNTHFLOW.value: 0.12,
    ExternalProvider.ELEVENLABS.value: 0.30,
}

# Recall Touch internal COGS per minute by optimization phase
RECALL_TOUCH_COGS = {
    "current": 0.148,   # Vapi + ElevenLabs + Claude Sonnet + Deepgram STT + Twilio
    "phase_1": 0.099,   # Vapi + Deepgram Aura-2 + Claude Haiku + Deepgram STT + Twilio
    "phase_2": 0.058,   # Pipecat + Deepgram Aura-2 + Haiku/Sonnet router + Deepgram STT + Twilio
    "phase_3": 0.043,   # Pipecat + Cartesia Sonic + GPT-4o-mini/Haiku/Sonnet router + Deepgram STT + Twilio
}

# Self-hosted model costs per minute of audio
# Calculated from cloud instance pricing and estimated concurrent capacity
SELF_HOSTED_COSTS = {
    VoiceModel.ORPHEUS_H100.value: 0.024,    # H100: $2.99/hr, ~25 concurrent streams
    VoiceModel.ORPHEUS_A100.value: 0.032,    # A100: $1.50/hr, ~15 concurrent streams
    VoiceModel.KOKORO_CPU.value: 0.005,      # CPU: $0.05/hr (small instance), unlimited
}


@dataclass
class SynthesisRecord:
    """Record of a single synthesis operation."""
    model: str
    duration_ms: int
    gpu_time_ms: int
    timestamp: datetime = field(default_factory=datetime.utcnow)
    success: bool = True

    def cost(self) -> float:
        """Calculate cost of this synthesis operation."""
        cost_per_minute = SELF_HOSTED_COSTS.get(self.model, 0.0)
        audio_minutes = self.duration_ms / 60000.0
        return cost_per_minute * audio_minutes

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        return data


@dataclass
class CostSummary:
    """Summary of costs over a time period."""
    period_start: datetime
    period_end: datetime
    total_audio_minutes: float = 0.0
    total_synthesis_count: int = 0
    total_cost: float = 0.0
    cost_per_minute: float = 0.0
    avg_latency_ms: float = 0.0
    success_rate: float = 1.0
    peak_daily_cost: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'period_start': self.period_start.isoformat(),
            'period_end': self.period_end.isoformat(),
            'total_audio_minutes': round(self.total_audio_minutes, 2),
            'total_synthesis_count': self.total_synthesis_count,
            'total_cost': round(self.total_cost, 2),
            'cost_per_minute': round(self.cost_per_minute, 4),
            'avg_latency_ms': round(self.avg_latency_ms, 2),
            'success_rate': round(self.success_rate, 4),
            'peak_daily_cost': round(self.peak_daily_cost, 2),
        }


class CostTracker:
    """
    Tracks synthesis costs and provides cost analysis and projections.
    """

    def __init__(self):
        """Initialize cost tracker."""
        self.records: List[SynthesisRecord] = []
        self.daily_costs: Dict[str, float] = {}

    def record_synthesis(
        self,
        model: str,
        duration_ms: int,
        gpu_time_ms: int,
        success: bool = True,
    ) -> float:
        """
        Record a synthesis operation.

        Args:
            model: Model used (from VoiceModel enum)
            duration_ms: Duration of generated audio in milliseconds
            gpu_time_ms: GPU compute time in milliseconds
            success: Whether synthesis succeeded

        Returns:
            Cost of this synthesis in dollars
        """
        record = SynthesisRecord(
            model=model,
            duration_ms=duration_ms,
            gpu_time_ms=gpu_time_ms,
            success=success,
        )

        self.records.append(record)

        # Track daily costs
        day_key = record.timestamp.strftime('%Y-%m-%d')
        cost = record.cost()
        self.daily_costs[day_key] = self.daily_costs.get(day_key, 0.0) + cost

        logger.info(
            f"Recorded synthesis: {model}, {duration_ms}ms audio, "
            f"{gpu_time_ms}ms GPU, ${cost:.4f}"
        )

        return cost

    def get_cost_summary(self, period_days: int = 30) -> CostSummary:
        """
        Get cost summary for the last N days.

        Args:
            period_days: Number of days to look back (default 30)

        Returns:
            CostSummary with aggregated metrics
        """
        cutoff_time = datetime.utcnow() - timedelta(days=period_days)

        # Filter records within period
        period_records = [r for r in self.records if r.timestamp >= cutoff_time]

        if not period_records:
            return CostSummary(
                period_start=cutoff_time,
                period_end=datetime.utcnow(),
            )

        # Calculate aggregates
        total_audio_minutes = sum(r.duration_ms for r in period_records) / 60000.0
        total_cost = sum(r.cost() for r in period_records)
        successful = sum(1 for r in period_records if r.success)
        success_rate = successful / len(period_records) if period_records else 1.0
        avg_latency = sum(r.gpu_time_ms for r in period_records) / len(period_records)

        # Find peak daily cost
        peak_daily = max(self.daily_costs.values()) if self.daily_costs else 0.0

        cost_per_minute = total_cost / max(total_audio_minutes, 0.001)

        return CostSummary(
            period_start=cutoff_time,
            period_end=datetime.utcnow(),
            total_audio_minutes=total_audio_minutes,
            total_synthesis_count=len(period_records),
            total_cost=total_cost,
            cost_per_minute=cost_per_minute,
            avg_latency_ms=avg_latency,
            success_rate=success_rate,
            peak_daily_cost=peak_daily,
        )

    def get_cost_by_model(self, period_days: int = 30) -> Dict[str, Dict[str, Any]]:
        """
        Get cost breakdown by model.

        Args:
            period_days: Number of days to look back

        Returns:
            Dict mapping model names to their costs
        """
        cutoff_time = datetime.utcnow() - timedelta(days=period_days)
        period_records = [r for r in self.records if r.timestamp >= cutoff_time]

        model_costs: Dict[str, List[SynthesisRecord]] = {}
        for record in period_records:
            if record.model not in model_costs:
                model_costs[record.model] = []
            model_costs[record.model].append(record)

        result = {}
        for model, records in model_costs.items():
            total_cost = sum(r.cost() for r in records)
            total_audio_min = sum(r.duration_ms for r in records) / 60000.0
            result[model] = {
                'count': len(records),
                'total_audio_minutes': round(total_audio_min, 2),
                'total_cost': round(total_cost, 2),
                'cost_per_minute': round(total_cost / max(total_audio_min, 0.001), 4),
            }

        return result

    def get_savings_vs_external(
        self,
        provider: Optional[str] = None,
        period_days: int = 30,
    ) -> Dict[str, Any]:
        """
        Calculate savings vs external provider pricing.

        Args:
            provider: Specific provider to compare against, or None for all
            period_days: Number of days to analyze

        Returns:
            Comparison dict with savings calculations
        """
        summary = self.get_cost_summary(period_days)

        if summary.total_audio_minutes == 0:
            return {
                'self_hosted_cost': 0.0,
                'comparison': {},
                'savings': {},
            }

        result = {
            'self_hosted_cost': round(summary.total_cost, 2),
            'period_days': period_days,
            'total_audio_minutes': round(summary.total_audio_minutes, 2),
            'comparison': {},
            'savings': {},
        }

        # Calculate costs for each external provider
        providers_to_check = (
            [provider] if provider else list(PROVIDER_COSTS.keys())
        )

        for prov in providers_to_check:
            if prov not in PROVIDER_COSTS:
                logger.warning(f"Unknown provider: {prov}")
                continue

            external_cost = PROVIDER_COSTS[prov] * summary.total_audio_minutes
            savings = external_cost - summary.total_cost
            savings_pct = (savings / external_cost * 100) if external_cost > 0 else 0

            result['comparison'][prov] = {
                'cost_per_minute': PROVIDER_COSTS[prov],
                'total_cost': round(external_cost, 2),
            }

            result['savings'][prov] = {
                'absolute': round(savings, 2),
                'percent': round(savings_pct, 1),
            }

        return result

    def project_monthly_cost(
        self,
        daily_minutes: int,
        model: str = VoiceModel.ORPHEUS_H100.value,
        days_ahead: int = 30,
    ) -> Dict[str, Any]:
        """
        Project future monthly costs based on usage patterns.

        Args:
            daily_minutes: Expected audio minutes per day
            model: Model to use for projection
            days_ahead: Number of days to project (default 30)

        Returns:
            Projection dict with estimated costs
        """
        if model not in SELF_HOSTED_COSTS:
            raise ValueError(f"Unknown model: {model}")

        cost_per_minute = SELF_HOSTED_COSTS[model]
        daily_cost = daily_minutes * cost_per_minute
        monthly_cost = daily_cost * days_ahead

        return {
            'model': model,
            'daily_audio_minutes': daily_minutes,
            'daily_cost': round(daily_cost, 2),
            'monthly_cost_projection': round(monthly_cost, 2),
            'projection_days': days_ahead,
            'cost_per_minute': cost_per_minute,
        }

    def project_roi_vs_external(
        self,
        daily_minutes: int,
        model: str = VoiceModel.ORPHEUS_H100.value,
        hardware_cost: float = 15000.0,
        days_ahead: int = 365,
    ) -> Dict[str, Any]:
        """
        Calculate ROI of self-hosted vs external providers.

        Args:
            daily_minutes: Expected audio minutes per day
            model: Model to use
            hardware_cost: Upfront hardware cost
            days_ahead: Period to analyze (default 365 days)

        Returns:
            ROI analysis comparing self-hosted vs external
        """
        if model not in SELF_HOSTED_COSTS:
            raise ValueError(f"Unknown model: {model}")

        projection = self.project_monthly_cost(daily_minutes, model, 30)
        monthly_self_hosted = projection['monthly_cost_projection']

        result = {
            'period_days': days_ahead,
            'self_hosted': {
                'monthly_cost': round(monthly_self_hosted, 2),
                'total_cost_period': round(monthly_self_hosted * (days_ahead / 30), 2),
                'hardware_cost': hardware_cost,
            },
            'external_providers': {},
            'roi_analysis': {},
        }

        # Calculate external costs
        total_monthly_minutes = daily_minutes * 30
        for provider, cost_per_min in PROVIDER_COSTS.items():
            monthly_cost = total_monthly_minutes * cost_per_min
            total_cost = monthly_cost * (days_ahead / 30)

            result['external_providers'][provider] = {
                'monthly_cost': round(monthly_cost, 2),
                'total_cost_period': round(total_cost, 2),
            }

            # ROI vs this provider
            total_self_hosted = (monthly_self_hosted * (days_ahead / 30)) + hardware_cost
            savings = total_cost - total_self_hosted
            payback_days = hardware_cost / (monthly_cost - monthly_self_hosted) * 30 if (monthly_cost - monthly_self_hosted) > 0 else None

            result['roi_analysis'][provider] = {
                'savings': round(savings, 2),
                'payback_period_days': round(payback_days) if payback_days else None,
                'break_even': savings > 0,
            }

        return result

    def get_recent_records(self, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get the most recent synthesis records.

        Args:
            limit: Maximum number of records to return

        Returns:
            List of recent synthesis records
        """
        recent = sorted(
            self.records,
            key=lambda r: r.timestamp,
            reverse=True,
        )[:limit]

        return [r.to_dict() for r in recent]

    def clear_old_records(self, days: int = 90) -> int:
        """
        Remove synthesis records older than specified days.

        Args:
            days: Number of days to retain

        Returns:
            Number of records deleted
        """
        cutoff = datetime.utcnow() - timedelta(days=days)
        initial_count = len(self.records)
        self.records = [r for r in self.records if r.timestamp >= cutoff]
        deleted = initial_count - len(self.records)

        logger.info(f"Cleared {deleted} old records (older than {days} days)")

        return deleted
