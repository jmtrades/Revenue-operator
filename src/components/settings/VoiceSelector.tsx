'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Play, Square, Check, Search, Filter, Volume2 } from 'lucide-react';
import { RECALL_VOICES, type RecallVoice } from '@/lib/constants/recall-voices';

export interface Voice {
  id: string;
  name: string;
  personality: string;
}

/** Map RecallVoice → simplified Voice for consumers that expect the old shape. */
export const VOICE_CONFIG: Voice[] = RECALL_VOICES.map((v) => ({
  id: v.id,
  name: v.name,
  personality: v.desc,
}));

const ACCENT_OPTIONS = ['All', 'American', 'British', 'Australian', 'Spanish', 'Canadian French', 'Indian English', 'Southern American'] as const;
const GENDER_OPTIONS = ['All', 'Female', 'Male', 'Neutral'] as const;
const TONE_OPTIONS = [
  'All', 'warm', 'professional', 'casual', 'friendly', 'calm',
  'energetic', 'authoritative', 'empathetic', 'confident', 'deep',
] as const;

interface VoiceSelectorProps {
  value?: string;
  onChange?: (voiceId: string) => void;
  planTier?: 'solo' | 'business' | 'scale' | 'enterprise';
}

export default function VoiceSelector({ value, onChange, planTier = 'enterprise' }: VoiceSelectorProps) {
  const [selectedVoice, setSelectedVoice] = useState<string>(value || RECALL_VOICES[0].id);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1.0);
  const [warmth, setWarmth] = useState(0.5);
  const [searchQuery, setSearchQuery] = useState('');
  const [accentFilter, setAccentFilter] = useState<string>('All');
  const [genderFilter, setGenderFilter] = useState<string>('All');
  const [toneFilter, setToneFilter] = useState<string>('All');
  const [showFilters, setShowFilters] = useState(false);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Voice limits per plan
  const voiceLimit = useMemo(() => {
    switch (planTier) {
      case 'solo': return 8;
      case 'business': return 16;
      case 'scale': return 30;
      case 'enterprise': return RECALL_VOICES.length;
      default: return RECALL_VOICES.length;
    }
  }, [planTier]);

  const filteredVoices = useMemo(() => {
    return RECALL_VOICES.filter((v) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !v.name.toLowerCase().includes(q) &&
          !v.desc.toLowerCase().includes(q) &&
          !v.accent.toLowerCase().includes(q) &&
          !v.tone.toLowerCase().includes(q) &&
          !v.bestFor.toLowerCase().includes(q)
        ) return false;
      }
      if (accentFilter !== 'All' && v.accent !== accentFilter) return false;
      if (genderFilter !== 'All' && v.gender !== genderFilter.toLowerCase()) return false;
      if (toneFilter !== 'All' && v.tone !== toneFilter) return false;
      return true;
    });
  }, [searchQuery, accentFilter, genderFilter, toneFilter]);

  const handleSelect = useCallback((voiceId: string) => {
    setSelectedVoice(voiceId);
    onChange?.(voiceId);
  }, [onChange]);

  const stopPlayback = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setPlayingVoice(null);
  }, []);

  const handlePlaySample = useCallback((voice: RecallVoice) => {
    if (playingVoice === voice.id) {
      stopPlayback();
      return;
    }

    stopPlayback();

    // Use browser TTS as preview (real voice server would be called in production via /api/agent/preview-voice)
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(
        `Hi there! Thanks for calling. My name is ${voice.name} and I'm here to help you today. How can I assist you?`
      );
      utterance.rate = speed;
      utterance.pitch = 0.8 + warmth * 0.4;
      utterance.onend = () => setPlayingVoice(null);
      utterance.onerror = () => setPlayingVoice(null);
      synthRef.current = utterance;
      window.speechSynthesis.speak(utterance);
      setPlayingVoice(voice.id);
    }
  }, [playingVoice, speed, warmth, stopPlayback]);

  useEffect(() => {
    return () => stopPlayback();
  }, [stopPlayback]);

  const getGenderBadgeColor = (gender: string) => {
    switch (gender) {
      case 'female': return 'bg-pink-100 text-pink-700';
      case 'male': return 'bg-blue-100 text-blue-700';
      case 'neutral': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getAccentFlag = (accent: string) => {
    switch (accent) {
      case 'American': return '🇺🇸';
      case 'British': return '🇬🇧';
      case 'Australian': return '🇦🇺';
      default: return '🌐';
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Search voices by name, tone, or use case..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 ${
              showFilters
                ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]'
                : 'bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]'
            }`}
          >
            <Filter size={14} />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)]">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Accent</label>
              <div className="flex gap-1.5">
                {ACCENT_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setAccentFilter(opt)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      accentFilter === opt
                        ? 'bg-[var(--accent-primary)] text-white'
                        : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Gender</label>
              <div className="flex gap-1.5">
                {GENDER_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setGenderFilter(opt)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      genderFilter === opt
                        ? 'bg-[var(--accent-primary)] text-white'
                        : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Tone</label>
              <div className="flex flex-wrap gap-1.5">
                {TONE_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setToneFilter(opt)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      toneFilter === opt
                        ? 'bg-[var(--accent-primary)] text-white'
                        : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    {opt === 'All' ? 'All' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Voice Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-secondary)]">
          <Volume2 size={14} className="inline mr-1.5" />
          {filteredVoices.length} voice{filteredVoices.length !== 1 ? 's' : ''} available
          {filteredVoices.length !== RECALL_VOICES.length && ` (of ${RECALL_VOICES.length} total)`}
        </p>
        {voiceLimit < RECALL_VOICES.length && (
          <p className="text-xs text-[var(--text-tertiary)]">
            {voiceLimit} voices on your plan · <a href="/pricing" className="text-[var(--accent-primary)] hover:underline">Upgrade for more</a>
          </p>
        )}
      </div>

      {/* Voice Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredVoices.map((voice, idx) => {
          const isLocked = idx >= voiceLimit;
          const isSelected = selectedVoice === voice.id;
          const isPlaying = playingVoice === voice.id;

          return (
            <button
              key={voice.id}
              onClick={() => !isLocked && handleSelect(voice.id)}
              disabled={isLocked}
              className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                isLocked
                  ? 'border-[var(--border-default)] opacity-50 cursor-not-allowed'
                  : isSelected
                    ? 'border-[var(--accent-primary)] bg-[var(--bg-surface)] shadow-sm'
                    : 'border-[var(--border-default)] bg-[var(--bg-card)] hover:border-[var(--accent-primary)] hover:shadow-sm'
              }`}
            >
              {/* Selected checkmark */}
              {isSelected && (
                <div className="absolute top-2 right-2 bg-[var(--accent-primary)] rounded-full p-1">
                  <Check size={12} className="text-white" />
                </div>
              )}

              {/* Voice info */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-semibold text-sm text-[var(--text-primary)]">
                    {getAccentFlag(voice.accent)} {voice.name}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{voice.description}</p>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${getGenderBadgeColor(voice.gender)}`}>
                  {voice.gender}
                </span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  {voice.tone}
                </span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {voice.accent}
                </span>
              </div>

              {/* Best for */}
              <p className="text-[11px] text-[var(--text-tertiary)] mb-3 line-clamp-1">{voice.bestFor}</p>

              {/* Play button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isLocked) handlePlaySample(voice);
                }}
                disabled={isLocked}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isPlaying
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-[var(--accent-primary)] hover:opacity-90 text-white'
                }`}
              >
                {isPlaying ? (
                  <><Square size={10} fill="currentColor" /> Stop</>
                ) : (
                  <><Play size={10} fill="currentColor" /> Preview</>
                )}
              </button>

              {isLocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-card)]/80 rounded-xl">
                  <span className="text-xs font-medium text-[var(--text-tertiary)]">Upgrade to unlock</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {filteredVoices.length === 0 && (
        <div className="text-center py-12 text-[var(--text-tertiary)]">
          <p className="text-sm">No voices match your filters.</p>
          <button
            onClick={() => { setSearchQuery(''); setAccentFilter('All'); setGenderFilter('All'); setToneFilter('All'); }}
            className="text-sm text-[var(--accent-primary)] hover:underline mt-2"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Voice tuning sliders */}
      <div className="grid grid-cols-2 gap-6 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)]">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-[var(--text-primary)]">Speed</label>
            <span className="text-sm text-[var(--text-tertiary)] tabular-nums">{speed.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="0.8"
            max="1.2"
            step="0.05"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="w-full h-2 bg-[var(--border-default)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)]"
          />
          <div className="flex justify-between text-[10px] text-[var(--text-tertiary)]">
            <span>Slower</span>
            <span>Faster</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-[var(--text-primary)]">Warmth</label>
            <span className="text-sm text-[var(--text-tertiary)] tabular-nums">{Math.round(warmth * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={warmth}
            onChange={(e) => setWarmth(parseFloat(e.target.value))}
            className="w-full h-2 bg-[var(--border-default)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)]"
          />
          <div className="flex justify-between text-[10px] text-[var(--text-tertiary)]">
            <span>Cool</span>
            <span>Warm</span>
          </div>
        </div>
      </div>
    </div>
  );
}
