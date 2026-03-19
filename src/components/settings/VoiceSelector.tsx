'use client';

import { useState } from 'react';
import { Play, Check, Unlock } from 'lucide-react';

export interface Voice {
  id: string;
  name: string;
  personality: string;
}

export const VOICE_CONFIG: Voice[] = [
  { id: 'rachel_pro', name: 'Rachel', personality: 'Pro' },
  { id: 'james_warm', name: 'James', personality: 'Warm' },
  { id: 'sofia_bright', name: 'Sofia', personality: 'Bright' },
  { id: 'marcus_calm', name: 'Marcus', personality: 'Calm' },
  { id: 'amy_friendly', name: 'Amy', personality: 'Friendly' },
  { id: 'david_authoritative', name: 'David', personality: 'Authoritative' },
];

export default function VoiceSelector() {
  const [selectedVoice, setSelectedVoice] = useState<string>('rachel_pro');
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1.0);
  const [warmth, setWarmth] = useState(0.5);

  const handlePlaySample = (voiceId: string) => {
    setIsPlaying(isPlaying === voiceId ? null : voiceId);
  };

  const handlePreviewGreeting = () => {
    setIsPlaying(selectedVoice);
  };

  return (
    <div className="space-y-8">
      {/* Voice Grid */}
      <div>
        <h3 className="text-sm font-semibold text-[#1A1A1A] mb-4">Select Your Voice</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {VOICE_CONFIG.map((voice) => (
            <button
              key={voice.id}
              onClick={() => setSelectedVoice(voice.id)}
              className={`relative p-4 rounded-lg border-2 transition-all duration-200 ${
                selectedVoice === voice.id
                  ? 'border-[#0D6E6E] bg-[#FAFAF8]'
                  : 'border-[#E5E5E0] bg-[#FAFAF8] hover:border-[#0D6E6E]'
              }`}
            >
              {/* Selected Checkmark */}
              {selectedVoice === voice.id && (
                <div className="absolute top-2 right-2 bg-[#0D6E6E] rounded-full p-1">
                  <Check size={16} className="text-[#FAFAF8]" />
                </div>
              )}

              {/* Voice Info */}
              <div className="text-left">
                <p className="font-semibold text-[#1A1A1A] text-base">{voice.name}</p>
                <p className="text-sm text-[#4A4A4A] mb-3">{voice.personality}</p>

                {/* Play Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlaySample(voice.id);
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded bg-[#0D6E6E] hover:bg-[#0a5454] text-[#FAFAF8] text-sm font-medium transition-colors"
                >
                  <Play size={14} fill="currentColor" />
                  {isPlaying === voice.id ? 'Playing...' : 'Play'}
                </button>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Preview with Greeting Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={handlePreviewGreeting}
          className="inline-flex items-center gap-2 px-4 py-2 rounded bg-[#0D6E6E] hover:bg-[#0a5454] text-[#FAFAF8] font-medium transition-colors"
        >
          <Play size={16} fill="currentColor" />
          Preview with your greeting
        </button>
      </div>

      {/* Speed Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-[#1A1A1A]">Speed</label>
          <span className="text-sm text-[#4A4A4A]">{speed.toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min="0.8"
          max="1.2"
          step="0.1"
          value={speed}
          onChange={(e) => setSpeed(parseFloat(e.target.value))}
          className="w-full h-2 bg-[#E5E5E0] rounded-lg appearance-none cursor-pointer accent-[#0D6E6E]"
        />
        <div className="flex justify-between text-xs text-[#4A4A4A]">
          <span>0.8x</span>
          <span>1.2x</span>
        </div>
      </div>

      {/* Warmth Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-[#1A1A1A]">Warmth</label>
          <span className="text-sm text-[#4A4A4A]">{Math.round(warmth * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={warmth}
          onChange={(e) => setWarmth(parseFloat(e.target.value))}
          className="w-full h-2 bg-[#E5E5E0] rounded-lg appearance-none cursor-pointer accent-[#0D6E6E]"
        />
        <div className="flex justify-between text-xs text-[#4A4A4A]">
          <span>Cool</span>
          <span>Warm</span>
        </div>
      </div>

      {/* Premium Upsell */}
      <div className="p-4 rounded-lg bg-[#FAFAF8] border border-[#E5E5E0]">
        <a
          href="#upgrade"
          className="inline-flex items-center gap-2 text-[#0D6E6E] hover:text-[#0a5454] font-medium transition-colors"
        >
          <Unlock size={16} />
          <span>Unlock 12+ additional voices for $29/mo →</span>
        </a>
      </div>
    </div>
  );
}
