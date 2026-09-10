"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useProgress } from "@react-three/drei";
import { useGame } from "@/game/state/gameState";
import { AudioManager } from "@/game/audio/AudioManager";
import { InputManager } from "@/game/input/InputManager";

export default function LoadingScreen() {
  const started = useGame((s) => s.started);
  const startExperience = useGame((s) => s.startExperience);
  const { progress, active } = useProgress();
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setMinTimePassed(true), 1400);
    return () => clearTimeout(t);
  }, []);

  // progress only ever moves forward, and finishes even if drei reports 0 items
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      setPct((cur) => {
        const target = active ? Math.min(progress, 96) : 100;
        if (cur >= target) return cur;
        // ~90 %/s so a no-asset load still resolves in ~1s
        return Math.min(target, cur + (dt / 1000) * 90);
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const fallback = setTimeout(() => setPct((c) => (c < 100 && !active ? 100 : c)), 2500);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(fallback);
    };
  }, [progress, active]);

  const ready = minTimePassed && pct >= 100;

  const begin = () => {
    AudioManager.start();
    InputManager.init();
    startExperience();
  };

  if (started) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="loading"
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-night-900 px-6 text-center"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* faint horizon glow */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#12203f] to-transparent opacity-70" />

        <motion.div
          className="relative z-10 flex flex-col items-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        >
          <p className="mb-2 text-xs uppercase tracking-[0.5em] text-white/40">An interactive night</p>
          <h1 className="mb-10 font-light tracking-tight text-white/90" style={{ fontSize: "clamp(2rem, 6vw, 3.4rem)" }}>
            The Last Song
          </h1>

          {!ready ? (
            <div className="flex flex-col items-center gap-4">
              <div className="h-[3px] w-56 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-white/70"
                  animate={{ width: `${pct}%` }}
                  transition={{ ease: "linear", duration: 0.1 }}
                />
              </div>
              <p className="text-sm font-light text-white/40">Preparing the night…</p>
            </div>
          ) : (
            <motion.div
              className="flex flex-col items-center gap-6"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <p className="text-lg font-light text-white/70">Ready?</p>
              <button
                onClick={begin}
                className="group relative rounded-full border border-white/25 px-9 py-3 text-sm uppercase tracking-[0.35em] text-white/85 transition-colors hover:border-white/60 hover:bg-white/5"
              >
                Start experience
                <span className="absolute -inset-px rounded-full border border-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
              <p className="max-w-xs text-xs font-light leading-relaxed text-white/30">
                Headphones help. Move with WASD or the on-screen stick. That&apos;s it.
              </p>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
