"""
A/B Testing and Shadow Mode Engine for Voice System

Provides deterministic variant assignment, metrics tracking, and statistical
significance testing for voice model experiments. Supports shadow mode for
parallel execution without user-facing impact.
"""

import hashlib
import json
import logging
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from typing import Optional, Tuple, Dict, List, Any
from math import sqrt
from enum import Enum

logger = logging.getLogger(__name__)


class VariantType(Enum):
    """Voice variant types for A/B tests."""
    VOICE_A = "voice_a"
    VOICE_B = "voice_b"


@dataclass
class VariantMetrics:
    """Metrics collected for a specific variant."""
    variant: str
    total_calls: int = 0
    total_duration_ms: int = 0
    total_ttfb_ms: int = 0  # Time to first byte
    satisfaction_score_sum: float = 0.0  # Proxy: 0-5 scale feedback
    satisfaction_count: int = 0
    conversion_count: int = 0
    error_count: int = 0
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        data = asdict(self)
        data['created_at'] = self.created_at.isoformat()
        data['updated_at'] = self.updated_at.isoformat()
        return data

    def avg_ttfb(self) -> float:
        """Calculate average time to first byte."""
        return self.total_ttfb_ms / max(self.total_calls, 1)

    def avg_duration(self) -> float:
        """Calculate average call duration."""
        return self.total_duration_ms / max(self.total_calls, 1)

    def avg_satisfaction(self) -> float:
        """Calculate average satisfaction score."""
        return self.satisfaction_score_sum / max(self.satisfaction_count, 1)

    def conversion_rate(self) -> float:
        """Calculate conversion rate."""
        return self.conversion_count / max(self.total_calls, 1)

    def error_rate(self) -> float:
        """Calculate error rate."""
        return self.error_count / max(self.total_calls, 1)


@dataclass
class ShadowModeResult:
    """Results from running both primary and shadow voices."""
    primary_result: Dict[str, Any]
    shadow_result: Dict[str, Any]
    primary_played: bool
    comparison: Dict[str, Any] = field(default_factory=dict)


class VoiceABTest:
    """
    A/B testing engine for voice variants with deterministic assignment.

    Uses call_sid hash to deterministically assign calls to variants,
    ensuring consistent variant assignment across system restarts.
    """

    def __init__(
        self,
        test_id: str,
        voice_a: str,
        voice_b: str,
        traffic_split: float = 0.5,
    ):
        """
        Initialize A/B test.

        Args:
            test_id: Unique identifier for this test
            voice_a: Name/ID of primary voice variant
            voice_b: Name/ID of secondary voice variant
            traffic_split: Proportion of traffic to send to voice_a (0.0-1.0)
        """
        if not 0.0 <= traffic_split <= 1.0:
            raise ValueError("traffic_split must be between 0.0 and 1.0")

        self.test_id = test_id
        self.voice_a = voice_a
        self.voice_b = voice_b
        self.traffic_split = traffic_split
        self.created_at = datetime.utcnow()

        self.metrics: Dict[str, VariantMetrics] = {
            voice_a: VariantMetrics(variant=voice_a),
            voice_b: VariantMetrics(variant=voice_b),
        }

    def assign_variant(self, call_sid: str) -> str:
        """
        Deterministically assign a call to a variant based on call_sid hash.

        Uses the first 8 bytes of SHA256(call_sid) to generate a deterministic
        float between 0 and 1. This ensures the same call_sid always gets the
        same variant across system restarts.

        Args:
            call_sid: Twilio call session ID

        Returns:
            Name of assigned variant (voice_a or voice_b)
        """
        hash_value = hashlib.sha256(call_sid.encode()).hexdigest()
        hash_int = int(hash_value[:8], 16)
        assignment_value = (hash_int / 0xFFFFFFFF) % 1.0

        return self.voice_a if assignment_value < self.traffic_split else self.voice_b

    def record_result(
        self,
        variant: str,
        metrics: Dict[str, Any],
    ) -> None:
        """
        Record metrics for a call variant.

        Args:
            variant: Variant identifier (voice_a or voice_b)
            metrics: Dict containing any of:
                - duration_ms: Call duration in milliseconds
                - ttfb_ms: Time to first byte in milliseconds
                - satisfaction_score: 0-5 feedback score
                - converted: Boolean indicating successful conversion
                - error: Boolean indicating if call had errors
        """
        if variant not in self.metrics:
            logger.warning(f"Unknown variant '{variant}' for test {self.test_id}")
            return

        variant_metrics = self.metrics[variant]
        variant_metrics.total_calls += 1
        variant_metrics.updated_at = datetime.utcnow()

        if 'duration_ms' in metrics:
            variant_metrics.total_duration_ms += metrics['duration_ms']

        if 'ttfb_ms' in metrics:
            variant_metrics.total_ttfb_ms += metrics['ttfb_ms']

        if 'satisfaction_score' in metrics:
            variant_metrics.satisfaction_score_sum += metrics['satisfaction_score']
            variant_metrics.satisfaction_count += 1

        if metrics.get('converted', False):
            variant_metrics.conversion_count += 1

        if metrics.get('error', False):
            variant_metrics.error_count += 1

    def get_stats(self) -> Dict[str, Any]:
        """
        Get comprehensive statistics for both variants.

        Returns:
            Dict with keys for each variant containing computed metrics
        """
        stats = {
            'test_id': self.test_id,
            'traffic_split': self.traffic_split,
            'created_at': self.created_at.isoformat(),
            'variants': {},
        }

        for variant_name, metrics in self.metrics.items():
            stats['variants'][variant_name] = {
                'total_calls': metrics.total_calls,
                'avg_duration_ms': round(metrics.avg_duration(), 2),
                'avg_ttfb_ms': round(metrics.avg_ttfb(), 2),
                'avg_satisfaction': round(metrics.avg_satisfaction(), 2),
                'conversion_rate': round(metrics.conversion_rate(), 4),
                'error_rate': round(metrics.error_rate(), 4),
            }

        return stats

    def is_significant(self, confidence: float = 0.95) -> Tuple[bool, Optional[str]]:
        """
        Determine if there's statistically significant difference between variants
        using two-proportion z-test on conversion rates.

        Args:
            confidence: Confidence level (default 0.95 for 95% CI)

        Returns:
            Tuple of (is_significant: bool, winner: str|None)
            winner is the variant with higher conversion rate if significant
        """
        metrics_a = self.metrics[self.voice_a]
        metrics_b = self.metrics[self.voice_b]

        # Need minimum sample size
        if metrics_a.total_calls < 30 or metrics_b.total_calls < 30:
            return False, None

        p_a = metrics_a.conversion_rate()
        p_b = metrics_b.conversion_rate()
        n_a = metrics_a.total_calls
        n_b = metrics_b.total_calls

        # Pooled proportion
        p_pool = (metrics_a.conversion_count + metrics_b.conversion_count) / (n_a + n_b)

        # Standard error
        se = sqrt(p_pool * (1 - p_pool) * (1/n_a + 1/n_b))

        if se == 0:
            return False, None

        # Z-statistic
        z = abs(p_a - p_b) / se

        # Critical z-value for 95% CI is ~1.96, 99% CI is ~2.576
        z_critical = 1.96 if confidence == 0.95 else 2.576

        is_sig = z > z_critical
        winner = self.voice_a if p_a > p_b else self.voice_b if p_b > p_a else None

        return is_sig, winner if is_sig else None


