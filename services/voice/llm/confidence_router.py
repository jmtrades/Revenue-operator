import hashlib
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class ConfidenceRouterConfig:
    """
    Router configuration for selecting between local Llama and Claude.

    - Primary ratio: 90% Llama, 10% Claude baseline.
    - Llama confidence threshold: if Llama confidence is below this value,
      we should retry with Claude (threshold-based fallback).

    Confidence scoring integration is intentionally stubbed for now; the
    `estimate_llama_confidence()` method returns a constant value until
    Pipecat's LLM response exposes logprob-based confidence in our pipeline.
    """

    primary_ratio: float = 0.9
    llama_confidence_threshold: float = 0.85


class ConfidenceRouter:
    def __init__(self, config: Optional[ConfidenceRouterConfig] = None):
        self.config = config or ConfidenceRouterConfig()

    def estimate_llama_confidence(self) -> float:
        # Placeholder confidence until logprob->confidence is wired.
        return 1.0

    def _deterministic_choice_bucket(self, key: str) -> int:
        """
        Deterministically pick a bucket so routing stays stable per call.
        """
        digest = hashlib.sha256(key.encode("utf-8")).hexdigest()
        return int(digest, 16) % 100

    def should_use_claude(
        self,
        *,
        routing_key: str,
        llama_confidence: Optional[float] = None,
    ) -> bool:
        """
        Returns True when the pipeline should use Claude instead of Llama.

        Baseline:
          - 10% of calls use Claude directly.
        Threshold:
          - if Llama confidence is below `llama_confidence_threshold`,
            we should retry with Claude.
        """
        confidence = llama_confidence if llama_confidence is not None else self.estimate_llama_confidence()

        # Baseline 90/10 selection.
        # Example: if bucket 0-9 => Claude, 10-99 => Llama.
        bucket = self._deterministic_choice_bucket(routing_key)
        baseline_use_claude = bucket < int((1.0 - self.config.primary_ratio) * 100)

        # Threshold-based fallback for when Llama was chosen.
        threshold_use_claude = confidence < self.config.llama_confidence_threshold

        return baseline_use_claude or threshold_use_claude

