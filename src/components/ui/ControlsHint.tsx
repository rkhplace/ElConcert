"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useGame } from "@/game/state/gameState";

export default function ControlsHint({ touch }: { touch: boolean }) {
  const started = useGame((s) => s.started);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (!started) return;
    const t = setTimeout(() => setGone(true), 8500);
    return () => clearTimeout(t);
  }, [started]);

  return (
    <AnimatePresence>
      {started && !gone && (
        <motion.div
          key="hint"
          className="pointer-events-none fixed inset-x-0 bottom-8 z-20 flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
        >
          <div className="flex items-center gap-4 rounded-full border border-white/10 bg-black/25 px-5 py-2 text-[12px] font-light tracking-wide text-white/55 backdrop-blur-sm">
            {touch ? (
              <span>Left stick — move · button — interact</span>
            ) : (
              <>
                <span>
                  <kbd className="rounded border border-white/25 px-1">W</kbd>
                  <kbd className="rounded border border-white/25 px-1">A</kbd>
                  <kbd className="rounded border border-white/25 px-1">S</kbd>
                  <kbd className="rounded border border-white/25 px-1">D</kbd> move
                </span>
                <span className="text-white/25">|</span>
                <span>
                  <kbd className="rounded border border-white/25 px-1">E</kbd> interact
                </span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
