"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { InputManager } from "@/game/input/InputManager";

const MAX_RADIUS = 62; // px travel of the thumb
const BASE = 148; // px diameter of the ring
const THUMB = 66;

function buzz(ms: number) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* not supported */
  }
}

/**
 * Analog joystick for touch. A visible resting ring sits in the corner so
 * it reads as a control; on touch the ring re-centres under the thumb
 * (anywhere in the control zone) and emits a normalised, y-up vector.
 */
export default function VirtualJoystick() {
  const zoneRef = useRef<HTMLDivElement>(null);
  const pointerId = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const [basePos, setBasePos] = useState({ x: 0, y: 0 });
  const [thumb, setThumb] = useState({ x: 0, y: 0 });
  const [mag, setMag] = useState(0);

  const move = useCallback((cx: number, cy: number) => {
    let dx = cx - origin.current.x;
    let dy = cy - origin.current.y;
    const dist = Math.hypot(dx, dy);
    if (dist > MAX_RADIUS) {
      dx = (dx / dist) * MAX_RADIUS;
      dy = (dy / dist) * MAX_RADIUS;
    }
    setThumb({ x: dx, y: dy });
    setMag(Math.min(1, dist / MAX_RADIUS));
    InputManager.setJoystick(dx / MAX_RADIUS, -dy / MAX_RADIUS);
  }, []);

  const release = useCallback(() => {
    pointerId.current = null;
    setActive(false);
    setThumb({ x: 0, y: 0 });
    setMag(0);
    InputManager.releaseJoystick();
  }, []);

  useEffect(() => {
    const zone = zoneRef.current;
    if (!zone) return;

    const onDown = (e: PointerEvent) => {
      if (pointerId.current !== null) return;
      pointerId.current = e.pointerId;
      origin.current = { x: e.clientX, y: e.clientY };
      setBasePos({ x: e.clientX, y: e.clientY });
      setActive(true);
      setThumb({ x: 0, y: 0 });
      setMag(0);
      try {
        zone.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      buzz(8);
      e.preventDefault();
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerId.current) return;
      move(e.clientX, e.clientY);
      e.preventDefault();
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pointerId.current) return;
      release();
      e.preventDefault();
    };
    const stop = (e: Event) => e.preventDefault();

    zone.addEventListener("pointerdown", onDown, { passive: false });
    zone.addEventListener("pointermove", onMove, { passive: false });
    zone.addEventListener("pointerup", onUp, { passive: false });
    zone.addEventListener("pointercancel", onUp, { passive: false });
    zone.addEventListener("contextmenu", stop);
    return () => {
      zone.removeEventListener("pointerdown", onDown);
      zone.removeEventListener("pointermove", onMove);
      zone.removeEventListener("pointerup", onUp);
      zone.removeEventListener("pointercancel", onUp);
      zone.removeEventListener("contextmenu", stop);
    };
  }, [move, release]);

  const restX = 30 + BASE / 2;
  const restY = -(30 + BASE / 2); // measured from bottom via inset

  return (
    <div
      ref={zoneRef}
      className="safe-bottom safe-left fixed bottom-0 left-0 z-30 select-none touch-none"
      style={{ touchAction: "none", width: "min(52%, 440px)", height: "46%" }}
      aria-hidden
    >
      {/* resting control */}
      {!active && (
        <div
          className="pointer-events-none absolute rounded-full border-2 border-white/25 bg-white/[0.04] backdrop-blur-[2px]"
          style={{
            width: BASE,
            height: BASE,
            left: restX - BASE / 2,
            bottom: -restY - BASE / 2,
          }}
        >
          <div
            className="absolute left-1/2 top-1/2 rounded-full border border-white/30 bg-white/25"
            style={{ width: THUMB, height: THUMB, transform: "translate(-50%,-50%)" }}
          />
          <span className="absolute inset-x-0 -bottom-6 text-center text-[10px] uppercase tracking-[0.3em] text-white/45">
            move
          </span>
        </div>
      )}

      {/* active control, re-centred under the thumb */}
      {active && (
        <>
          <div
            className="pointer-events-none absolute rounded-full border-2 border-white/30 bg-white/[0.06] backdrop-blur-[2px]"
            style={{
              width: BASE,
              height: BASE,
              left: basePos.x - BASE / 2,
              top: basePos.y - BASE / 2,
            }}
          />
          <div
            className="pointer-events-none absolute rounded-full bg-white/80"
            style={{
              width: THUMB,
              height: THUMB,
              left: basePos.x - THUMB / 2 + thumb.x,
              top: basePos.y - THUMB / 2 + thumb.y,
              boxShadow: `0 0 ${12 + mag * 26}px rgba(255,255,255,${0.3 + mag * 0.4})`,
            }}
          />
        </>
      )}
    </div>
  );
}
