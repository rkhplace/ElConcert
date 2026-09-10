"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useGame } from "@/game/state/gameState";

export default function CinematicText() {
  const cinematic = useGame((s) => s.cinematic);
  const clearCinematic = useGame((s) => s.clearCinematic);
  const reducedMotion = useGame((s) => s.reducedMotion);

  const [line, setLine] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];

    if (!cinematic) {
      setLine(null);
      return;
    }

    const pace = cinematic.pace ?? 2700;
    const gap = reducedMotion ? 120 : 420; // dark pause between lines
    let t = 0;

    cinematic.lines.forEach((text, i) => {
      const isLast = i === cinematic.lines.length - 1;
      timers.current.push(setTimeout(() => setLine(text), t));
      t += pace + (isLast ? 900 : 0);
      timers.current.push(setTimeout(() => setLine(null), t));
      t += gap;
    });

    timers.current.push(
      setTimeout(() => {
        cinematic.onDone?.();
        clearCinematic();
      }, t + 150),
    );

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [cinematic, clearCinematic, reducedMotion]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-8 pb-[16vh]">
      <AnimatePresence mode="wait">
        {line && (
          <motion.p
            key={line}
            initial={{ opacity: 0, y: reducedMotion ? 0 : 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: reducedMotion ? 0 : -6, filter: "blur(4px)" }}
            transition={{ duration: reducedMotion ? 0.15 : 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-lg text-center font-light leading-relaxed text-white/85"
            style={{ fontSize: "clamp(1.05rem, 2.4vw, 1.5rem)", textShadow: "0 2px 24px rgba(0,0,0,0.6)" }}
          >
            {line}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
