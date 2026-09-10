"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useGame } from "@/game/state/gameState";
import { InputManager } from "@/game/input/InputManager";
import { AudioManager } from "@/game/audio/AudioManager";
import LoadingScreen from "@/components/ui/LoadingScreen";
import GameHUD from "@/components/ui/GameHUD";
import CinematicText from "@/components/ui/CinematicText";
import VirtualJoystick from "@/components/ui/VirtualJoystick";
import InteractionButton from "@/components/ui/InteractionButton";
import ControlsHint from "@/components/ui/ControlsHint";
import TopBar from "@/components/ui/TopBar";
import DebugPanel from "@/components/ui/DebugPanel";
import EndScreen from "@/components/ui/EndScreen";
import Veil from "@/components/ui/Veil";
import RotateHint from "@/components/ui/RotateHint";

// the WebGL canvas is client-only
const GameCanvas = dynamic(() => import("@/components/game/GameCanvas"), {
  ssr: false,
});

export default function Experience() {
  const started = useGame((s) => s.started);
  const debug = useGame((s) => s.debug);
  const state = useGame((s) => s.state);
  const setDebug = useGame((s) => s.setDebug);
  const setReducedMotion = useGame((s) => s.setReducedMotion);
  const [touch, setTouch] = useState(false);
  const [idleCursor, setIdleCursor] = useState(false);

  useEffect(() => {
    // input capability
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    setTouch(coarse || hasTouch);

    // options via query string
    const params = new URLSearchParams(window.location.search);
    if (params.get("debug") === "true") {
      setDebug(true);
      const w = window as unknown as Record<string, unknown>;
      w.__game = useGame;
      w.__input = InputManager;
      w.__audio = AudioManager;
    }
    if (
      params.get("reducedMotion") === "true" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setReducedMotion(true);
    }
  }, [setDebug, setReducedMotion]);

  // hide the OS cursor during play; reveal it briefly on mouse movement
  useEffect(() => {
    if (!started || touch) {
      setIdleCursor(false);
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    const wake = () => {
      setIdleCursor(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIdleCursor(true), 2200);
    };
    wake();
    window.addEventListener("pointermove", wake);
    return () => {
      window.removeEventListener("pointermove", wake);
      clearTimeout(timer);
    };
  }, [started, touch]);

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-night-900 ${
        idleCursor && state !== "FINISHED" ? "cursor-none" : ""
      }`}
    >
      <GameCanvas />

      <GameHUD />
      <CinematicText />
      <TopBar />
      <ControlsHint touch={touch} />
      {started && (touch || debug) && <VirtualJoystick />}
      <InteractionButton touch={touch} />
      <EndScreen />
      <Veil />
      <RotateHint />
      <DebugPanel />
      <LoadingScreen />
    </div>
  );
}
