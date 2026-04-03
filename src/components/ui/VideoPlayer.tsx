"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Maximize2, Minimize2, Volume2, VolumeX } from "lucide-react";

interface VideoPlayerProps {
  src?: string;
  poster?: string;
  title?: string;
  subtitle?: string;
  /** When no src provided, shows a cinematic placeholder */
  placeholder?: boolean;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  onPlay?: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VideoPlayer({
  src,
  poster,
  title,
  subtitle,
  placeholder = false,
  className = "",
  autoPlay = false,
  loop = true,
  onPlay,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setShowControls(true);
    if (playing) {
      hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [playing]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!hasInteracted) setHasInteracted(true);
    if (video.paused) {
      video.play();
      setPlaying(true);
      onPlay?.();
    } else {
      video.pause();
      setPlaying(true);
    }
    scheduleHide();
  }, [hasInteracted, onPlay, scheduleHide]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      setFullscreen(false);
    } else {
      await el.requestFullscreen();
      setFullscreen(true);
    }
  }, []);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const bar = progressRef.current;
    if (!video || !bar) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    video.currentTime = pct * video.duration;
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setProgress(video.duration ? (video.currentTime / video.duration) * 100 : 0);
    };
    const onLoaded = () => setDuration(video.duration);
    const onEnded = () => { setPlaying(false); setShowControls(true); };
    const onPause = () => { setPlaying(false); setShowControls(true); };
    const onPlaying = () => setPlaying(true);

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("ended", onEnded);
    video.addEventListener("pause", onPause);
    video.addEventListener("playing", onPlaying);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("playing", onPlaying);
    };
  }, []);

  useEffect(() => {
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, []);

  // Placeholder mode — cinematic "Coming Soon" with animated gradient
  if (placeholder || !src) {
    return (
      <div className={`relative overflow-hidden ${className}`} style={{ borderRadius: "var(--radius-xl)" }}>
        <div
          className="relative w-full overflow-hidden"
          style={{
            aspectRatio: "16/9",
            background: "linear-gradient(135deg, #0a0a0b 0%, #1a1a2e 40%, #16213e 70%, #0a0a0b 100%)",
            borderRadius: "var(--radius-xl)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* Animated grain overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              backgroundSize: "128px",
            }}
          />

          {/* Floating light orbs */}
          <div
            className="absolute top-1/4 left-1/3 w-64 h-64 rounded-full opacity-20 blur-3xl"
            style={{
              background: "radial-gradient(circle, rgba(37,99,235,0.4) 0%, transparent 70%)",
              animation: "subtle-float 6s ease-in-out infinite",
            }}
          />
          <div
            className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full opacity-15 blur-3xl"
            style={{
              background: "radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)",
              animation: "subtle-float 8s ease-in-out infinite reverse",
            }}
          />

          {/* Center play button */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
            <motion.button
              type="button"
              className="relative flex items-center justify-center w-20 h-20 rounded-full mb-6 cursor-pointer"
              style={{
                background: "rgba(255,255,255,0.1)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Play product demo"
            >
              <Play className="w-8 h-8 text-white ml-1" fill="white" />
              {/* Pulse ring */}
              <span
                className="absolute inset-0 rounded-full"
                style={{
                  border: "2px solid rgba(255,255,255,0.2)",
                  animation: "breathing 2s ease-in-out infinite",
                }}
              />
            </motion.button>

            {title && (
              <p className="text-white/90 text-lg font-semibold tracking-tight mb-1">{title}</p>
            )}
            {subtitle && (
              <p className="text-white/50 text-sm">{subtitle}</p>
            )}
          </div>

          {/* Bottom edge gradient */}
          <div
            className="absolute bottom-0 left-0 right-0 h-32"
            style={{
              background: "linear-gradient(to top, rgba(10,10,11,0.8) 0%, transparent 100%)",
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden group ${className}`}
      style={{ borderRadius: fullscreen ? 0 : "var(--radius-xl)" }}
      onMouseMove={scheduleHide}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      <div
        className="relative w-full overflow-hidden"
        style={{
          aspectRatio: fullscreen ? undefined : "16/9",
          height: fullscreen ? "100vh" : undefined,
          background: "#0a0a0b",
          borderRadius: fullscreen ? 0 : "var(--radius-xl)",
          border: fullscreen ? "none" : "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          autoPlay={autoPlay}
          loop={loop}
          muted={muted}
          playsInline
          className="w-full h-full object-cover"
          onClick={togglePlay}
          style={{ cursor: "pointer" }}
        />

        {/* Large center play (before first interaction) */}
        <AnimatePresence>
          {!hasInteracted && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center z-20"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.button
                type="button"
                onClick={togglePlay}
                className="flex items-center justify-center w-20 h-20 rounded-full cursor-pointer"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Play video"
              >
                <Play className="w-8 h-8 text-white ml-1" fill="white" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls overlay */}
        <AnimatePresence>
          {showControls && hasInteracted && (
            <motion.div
              className="absolute bottom-0 left-0 right-0 z-30 px-4 pb-3 pt-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)",
              }}
            >
              {/* Progress bar */}
              <div
                ref={progressRef}
                className="w-full h-1 rounded-full mb-3 cursor-pointer group/progress"
                style={{ background: "rgba(255,255,255,0.2)" }}
                onClick={handleProgressClick}
                role="slider"
                aria-label="Video progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress)}
                tabIndex={0}
              >
                <div
                  className="h-full rounded-full relative transition-all"
                  style={{
                    width: `${progress}%`,
                    background: "var(--accent-primary)",
                  }}
                >
                  <div
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity"
                    style={{ background: "white" }}
                  />
                </div>
              </div>

              {/* Control buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="text-white/90 hover:text-white transition-colors p-1"
                    aria-label={playing ? "Pause" : "Play"}
                  >
                    {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" fill="white" />}
                  </button>
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="text-white/90 hover:text-white transition-colors p-1"
                    aria-label={muted ? "Unmute" : "Mute"}
                  >
                    {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <span className="text-white/60 text-xs font-mono tabular-nums">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {title && (
                    <span className="text-white/50 text-xs mr-2 hidden sm:inline">{title}</span>
                  )}
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="text-white/90 hover:text-white transition-colors p-1"
                    aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
                  >
                    {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
