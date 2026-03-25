/**
 * Shadow Mode Integration for Voice Provider
 *
 * When enabled, runs both primary and shadow voice synthesis in parallel,
 * plays only the primary audio to the caller, and logs quality metrics
 * from both for comparison analysis.
 *
 * Enable via environment variable: VOICE_SHADOW_MODE=true
 */

const logger = {
  info: (...args: unknown[]) => console.error("[shadow-mode]", ...args),
  warn: (...args: unknown[]) => console.warn("[shadow-mode]", ...args),
  error: (...args: unknown[]) => console.error("[shadow-mode]", ...args),
  debug: (...args: unknown[]) => console.debug("[shadow-mode]", ...args),
};

export interface TTSResult {
  audio: ArrayBuffer
  duration_ms: number
  model: string
  latency_ms: number
  success: boolean
  error?: string
}

export interface ShadowModeComparison {
  timestamp: string
  primary_model: string
  shadow_model: string
  primary_latency_ms: number
  shadow_latency_ms: number
  latency_diff_ms: number
  primary_duration_ms: number
  shadow_duration_ms: number
  duration_match: boolean
  quality_indicator: 'excellent' | 'good' | 'fair' | 'poor'
}

export interface ShadowModeConfig {
  enabled: boolean
  primary_voice: string
  shadow_voice: string
  sample_rate: number
}

/**
 * Shadow Mode Manager - handles parallel synthesis and comparison
 */
export class ShadowModeManager {
  private config: ShadowModeConfig
  private comparisons: ShadowModeComparison[] = []

  constructor(config: Partial<ShadowModeConfig> = {}) {
    this.config = {
      enabled: process.env.VOICE_SHADOW_MODE === 'true',
      primary_voice: config.primary_voice || 'default',
      shadow_voice: config.shadow_voice || 'shadow-alt',
      sample_rate: config.sample_rate || 24000,
    }

    logger.debug('[ShadowMode] Initialized', {
      enabled: this.config.enabled,
      primary: this.config.primary_voice,
      shadow: this.config.shadow_voice,
    })
  }

