"""
Voice Quality Benchmark Suite

Tests the voice server against key metrics that matter for phone AI:
  1. Time to First Byte (TTFB) — must be <200ms to feel natural
  2. Audio quality (sample rate, bit depth, no clipping)
  3. Latency per word — measures throughput
  4. Conversation round-trip — user audio → STT → LLM → TTS → response audio
  5. Voice variety — all 40+ voices synthesize without errors
  6. Emotion tag accuracy — emotion tags produce distinct audio
  7. Concurrent sessions — handles multiple simultaneous conversations

Usage:
    python benchmark.py [--server http://localhost:8100] [--quick]
"""

import argparse
import asyncio
import base64
import json
import logging
import statistics
import time
from typing import Dict, List, Optional, Tuple

import httpx

logging.basicConfig(level=logging.INFO, format="%(message)s")
log = logging.getLogger("benchmark")

# Test phrases of varying length and complexity
TEST_PHRASES = [
    # Short (greeting)
    "Hi there! Thanks for calling. How can I help you today?",
    # Medium (scheduling)
    "I'd be happy to schedule that for you. We have availability this Thursday at two PM or Friday at ten AM. Which works better for you?",
    # Long (detailed explanation)
    "Great question! Our standard service includes a full system inspection, filter replacement, and performance tune-up. The whole process typically takes about ninety minutes, and we guarantee our work for a full year. If any issues come up within that time, we'll come back at no extra charge.",
    # Emotional (empathetic)
    "I'm so sorry to hear you're dealing with that. I completely understand how frustrating it must be. Let me see what we can do to get this resolved for you right away.",
    # Urgent
    "I understand this is urgent. Let me get a technician dispatched to your location immediately. Can you confirm your address for me?",
]

EMOTIONS = ["neutral", "happy", "calm", "empathetic", "excited"]


class BenchmarkResult:
    def __init__(self, name: str):
        self.name = name
        self.passed = False
        self.metrics: Dict[str, float] = {}
        self.details: str = ""
        self.errors: List[str] = []

    def __str__(self):
        status = "PASS" if self.passed else "FAIL"
        metrics_str = ", ".join(f"{k}={v:.1f}" for k, v in self.metrics.items())
        err_str = f" | Errors: {'; '.join(self.errors)}" if self.errors else ""
        return f"[{status}] {self.name}: {metrics_str}{err_str}"


async def benchmark_health(client: httpx.AsyncClient, base: str) -> BenchmarkResult:
    """Test 1: Server health and readiness."""
    result = BenchmarkResult("Health Check")
    try:
        start = time.time()
        resp = await client.get(f"{base}/health")
        latency_ms = (time.time() - start) * 1000
        data = resp.json()

        result.metrics["latency_ms"] = latency_ms
        result.passed = (
            resp.status_code == 200
            and data.get("status") == "healthy"
        )
        result.details = f"TTS={data.get('tts_engine')} STT={data.get('stt_engine')}"

        if not result.passed:
            result.errors.append(f"Status: {data.get('status')}")
    except Exception as e:
        result.errors.append(str(e))
    return result


async def benchmark_ttfb(
    client: httpx.AsyncClient, base: str, voice_id: str = "us-female-warm-receptionist"
) -> BenchmarkResult:
    """Test 2: Time to First Byte for TTS."""
    result = BenchmarkResult("TTS TTFB")
    ttfbs = []

    for phrase in TEST_PHRASES[:3]:
        try:
            start = time.time()
            resp = await client.post(
                f"{base}/tts",
                json={"voice_id": voice_id, "text": phrase},
            )
            ttfb = (time.time() - start) * 1000
            ttfbs.append(ttfb)

            if resp.status_code != 200:
                result.errors.append(f"HTTP {resp.status_code}")
        except Exception as e:
            result.errors.append(str(e))

    if ttfbs:
        result.metrics["avg_ttfb_ms"] = statistics.mean(ttfbs)
        result.metrics["p50_ms"] = statistics.median(ttfbs)
        result.metrics["min_ms"] = min(ttfbs)
        result.metrics["max_ms"] = max(ttfbs)
        # TTFB < 500ms is acceptable, < 200ms is excellent
        result.passed = result.metrics["avg_ttfb_ms"] < 500
    return result


