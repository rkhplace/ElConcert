"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useGame } from "@/game/state/gameState";
import { InputManager } from "@/game/input/InputManager";
import { AudioManager } from "@/game/audio/AudioManager";

export default function InteractionButton({ touch }: { touch: boolean }) {
  const prompt = useGame((s) => s.prompt);
  const fireInteract = useGame((s) => s.fireInteract);

  const onTap = () => {
    try {
      navigator.vibrate?.(14);
    } catch {
      /* not supported */
    }
    AudioManager.blip("confirm");
    InputManager.queueInteract();
    fireInteract();
  };

  return (
    <AnimatePresence>
      {prompt && (
        <motion.div
          key="interact"
          className="safe-bottom safe-right pointer-events-none fixed bottom-0 right-0 z-30 flex flex-col items-end gap-3 p-5 pb-8"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 14 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        >
          {!touch && (
            <div className="flex items-center gap-2.5 rounded-full border border-white/15 bg-black/35 px-4 py-2 backdrop-blur-sm">
              <kbd className="rounded border border-white/30 px-1.5 py-0.5 text-[11px] font-medium text-white/85">
                E
              </kbd>
              <span className="text-sm font-light tracking-wide text-white/85">{prompt.label}</span>
            </div>
          )}

          {touch && (
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                onTap();
              }}
              className="pointer-events-auto relative flex h-[88px] w-[88px] flex-col items-center justify-center rounded-full border-2 border-white/45 bg-white/10 backdrop-blur-md transition-transform active:scale-90"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <span
                className="absolute inset-0 rounded-full border-2 border-white/45"
                style={{ animation: "pulse-ring 1.8s ease-out infinite" }}
              />
              <span className="max-w-[76px] text-center text-[12px] font-medium uppercase leading-tight tracking-wide text-white">
                {prompt.label}
              </span>
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
