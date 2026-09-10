"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { useGame } from "@/game/state/gameState";
import { playerState } from "@/game/state/playerState";
import { cameraDirector } from "@/game/systems/cameraDirector";

export default function CameraController() {
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    // sensible starting pose so the first frame isn't jarring
    cameraDirector.frameFollow(playerState.position, playerState.rotationY);
    cameraDirector.snap(camera);
  }, [camera]);

  useFrame((_, delta) => {
    const dt = Math.min(delta || 0, 1 / 20);
    if (!Number.isFinite(dt) || dt <= 0) return;
    const { cameraMode, reducedMotion } = useGame.getState();

    if (cameraMode === "follow") {
      cameraDirector.frameFollow(playerState.position, playerState.rotationY);
    }
    cameraDirector.apply(camera, dt, reducedMotion);
  });

  return null;
}
