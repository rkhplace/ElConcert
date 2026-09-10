"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
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

const DURATION = 11.5;
const DISTANCE = 300;

/** simple hunched rider on the bike — cheaper and steadier than the full rig */
function Rider({ colors }: { colors: { top: string; hair: string; leg: string } }) {
  return (
    <group position={[0, 0.86, 0.34]}>
      <mesh castShadow position={[0, 0.16, -0.06]} rotation={[0.52, 0, 0]}>
        <boxGeometry args={[0.34, 0.46, 0.24]} />
        <meshStandardMaterial color={colors.top} flatShading roughness={0.85} />
      </mesh>
      {/* helmet-ish head */}
      <mesh castShadow position={[0, 0.42, -0.3]}>
        <boxGeometry args={[0.24, 0.26, 0.26]} />
        <meshStandardMaterial color="#171320" flatShading roughness={0.4} metalness={0.25} />
      </mesh>
      {/* hair streaming back */}
      <mesh castShadow position={[0, 0.32, -0.12]} rotation={[0.85, 0, 0]}>
        <boxGeometry args={[0.16, 0.4, 0.09]} />
        <meshStandardMaterial color={colors.hair} flatShading roughness={0.95} />
      </mesh>
      {/* arms to the bars */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} castShadow position={[0.19 * sx, 0.08, -0.34]} rotation={[1.05, 0, 0.16 * sx]}>
          <boxGeometry args={[0.1, 0.52, 0.1]} />
          <meshStandardMaterial color={colors.top} flatShading roughness={0.85} />
        </mesh>
      ))}
      {/* thighs along the tank */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} castShadow position={[0.13 * sx, -0.06, 0.14]} rotation={[-0.32, 0, 0]}>
          <boxGeometry args={[0.14, 0.13, 0.5]} />
          <meshStandardMaterial color={colors.leg} flatShading roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