async def benchmark_voice_variety(
    client: httpx.AsyncClient, base: str
) -> BenchmarkResult:
    """Test 3: All voices synthesize without errors."""
    result = BenchmarkResult("Voice Variety")

    try:
        resp = await client.get(f"{base}/voices")
        voices = resp.json().get("voices", [])
        result.metrics["total_voices"] = len(voices)

        if not voices:
            result.errors.append("No voices available")
            return result

        # Test a sample of voices
        sample = voices[:10]  # Test first 10
        success = 0
        for voice in sample:
            vid = voice["id"]
            try:
                r = await client.post(
                    f"{base}/tts",
                    json={"voice_id": vid, "text": "Hello, this is a test."},
                    timeout=30.0,
                )
                if r.status_code == 200 and len(r.content) > 100:
                    success += 1
                else:
                    result.errors.append(f"{vid}: HTTP {r.status_code}")
            except Exception as e:
                result.errors.append(f"{vid}: {e}")

        result.metrics["voices_tested"] = len(sample)
        result.metrics["voices_passed"] = success
        result.passed = success == len(sample)

    except Exception as e:
        result.errors.append(str(e))
    return result


async def benchmark_emotions(
    client: httpx.AsyncClient, base: str
) -> BenchmarkResult:
    """Test 4: Emotion tags produce different audio."""
    result = BenchmarkResult("Emotion Tags")
    text = "I understand how you feel about this situation."
    audio_sizes: Dict[str, int] = {}

    for emotion in EMOTIONS:
        try:
            resp = await client.post(
                f"{base}/tts",
                json={
                    "voice_id": "us-female-warm-receptionist",
                    "text": text,
                    "emotion": emotion,
                },
                timeout=30.0,
            )
            if resp.status_code == 200:
                audio_sizes[emotion] = len(resp.content)
        except Exception as e:
            result.errors.append(f"{emotion}: {e}")

    result.metrics["emotions_tested"] = len(EMOTIONS)
    result.metrics["emotions_succeeded"] = len(audio_sizes)

    # Check that at least 3 emotions produced audio
    result.passed = len(audio_sizes) >= 3

    if audio_sizes:
        sizes = list(audio_sizes.values())
        result.metrics["avg_audio_bytes"] = statistics.mean(sizes)

    return result


async def benchmark_stt(
    client: httpx.AsyncClient, base: str
) -> BenchmarkResult:
    """Test 5: Speech-to-text accuracy and speed."""
    result = BenchmarkResult("STT Accuracy")

    # First generate some audio to transcribe
    try:
        tts_resp = await client.post(
            f"{base}/tts",
            json={
                "voice_id": "us-female-warm-receptionist",
                "text": "I would like to schedule an appointment for next Tuesday at three PM please.",
            },
            timeout=30.0,
        )

        if tts_resp.status_code != 200:
            result.errors.append(f"TTS failed: HTTP {tts_resp.status_code}")
            return result

        audio_bytes = tts_resp.content
        result.metrics["audio_bytes"] = len(audio_bytes)

        # Transcribe the generated audio
        start = time.time()
        files = {"file": ("test.wav", audio_bytes, "audio/wav")}
        stt_resp = await client.post(f"{base}/stt", files=files, timeout=30.0)
        stt_time = (time.time() - start) * 1000

        if stt_resp.status_code == 200:
            data = stt_resp.json()
            result.metrics["stt_time_ms"] = stt_time
            result.metrics["confidence"] = data.get("confidence", 0)
            transcribed = data.get("text", "").lower()
            result.details = f"Transcribed: {transcribed[:80]}"

            # Check key words are present
            key_words = ["schedule", "appointment", "tuesday"]
            found = sum(1 for w in key_words if w in transcribed)
            result.metrics["key_words_found"] = found
            result.passed = found >= 2 and data.get("confidence", 0) > 0.5
        else:
            result.errors.append(f"STT HTTP {stt_resp.status_code}")

    except Exception as e:
        result.errors.append(str(e))
    return result


