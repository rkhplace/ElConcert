"use client";

import { useEffect, useRef, useState } from "react";
import { useGame } from "@/game/state/gameState";
import { playerState } from "@/game/state/playerState";
import { InputManager } from "@/game/input/InputManager";

export default function DebugPanel() {
  const debug = useGame((s) => s.debug);
  const state = useGame((s) => s.state);
  const [, force] = useState(0);
  const fps = useRef(60);
  const last = useRef(performance.now());
  const frames = useRef(0);
  const acc = useRef(0);

  useEffect(() => {
    if (!debug) return;
    let raf = 0;
    const loop = () => {
      const now = performance.now();
      const dt = now - last.current;
      last.current = now;
      frames.current++;
      acc.current += dt;
      if (acc.current >= 250) {
        fps.current = Math.round((frames.current / acc.current) * 1000);
        frames.current = 0;
        acc.current = 0;
        force((n) => n + 1);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [debug]);

  if (!debug) return null;

  const p = playerState;
  const mv = InputManager.getMovement();
  const row = (k: string, v: string) => (
    <div className="flex justify-between gap-6">
      <span className="text-emerald-400/70">{k}</span>
      <span>{v}</span>
    </div>
  );

  return (
    <div className="fixed left-3 top-3 z-50 w-56 rounded-md border border-emerald-500/20 bg-black/70 p-3 font-mono text-[11px] leading-relaxed text-white/80 backdrop-blur-sm">
      {row("fps", String(fps.current))}
      {row("state", state)}
      {row("pos", `${p.position.x.toFixed(1)}, ${p.position.z.toFixed(1)}`)}
      {row("rotY", p.rotationY.toFixed(2))}
      {row("speed", p.speed.toFixed(2))}
      {row("input", `${mv.x.toFixed(2)}, ${mv.y.toFixed(2)}`)}
      {row("mag", mv.magnitude.toFixed(2))}
      {row("frozen", String(p.frozen))}
    </div>
  );
}
