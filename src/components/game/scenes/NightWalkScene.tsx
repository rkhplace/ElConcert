"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
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
  moveCamera,
  releasePlayer,
  veil,
  lockInput,
  cameraMode,
} from "@/game/systems/sequence";
import { damp, clamp } from "@/lib/math";
import { Ground, StreetLamp, LowBuilding, AmbientDust } from "@/components/game/props/Env";
import ConcertStage from "@/components/game/ConcertStage";
import Ticket from "@/components/game/props/Ticket";
import { PromptZone, ZGate } from "@/components/game/zones";

const TICKET_POS: [number, number, number] = [3, 0, -47];
const END_STAGE_Z = -122;

const NIGHT = new THREE.Color("#070a16");
const DAWN = new THREE.Color("#cf9fae");

export default function NightWalkScene() {
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const state = useGame((s) => s.state);
  const setState = useGame((s) => s.setState);
  const setObjective = useGame((s) => s.setObjective);

  const dawn = useRef(0); // 0 night .. 1 ending world
  const dawnTarget = useRef(0);
  const stageLevel = useRef(0);
  const stageLevelTarget = useRef(0);
  const [ticketVisible, setTicketVisible] = useState(false);
  const picked = useRef(false);
  const cinematicDone = useRef(false);

  useEffect(() => {
    resetPlayerTo(0, 2, Math.PI);
    worldBounds.set({ minX: -12, maxX: 12, minZ: END_STAGE_Z + 6, maxZ: 8 });
    cameraDirector.followDistance = 6.4;
    cameraDirector.followHeight = 3.2;
    cameraDirector.stiffness = 4;
    cameraMode("follow");

    const bg = NIGHT.clone();
    scene.background = bg;
    scene.fog = new THREE.FogExp2(0x0a1024, 0.03);
    gl.setClearColor(bg, 1);

    let cancelled = false;
    (async () => {
      AudioManager.setMood("quiet", 3);
      AudioManager.setMusicLevel(0.32, 3);
      await veil(0, 1);
      lockInput(false);
      setObjective("Walk home");
      if (cancelled) return;
    })();

    return () => {
      cancelled = true;
      gsap.killTweensOf(playerState.position);
      gsap.killTweensOf(cameraDirector.pos);
      gsap.killTweensOf(cameraDirector.look);
      useGame.getState().setPrompt(null);
      beatClock.stop();
    };
  }, [scene, gl, setObjective]);

  // ---------- the quiet cinematic beat ----------
  const runCinematic = async () => {
    if (cinematicDone.current) return;
    cinematicDone.current = true;
    lockInput(true);
    setObjective("");
    playerState.frozen = true;
    useGame.getState().setPlayerAnim(null);

    await wait(0.6);
    cameraMode("cutscene");
    // camera eases slightly behind and low
    const p = playerState.position;
    await moveCamera(
      { pos: [p.x + 0.6, 2.2, p.z + 7.5], look: [p.x, 1.4, p.z - 2] },
      2.4,
    );
    await say(["I know."], { pace: 2200 });
    await say(["That wasn't the night you were hoping for."], { pace: 2800 });
    await say(["But hey…"], { pace: 2000 });
    await wait(0.4);

    // the twist: something glows nearby
    setTicketVisible(true);
    AudioManager.blip("confirm");
    await moveCamera(
      { pos: [TICKET_POS[0] - 2.5, 2, TICKET_POS[2] + 4], look: [TICKET_POS[0], 1, TICKET_POS[2]] },
      2,
    );
    await wait(0.8);
    setState("TICKET");
    setObjective("Pick it up");
    cameraMode("follow");
    releasePlayer();
    lockInput(false);
  };

  // ---------- pick up the ticket ----------
  const pickUp = async () => {
    if (picked.current) return;
    picked.current = true;
    useGame.getState().setFlag("ticketPickedUp", true);
    useGame.getState().setPrompt(null);
    setObjective("");
    lockInput(true);
    playerState.frozen = true;

    await walkPlayerTo(TICKET_POS[0] - 0.9, TICKET_POS[2] + 0.6, { speed: 1.4 });
    useGame.getState().setPlayerAnim("INTERACT");
    cameraMode("cutscene");
    await moveCamera(
      { pos: [TICKET_POS[0] - 1.6, 1.5, TICKET_POS[2] + 2.2], look: [TICKET_POS[0], 1.1, TICKET_POS[2]] },
      1.6,
    );
    await wait(1.4);
    useGame.getState().setPlayerAnim(null);
    setTicketVisible(false);

    // ---------- ending world ----------
    setState("ENDING");
    setObjective("");
    dawnTarget.current = 1;
    stageLevelTarget.current = 1;
    AudioManager.setMood("hopeful", 6);
    AudioManager.setMusicLevel(0.6, 5);
    AudioManager.stab(523.25);
    await wait(0.4);
    AudioManager.stab(659.25);

    await say(["Maybe the concert wasn't meant to end that night."], { pace: 3000 });

    cameraMode("follow");
    releasePlayer();
    lockInput(false);
    setObjective("Walk to the stage");
  };

  // ---------- arrive at the new stage ----------
  const reachStage = async () => {
    if (useGame.getState().state !== "ENDING") return;
    lockInput(true);
    setObjective("");
    playerState.frozen = true;
    cameraMode("cutscene");

    await walkPlayerTo(0, END_STAGE_Z + 14, { speed: 1.7 });
    await moveCamera(
      { pos: [6.5, 2.4, END_STAGE_Z + 24], look: [0, 1.4, END_STAGE_Z + 10] },
      2,
    );

    setState("DANCE");
    beatClock.start(120);
    const off = beatClock.onBeat((i) => {
      AudioManager.kick(i % 2 === 0 ? 0.9 : 0.6);
      if (i % 4 === 0) AudioManager.stab(i % 8 === 0 ? 523.25 : 392);
    });
    AudioManager.setMusicLevel(0.75, 2);
    AudioManager.cheer(0.8);

    useGame.getState().setPlayerAnim("DANCE");

    // slow cinematic orbit while she dances
    const orbit = { a: 0 };
    gsap.to(orbit, {
      a: Math.PI * 1.2,
      duration: 9,
      ease: "sine.inOut",
      onUpdate: () => {
        const r = 8;
        cameraDirector.pos.set(
          Math.sin(orbit.a) * r,
          2.2 + Math.sin(orbit.a * 2) * 0.5,
          END_STAGE_Z + 12 + Math.cos(orbit.a) * r,
        );
        cameraDirector.look.set(0, 1.3, END_STAGE_Z + 10);
      },
    });

    await wait(9);
    off();
    beatClock.stop();

    useGame.getState().setPlayerAnim("CELEBRATE");
    AudioManager.cheer(1);
    await wait(1.6);
    useGame.getState().setPlayerAnim(null);

    await say(["Maybe it was just postponed."], { pace: 2800 });
    await wait(0.4);
    AudioManager.setMusicLevel(0.4, 3);
    setState("FINISHED");
  };

  // ---------- per-frame env transform ----------
  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20);
    dawn.current = damp(dawn.current, dawnTarget.current, 0.8, dt);
    stageLevel.current = damp(stageLevel.current, stageLevelTarget.current, 1.2, dt);
    const d = clamp(dawn.current, 0, 1);

    if (scene.background instanceof THREE.Color) {
      scene.background.copy(NIGHT).lerp(DAWN, d);
      gl.setClearColor(scene.background, 1);
    }
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.copy(NIGHT).lerp(DAWN, d);
      scene.fog.density = 0.03 * (1 - d) + 0.01 * d;
    }
  });

  const d = () => clamp(dawn.current, 0, 1);

  return (
    <group>
      <Ground size={420} color="#0a0f1e" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -60]}>
        <planeGeometry args={[8, 200]} />
        <meshStandardMaterial color="#12151f" roughness={0.92} />
      </mesh>
      {Array.from({ length: 40 }, (_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 4 - i * 6]}>
          <planeGeometry args={[0.16, 2]} />
          <meshStandardMaterial color="#3a4056" emissive="#3a4056" emissiveIntensity={0.3} />
        </mesh>
      ))}

      <DawnLights getD={d} />

      {/* sparse street — a few lamps, thinning out */}
      <StreetLamp position={[4.5, 0, -6]} light tone="#f0c27b" />
      <StreetLamp position={[-4.5, 0, -22]} light tone="#f0c27b" />
      <StreetLamp position={[4.5, 0, -40]} tone="#f0c27b" />
      <LowBuilding position={[-12, 0, -14]} size={[7, 9, 8]} seed={61} />
      <LowBuilding position={[12, 0, -30]} size={[6, 7, 8]} seed={67} />
      <LowBuilding position={[-13, 0, -60]} size={[8, 11, 8]} seed={71} />

      <AmbientDust count={160} area={30} height={12} color="#a9b8e0" />

      {ticketVisible && <Ticket position={TICKET_POS} picked={picked.current} />}

      {/* the second stage, revealed in the ending world */}
      <group position={[0, 0, END_STAGE_Z]}>
        <ConcertStage position={[0, 0, 0]} level={() => stageLevel.current} />
      </group>

      {/* triggers */}
      <ZGate z={-38} dir={-1} onCross={runCinematic} enabled={state === "WALK_HOME"} />
      <PromptZone
        x={TICKET_POS[0]}
        z={TICKET_POS[2]}
        radius={2.8}
        label="Pick up"
        onInteract={pickUp}
        enabled={ticketVisible && state === "TICKET"}
      />
      <ZGate z={END_STAGE_Z + 20} dir={-1} onCross={reachStage} enabled={state === "ENDING"} />
    </group>
  );
}

/** Warm fill light that fades up as the world turns to dawn. */
function DawnLights({ getD }: { getD: () => number }) {
  const key = useRef<THREE.DirectionalLight>(null);
  const amb = useRef<THREE.HemisphereLight>(null);
  useFrame(() => {
    const d = getD();
    if (key.current) key.current.intensity = 0.35 + d * 1.2;
    if (amb.current) amb.current.intensity = 0.5 + d * 0.6;
  });
  return (
    <>
      <hemisphereLight ref={amb} args={["#31406f", "#0b0b14", 0.5]} />
      <directionalLight
        ref={key}
        position={[8, 14, 10]}
        intensity={0.35}
        color="#ffd9b0"
        castShadow
      />
      <ambientLight intensity={0.18} />
    </>
  );
}
