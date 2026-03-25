"use client";

export function Waveform({ isPlaying }: { isPlaying: boolean }) {
  return (
    <div className="flex items-center gap-0.5 h-4 items-end" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`w-0.5 rounded-full bg-green-400 min-h-[4px] ${
            isPlaying ? "animate-waveform-bar" : "h-1"
          }`}
          style={
            isPlaying
              ? { animationDelay: `${i * 80}ms` }
              : undefined
          }
        />
      ))}
    </div>
  );
}
