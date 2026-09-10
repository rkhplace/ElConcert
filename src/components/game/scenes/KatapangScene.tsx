"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { useSceneEnv } from "@/hooks/useSceneEnv";
import { useGame } from "@/game/state/gameState";
import { resetPlayerTo, playerState } from "@/game/state/playerState";
import { worldBounds } from "@/game/systems/worldBounds";
import { cameraDirector } from "@/game/systems/cameraDirector";
import { AudioManager } from "@/game/audio/AudioManager";
import {
  say,
  wait,
  walkPlayerTo,
  facePlayer,
  moveCamera,
  releasePlayer,
  veil,
  lockInput,
  cameraMode,
} from "@/game/systems/sequence";
import { Ground, StreetLamp, LowBuilding, AmbientDust } from "@/components/game/props/Env";
import Motorcycle from "@/components/game/props/Motorcycle";
import { PromptZone } from "@/components/game/zones";

const BIKE: [number, number, number] = [2.6, 0, -2];

export default function KatapangScene() {
  useSceneEnv({ bg: "#070a16", fogColor: "#0a1024", fogDensity: 0.028 });
  const setState = useGame((s) => s.setState);
  const setObjective = useGame((s) => s.setObjective);
  const promptEnabled = useRef(false);
  const rode = useRef(false);

  useEffect(() => {
    resetPlayerTo(0, 4, Math.PI); // facing -Z, camera ends up at +Z
    worldBounds.set({ minX: -9, maxX: 9, minZ: -64, maxZ: 8 });
    cameraDirector.followDistance = 6.6;
    cameraDirector.followHeight = 3.4;
    cameraMode("follow");
    lockInput(true);
    setObjective("");

    let cancelled = false;
    (async () => {
      AudioManager.setMood("night", 3);
      await wait(0.8);
      if (cancelled) return;
      await say(["One night."], { pace: 2200 });
      if (cancelled) return;
      await say(["Let's take a little walk."], { pace: 2400 });
      if (cancelled) return;
      lockInput(false);
      setObjective("Take a walk");
      await wait(6);
      if (cancelled || rode.current) return;
      setObjective("Find the motorcycle");
      promptEnabled.current = true;
    })();

    return () => {
      cancelled = true;
      gsap.killTweensOf(playerState.position);
      gsap.killTweensOf(cameraDirector.pos);
      gsap.killTweensOf(cameraDirector.look);
      useGame.getState().setPrompt(null);
    };
  }, [setObjective]);

  const ride = async () => {
    if (rode.current) return;
    rode.current = true;
    promptEnabled.current = false;
    useGame.getState().setPrompt(null);
    useGame.getState().setFlag("motorcycleRidden", true);
    setObjective("");
    lockInput(true);
    playerState.frozen = true;

    await walkPlayerTo(BIKE[0] - 0.9, BIKE[2] + 0.1, { speed: 1.6 });
    await facePlayer(BIKE[0], BIKE[2], 0.4);
    useGame.getState().setPlayerAnim("INTERACT");
    cameraMode("cutscene");
    await moveCamera(
      { pos: [BIKE[0] + 3.5, 2.2, BIKE[2] + 4], look: [BIKE[0], 1, BIKE[2]] },
      1.6,
    );
    await wait(0.6);
    useGame.getState().setPlayerAnim(null);

    // sit on the bike, engine catches
    AudioManager.startEngine();
    AudioManager.setEngineRpm(0.2);
    playerState.position.set(BIKE[0], 0.0, BIKE[2]);
    await moveCamera({ pos: [BIKE[0] - 2, 1.6, BIKE[2] - 3], look: [BIKE[0], 1.1, BIKE[2] - 1] }, 1.4);
    AudioManager.setEngineRpm(0.55);
    await wait(0.5);
    await veil(1, 0.7);
    setState("JOURNEY");
  };

  return (
    <group>
      <Ground size={400} color="#151b30" />

      {/* road surface strip */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -20]}>
        <planeGeometry args={[7, 90]} />
        <meshStandardMaterial color="#1e2230" roughness={0.9} />
      </mesh>
      {Array.from({ length: 10 }, (_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 4 - i * 7]}>
          <planeGeometry args={[0.16, 2]} />
          <meshStandardMaterial color="#3a4056" emissive="#3a4056" emissiveIntensity={0.4} />
        </mesh>
      ))}

      <hemisphereLight args={["#44568c", "#0c1020", 1.05]} />
      <directionalLight position={[6, 12, 4]} intensity={0.75} color="#b6c6ec" castShadow />
      <ambientLight intensity={0.4} />
      {/* moonlit key from the other side so silhouettes read */}
      <directionalLight position={[-8, 9, -6]} intensity={0.35} color="#8aa0d8" />

      <StreetLamp position={[4.5, 0, 0]} light tone="#f7cf95" />
      <StreetLamp position={[-4.5, 0, -16]} light tone="#f7cf95" />
      <StreetLamp position={[4.5, 0, -32]} light tone="#f7cf95" />
      <StreetLamp position={[-4.5, 0, -48]} tone="#f7cf95" />

      {/* warm pool of light on the motorcycle so it's clearly there */}
      <pointLight position={[BIKE[0] + 0.4, 2.2, BIKE[2] + 0.6]} color="#ffdca6" intensity={16} distance={9} decay={2} />
      <pointLight position={[BIKE[0] - 1.2, 1, BIKE[2] - 0.8]} color="#9fb6f0" intensity={6} distance={7} decay={2} />

      <LowBuilding position={[-11, 0, -6]} size={[7, 8, 8]} seed={2} />
      <LowBuilding position={[12, 0, -14]} size={[8, 12, 7]} seed={5} />
      <LowBuilding position={[-12, 0, -26]} size={[6, 7, 9]} seed={9} />
      <LowBuilding position={[12, 0, -38]} size={[7, 9, 8]} seed={13} />
      <LowBuilding position={[-11, 0, -50]} size={[8, 10, 8]} seed={17} />

      {/* a few quiet details */}
      <mesh position={[-3.4, 0.4, -3]} castShadow>
        <boxGeometry args={[0.6, 0.8, 0.5]} />
        <meshStandardMaterial color="#1a2030" />
      </mesh>
      <mesh position={[3.6, 0.5, -22]} castShadow>
        <boxGeometry args={[0.4, 1, 0.4]} />
        <meshStandardMaterial color="#182032" />
      </mesh>

      <AmbientDust count={160} area={30} height={10} color="#7f97cf" />

      <group position={BIKE}>
        <Motorcycle headlight={false} />
      </group>

      <PromptZone
        x={BIKE[0]}
        z={BIKE[2]}
        radius={2.6}
        label="Ride"
        onInteract={ride}
        enabled={true}
      />
    </group>
  );
}
