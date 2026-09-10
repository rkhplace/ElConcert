"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { InputManager } from "@/game/input/InputManager";

const MAX_RADIUS = 56; // px travel of the thumb
const BASE_SIZE = 132;

/**
 * Analog joystick. Dynamic origin: the base spawns wherever the thumb
 * first lands inside the control zone, so it always feels reachable.
 * Emits a normalised vector (length 0..1, y-up) to the InputManager.
 */
export default function VirtualJoystick() {
  const zoneRef = useRef<HTMLDivElement>(null);
  const pointerId = useRef<number | null>(null);
  const base = useRef({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const [basePos, setBasePos] = useState({ x: 0, y: 0 });
  const [thumb, setThumb] = useState({ x: 0, y: 0 });

  const update = useCallback((clientX: number, clientY: number) => {
    let dx = clientX - base.current.x;
    let dy = clientY - base.current.y;
    const dist = Math.hypot(dx, dy);
    if (dist > MAX_RADIUS) {
      dx = (dx / dist) * MAX_RADIUS;
      dy = (dy / dist) * MAX_RADIUS;
    }
    setThumb({ x: dx, y: dy });
    // screen y is down-positive -> invert for "forward is up"
    InputManager.setJoystick(dx / MAX_RADIUS, -dy / MAX_RADIUS);
  }, []);

  const end = useCallback(() => {
    pointerId.current = null;
    setActive(false);
    setThumb({ x: 0, y: 0 });
    InputManager.releaseJoystick();
  }, []);

  useEffect(() => {
    const zone = zoneRef.current;
    if (!zone) return;

    const onDown = (e: PointerEvent) => {
      if (pointerId.current !== null) return;
      pointerId.current = e.pointerId;
      base.current = { x: e.clientX, y: e.clientY };
      setBasePos({ x: e.clientX, y: e.clientY });
      setActive(true);
      setThumb({ x: 0, y: 0 });
      zone.setPointerCapture(e.pointerId);
      e.preventDefault();
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerId.current) return;
      update(e.clientX, e.clientY);
      e.preventDefault();
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pointerId.current) return;
      end();
      e.preventDefault();
    };

    zone.addEventListener("pointerdown", onDown, { passive: false });
    zone.addEventListener("pointermove", onMove, { passive: false });
    zone.addEventListener("pointerup", onUp, { passive: false });
    zone.addEventListener("pointercancel", onUp, { passive: false });
    return () => {
      zone.removeEventListener("pointerdown", onDown);
      zone.removeEventListener("pointermove", onMove);
      zone.removeEventListener("pointerup", onUp);
      zone.removeEventListener("pointercancel", onUp);
    };
  }, [update, end]);

  return (
    <div
      ref={zoneRef}
      className="safe-bottom safe-left fixed bottom-0 left-0 z-30 h-[46%] w-[52%] max-w-[420px] touch-none"
      style={{ touchAction: "none" }}
      aria-hidden
    >
      {active && (
        <>
          <div
            className="pointer-events-none absolute rounded-full border border-white/25 bg-white/5 backdrop-blur-[1px]"
            style={{
              width: BASE_SIZE,
              height: BASE_SIZE,
              left: basePos.x - BASE_SIZE / 2,
              top: basePos.y - BASE_SIZE / 2,
            }}
          />
          <div
            className="pointer-events-none absolute rounded-full bg-white/70 shadow-[0_0_20px_rgba(255,255,255,0.35)]"
            style={{
              width: 54,
              height: 54,
              left: basePos.x - 27 + thumb.x,
              top: basePos.y - 27 + thumb.y,
            }}
          />
        </>
      )}
      {!active && (
        <div className="pointer-events-none absolute bottom-8 left-8 flex h-[132px] w-[132px] items-center justify-center rounded-full border border-white/15 opacity-40">
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/60">move</span>
        </div>
      )}
    </div>
  );
}
