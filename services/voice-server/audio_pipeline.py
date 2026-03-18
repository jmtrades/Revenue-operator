"""
Production-grade audio post-processing pipeline for AI voice on telephone calls.

Optimized for natural-sounding voice transmission over PSTN networks with
telephony-specific processing: EQ shaping, dynamic range compression, comfort
noise generation, and codec optimization for mu-law/8kHz formats.
"""

import numpy as np
from scipy import signal
from dataclasses import dataclass
from typing import Optional, Tuple, List
import logging

logger = logging.getLogger(__name__)


@dataclass
class PipelineConfig:
    """Configuration for audio processing pipeline."""
    target_lufs: float = -14.0
    comfort_noise_db: float = -50.0
    enable_eq: bool = True
    enable_compression: bool = True
    enable_comfort_noise: bool = True
    enable_warmth: bool = True
    enable_de_essing: bool = True
    sentence_pause_ms: Tuple[int, int] = (30, 80)

    def __post_init__(self):
        """Validate configuration values."""
        if self.target_lufs > -6.0 or self.target_lufs < -30.0:
            raise ValueError(f"target_lufs {self.target_lufs} out of range [-30, -6]")
        if self.comfort_noise_db > -20.0 or self.comfort_noise_db < -80.0:
            raise ValueError(f"comfort_noise_db {self.comfort_noise_db} out of range [-80, -20]")
        if self.sentence_pause_ms[0] < 0 or self.sentence_pause_ms[1] < self.sentence_pause_ms[0]:
            raise ValueError(f"Invalid sentence_pause_ms range: {self.sentence_pause_ms}")