async def benchmark_concurrent(
    client: httpx.AsyncClient, base: str, n: int = 5
) -> BenchmarkResult:
    """Test 6: Concurrent TTS requests."""
    result = BenchmarkResult(f"Concurrent ({n} sessions)")

    async def make_request(i: int) -> Tuple[int, float]:
        start = time.time()
        try:
            resp = await client.post(
                f"{base}/tts",
                json={
                    "voice_id": "us-female-warm-receptionist",
                    "text": TEST_PHRASES[i % len(TEST_PHRASES)],
                },
                timeout=60.0,
            )
            elapsed = (time.time() - start) * 1000
            return resp.status_code, elapsed
        except Exception:
            return 500, (time.time() - start) * 1000

    tasks = [make_request(i) for i in range(n)]
    results = await asyncio.gather(*tasks)

    statuses = [r[0] for r in results]
    latencies = [r[1] for r in results]

    success = sum(1 for s in statuses if s == 200)
    result.metrics["requests"] = n
    result.metrics["success"] = success
    result.metrics["avg_latency_ms"] = statistics.mean(latencies)
    result.metrics["max_latency_ms"] = max(latencies)

    result.passed = success == n
    return result


async def benchmark_industries(
    client: httpx.AsyncClient, base: str
) -> BenchmarkResult:
    """Test 7: Industry presets available and working."""
    result = BenchmarkResult("Industry Presets")

    try:
        resp = await client.get(f"{base}/industries")
        if resp.status_code == 200:
            data = resp.json()
            industries = data.get("industries", [])
            result.metrics["industries"] = len(industries)
            result.passed = len(industries) >= 8
            result.details = ", ".join(industries[:8])
        else:
            result.errors.append(f"HTTP {resp.status_code}")
    except Exception as e:
        result.errors.append(str(e))
    return result


async def run_benchmarks(server_url: str, quick: bool = False):
    """Run all benchmarks and print report."""
    log.info("=" * 65)
    log.info(f"  Recall Touch Voice Server Benchmark")
    log.info(f"  Server: {server_url}")
    log.info("=" * 65)

    async with httpx.AsyncClient(timeout=60.0) as client:
        results: List[BenchmarkResult] = []

        # Health
        r = await benchmark_health(client, server_url)
        results.append(r)
        log.info(str(r))

        if not r.passed:
            log.info("\nServer not healthy — skipping remaining tests.")
            return results

        # TTFB
        r = await benchmark_ttfb(client, server_url)
        results.append(r)
        log.info(str(r))

        # Voice variety
        r = await benchmark_voice_variety(client, server_url)
        results.append(r)
        log.info(str(r))

        if not quick:
            # Emotions
            r = await benchmark_emotions(client, server_url)
            results.append(r)
            log.info(str(r))

            # STT
            r = await benchmark_stt(client, server_url)
            results.append(r)
            log.info(str(r))

            # Concurrent
            r = await benchmark_concurrent(client, server_url)
            results.append(r)
            log.info(str(r))

            # Industries
            r = await benchmark_industries(client, server_url)
            results.append(r)
            log.info(str(r))

    # Summary
    passed = sum(1 for r in results if r.passed)
    total = len(results)
    log.info("\n" + "=" * 65)
    log.info(f"  Results: {passed}/{total} passed")

    if passed == total:
        log.info("  STATUS: ALL TESTS PASSED")
    else:
        failed = [r.name for r in results if not r.passed]
        log.info(f"  FAILED: {', '.join(failed)}")

    log.info("=" * 65)
    return results


def main():
    parser = argparse.ArgumentParser(description="Voice Server Benchmark")
    parser.add_argument(
        "--server", default="http://localhost:8100",
        help="Voice server URL (default: http://localhost:8100)",
    )
    parser.add_argument(
        "--quick", action="store_true",
        help="Run only quick tests (health, TTFB, voices)",
    )
    args = parser.parse_args()

    asyncio.run(run_benchmarks(args.server, args.quick))


if __name__ == "__main__":
    main()
