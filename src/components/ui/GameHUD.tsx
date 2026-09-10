"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useGame } from "@/game/state/gameState";

export default function GameHUD() {
  const objective = useGame((s) => s.objective);
  const started = useGame((s) => s.started);
  const cinematic = useGame((s) => s.cinematic);
  const state = useGame((s) => s.state);

  const show = started && objective && !cinematic && state !== "FINISHED";

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-20 flex justify-center p-5">
      <AnimatePresence mode="wait">
        {show && (
          <motion.div
            key={objective}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-2.5 rounded-full border border-white/10 bg-black/25 px-4 py-1.5 backdrop-blur-sm"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-white/60" style={{ animation: "drift 2s ease-in-out infinite alternate" }} />
            <span className="text-[13px] font-light tracking-wide text-white/70">{objective}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