  /**
   * Check if shadow mode is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled
  }

  /**
   * Synthesize audio with both primary and shadow voices in parallel
   *
   * @param text - Text to synthesize
   * @param synthesizer - Async function that synthesizes audio
   * @returns Promise resolving to primary result and shadow result
   */
  async synthesizeBoth(
    text: string,
    synthesizer: (voice: string, text: string) => Promise<TTSResult>,
  ): Promise<[TTSResult, TTSResult]> {
    if (!this.config.enabled) {
      throw new Error('Shadow mode is disabled')
    }

    const startTime = performance.now()

    try {
      // Run both syntheses in parallel
      const [primaryResult, shadowResult] = await Promise.all([
        synthesizer(this.config.primary_voice, text),
        synthesizer(this.config.shadow_voice, text),
      ])

      const elapsed = performance.now() - startTime

      // Log comparison metrics
      this.recordComparison(primaryResult, shadowResult)

      logger.info('[ShadowMode] Synthesis complete', {
        primary_duration_ms: primaryResult.duration_ms,
        shadow_duration_ms: shadowResult.duration_ms,
        elapsed_ms: Math.round(elapsed),
        primary_latency_ms: primaryResult.latency_ms,
        shadow_latency_ms: shadowResult.latency_ms,
      })

      return [primaryResult, shadowResult]
    } catch (error) {
      logger.error('[ShadowMode] Synthesis failed', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Play primary audio while logging shadow comparison
   *
   * @param primaryResult - Primary voice synthesis result
   * @param shadowResult - Shadow voice synthesis result
   * @param audioElement - HTML audio element or Web Audio API context
   */
  async playWithLogging(
    primaryResult: TTSResult,
    shadowResult: TTSResult,
    audioElement: HTMLAudioElement | AudioContext,
  ): Promise<void> {
    if (!primaryResult.success) {
      throw new Error('Primary voice synthesis failed, cannot play')
    }

    try {
      // Play primary audio to caller
      if (audioElement instanceof HTMLAudioElement) {
        await this.playToHTMLElement(primaryResult, audioElement)
      } else if (audioElement instanceof AudioContext) {
        await this.playToWebAudio(primaryResult, audioElement)
      }

      // Log quality metrics for shadow voice
      if (shadowResult.success) {
        logger.info('[ShadowMode] Shadow voice quality logged', {
          shadow_model: shadowResult.model,
          shadow_duration_ms: shadowResult.duration_ms,
          shadow_latency_ms: shadowResult.latency_ms,
        })
      } else {
        logger.warn('[ShadowMode] Shadow voice synthesis failed', {
          error: shadowResult.error,
        })
      }
    } catch (error) {
      logger.error('[ShadowMode] Playback failed', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Play audio to HTML audio element
   */
  private async playToHTMLElement(
    result: TTSResult,
    element: HTMLAudioElement,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const blob = new Blob([result.audio], { type: 'audio/wav' })
        const url = URL.createObjectURL(blob)

        element.src = url
        element.onended = () => {
          URL.revokeObjectURL(url)
          resolve()
        }
        element.onerror = (error) => {
          URL.revokeObjectURL(url)
          reject(error)
        }

        element.play().catch(reject)
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Play audio to Web Audio API context
   */
  private async playToWebAudio(
    result: TTSResult,
    context: AudioContext,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        context.decodeAudioData(
          result.audio.slice(0),
          (buffer) => {
            const source = context.createBufferSource()
            source.buffer = buffer
            source.connect(context.destination)

            source.onended = () => resolve()
            source.start(0)
          },
          (error) => reject(error),
        )
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Record and analyze comparison between primary and shadow results
   */
  private recordComparison(
    primary: TTSResult,
    shadow: TTSResult,
  ): ShadowModeComparison {
    const latencyDiff = Math.abs(
      primary.latency_ms - shadow.latency_ms,
    )
    const durationMatch = Math.abs(
      primary.duration_ms - shadow.duration_ms,
    ) < 50 // Consider match if within 50ms

    // Quality indicator based on latency and duration consistency
    let qualityIndicator: 'excellent' | 'good' | 'fair' | 'poor'
    if (latencyDiff < 20 && durationMatch) {
      qualityIndicator = 'excellent'
    } else if (latencyDiff < 50 && durationMatch) {
      qualityIndicator = 'good'
    } else if (latencyDiff < 100) {
      qualityIndicator = 'fair'
    } else {
      qualityIndicator = 'poor'
    }

    const comparison: ShadowModeComparison = {
      timestamp: new Date().toISOString(),
      primary_model: primary.model,
      shadow_model: shadow.model,
      primary_latency_ms: primary.latency_ms,
      shadow_latency_ms: shadow.latency_ms,
      latency_diff_ms: latencyDiff,
      primary_duration_ms: primary.duration_ms,
      shadow_duration_ms: shadow.duration_ms,
      duration_match: durationMatch,
      quality_indicator: qualityIndicator,
    }

    this.comparisons.push(comparison)

    // Keep only recent comparisons in memory
    if (this.comparisons.length > 1000) {
      this.comparisons = this.comparisons.slice(-500)
    }

    return comparison
  }

  /**
   * Get recent comparison metrics
   */
  getComparisons(limit: number = 50): ShadowModeComparison[] {
    return this.comparisons.slice(-limit)
  }

  /**
   * Get aggregated comparison statistics
   */
  getComparisonStats(): {
    total_comparisons: number
    avg_latency_diff_ms: number
    quality_distribution: Record<string, number>
    avg_primary_latency_ms: number
    avg_shadow_latency_ms: number
  } {
    if (this.comparisons.length === 0) {
      return {
        total_comparisons: 0,
        avg_latency_diff_ms: 0,
        quality_distribution: {},
        avg_primary_latency_ms: 0,
        avg_shadow_latency_ms: 0,
      }
    }

    const qualityDist: Record<string, number> = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
    }

    let totalLatencyDiff = 0
    let totalPrimaryLatency = 0
    let totalShadowLatency = 0

    for (const comp of this.comparisons) {
      totalLatencyDiff += comp.latency_diff_ms
      totalPrimaryLatency += comp.primary_latency_ms
      totalShadowLatency += comp.shadow_latency_ms
      qualityDist[comp.quality_indicator]++
    }

    return {
      total_comparisons: this.comparisons.length,
      avg_latency_diff_ms: Math.round(
        totalLatencyDiff / this.comparisons.length,
      ),
      quality_distribution: qualityDist,
      avg_primary_latency_ms: Math.round(
        totalPrimaryLatency / this.comparisons.length,
      ),
      avg_shadow_latency_ms: Math.round(
        totalShadowLatency / this.comparisons.length,
      ),
    }
  }

  /**
   * Export all comparison data for analysis
   */
  exportComparisons(): {
    config: ShadowModeConfig
    comparisons: ShadowModeComparison[]
    stats: ReturnType<ShadowModeManager['getComparisonStats']>
    exported_at: string
  } {
    return {
      config: this.config,
      comparisons: this.comparisons,
      stats: this.getComparisonStats(),
      exported_at: new Date().toISOString(),
    }
  }

  /**
   * Clear all recorded comparisons
   */
  clearComparisons(): void {
    this.comparisons = []
    logger.debug('[ShadowMode] Comparisons cleared')
  }

  /**
   * Update configuration
   */
  updateConfig(partial: Partial<ShadowModeConfig>): void {
    this.config = {
      ...this.config,
      ...partial,
    }
    logger.debug('[ShadowMode] Config updated', this.config)
  }
}

/**
 * Create or get global shadow mode manager instance
 */
let globalShadowModeManager: ShadowModeManager | null = null

export function getShadowModeManager(
  config?: Partial<ShadowModeConfig>,
): ShadowModeManager {
  if (!globalShadowModeManager) {
    globalShadowModeManager = new ShadowModeManager(config)
  }
  return globalShadowModeManager
}

/**
 * Provider wrapper for RecallVoiceProvider to integrate shadow mode
 */
export class ShadowModeRecallVoiceProvider {
  private shadowModeManager: ShadowModeManager
  private baseProvider: { synthesize(text: string, config: Record<string, unknown>): Promise<TTSResult> }

  constructor(baseProvider: { synthesize(text: string, config: Record<string, unknown>): Promise<TTSResult> }, shadowConfig?: Partial<ShadowModeConfig>) {
    this.baseProvider = baseProvider
    this.shadowModeManager = getShadowModeManager(shadowConfig)
  }

  /**
   * Synthesize with optional shadow mode
   */
  async synthesize(
    text: string,
    config: Record<string, unknown> = {},
  ): Promise<TTSResult> {
    if (!this.shadowModeManager.isEnabled()) {
      return this.baseProvider.synthesize(text, config)
    }

    try {
      // Synthesize with both voices
      const [primary, shadow] = await this.shadowModeManager.synthesizeBoth(
        text,
        async (voice: string, textContent: string) => {
          const voiceConfig = { ...config, voice_id: voice }
          return this.baseProvider.synthesize(textContent, voiceConfig)
        },
      )

      // Log shadow metrics without affecting user experience
      if (!shadow.success) {
        logger.warn('[ShadowMode] Shadow voice failed but primary succeeded')
      }

      // Return primary result to caller
      return primary
    } catch (error) {
      logger.error('[ShadowMode] Dual synthesis failed, falling back', {
        error: error instanceof Error ? error.message : String(error),
      })

      // Fallback to primary voice only
      return this.baseProvider.synthesize(text, config)
    }
  }

  /**
   * Get shadow mode statistics
   */
  getShadowModeStats() {
    return this.shadowModeManager.getComparisonStats()
  }

  /**
   * Export shadow mode data
   */
  exportShadowModeData() {
    return this.shadowModeManager.exportComparisons()
  }
}