export default function JourneyScene() {
  useSceneEnv({ bg: "#060912", fogColor: "#0b1428", fogDensity: 0.028 });
  const setState = useGame((s) => s.setState);
  const setObjective = useGame((s) => s.setObjective);
  const camera = useThree((s) => s.camera);
  const rig = useRef<THREE.Group>(null);
  const streaks = useRef<THREE.Group>(null);
  const t0 = useRef(0);
  const done = useRef(false);
  const baseFov = useRef(52);

  const lamps = useMemo(
    () =>
      Array.from({ length: 46 }, (_, i) => ({
        z: -i * 7 - 3,
        side: i % 2 === 0 ? 1 : -1,
        tone: i % 6 === 0 ? "#8fd0ff" : "#f2c27b",
      })),
    [],
  );
  const cityLights = useMemo(
    () =>
      Array.from({ length: 120 }, () => ({
        x: (Math.random() - 0.5) * 200,
        y: 1 + Math.random() * 26,
        z: -10 - Math.random() * 320,
        w: 0.35 + Math.random() * 1.7,
        tone: Math.random() > 0.72 ? "#9ab8ff" : "#ffd9a8",
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
    baseFov.current = (camera as THREE.PerspectiveCamera).fov ?? 52;
    cameraDirector.stiffness = 3.6;

    let cancelled = false;
    (async () => {
      AudioManager.setMood("road", 4);
      await veil(0, 0.9);
      await wait(2.4);
      if (cancelled) return;
      await say(["Katapang."], { pace: 1700 });
      if (cancelled) return;
      await wait(2.6);
      if (cancelled) return;
      await say(["Summarecon Bandung.", "A long way for one show."], { pace: 2300 });
    })();

    return () => {
      cancelled = true;
      const cam = camera as THREE.PerspectiveCamera;
      if (cam.isPerspectiveCamera) {
        cam.fov = baseFov.current;
        cam.updateProjectionMatrix();
      }
    };
  }, [setObjective, camera]);

  useFrame(() => {
    if (!rig.current) return;
    const elapsed = (performance.now() - t0.current) / 1000;
    const p = clamp(elapsed / DURATION, 0, 1);
    const eased =
      p < 0.12
        ? smoothstep(0, 0.12, p) * 0.08
        : p > 0.9
          ? 0.88 + smoothstep(0.9, 1, p) * 0.12
          : 0.08 + ((p - 0.12) / 0.78) * 0.8;
    const z = -eased * DISTANCE;

    // gentle lane weave + lean
    const weave = Math.sin(elapsed * 0.7) * 1.2 + Math.sin(elapsed * 0.31) * 0.5;
    rig.current.position.z = z;
    rig.current.position.x = weave;
    rig.current.rotation.z = -Math.cos(elapsed * 0.7) * 0.12;
    rig.current.rotation.y = weave * 0.03;

    // speed feel: 0 at ends, 1 mid-ride
    const speed = smoothstep(0, 0.18, p) * (1 - smoothstep(0.86, 1, p));

    const rpm = 0.45 + speed * 0.4 + Math.abs(Math.sin(elapsed * 1.3)) * 0.12;
    AudioManager.setEngineRpm(clamp(rpm, 0, 1));

    // chase camera — mostly low behind, slow drift to a 3/4 angle and back
    const angle = Math.sin(elapsed * 0.28) * 0.6;
    cameraDirector.pos.set(
      weave + Math.sin(angle) * 3.4,
      1.55 + Math.sin(elapsed * 0.9) * 0.22,
      z + 5.4 + Math.cos(angle) * 1.6,
    );
    cameraDirector.look.set(weave * 0.6, 1.05, z - 7);

    const cam = camera as THREE.PerspectiveCamera;
    if (cam.isPerspectiveCamera) {
      const targetFov = baseFov.current + speed * 12;
      cam.fov += (targetFov - cam.fov) * 0.08;
      cam.updateProjectionMatrix();
    }

    if (streaks.current) {
      streaks.current.position.z = z;
      streaks.current.children.forEach((c, i) => {
        const m = (c as THREE.Sprite).material as THREE.SpriteMaterial;
        m.opacity = speed * (0.1 + (i % 3) * 0.04);
        c.scale.y = 2 + speed * 6;
      });
    }

    if (p >= 1 && !done.current) {
      done.current = true;
      (async () => {
        await veil(1, 0.8);
        AudioManager.setEngineRpm(0.12);
        AudioManager.stopEngine();
        setState("ARRIVAL");
      })();
    }
  });

  return (
    <group>
      <Ground size={600} color="#080b16" />

      {/* road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -DISTANCE / 2]}>
        <planeGeometry args={[10, DISTANCE + 140]} />
        <meshStandardMaterial color="#0f121c" roughness={0.85} metalness={0.1} />
      </mesh>
      {Array.from({ length: 80 }, (_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 6 - i * 6]}>
          <planeGeometry args={[0.2, 2.6]} />
          <meshStandardMaterial color="#5a6180" emissive="#5a6180" emissiveIntensity={0.7} toneMapped={false} />
        </mesh>
      ))}
      {/* edge reflectors */}
      {Array.from({ length: 60 }).flatMap((_, i) =>
        [-4.6, 4.6].map((x) => (
          <mesh key={`${i}-${x}`} position={[x, 0.06, 4 - i * 8]}>
            <boxGeometry args={[0.08, 0.08, 0.08]} />
            <meshStandardMaterial
              color="#ffb060"
              emissive="#ffb060"
              emissiveIntensity={2}
              toneMapped={false}
            />
          </mesh>
        )),
      )}

      <hemisphereLight args={["#1e2c4e", "#04060c", 0.5]} />
      <ambientLight intensity={0.12} />

      {/* streetlamps streaming past */}
      {lamps.map((l, i) => (
        <group key={i} position={[5.6 * l.side, 0, l.z]}>
          <mesh position={[0, 3, 0]}>
            <cylinderGeometry args={[0.06, 0.08, 6, 5]} />
            <meshStandardMaterial color="#171b24" />
          </mesh>
          <mesh position={[-0.7 * l.side, 5.9, 0]}>
            <boxGeometry args={[0.34, 0.14, 0.34]} />
            <meshStandardMaterial color={l.tone} emissive={l.tone} emissiveIntensity={3.4} toneMapped={false} />
          </mesh>
          <sprite position={[-0.7 * l.side, 5.9, 0]} scale={[3.4, 3.4, 1]}>
            <spriteMaterial color={l.tone} transparent opacity={0.2} depthWrite={false} blending={THREE.AdditiveBlending} />
          </sprite>
        </group>
      ))}

      {/* distant city glow */}
      {cityLights.map((f, i) => (
        <sprite key={i} position={[f.x, f.y, f.z]} scale={[f.w, f.w, 1]}>
          <spriteMaterial color={f.tone} transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      ))}
      <LowBuilding position={[-32, 0, -110]} size={[16, 44, 16]} seed={31} />
      <LowBuilding position={[36, 0, -170]} size={[14, 56, 14]} seed={37} />
      <LowBuilding position={[-28, 0, -230]} size={[18, 48, 16]} seed={41} />
      <LowBuilding position={[30, 0, -285]} size={[16, 40, 16]} seed={43} />

      {/* the ride */}
      <group ref={rig} position={[0, 0, 0]}>
        <Motorcycle headlight taillight />
        <Rider colors={{ top: "#c9d7ff", hair: "#241c2b", leg: "#39457a" }} />
      </group>

      {/* speed streaks that follow the camera end of the rig */}
      <group ref={streaks} position={[0, 0, 0]}>
        {Array.from({ length: 10 }, (_, i) => (
          <sprite
            key={i}
            position={[(i - 4.5) * 0.9, 1 + (i % 3) * 0.6, 4.5]}
            scale={[0.05, 3, 1]}
          >
            <spriteMaterial color="#d8e6ff" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
          </sprite>
        ))}
      </group>
    </group>
  );
}
