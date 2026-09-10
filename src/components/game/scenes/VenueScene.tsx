"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import { useSceneEnv } from "@/hooks/useSceneEnv";
import { useGame } from "@/game/state/gameState";
import { resetPlayerTo, playerState } from "@/game/state/playerState";
import { worldBounds } from "@/game/systems/worldBounds";
import { cameraDirector } from "@/game/systems/cameraDirector";
import { beatClock } from "@/game/systems/beatClock";
import { AudioManager } from "@/game/audio/AudioManager";
import {
  say,
  wait,
  walkPlayerTo,
  facePlayer,
  moveCamera,
  releasePlayer,
  veil,
  shake,
  lockInput,
  cameraMode,
} from "@/game/systems/sequence";
import { clamp, damp } from "@/lib/math";
import { Ground, StreetLamp, LowBuilding, SignBoard, AmbientDust } from "@/components/game/props/Env";
import Crowd from "@/components/game/Crowd";
import ConcertStage from "@/components/game/ConcertStage";
import Friend, { FriendHandle } from "@/components/game/Friend";
import { ProximityTrigger, ZGate } from "@/components/game/zones";

const STAGE_Z = -94;
const FRIEND_POS: [number, number, number] = [2.4, 0, -74];

export default function VenueScene() {
  useSceneEnv({ bg: "#0a0e1e", fogColor: "#111a34", fogDensity: 0.02 });
  const state = useGame((s) => s.state);
  const setState = useGame((s) => s.setState);
  const setObjective = useGame((s) => s.setObjective);

  const friend = useRef<FriendHandle>(null);
  const collapse = useRef({ v: 0 });
  const stageLevel = useRef(1);
  const stageLevelTarget = useRef(1);
  const crowdEnergy = useRef(0.15);
  const crowdEnergyTarget = useRef(0.15);
  const incidentStarted = useRef(false);
  const [entered, setEntered] = useState(false);

  // ---- scene boot ----
  useEffect(() => {
    resetPlayerTo(0, 2, Math.PI);
    worldBounds.set({ minX: -30, maxX: 30, minZ: STAGE_Z + 6, maxZ: 8 });
    cameraDirector.followDistance = 6.2;
    cameraDirector.followHeight = 3.1;
    cameraDirector.stiffness = 4.5;
    cameraMode("follow");
    lockInput(true);
    setObjective("");

    let cancelled = false;
    (async () => {
      AudioManager.setMood("night", 2);
      AudioManager.startCrowd();
      AudioManager.setCrowdLevel(0.06, 2);
      await veil(0, 0.9);
      await wait(0.8);
      if (cancelled) return;
      await say(["Summarecon."], { pace: 2000 });
      if (cancelled) return;
      lockInput(false);
      setEntered(true);
      setState("EXPLORE_VENUE");
      setObjective("Find the venue");
    })();

    return () => {
      cancelled = true;
      gsap.killTweensOf(playerState.position);
      gsap.killTweensOf(cameraDirector.pos);
      gsap.killTweensOf(cameraDirector.look);
      gsap.killTweensOf(collapse.current);
      useGame.getState().setPrompt(null);
    };
  }, [setObjective, setState]);

  // ---- concert start ----
  const startConcert = () => {
    if (useGame.getState().state !== "EXPLORE_VENUE") return;
    setState("CONCERT");
    setObjective("Get to the front");
    beatClock.start(122);
    AudioManager.setMood("concert", 3);
    AudioManager.setMusicLevel(0.6, 3);
    AudioManager.setCrowdLevel(0.16, 3);
    crowdEnergyTarget.current = 0.9;
    stageLevelTarget.current = 1;
    const off = beatClock.onBeat((i) => {
      AudioManager.kick(i % 2 === 0 ? 1 : 0.7);
      if (i % 8 === 0) AudioManager.cheer(0.5);
    });
    beatOff.current = off;
  };
  const beatOff = useRef<null | (() => void)>(null);

  // ---- the incident (auto-triggers near the friend) ----
  const runIncident = async () => {
    if (incidentStarted.current) return;
    if (useGame.getState().state !== "CONCERT") return;
    incidentStarted.current = true;
    setState("INCIDENT");
    setObjective("");
    lockInput(true);
    useGame.getState().setPrompt(null);
    playerState.frozen = true;
    cameraMode("cutscene");

    // settle the player a couple of steps from the friend, facing her
    await walkPlayerTo(FRIEND_POS[0] - 2.2, FRIEND_POS[2] + 1.4, { speed: 1.5 });
    await facePlayer(FRIEND_POS[0], FRIEND_POS[2], 0.4);

    await moveCamera(
      { pos: [FRIEND_POS[0] + 3.4, 2.3, FRIEND_POS[2] + 4.2], look: [FRIEND_POS[0], 1.3, FRIEND_POS[2]] },
      1.6,
    );

    // 1-2: friend sways, Elvira notices
    friend.current?.char?.setInput({ pose: "IDLE" });
    gsap.to(collapse.current, { v: 0.28, duration: 1.1, ease: "sine.inOut", yoyo: true, repeat: 1 });
    await wait(1.1);
    useGame.getState().setPlayerAnim("LOOK_AROUND");
    await wait(0.8);

    // 3-4: turn + surprised, friend collapses (gently)
    useGame.getState().setPlayerAnim("SURPRISED");
    AudioManager.duck(0.3, 0.6);
    AudioManager.setMusicLevel(0.12, 1.2);
    AudioManager.setCrowdLevel(0.05, 1.5);
    crowdEnergyTarget.current = 0.1;
    stageLevelTarget.current = 0.25;
    beatClock.stop();
    beatOff.current?.();
    shake(0.12, 0.5);
    gsap.to(collapse.current, { v: 1, duration: 1.3, ease: "power2.in" });
    await wait(1.4);

    // 5-8: music down, Elvira approaches and helps
    await moveCamera(
      { pos: [FRIEND_POS[0] - 3, 1.8, FRIEND_POS[2] + 3.4], look: [FRIEND_POS[0], 0.6, FRIEND_POS[2]] },
      1.4,
    );
    useGame.getState().setPlayerAnim(null);
    await walkPlayerTo(FRIEND_POS[0] - 1.0, FRIEND_POS[2] + 0.7, { speed: 1.2 });
    await facePlayer(FRIEND_POS[0], FRIEND_POS[2], 0.35);
    useGame.getState().setPlayerAnim("HELP");
    await wait(1.6);

    // 9: quieter
    await say(["The night didn't go as planned."], { pace: 2600 });
    await say(["But you were there."], { pace: 2600 });

    // hand control back for the walk out
    setState("EXIT");
    setObjective("Head back to the exit");
    useGame.getState().setPlayerAnim(null);
    cameraMode("follow");
    releasePlayer();
    lockInput(false);
  };

  // ---- exit gate: walk back the way you came ----
  const leaveVenue = async () => {
    if (useGame.getState().state !== "EXIT") return;
    lockInput(true);
    setObjective("");
    await veil(1, 0.8);
    AudioManager.setCrowdLevel(0, 2);
    AudioManager.stopCrowd();
    AudioManager.setMusicLevel(0.3, 2);
    setState("WALK_HOME");
  };

  // ---- per-frame smoothing + fade crowd/stage by distance on the way out ----
  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const st = useGame.getState().state;

    if (st === "EXIT") {
      // as she walks away, the show recedes
      const d = clamp((playerState.position.z - -30) / 40, 0, 1); // 0 near stage .. 1 at plaza
      crowdEnergyTarget.current = 0.12 * (1 - d) + 0.04;
      stageLevelTarget.current = 0.25 * (1 - d) + 0.08;
      AudioManager.setCrowdLevel(0.05 * (1 - d), 1.5);
    }

    stageLevel.current = damp(stageLevel.current, stageLevelTarget.current, 2.5, dt);
    crowdEnergy.current = damp(crowdEnergy.current, crowdEnergyTarget.current, 2, dt);

    if (friend.current?.char) {
      friend.current.char.setInput({
        pose: "IDLE",
        collapse: collapse.current.v,
        speed01: 0,
        turnRate: 0,
      });
    }
  });

  return (
    <group>
      <Ground size={400} color="#0a1020" />

      {/* ---------------- arrival plaza ---------------- */}
      <group position={[0, 0, -6]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <planeGeometry args={[40, 30]} />
          <meshStandardMaterial color="#141a2c" roughness={0.85} />
        </mesh>
        <SignBoard position={[-13, 6, -6]} text="SUMMARECON" tone="#8fd0ff" />
        <SignBoard position={[14, 4.5, -2]} rotation={[0, -0.5, 0]} text="BANDUNG" tone="#ffb0d0" scale={0.7} />
        <LowBuilding position={[-20, 0, -4]} size={[12, 16, 10]} seed={51} windowTone="#bfe0ff" />
        <LowBuilding position={[20, 0, -8]} size={[12, 20, 10]} seed={57} windowTone="#ffd8c0" />
        <StreetLamp position={[-8, 0, 4]} light tone="#bfe0ff" />
        <StreetLamp position={[8, 0, 4]} light tone="#bfe0ff" />
      </group>

      {/* ---------------- checkpoint ---------------- */}
      <group position={[0, 0, -26]}>
        {[-3, 3].map((x) => (
          <mesh key={x} position={[x, 1.4, 0]} castShadow>
            <boxGeometry args={[0.5, 2.8, 0.5]} />
            <meshStandardMaterial color="#1a2030" />
          </mesh>
        ))}
        <mesh position={[0, 3, 0]}>
          <boxGeometry args={[7, 0.4, 0.4]} />
          <meshStandardMaterial color="#222a3e" />
        </mesh>
        <SignBoard position={[0, 4, 0]} text="ENTRANCE" tone="#9fe0c0" scale={0.5} />
      </group>

      {/* ---------------- concert bowl ---------------- */}
      <hemisphereLight args={["#31406f", "#06080f", 0.55]} />
      <ambientLight intensity={0.2} />
      <directionalLight position={[10, 18, 6]} intensity={0.32} color="#9fb2e6" castShadow />

      <ConcertStage position={[0, 0, STAGE_Z]} level={() => stageLevel.current} />

      <Crowd
        count={150}
        area={[52, 40]}
        position={[0, 0, -52]}
        faceZ={STAGE_Z}
        energy={() => crowdEnergy.current}
      />

      {/* barrier near the front */}
      <mesh position={[0, 0.6, -78]}>
        <boxGeometry args={[40, 1.2, 0.3]} />
        <meshStandardMaterial color="#141824" metalness={0.3} roughness={0.6} />
      </mesh>

      <AmbientDust count={200} area={70} height={16} color="#8fa8e0" />

      <Friend ref={friend} position={FRIEND_POS} rotation={Math.PI} />

      {/* ---------------- triggers ---------------- */}
      <ZGate z={-26} dir={-1} onCross={startConcert} enabled={entered && state === "EXPLORE_VENUE"} />
      <ProximityTrigger
        x={FRIEND_POS[0]}
        z={FRIEND_POS[2]}
        radius={4.5}
        once
        onEnter={runIncident}
        enabled={state === "CONCERT"}
      />
      <ZGate z={-12} dir={1} onCross={leaveVenue} enabled={state === "EXIT"} />
    </group>
  );
}
