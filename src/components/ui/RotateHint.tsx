"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function RotateHint() {
  const [portrait, setPortrait] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const check = () => {
      const isTouch = window.matchMedia("(pointer: coarse)").matches;
      setPortrait(isTouch && window.innerHeight > window.innerWidth);
    };
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  return (
    <AnimatePresence>
      {portrait && !dismissed && (
        <motion.button
          key="rotate"
          onClick={() => setDismissed(true)}
          className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-center gap-3 bg-black/60 px-5 py-3 text-[12px] font-light tracking-wide text-white/70 backdrop-blur-sm"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="4" y="2" width="10" height="18" rx="2" transform="rotate(12 9 11)" />
          </svg>
          Rotate your phone for the best experience — tap to dismiss
        </motion.button>
      )}
    </AnimatePresence>
  );
}
