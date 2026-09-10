"use client";

import { useGame } from "@/game/state/gameState";
import { AudioManager } from "@/game/audio/AudioManager";

/** Minimal always-on controls: mute + reduced motion. */
export default function TopBar() {
  const started = useGame((s) => s.started);
  const muted = useGame((s) => s.muted);
  const toggleMuted = useGame((s) => s.toggleMuted);
  const reducedMotion = useGame((s) => s.reducedMotion);
  const setReducedMotion = useGame((s) => s.setReducedMotion);

  if (!started) return null;

  return (
    <div className="safe-right fixed right-0 top-0 z-30 flex items-center gap-2 p-3 sm:p-4">
      <button
        onClick={() => setReducedMotion(!reducedMotion)}
        title="Reduced motion"
        className={`rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] backdrop-blur-sm transition-colors ${
          reducedMotion
            ? "border-white/50 bg-white/10 text-white/80"
            : "border-white/15 bg-black/25 text-white/45 hover:text-white/70"
        }`}
      >
        motion
      </button>
      <button
        onClick={() => {
          toggleMuted();
          AudioManager.setMuted(!muted);
        }}
        title="Mute"
        aria-label={muted ? "Unmute" : "Mute"}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/25 text-white/60 backdrop-blur-sm transition-colors hover:text-white/90"
      >
        {muted ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M11 5 6 9H2v6h4l5 4V5Z" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M11 5 6 9H2v6h4l5 4V5Z" />
            <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
          </svg>
        )}
      </button>
    </div>
  );
}
