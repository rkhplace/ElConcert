"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useGame } from "@/game/state/gameState";
import { InputManager } from "@/game/input/InputManager";
import { AudioManager } from "@/game/audio/AudioManager";

export default function InteractionButton({ touch }: { touch: boolean }) {
  const prompt = useGame((s) => s.prompt);
  const fireInteract = useGame((s) => s.fireInteract);

  const onTap = () => {
    AudioManager.blip("confirm");
    InputManager.queueInteract();
    fireInteract();
  };

  return (
    <AnimatePresence>
      {prompt && (
        <motion.div
          key="interact"
          className="safe-bottom safe-right pointer-events-none fixed bottom-0 right-0 z-30 flex flex-col items-end gap-3 p-6 pb-10"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center gap-3 rounded-full border border-white/15 bg-black/30 px-4 py-2 backdrop-blur-sm">
            {!touch && (
              <kbd className="rounded border border-white/30 px-1.5 py-0.5 text-[11px] font-medium text-white/80">
                E
              </kbd>
            )}
            <span className="text-sm font-light tracking-wide text-white/85">{prompt.label}</span>
          </div>

          {touch && (
            <button
              onClick={onTap}
              className="pointer-events-auto relative flex h-20 w-20 items-center justify-center rounded-full border border-white/40 bg-white/10 text-xs uppercase tracking-[0.25em] text-white/90 backdrop-blur active:scale-95"
            >
              <span
                className="absolute inset-0 rounded-full border border-white/40"
                style={{ animation: "pulse-ring 1.8s ease-out infinite" }}
              />
              tap
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
