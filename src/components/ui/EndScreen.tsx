"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useGame } from "@/game/state/gameState";
import { AudioManager } from "@/game/audio/AudioManager";
import { resetPlayerTo } from "@/game/state/playerState";
import { worldBounds } from "@/game/systems/worldBounds";

export default function EndScreen() {
  const state = useGame((s) => s.state);
  const restart = useGame((s) => s.restart);

  const show = state === "FINISHED";

  const playAgain = () => {
    AudioManager.blip("confirm");
    AudioManager.setMood("night", 2);
    AudioManager.stopEngine();
    AudioManager.stopCrowd();
    worldBounds.reset();
    resetPlayerTo(0, 0, 0);
    restart();
  };

  const exit = () => {
    AudioManager.blip("soft");
    AudioManager.setMuted(true);
    if (typeof window !== "undefined") {
      window.location.href = "about:blank";
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="end"
          className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/45 px-6 text-center backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.4 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 1 }}
            className="flex flex-col items-center gap-8"
          >
            <p className="max-w-md font-light leading-relaxed text-white/80" style={{ fontSize: "clamp(1rem, 2.4vw, 1.35rem)" }}>
              Next time, stay until the last song.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={playAgain}
                className="rounded-full border border-white/30 px-7 py-2.5 text-xs uppercase tracking-[0.3em] text-white/85 transition-colors hover:border-white/60 hover:bg-white/5"
              >
                Play again
              </button>
              <button
                onClick={exit}
                className="rounded-full border border-white/10 px-7 py-2.5 text-xs uppercase tracking-[0.3em] text-white/40 transition-colors hover:text-white/70"
              >
                Exit
              </button>
            </div>

            <p className="text-[10px] uppercase tracking-[0.35em] text-white/20">
              Made with a little bit of code
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
