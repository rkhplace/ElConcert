"use client";

import { useEffect, useState } from "react";
import { useGame } from "@/game/state/gameState";

/** Diegetic full-screen fade used to mask scene-root swaps. */
export default function Veil() {
  const veil = useGame((s) => s.veil);
  const [v, setV] = useState(0);

  // subscribe imperatively so GSAP tweens of `veil` show without churn
  useEffect(() => {
    const unsub = useGame.subscribe((s) => {
      setV(s.veil);
    });
    return unsub;
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[45] bg-black transition-opacity"
      style={{ opacity: Math.max(v, veil), transitionDuration: "80ms" }}
    />
  );
}
