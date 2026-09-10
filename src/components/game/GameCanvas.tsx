"use client";

import { Suspense, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { beatClock } from "@/game/systems/beatClock";
import { useGame } from "@/game/state/gameState";
import SceneManager from "./SceneManager";
import Player from "./Player";
import CameraController from "./CameraController";
import { InteractionSystem } from "./zones";

function Systems() {
  const get = useThree((s) => s.get);
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as unknown as { __three: unknown }).__three = get;
    }
  }, [get]);
  useFrame(() => beatClock.update());
  return null;
}

export default function GameCanvas() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.8]}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.42,
      }}
      camera={{ fov: 52, near: 0.1, far: 1000, position: [0, 3, 8] }}
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color("#070a16"), 1);
      }}
    >
      <Suspense fallback={null}>
        <SceneManager />
      </Suspense>
      <Player />
      <CameraController />
      <InteractionSystem />
      <Systems />
    </Canvas>
  );
}
