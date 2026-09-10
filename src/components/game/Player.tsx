"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import Character, { CharPose, CharacterHandle } from "./Character";
import { InputManager } from "@/game/input/InputManager";
import { playerState } from "@/game/state/playerState";
import { useGame } from "@/game/state/gameState";
import { worldBounds } from "@/game/systems/worldBounds";
import { AudioManager } from "@/game/audio/AudioManager";
import { clamp, dampAngle, damp, invLerp } from "@/lib/math";

const WALK_SPEED = 1.75;
const RUN_SPEED = 4.5;
const ACCEL = 12;
const DECEL = 10;

const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _prevPos = new THREE.Vector3();

function shortAngle(a: number, b: number) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export default function Player() {
  const group = useRef<THREE.Group>(null);
  const char = useRef<CharacterHandle>(null);
  const camera = useThree((s) => s.camera);
  const speed01 = useRef(0);
  const turnRate = useRef(0);
  const stepPhase = useRef(0);

  useFrame((_, delta) => {
    const dt = Math.min(delta || 0, 1 / 20);
    if (!Number.isFinite(dt) || dt <= 0) return; // skip degenerate frames
    const g = useGame.getState();
    const p = playerState;
    if (!group.current) return;

    // ---- cutscene: body driven externally ----
    if (p.frozen) {
      group.current.position.copy(p.position);
      group.current.rotation.y = dampAngle(group.current.rotation.y, p.rotationY, 12, dt);
      speed01.current = damp(speed01.current, 0, 8, dt);
      char.current?.setInput({
        pose: (g.playerAnim as CharPose) ?? "IDLE",
        speed01: speed01.current,
        turnRate: 0,
      });
      return;
    }

    // ---- unified input ----
    const move =
      g.inputLocked || !g.started ? { x: 0, y: 0, magnitude: 0 } : InputManager.getMovement();
    p.moveInput.set(move.x, move.y);
    p.moveMagnitude = move.magnitude;

    camera.getWorldDirection(_forward);
    _forward.y = 0;
    if (_forward.lengthSq() < 1e-4) _forward.set(0, 0, -1);
    _forward.normalize();
    // right = forward × up  → screen-right maps to world +X when looking down -Z
    _right.set(-_forward.z, 0, _forward.x);

    _dir.set(0, 0, 0).addScaledVector(_forward, move.y).addScaledVector(_right, move.x);
    const inputMag = clamp(_dir.length(), 0, 1);
    if (inputMag > 1e-4) _dir.normalize();

    const targetSpeed =
      move.magnitude < 0.02
        ? 0
        : move.magnitude <= 0.62
          ? (move.magnitude / 0.62) * WALK_SPEED
          : WALK_SPEED + ((move.magnitude - 0.62) / 0.38) * (RUN_SPEED - WALK_SPEED);

    const dvx = _dir.x * targetSpeed;
    const dvz = _dir.z * targetSpeed;
    const rate = targetSpeed > p.velocity.length() ? ACCEL : DECEL;
    p.velocity.x = damp(p.velocity.x, dvx, rate, dt);
    p.velocity.z = damp(p.velocity.z, dvz, rate, dt);

    _prevPos.copy(p.position);
    p.position.x += p.velocity.x * dt;
    p.position.z += p.velocity.z * dt;
    worldBounds.resolve(p.position, 0.34);
    p.speed = Math.hypot(p.position.x - _prevPos.x, p.position.z - _prevPos.z) / dt;
    if (!Number.isFinite(p.speed)) p.speed = 0;

    if (p.speed > 0.25 && inputMag > 0.05) {
      const targetRot = Math.atan2(p.velocity.x, p.velocity.z);
      const prev = p.rotationY;
      const lambda = 7 + (p.speed / RUN_SPEED) * 6;
      p.rotationY = dampAngle(p.rotationY, targetRot, lambda, dt);
      const rawTurn = clamp(shortAngle(prev, p.rotationY) / dt, -8, 8);
      turnRate.current = damp(turnRate.current, rawTurn, 8, dt);
    } else {
      turnRate.current = damp(turnRate.current, 0, 8, dt);
    }

    group.current.position.copy(p.position);
    group.current.rotation.y = p.rotationY;

    const s01 = clamp(invLerp(0.1, RUN_SPEED, p.speed), 0, 1);
    speed01.current = damp(speed01.current, s01, 10, dt);

    let pose: CharPose;
    if (g.playerAnim) pose = g.playerAnim as CharPose;
    else if (p.speed < 0.18) pose = "IDLE";
    else if (p.speed < WALK_SPEED * 0.82) pose = "WALK";
    else pose = "RUN";

    char.current?.setInput({
      pose,
      speed01: speed01.current,
      turnRate: turnRate.current,
    });

    if ((pose === "WALK" || pose === "RUN") && AudioManager.isStarted && !g.muted) {
      const freq = 1.6 + speed01.current * 2.2;
      stepPhase.current += dt * freq;
      if (stepPhase.current >= 1) {
        stepPhase.current -= 1;
        AudioManager.blip("soft");
      }
    }
  });

  return (
    <group ref={group}>
      <Character ref={char} variant="elvira" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.5, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.28} depthWrite={false} />
      </mesh>
    </group>
  );
}