class ShadowMode:
    """
    Shadow mode execution engine for running two voices in parallel
    while only playing one to the caller.

    Useful for offline evaluation and quality comparison without
    impacting user experience.
    """

    def __init__(self, primary_voice: str, shadow_voice: str):
        """
        Initialize shadow mode.

        Args:
            primary_voice: Voice variant to play to caller
            shadow_voice: Voice variant to run but not play (for comparison)
        """
        self.primary_voice = primary_voice
        self.shadow_voice = shadow_voice
        self.execution_count = 0

    async def synthesize_both(
        self,
        text: str,
        config: Dict[str, Any],
        tts_manager: Any,
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Synthesize text with both primary and shadow voices in parallel.

        Args:
            text: Text to synthesize
            config: Base TTS configuration
            tts_manager: TTS manager instance with synthesize method

        Returns:
            Tuple of (primary_result, shadow_result)
            Each result contains: audio_bytes, duration_ms, model, latency_ms
        """
        import asyncio
        import time

        self.execution_count += 1

        # Create configs for each variant
        config_primary = {**config, 'voice_id': self.primary_voice}
        config_shadow = {**config, 'voice_id': self.shadow_voice}

        # Run both in parallel
        start_time = time.time()

        try:
            primary_coro = tts_manager.synthesize(text, config_primary)
            shadow_coro = tts_manager.synthesize(text, config_shadow)

            primary_result, shadow_result = await asyncio.gather(
                primary_coro,
                shadow_coro,
                return_exceptions=False,
            )

            elapsed_ms = (time.time() - start_time) * 1000

            # Ensure results are dicts
            if not isinstance(primary_result, dict):
                primary_result = {'error': str(primary_result)}
            if not isinstance(shadow_result, dict):
                shadow_result = {'error': str(shadow_result)}

            # Add timing info
            primary_result['total_latency_ms'] = elapsed_ms
            shadow_result['total_latency_ms'] = elapsed_ms

            logger.info(
                f"Shadow mode synthesis complete: primary={self.primary_voice}, "
                f"shadow={self.shadow_voice}, latency={elapsed_ms:.0f}ms"
            )

            return primary_result, shadow_result

        except Exception as e:
            logger.error(f"Shadow mode synthesis failed: {e}", exc_info=True)
            raise

    @staticmethod
    def compare_results(
        primary: Dict[str, Any],
        shadow: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Compare primary and shadow synthesis results.

        Args:
            primary: Primary voice synthesis result
            shadow: Shadow voice synthesis result

        Returns:
            Comparison dict with metrics and quality indicators
        """
        comparison = {
            'timestamp': datetime.utcnow().isoformat(),
            'primary_duration_ms': primary.get('duration_ms'),
            'shadow_duration_ms': shadow.get('duration_ms'),
            'primary_model': primary.get('model'),
            'shadow_model': shadow.get('model'),
            'primary_error': primary.get('error'),
            'shadow_error': shadow.get('error'),
            'duration_diff_ms': None,
            'quality_match': None,
        }

        # Calculate duration difference
        if (primary.get('duration_ms') and shadow.get('duration_ms')):
            diff = abs(primary['duration_ms'] - shadow['duration_ms'])
            comparison['duration_diff_ms'] = diff
            # Consider match if within 50ms
            comparison['quality_match'] = diff < 50

        return comparison


class ABTestManager:
    """
    Manager for multiple concurrent A/B tests and shadow mode executions.
    """

    def __init__(self):
        """Initialize test manager."""
        self.tests: Dict[str, VoiceABTest] = {}
        self.shadow_modes: Dict[str, ShadowMode] = {}

    def create_test(
        self,
        test_id: str,
        voice_a: str,
        voice_b: str,
        traffic_split: float = 0.5,
    ) -> VoiceABTest:
        """
        Create a new A/B test.

        Args:
            test_id: Unique test identifier
            voice_a: Primary voice variant
            voice_b: Secondary voice variant
            traffic_split: Traffic split ratio (default 50/50)

        Returns:
            Created VoiceABTest instance
        """
        if test_id in self.tests:
            logger.warning(f"Test {test_id} already exists, overwriting")

        test = VoiceABTest(test_id, voice_a, voice_b, traffic_split)
        self.tests[test_id] = test

        logger.info(
            f"Created A/B test {test_id}: {voice_a} vs {voice_b} "
            f"({traffic_split*100:.0f}/{(1-traffic_split)*100:.0f})"
        )

        return test

    def create_shadow_mode(
        self,
        mode_id: str,
        primary_voice: str,
        shadow_voice: str,
    ) -> ShadowMode:
        """
        Create a shadow mode execution.

        Args:
            mode_id: Unique shadow mode identifier
            primary_voice: Primary voice to play
            shadow_voice: Shadow voice to compare

        Returns:
            Created ShadowMode instance
        """
        if mode_id in self.shadow_modes:
            logger.warning(f"Shadow mode {mode_id} already exists, overwriting")

        shadow = ShadowMode(primary_voice, shadow_voice)
        self.shadow_modes[mode_id] = shadow

        logger.info(f"Created shadow mode {mode_id}: {primary_voice} (primary), {shadow_voice} (shadow)")

        return shadow

    def get_active_tests(self, workspace_id: str = None) -> List[VoiceABTest]:
        """
        Get all active A/B tests.

        Args:
            workspace_id: Optional workspace filter (for future multi-tenant support)

        Returns:
            List of active VoiceABTest instances
        """
        return list(self.tests.values())

    def get_variant_for_call(
        self,
        call_sid: str,
        test_id: str = None,
    ) -> Optional[str]:
        """
        Get assigned variant for a specific call.

        Args:
            call_sid: Twilio call session ID
            test_id: Specific test to use, or None to use first active test

        Returns:
            Assigned variant name or None if no active tests
        """
        if test_id:
            if test_id not in self.tests:
                return None
            return self.tests[test_id].assign_variant(call_sid)

        # Use first active test if no specific test provided
        if not self.tests:
            return None

        first_test = next(iter(self.tests.values()))
        return first_test.assign_variant(call_sid)

    def record_call_result(
        self,
        test_id: str,
        variant: str,
        metrics: Dict[str, Any],
    ) -> None:
        """Record result for a call in a test."""
        if test_id not in self.tests:
            logger.warning(f"Test {test_id} not found")
            return

        self.tests[test_id].record_result(variant, metrics)

    def get_test_stats(self, test_id: str) -> Optional[Dict[str, Any]]:
        """Get statistics for a specific test."""
        if test_id not in self.tests:
            return None

        return self.tests[test_id].get_stats()

    def export_results(self) -> Dict[str, Any]:
        """Export all test results."""
        return {
            'tests': {
                test_id: test.get_stats()
                for test_id, test in self.tests.items()
            },
            'exported_at': datetime.utcnow().isoformat(),
        }
