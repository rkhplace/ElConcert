"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSceneEnv } from "@/hooks/useSceneEnv";
import { useGame } from "@/game/state/gameState";
import { playerState } from "@/game/state/playerState";
import { cameraDirector } from "@/game/systems/cameraDirector";
import { AudioManager } from "@/game/audio/AudioManager";
import { say, wait, veil, cameraMode, lockInput } from "@/game/systems/sequence";
import { clamp, smoothstep } from "@/lib/math";
import Motorcycle from "@/components/game/props/Motorcycle";
import { Ground, LowBuilding } from "@/components/game/props/Env";

const DURATION = 13.5;
const DISTANCE = 320;

export default function JourneyScene() {
  useSceneEnv({ bg: "#060912", fogColor: "#0a1226", fogDensity: 0.03 });
  const setState = useGame((s) => s.setState);
  const setObjective = useGame((s) => s.setObjective);
  const rig = useRef<THREE.Group>(null);
  const t0 = useRef(0);
  const done = useRef(false);
  const cam = useRef({ side: 1 });

  const lamps = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        z: -i * 9 - 4,
        side: i % 2 === 0 ? 1 : -1,
        tone: i % 7 === 0 ? "#8fd0ff" : "#f0c27b",
      })),
    [],
  );
  const farLights = useMemo(
    () =>
      Array.from({ length: 90 }, () => ({
        x: (Math.random() - 0.5) * 160,
        y: 1 + Math.random() * 22,
        z: -20 - Math.random() * 320,
        w: 0.4 + Math.random() * 1.6,
        tone: Math.random() > 0.7 ? "#9ab8ff" : "#ffd9a8",
      })),
    [],
  );

  useEffect(() => {
    setObjective("");
    lockInput(true);
    cameraMode("cutscene");
    playerState.frozen = true;
    t0.current = performance.now();
    done.current = false;

    let cancelled = false;
    (async () => {
      AudioManager.setMood("road", 4);
      await veil(0, 0.9);
      await wait(3.5);
      if (cancelled) return;
      await say(["Katapang."], { pace: 1800 });
      if (cancelled) return;
      await wait(3.5);
      if (cancelled) return;
      await say(["Summarecon Bandung.", "A long way for one show."], { pace: 2400 });
    })();

    return () => {
      cancelled = true;
    };
  }, [setObjective]);

  useFrame(() => {
    if (!rig.current) return;
    const elapsed = (performance.now() - t0.current) / 1000;
    const p = clamp(elapsed / DURATION, 0, 1);
    // ease: pull away, long cruise, gentle arrival
    const eased =
      p < 0.15
        ? smoothstep(0, 0.15, p) * 0.1
        : p > 0.9
          ? 0.9 + smoothstep(0.9, 1, p) * 0.1
          : 0.1 + ((p - 0.15) / 0.75) * 0.8;
    const z = -eased * DISTANCE;
    rig.current.position.z = z;
    rig.current.position.x = Math.sin(elapsed * 0.6) * 1.4;
    rig.current.rotation.z = -Math.cos(elapsed * 0.6) * 0.08;
    rig.current.rotation.y = Math.sin(elapsed * 0.6) * 0.04;

    const rpm = 0.55 + Math.abs(Math.sin(elapsed * 0.6)) * 0.35 + smoothstep(0, 0.2, p) * 0.1;
    AudioManager.setEngineRpm(clamp(p > 0.92 ? 0.3 : rpm, 0, 1));

    // chase camera — swings between behind and side for cinema
    const swing = Math.sin(elapsed * 0.35);
    cameraDirector.pos.set(
      rig.current.position.x + swing * 4.5,
      1.7 + Math.sin(elapsed * 0.8) * 0.3,
      z + 6.2 + swing * 1.5,
    );
    cameraDirector.look.set(rig.current.position.x, 1.1, z - 6);
    cameraDirector.stiffness = 3.2;

    if (p >= 1 && !done.current) {
      done.current = true;
      (async () => {
        await veil(1, 0.8);
        AudioManager.setEngineRpm(0.15);
        AudioManager.stopEngine();
        setState("ARRIVAL");
      })();
    }
  });

  return (
    <group>
      <Ground size={600} color="#080b16" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -DISTANCE / 2]}>
        <planeGeometry args={[9, DISTANCE + 120]} />
        <meshStandardMaterial color="#10131d" roughness={0.9} />
      </mesh>
      {/* centre dashes */}
      {Array.from({ length: 70 }, (_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -i * 6]}>
          <planeGeometry args={[0.18, 2.4]} />
          <meshStandardMaterial color="#4a5170" emissive="#4a5170" emissiveIntensity={0.5} />
        </mesh>
      ))}

      <hemisphereLight args={["#1c2848", "#04060c", 0.45]} />
      <ambientLight intensity={0.1} />

      {/* streetlamps streaming past */}
      {lamps.map((l, i) => (
        <group key={i} position={[5.2 * l.side, 0, l.z]}>
          <mesh position={[0, 3, 0]}>
            <cylinderGeometry args={[0.06, 0.08, 6, 5]} />
            <meshStandardMaterial color="#171b24" />
          </mesh>
          <mesh position={[-0.6 * l.side, 5.8, 0]}>
            <boxGeometry args={[0.3, 0.14, 0.3]} />
            <meshStandardMaterial color={l.tone} emissive={l.tone} emissiveIntensity={3} toneMapped={false} />
          </mesh>
          <sprite position={[-0.6 * l.side, 5.8, 0]} scale={[3, 3, 1]}>
            <spriteMaterial color={l.tone} transparent opacity={0.18} depthWrite={false} blending={THREE.AdditiveBlending} />
          </sprite>
        </group>
      ))}

      {/* distant city glow */}
      {farLights.map((f, i) => (
        <sprite key={i} position={[f.x, f.y, f.z]} scale={[f.w, f.w, 1]}>
          <spriteMaterial color={f.tone} transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      ))}
      <LowBuilding position={[-30, 0, -120]} size={[16, 40, 16]} seed={31} />
      <LowBuilding position={[34, 0, -180]} size={[14, 52, 14]} seed={37} />
      <LowBuilding position={[-26, 0, -240]} size={[18, 46, 16]} seed={41} />

      {/* the ride */}
      <group ref={rig} position={[0, 0, 0]}>
        <Motorcycle headlight taillight />
        {/* speed lines near the rider */}
        {Array.from({ length: 6 }, (_, i) => (
          <sprite key={i} position={[(i - 2.5) * 0.5, 1 + (i % 2) * 0.4, 2]} scale={[0.06, 3.5, 1]}>
            <spriteMaterial color="#cfe0ff" transparent opacity={0.12} depthWrite={false} blending={THREE.AdditiveBlending} />
          </sprite>
        ))}
      </group>
    </group>
  );
}
