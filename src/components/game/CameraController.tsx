"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import { useGame } from "@/game/state/gameState";
import { playerState } from "@/game/state/playerState";
import { cameraDirector } from "@/game/systems/cameraDirector";
import { damp, clamp } from "@/lib/math";

const BASE_VFOV = 52;
const TAN_HALF_BASE = Math.tan((BASE_VFOV * Math.PI) / 180 / 2);

/**
 * On a portrait / narrow viewport the horizontal field of view collapses,
 * which pushes scripted subjects (the dance, cutscenes) off-screen. We
 * widen the *vertical* fov to hold roughly the same horizontal framing as
 * a landscape screen, capped so it never goes fisheye.
 */
function baseFovForAspect(aspect: number) {
  if (!Number.isFinite(aspect) || aspect >= 1) return BASE_VFOV;
  const needed = (2 * Math.atan(TAN_HALF_BASE / aspect) * 180) / Math.PI;
  return clamp(needed, BASE_VFOV, 68);
}

export default function CameraController() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  useEffect(() => {
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

    // keep framing sane across aspect ratios + let scenes nudge fov
    const cam = camera as THREE.PerspectiveCamera;
    if (cam.isPerspectiveCamera) {
      const target = baseFovForAspect(size.width / size.height) + cameraDirector.fovBoost;
      const next = damp(cam.fov, target, 6, dt);
      if (Math.abs(next - cam.fov) > 0.01) {
        cam.fov = next;
        cam.updateProjectionMatrix();
      }
    }
  });

  return null;
}