class AudioPipeline:
    """
    Production-grade telephony audio post-processing pipeline.

    Processes AI-generated voice for optimal quality on telephone systems.
    Handles EQ, compression, comfort noise, normalization, and codec optimization.
    """

    def __init__(self, config: Optional[PipelineConfig] = None):
        """
        Initialize audio pipeline.

        Args:
            config: PipelineConfig instance. Uses defaults if None.

        Raises:
            ValueError: If config values are invalid.
        """
        self.config = config or PipelineConfig()
        self._validate_config()
        logger.info(f"AudioPipeline initialized with config: {self.config}")

    def _validate_config(self) -> None:
        """Validate configuration object."""
        try:
            if not isinstance(self.config, PipelineConfig):
                raise TypeError(f"config must be PipelineConfig, got {type(self.config)}")
        except Exception as e:
            logger.error(f"Config validation failed: {e}")
            raise

    def process(self, audio_np: np.ndarray, sample_rate: int) -> np.ndarray:
        """
        Process audio through complete pipeline.

        Args:
            audio_np: Audio samples as numpy array (mono or stereo).
            sample_rate: Sample rate in Hz.

        Returns:
            Processed audio as numpy array.

        Raises:
            ValueError: If audio or sample_rate are invalid.
            RuntimeError: If processing fails.
        """
        try:
            # Validate inputs
            if not isinstance(audio_np, np.ndarray):
                raise ValueError(f"audio_np must be numpy array, got {type(audio_np)}")
            if audio_np.size == 0:
                raise ValueError("audio_np cannot be empty")
            if sample_rate <= 0:
                raise ValueError(f"sample_rate must be positive, got {sample_rate}")

            # Convert to mono if stereo
            if audio_np.ndim == 2:
                audio_np = np.mean(audio_np, axis=1)
            elif audio_np.ndim != 1:
                raise ValueError(f"audio_np must be 1D or 2D, got shape {audio_np.shape}")

            # Ensure float32
            if audio_np.dtype != np.float32:
                audio_np = audio_np.astype(np.float32)

            logger.debug(f"Processing audio: {audio_np.shape} @ {sample_rate}Hz")

            # Apply pipeline stages in order
            audio = audio_np.copy()

            if self.config.enable_eq:
                audio = self._apply_eq(audio, sample_rate)

            if self.config.enable_warmth:
                audio = self._apply_warmth(audio, sample_rate)

            if self.config.enable_de_essing:
                audio = self._apply_de_esser(audio, sample_rate)

            if self.config.enable_compression:
                audio = self._apply_compression(audio)

            if self.config.enable_comfort_noise:
                audio = self.add_comfort_noise(audio, sample_rate)

            # Final normalization
            audio = self._normalize_loudness(audio, sample_rate)
            audio = self._apply_peak_limiter(audio)

            # Ensure audio is in valid range
            audio = np.clip(audio, -1.0, 1.0)

            logger.debug(f"Processing complete. Output shape: {audio.shape}")
            return audio

        except Exception as e:
            logger.error(f"Audio processing failed: {e}", exc_info=True)
            raise RuntimeError(f"Audio processing pipeline failed: {e}") from e

    def process_for_twilio(self, audio_np: np.ndarray, sample_rate: int) -> bytes:
        """
        Process audio and encode for Twilio (mu-law, 8kHz).

        Args:
            audio_np: Audio samples as numpy array.
            sample_rate: Sample rate in Hz.

        Returns:
            Mu-law encoded bytes (8000 Hz).

        Raises:
            ValueError: If audio or sample_rate are invalid.
            RuntimeError: If processing or encoding fails.
        """
        try:
            # Process through main pipeline
            audio = self.process(audio_np, sample_rate)

            # Resample to 8kHz if needed
            if sample_rate != 8000:
                audio = self._resample(audio, sample_rate, 8000)

            # Apply pre-emphasis for mu-law
            audio = self._apply_pre_emphasis(audio, 8000)

            # Convert to mu-law (ITU-T G.711)
            mu_law_bytes = self._linear_to_mulaw(audio)

            logger.debug(f"Encoded for Twilio: {len(mu_law_bytes)} bytes @ 8kHz")
            return mu_law_bytes

        except Exception as e:
            logger.error(f"Twilio encoding failed: {e}", exc_info=True)
            raise RuntimeError(f"Twilio encoding failed: {e}") from e

    def add_comfort_noise(self, audio_np: np.ndarray, sample_rate: int) -> np.ndarray:
        """
        Add comfort noise during silence to eliminate dead air.

        Args:
            audio_np: Audio samples as numpy array.
            sample_rate: Sample rate in Hz.

        Returns:
            Audio with comfort noise added during silence.

        Raises:
            ValueError: If audio or sample_rate are invalid.
        """
        try:
            if audio_np.size == 0 or sample_rate <= 0:
                raise ValueError(f"Invalid input: audio size {audio_np.size}, sr {sample_rate}")

            # Detect silence using RMS energy
            frame_size = int(sample_rate * 0.02)  # 20ms frames
            if frame_size == 0:
                frame_size = 1

            silence_threshold = self._db_to_linear(self.config.comfort_noise_db + 30)
            audio = audio_np.copy()

            # Pad audio for frame processing
            frames_count = int(np.ceil(len(audio) / frame_size))
            padded_len = frames_count * frame_size
            padded_audio = np.pad(audio, (0, padded_len - len(audio)), mode='constant')

            # Reshape into frames
            frames = padded_audio[:frames_count * frame_size].reshape((frames_count, frame_size))

            # Calculate RMS for each frame
            rms_values = np.sqrt(np.mean(frames ** 2, axis=1))
            is_silence = rms_values < silence_threshold

            # Generate pink noise
            pink_noise = self._generate_pink_noise(padded_len, sample_rate)
            noise_level = self._db_to_linear(self.config.comfort_noise_db)
            pink_noise = pink_noise * noise_level

            # Apply noise to silence frames with smooth crossfading
            result = padded_audio.copy()
            crossfade_samples = int(sample_rate * 0.005)  # 5ms crossfade

            for i in range(frames_count):
                frame_start = i * frame_size
                frame_end = min((i + 1) * frame_size, padded_len)

                if is_silence[i]:
                    # Add comfort noise with crossfading at boundaries
                    if i > 0 and not is_silence[i - 1]:
                        # Fade in
                        fade_start = max(0, frame_start - crossfade_samples)
                        fade_end = min(frame_start + crossfade_samples, frame_end)
                        fade_len = fade_end - fade_start
                        if fade_len > 0:
                            fade_in = np.linspace(0, 1, fade_len)
                            result[fade_start:fade_end] = (
                                result[fade_start:fade_end] * (1 - fade_in) +
                                pink_noise[fade_start:fade_end] * fade_in
                            )
                        result[frame_start:fade_start] = pink_noise[frame_start:fade_start]
                    elif i < frames_count - 1 and not is_silence[i + 1]:
                        # Fade out at end
                        fade_start = max(frame_start, frame_end - crossfade_samples)
                        fade_end = frame_end
                        fade_len = fade_end - fade_start
                        if fade_len > 0:
                            fade_out = np.linspace(1, 0, fade_len)
                            result[fade_start:fade_end] = (
                                pink_noise[fade_start:fade_end] * fade_out +
                                result[fade_start:fade_end] * (1 - fade_out)
                            )
                        result[frame_start:fade_start] = pink_noise[frame_start:fade_start]
                    else:
                        # Pure comfort noise
                        result[frame_start:frame_end] = pink_noise[frame_start:frame_end]

            # Return to original length
            result = result[:len(audio_np)]
            logger.debug(f"Added comfort noise to {np.sum(is_silence)}/{frames_count} frames")
            return result

        except Exception as e:
            logger.error(f"Comfort noise generation failed: {e}", exc_info=True)
            raise ValueError(f"Comfort noise generation failed: {e}") from e

    def split_sentences(self, text: str) -> List[str]:
        """
        Split text into sentences for streaming processing.

        Args:
            text: Text to split.

        Returns:
            List of sentences.

        Raises:
            ValueError: If text is invalid.
        """
        try:
            if not isinstance(text, str):
                raise ValueError(f"text must be string, got {type(text)}")
            if not text.strip():
                raise ValueError("text cannot be empty or whitespace")

            # Simple sentence splitting on punctuation
            import re
            sentences = re.split(r'(?<=[.!?])\s+', text.strip())
            sentences = [s.strip() for s in sentences if s.strip()]

            if not sentences:
                sentences = [text.strip()]

            logger.debug(f"Split text into {len(sentences)} sentences")
            return sentences

        except Exception as e:
            logger.error(f"Sentence splitting failed: {e}", exc_info=True)
            raise ValueError(f"Sentence splitting failed: {e}") from e

    def crossfade_chunks(self, chunks: List[np.ndarray], crossfade_ms: int = 5) -> np.ndarray:
        """
        Crossfade audio chunks for seamless concatenation.

        Args:
            chunks: List of audio arrays to crossfade.
            crossfade_ms: Crossfade duration in milliseconds.

        Returns:
            Crossfaded audio array.

        Raises:
            ValueError: If chunks or crossfade_ms are invalid.
        """
        try:
            if not chunks or len(chunks) == 0:
                raise ValueError("chunks list cannot be empty")
            if not all(isinstance(c, np.ndarray) for c in chunks):
                raise ValueError("All chunks must be numpy arrays")
            if crossfade_ms < 0:
                raise ValueError(f"crossfade_ms must be non-negative, got {crossfade_ms}")

            if len(chunks) == 1:
                return chunks[0].copy()

            # Estimate sample rate from chunk length and assume reasonable duration
            # Default to 16kHz if we can't determine
            sample_rate = 16000
            crossfade_samples = max(1, int(sample_rate * crossfade_ms / 1000))

            result = chunks[0].copy()

            for i in range(1, len(chunks)):
                chunk = chunks[i].copy()
                overlap_len = min(crossfade_samples, len(result), len(chunk))

                if overlap_len > 1:
                    # Create crossfade
                    fade_out = np.linspace(1, 0, overlap_len)
                    fade_in = np.linspace(0, 1, overlap_len)

                    # Apply crossfade
                    result[-overlap_len:] = (
                        result[-overlap_len:] * fade_out +
                        chunk[:overlap_len] * fade_in
                    )
                    result = np.concatenate([result, chunk[overlap_len:]])
                else:
                    result = np.concatenate([result, chunk])

            logger.debug(f"Crossfaded {len(chunks)} chunks with {crossfade_ms}ms overlap")
            return result

        except Exception as e:
            logger.error(f"Chunk crossfading failed: {e}", exc_info=True)
            raise ValueError(f"Chunk crossfading failed: {e}") from e

    # =========================================================================
    # Private methods - DSP operations
    # =========================================================================

    def _apply_eq(self, audio: np.ndarray, sample_rate: int) -> np.ndarray:
        """Apply telephony EQ: high-pass, presence boost, rolloff."""
        try:
            audio = audio.copy()

            # High-pass filter at 80Hz (remove rumble)
            sos = signal.butter(3, 80, 'hp', fs=sample_rate, output='sos')
            audio = signal.sosfilt(sos, audio)

            # Presence boost at 2-4kHz (clarity and presence)
            # Using peaking filter
            f_center = 3000  # Hz
            Q = 0.7
            gain_db = 3.0
            audio = self._apply_peaking_filter(audio, sample_rate, f_center, Q, gain_db)

            # Gentle rolloff above 7kHz (phone bandwidth limit)
            sos = signal.butter(2, 7000, 'lp', fs=sample_rate, output='sos')
            audio = signal.sosfilt(sos, audio)

            logger.debug("Applied telephony EQ")
            return audio

        except Exception as e:
            logger.error(f"EQ application failed: {e}")
            raise

    def _apply_warmth(self, audio: np.ndarray, sample_rate: int) -> np.ndarray:
        """Apply subtle warmth enhancement via low-shelf filter."""
        try:
            # Low shelf boost at 200Hz +1dB
            f_center = 200  # Hz
            gain_db = 1.0
            Q = 0.707
            audio = self._apply_shelving_filter(
                audio, sample_rate, f_center, gain_db, Q, shelf_type='low'
            )
            logger.debug("Applied warmth enhancement")
            return audio

        except Exception as e:
            logger.error(f"Warmth enhancement failed: {e}")
            raise

    def _apply_de_esser(self, audio: np.ndarray, sample_rate: int) -> np.ndarray:
        """Reduce sibilance in 5-8kHz range."""
        try:
            # Multi-notch approach for de-essing
            audio = audio.copy()

            # Create bandpass filter to isolate sibilance range
            freq_center = 6500  # Hz
            bandwidth = 3000  # Hz
            Q = freq_center / bandwidth

            # Extract sibilance components
            sos_bp = signal.butter(
                3,
                [freq_center - bandwidth/2, freq_center + bandwidth/2],
                'bp',
                fs=sample_rate,
                output='sos'
            )
            sibilance = signal.sosfilt(sos_bp, audio)

            # Detect peaks in sibilance and apply gentle reduction
            sibilance_rms = np.sqrt(np.mean(sibilance ** 2))
            if sibilance_rms > 0.01:
                # Gentle compression on sibilance
                reduction_factor = 0.6
                sibilance = sibilance * reduction_factor

            # Mix back
            audio = audio - sibilance * 0.5

            logger.debug("Applied de-esser")
            return audio

        except Exception as e:
            logger.error(f"De-esser application failed: {e}")
            raise

    def _apply_compression(self, audio: np.ndarray) -> np.ndarray:
        """Apply dynamic range compression for consistent volume."""
        try:
            audio = audio.copy()

            # Compressor parameters
            threshold = self._db_to_linear(-20)  # -20dB
            ratio = 3.0
            attack_ms = 5
            release_ms = 50
            makeup_gain_db = 4.0  # To reach -14 LUFS

            # Use sample-by-sample compression (simple but effective)
            sample_rate = 16000  # Assume 16kHz for attack/release timing
            attack_samples = max(1, int(sample_rate * attack_ms / 1000))
            release_samples = max(1, int(sample_rate * release_ms / 1000))

            makeup_gain = self._db_to_linear(makeup_gain_db)

            # Envelope follower for level detection
            envelope = np.zeros_like(audio)
            envelope[0] = abs(audio[0])

            for i in range(1, len(audio)):
                input_level = abs(audio[i])

                if input_level > envelope[i - 1]:
                    # Attack phase
                    alpha = 1.0 / attack_samples
                else:
                    # Release phase
                    alpha = 1.0 / release_samples

                envelope[i] = alpha * input_level + (1 - alpha) * envelope[i - 1]

            # Calculate gain reduction
            gain_reduction = np.ones_like(audio)
            mask = envelope > threshold
            gain_reduction[mask] = (
                threshold + (envelope[mask] - threshold) / ratio
            ) / (envelope[mask] + 1e-10)

            # Apply compression and makeup gain
            audio = audio * gain_reduction * makeup_gain

            logger.debug("Applied dynamic range compression")
            return audio

        except Exception as e:
            logger.error(f"Compression application failed: {e}")
            raise

    def _normalize_loudness(self, audio: np.ndarray, sample_rate: int) -> np.ndarray:
        """Normalize loudness to target LUFS using RMS-based approximation."""
        try:
            audio = audio.copy()

            # Calculate RMS (approximation of loudness)
            rms = np.sqrt(np.mean(audio ** 2))
            if rms < 1e-10:
                logger.warning("Audio RMS too low, skipping loudness normalization")
                return audio

            # Target LUFS (we approximate with RMS level)
            target_linear = self._db_to_linear(self.config.target_lufs)

            # Calculate gain needed
            current_db = self._linear_to_db(rms)
            target_db = self.config.target_lufs
            gain_db = target_db - current_db

            # Limit gain adjustment to prevent excessive amplification
            gain_db = np.clip(gain_db, -12, 12)
            gain_linear = self._db_to_linear(gain_db)

            audio = audio * gain_linear

            logger.debug(f"Normalized loudness: {current_db:.1f}dB -> {target_db:.1f}dB")
            return audio

        except Exception as e:
            logger.error(f"Loudness normalization failed: {e}")
            raise

    def _apply_peak_limiter(self, audio: np.ndarray) -> np.ndarray:
        """Apply true peak limiter at -0.5dBFS to prevent clipping."""
        try:
            audio = audio.copy()
            peak_threshold = self._db_to_linear(-0.5)

            # Simple limiting: any sample above threshold is reduced
            mask = np.abs(audio) > peak_threshold
            if np.any(mask):
                audio[mask] = np.sign(audio[mask]) * peak_threshold

            logger.debug(f"Applied peak limiter at -0.5dBFS")
            return audio

        except Exception as e:
            logger.error(f"Peak limiter application failed: {e}")
            raise

    def _apply_pre_emphasis(self, audio: np.ndarray, sample_rate: int) -> np.ndarray:
        """Apply pre-emphasis filter for mu-law encoding optimization."""
        try:
            # Standard pre-emphasis filter for speech
            # Emphasizes higher frequencies to compensate for mu-law
            alpha = 0.97
            result = np.zeros_like(audio)
            result[0] = audio[0]

            for i in range(1, len(audio)):
                result[i] = audio[i] - alpha * audio[i - 1]

            logger.debug("Applied pre-emphasis filter")
            return result

        except Exception as e:
            logger.error(f"Pre-emphasis application failed: {e}")
            raise

    def _resample(self, audio: np.ndarray, sr_from: int, sr_to: int) -> np.ndarray:
        """Resample audio with anti-aliasing."""
        try:
            if sr_from == sr_to:
                return audio.copy()

            if sr_to > sr_from:
                # Upsampling - apply anti-aliasing lowpass
                nyquist_new = sr_to / 2
                cutoff = sr_from / 2
                normalized_cutoff = cutoff / nyquist_new
                normalized_cutoff = min(0.99, normalized_cutoff)

                sos = signal.butter(4, normalized_cutoff, 'lp', output='sos')
                audio = signal.sosfilt(sos, audio)

            # Resample
            num_samples = int(np.round(len(audio) * sr_to / sr_from))
            audio_resampled = signal.resample(audio, num_samples)

            if sr_to < sr_from:
                # Downsampling - apply anti-aliasing lowpass
                nyquist_old = sr_from / 2
                cutoff = sr_to / 2
                normalized_cutoff = (cutoff / nyquist_old) * 2
                normalized_cutoff = min(0.99, normalized_cutoff)

                sos = signal.butter(4, normalized_cutoff, 'lp', output='sos')
                audio_resampled = signal.sosfilt(sos, audio_resampled)

            logger.debug(f"Resampled {sr_from}Hz -> {sr_to}Hz ({len(audio)} -> {len(audio_resampled)} samples)")
            return audio_resampled.astype(np.float32)

        except Exception as e:
            logger.error(f"Resampling failed: {e}")
            raise

    def _generate_pink_noise(self, length: int, sample_rate: int) -> np.ndarray:
        """Generate pink noise using spectral filtering."""
        try:
            # Generate white noise
            white = np.random.randn(length)

            # Create 1/f filter (pink noise)
            # Simple method: cascade of lowpass filters
            # More sophisticated: FFT-based pink noise
            freqs = np.fft.rfftfreq(length, 1 / sample_rate)
            fft_white = np.fft.rfft(white)

            # 1/f spectrum
            with np.errstate(divide='ignore'):
                pink_spectrum = fft_white / np.sqrt(freqs + 1)
            pink_spectrum[0] = 0  # Remove DC

            pink_noise = np.fft.irfft(pink_spectrum, n=length)

            # Normalize
            rms = np.sqrt(np.mean(pink_noise ** 2))
            if rms > 0:
                pink_noise = pink_noise / rms

            return pink_noise.astype(np.float32)

        except Exception as e:
            logger.error(f"Pink noise generation failed: {e}")
            raise

    def _apply_peaking_filter(
        self,
        audio: np.ndarray,
        sample_rate: int,
        f_center: float,
        Q: float,
        gain_db: float
    ) -> np.ndarray:
        """Apply parametric peaking EQ filter."""
        try:
            A = 10 ** (gain_db / 40)
            w0 = 2 * np.pi * f_center / sample_rate
            alpha = np.sin(w0) / (2 * Q)

            b0 = 1 + alpha * A
            b1 = -2 * np.cos(w0)
            b2 = 1 - alpha * A
            a0 = 1 + alpha / A
            a1 = -2 * np.cos(w0)
            a2 = 1 - alpha / A

            b = np.array([b0 / a0, b1 / a0, b2 / a0])
            a = np.array([1, a1 / a0, a2 / a0])

            return signal.lfilter(b, a, audio)

        except Exception as e:
            logger.error(f"Peaking filter application failed: {e}")
            raise

    def _apply_shelving_filter(
        self,
        audio: np.ndarray,
        sample_rate: int,
        f_center: float,
        gain_db: float,
        Q: float,
        shelf_type: str = 'low'
    ) -> np.ndarray:
        """Apply shelving EQ filter (low or high shelf)."""
        try:
            A = 10 ** (gain_db / 40)
            w0 = 2 * np.pi * f_center / sample_rate
            alpha = np.sin(w0) / (2 * Q)

            if shelf_type.lower() == 'low':
                b0 = A * ((A + 1) - (A - 1) * np.cos(w0) + 2 * np.sqrt(A) * alpha)
                b1 = 2 * A * ((A - 1) - (A + 1) * np.cos(w0))
                b2 = A * ((A + 1) - (A - 1) * np.cos(w0) - 2 * np.sqrt(A) * alpha)
                a0 = (A + 1) + (A - 1) * np.cos(w0) + 2 * np.sqrt(A) * alpha
                a1 = -2 * ((A - 1) + (A + 1) * np.cos(w0))
                a2 = (A + 1) + (A - 1) * np.cos(w0) - 2 * np.sqrt(A) * alpha
            else:  # high shelf
                b0 = A * ((A + 1) + (A - 1) * np.cos(w0) + 2 * np.sqrt(A) * alpha)
                b1 = -2 * A * ((A - 1) + (A + 1) * np.cos(w0))
                b2 = A * ((A + 1) + (A - 1) * np.cos(w0) - 2 * np.sqrt(A) * alpha)
                a0 = (A + 1) - (A - 1) * np.cos(w0) + 2 * np.sqrt(A) * alpha
                a1 = 2 * ((A - 1) - (A + 1) * np.cos(w0))
                a2 = (A + 1) - (A - 1) * np.cos(w0) - 2 * np.sqrt(A) * alpha

            b = np.array([b0 / a0, b1 / a0, b2 / a0])
            a = np.array([1, a1 / a0, a2 / a0])

            return signal.lfilter(b, a, audio)

        except Exception as e:
            logger.error(f"Shelving filter application failed: {e}")
            raise

    def _linear_to_mulaw(self, audio: np.ndarray) -> bytes:
        """Convert linear PCM to mu-law encoding (ITU-T G.711)."""
        try:
            # Clamp to valid range
            audio = np.clip(audio, -1.0, 1.0)

            # Mu-law constant
            mu = 255.0

            # Mu-law companding transformation
            safe_abs = np.abs(audio) + 1e-10
            magnitude = np.log(1 + mu * safe_abs) / np.log(1 + mu)
            signal_compressed = np.sign(audio) * magnitude

            # Quantize to 8 bits
            quantized = (signal_compressed * 127).astype(np.int16)
            quantized = np.clip(quantized, -128, 127)

            # Convert to bytes
            mu_law_bytes = quantized.astype(np.uint8)

            return bytes(mu_law_bytes)

        except Exception as e:
            logger.error(f"Mu-law encoding failed: {e}")
            raise

    @staticmethod
    def _db_to_linear(db: float) -> float:
        """Convert dB to linear amplitude."""
        return 10 ** (db / 20.0)

    @staticmethod
    def _linear_to_db(linear: float) -> float:
        """Convert linear amplitude to dB."""
        if linear <= 0:
            return -np.inf
        return 20 * np.log10(linear)


# ============================================================================
# Module-level utility functions
# ============================================================================

def create_pipeline(config: Optional[PipelineConfig] = None) -> AudioPipeline:
    """
    Factory function to create audio pipeline.

    Args:
        config: Optional PipelineConfig instance.

    Returns:
        AudioPipeline instance.
    """
    return AudioPipeline(config)


def get_default_config() -> PipelineConfig:
    """Get default pipeline configuration."""
    return PipelineConfig()
