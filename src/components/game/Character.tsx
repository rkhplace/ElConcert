"use client";

import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { damp, dampAngle, clamp } from "@/lib/math";

export type CharPose =
  | "IDLE"
  | "WALK"
  | "RUN"
  | "TURN"
  | "INTERACT"
  | "LOOK_AROUND"
  | "SURPRISED"
  | "HELP"
  | "DANCE"
  | "CELEBRATE";

export interface CharInput {
  pose: CharPose;
  /** 0..1 locomotion intensity (drives WALK<->RUN blend) */
  speed01: number;
  /** signed turn rate (rad/s) for lean-into-turn */
  turnRate: number;
  /** collapse amount 0..1 for the friend's faint */
  collapse: number;
}

export interface CharacterHandle {
  setInput: (partial: Partial<CharInput>) => void;
  group: THREE.Group | null;
}

export interface CharacterProps {
  variant?: "elvira" | "friend";
  pose?: CharPose;
  speed01?: number;
  turnRate?: number;
  collapse?: number;
}

interface Rig {
  root: THREE.Group;
  hips: THREE.Group;
  spine: THREE.Group;
  head: THREE.Group;
  shoulderL: THREE.Group;
  shoulderR: THREE.Group;
  elbowL: THREE.Group;
  elbowR: THREE.Group;
  hipL: THREE.Group;
  hipR: THREE.Group;
  kneeL: THREE.Group;
  kneeR: THREE.Group;
}

const DEFAULTS: PoseVals = {
  rootY: 0,
  lean: 0.02,
  roll: 0,
  hipsY: 0,
  spineBend: 0.04,
  spineTwist: 0,
  headPitch: 0,
  headYaw: 0,
  sLX: 0.05,
  sLZ: 0.16,
  eL: 0.15,
  sRX: 0.05,
  sRZ: -0.16,
  eR: 0.15,
  hLX: 0,
  kL: 0.04,
  hRX: 0,
  kR: 0.04,
};

interface PoseVals {
  rootY: number;
  lean: number;
  roll: number;
  hipsY: number;
  spineBend: number;
  spineTwist: number;
  headPitch: number;
  headYaw: number;
  sLX: number;
  sLZ: number;
  eL: number;
  sRX: number;
  sRZ: number;
  eR: number;
  hLX: number;
  kL: number;
  hRX: number;
  kR: number;
}

const Character = forwardRef<CharacterHandle, CharacterProps>(function Character(
  { variant = "elvira", pose = "IDLE", speed01 = 0, turnRate = 0, collapse = 0 },
  ref,
) {
  const g = useRef<Partial<Rig>>({});
  const phase = useRef(0);
  const clock = useRef(0);
  const spin = useRef(0);
  const local = useRef<PoseVals>({ ...DEFAULTS });
  const input = useRef<CharInput>({ pose, speed01, turnRate, collapse });

  useImperativeHandle(ref, () => ({
    setInput: (partial) => Object.assign(input.current, partial),
    get group() {
      return g.current.root ?? null;
    },
  }));

  const colors = useMemo(() => {
    return variant === "elvira"
      ? { skin: "#e8b48c", top: "#c9d7ff", bottom: "#3a4a80", hair: "#241c2b", accent: "#f4f7ff" }
      : { skin: "#e6b493", top: "#f2c3d1", bottom: "#4a4550", hair: "#2b241f", accent: "#ffd9e2" };
  }, [variant]);

  useFrame((_, delta) => {
    const dt = Math.min(delta || 0, 1 / 20);
    if (!Number.isFinite(dt) || dt <= 0) return; // skip degenerate frames
    clock.current += dt;
    const { pose: p, speed01: s01, turnRate: tr, collapse: col } = input.current;
    const s = clamp(Number.isFinite(s01) ? s01 : 0, 0, 1);

    // self-heal if a bad frame ever poisoned the pose values
    if (!Number.isFinite(local.current.rootY)) local.current = { ...DEFAULTS };

    const locFreq = 5.5 + s * 6.5;
    if (p === "WALK" || p === "RUN") phase.current += dt * locFreq;
    else if (p === "DANCE") phase.current += dt * 3.2;
    else phase.current += dt * 1.4;

    const safeTr = Number.isFinite(tr) ? tr : 0;
    const safeCol = clamp(Number.isFinite(col) ? col : 0, 0, 1);
    const tgt = makeTarget(p, s, phase.current, clock.current, safeTr, safeCol);

    const L = 9;
    const c = local.current;
    (Object.keys(tgt) as (keyof PoseVals)[]).forEach((k) => {
      if (k === "headYaw" || k === "spineTwist") c[k] = dampAngle(c[k], tgt[k], L, dt);
      else c[k] = damp(c[k], tgt[k], L, dt);
    });

    if (p === "DANCE") spin.current += dt * 0.55;
    else spin.current = dampAngle(spin.current, 0, 3, dt);

    const r = g.current;
    if (r.root) {
      r.root.position.y = c.rootY;
      r.root.rotation.x = c.lean;
      r.root.rotation.z = c.roll;
      r.root.rotation.y = spin.current;
    }
    if (r.hips) r.hips.position.y = 0.92 + c.hipsY;
    if (r.spine) {
      r.spine.rotation.x = c.spineBend;
      r.spine.rotation.y = c.spineTwist;
    }
    if (r.head) {
      r.head.rotation.x = c.headPitch;
      r.head.rotation.y = c.headYaw;
    }
    if (r.shoulderL) r.shoulderL.rotation.set(c.sLX, 0, c.sLZ);
    if (r.shoulderR) r.shoulderR.rotation.set(c.sRX, 0, c.sRZ);
    if (r.elbowL) r.elbowL.rotation.x = -Math.abs(c.eL);
    if (r.elbowR) r.elbowR.rotation.x = -Math.abs(c.eR);
    if (r.hipL) r.hipL.rotation.x = c.hLX;
    if (r.hipR) r.hipR.rotation.x = c.hRX;
    if (r.kneeL) r.kneeL.rotation.x = Math.abs(c.kL);
    if (r.kneeR) r.kneeR.rotation.x = Math.abs(c.kR);
  });

  const setRef = (key: keyof Rig) => (o: THREE.Group | null) => {
    if (o) g.current[key] = o;
  };
  const topMat = <meshStandardMaterial color={colors.top} flatShading roughness={0.8} />;

  return (
    <group ref={setRef("root")} dispose={null}>
      <group ref={setRef("hips")} position={[0, 0.92, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.32, 0.22, 0.22]} />
          <meshStandardMaterial color={colors.bottom} flatShading roughness={0.9} />
        </mesh>

        {([-1, 1] as const).map((side) => (
          <group
            key={side}
            ref={setRef(side === -1 ? "hipL" : "hipR")}
            position={[0.11 * side, -0.05, 0]}
          >
            <mesh castShadow position={[0, -0.24, 0]}>
              <boxGeometry args={[0.15, 0.44, 0.16]} />
              <meshStandardMaterial color={colors.bottom} flatShading roughness={0.9} />
            </mesh>
            <group ref={setRef(side === -1 ? "kneeL" : "kneeR")} position={[0, -0.46, 0]}>
              <mesh castShadow position={[0, -0.22, 0]}>
                <boxGeometry args={[0.13, 0.42, 0.14]} />
                <meshStandardMaterial color={colors.bottom} flatShading roughness={0.9} />
              </mesh>
              <mesh castShadow position={[0, -0.44, 0.05]}>
                <boxGeometry args={[0.14, 0.08, 0.24]} />
                <meshStandardMaterial color={colors.hair} flatShading roughness={0.9} />
              </mesh>
            </group>
          </group>
        ))}

        <group ref={setRef("spine")} position={[0, 0.11, 0]}>
          <mesh castShadow position={[0, 0.28, 0]}>
            <boxGeometry args={[0.4, 0.5, 0.24]} />
            {topMat}
          </mesh>
          <mesh castShadow position={[0, 0.52, 0]}>
            <boxGeometry args={[0.46, 0.12, 0.26]} />
            <meshStandardMaterial color={colors.accent} flatShading roughness={0.7} />
          </mesh>

          {([-1, 1] as const).map((side) => (
            <group
              key={side}
              ref={setRef(side === -1 ? "shoulderL" : "shoulderR")}
              position={[0.26 * side, 0.5, 0]}
            >
              <mesh castShadow position={[0, -0.2, 0]}>
                <boxGeometry args={[0.12, 0.4, 0.12]} />
                {topMat}
              </mesh>
              <group ref={setRef(side === -1 ? "elbowL" : "elbowR")} position={[0, -0.4, 0]}>
                <mesh castShadow position={[0, -0.19, 0]}>
                  <boxGeometry args={[0.1, 0.38, 0.1]} />
                  <meshStandardMaterial color={colors.skin} flatShading roughness={0.85} />
                </mesh>
              </group>
            </group>
          ))}

          <group ref={setRef("head")} position={[0, 0.78, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.24, 0.28, 0.24]} />
              <meshStandardMaterial color={colors.skin} flatShading roughness={0.85} />
            </mesh>
            <mesh castShadow position={[0, 0.08, -0.02]}>
              <boxGeometry args={[0.3, 0.22, 0.3]} />
              <meshStandardMaterial color={colors.hair} flatShading roughness={0.95} />
            </mesh>
            <mesh castShadow position={[0, -0.02, -0.16]}>
              <boxGeometry args={[0.26, 0.34, 0.06]} />
              <meshStandardMaterial color={colors.hair} flatShading roughness={0.95} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
});

export default Character;

function makeTarget(
  pose: CharPose,
  s: number,
  t: number,
  clock: number,
  turnRate: number,
  collapse: number,
): PoseVals {
  const o: PoseVals = { ...DEFAULTS };
  const swing = Math.sin(t);
  const swing2 = Math.sin(t * 2);
  const turnLean = clamp(-turnRate * 0.12, -0.25, 0.25);

  o.hipsY = Math.sin(clock * 1.6) * 0.012;
  o.spineBend = 0.04 + Math.sin(clock * 1.4) * 0.02;
  o.spineTwist = Math.sin(clock * 0.7) * 0.05;
  o.headPitch = -0.02 + Math.sin(clock * 0.9) * 0.03;
  o.headYaw = Math.sin(clock * 0.5) * 0.08;
  o.roll = turnLean;
  o.sLZ = 0.16 + Math.sin(clock * 1.3) * 0.03;
  o.sRZ = -0.16 - Math.sin(clock * 1.1) * 0.03;

  if (pose === "WALK" || pose === "RUN") {
    const amp = 0.35 + s * 0.85;
    const run = s;
    o.lean = 0.06 + run * 0.22 + turnLean * 0.4;
    o.rootY = Math.abs(swing2) * (0.03 + run * 0.05);
    o.hipsY = -0.02 - run * 0.03;
    o.spineBend = 0.08 + run * 0.14;
    o.spineTwist = swing * 0.12;
    o.headPitch = -0.04 - run * 0.06;
    o.headYaw = -swing * 0.06;
    o.hLX = swing * 0.55 * amp;
    o.hRX = -swing * 0.55 * amp;
    o.kL = Math.max(0.05, -swing) * (0.55 + run * 0.5) * amp + 0.05;
    o.kR = Math.max(0.05, swing) * (0.55 + run * 0.5) * amp + 0.05;
    o.sLX = -swing * (0.45 + run * 0.35) * amp;
    o.sRX = swing * (0.45 + run * 0.35) * amp;
    o.sLZ = 0.12;
    o.sRZ = -0.12;
    o.eL = 0.25 + run * 0.5 + Math.max(0, -swing) * 0.3;
    o.eR = 0.25 + run * 0.5 + Math.max(0, swing) * 0.3;
    return o;
  }

  if (pose === "TURN") {
    o.roll = clamp(-turnRate * 0.18, -0.35, 0.35);
    o.spineTwist = clamp(-turnRate * 0.2, -0.4, 0.4);
    o.headYaw = clamp(-turnRate * 0.25, -0.5, 0.5);
    return o;
  }

  if (pose === "INTERACT") {
    o.lean = 0.12;
    o.spineBend = 0.16;
    o.headPitch = 0.12;
    o.sRX = -1.15 + Math.sin(clock * 6) * 0.05;
    o.sRZ = -0.05;
    o.eR = 0.35;
    o.sLX = -0.2;
    return o;
  }

  if (pose === "LOOK_AROUND") {
    const look = Math.sin(clock * 1.1);
    o.headYaw = look * 0.7;
    o.spineTwist = look * 0.25;
    o.headPitch = 0.03 + Math.sin(clock * 0.6) * 0.05;
    o.sLZ = 0.2;
    o.sRZ = -0.2;
    return o;
  }

  if (pose === "SURPRISED") {
    o.lean = -0.22;
    o.rootY = 0.04;
    o.spineBend = -0.12;
    o.headPitch = -0.28;
    o.sLX = -0.9;
    o.sLZ = 0.5;
    o.eL = 0.9;
    o.sRX = -0.9;
    o.sRZ = -0.5;
    o.eR = 0.9;
    o.hLX = -0.15;
    o.hRX = 0.1;
    o.kL = 0.2;
    o.kR = 0.1;
    return o;
  }

  if (pose === "HELP") {
    o.rootY = -0.42;
    o.lean = 0.28;
    o.spineBend = 0.3;
    o.headPitch = 0.35;
    o.hipsY = -0.1;
    o.hLX = -1.3;
    o.kL = 1.5;
    o.hRX = 0.2;
    o.kR = 1.9;
    o.sLX = -0.9 + Math.sin(clock * 2) * 0.06;
    o.sLZ = 0.1;
    o.eL = 0.5;
    o.sRX = -1.0 + Math.sin(clock * 2 + 1) * 0.06;
    o.sRZ = -0.08;
    o.eR = 0.6;
    return o;
  }

  if (pose === "CELEBRATE") {
    const hop = Math.abs(Math.sin(clock * 6));
    o.rootY = hop * 0.12;
    o.lean = -0.05;
    o.spineBend = -0.05;
    o.headPitch = -0.15;
    o.sLX = -2.5 + Math.sin(clock * 8) * 0.15;
    o.sLZ = 0.4;
    o.eL = 0.2;
    o.sRX = -2.5 + Math.sin(clock * 8 + 1) * 0.15;
    o.sRZ = -0.4;
    o.eR = 0.2;
    o.kL = 0.1 + hop * 0.3;
    o.kR = 0.1 + hop * 0.3;
    return o;
  }

  if (pose === "DANCE") {
    const a = t;
    const slow = clock * 0.9;
    const shift = Math.sin(a * 0.5);
    const wave = Math.sin(a);
    const wave2 = Math.sin(a * 0.5 + 1.2);
    o.roll = shift * 0.16;
    o.lean = 0.04 + Math.sin(a * 0.5) * 0.12;
    o.rootY = Math.abs(Math.sin(a)) * 0.06 + Math.max(0, Math.sin(slow * 0.5)) * 0.05;
    o.hipsY = shift * 0.03;
    o.spineBend = 0.06 + Math.sin(a * 0.7) * 0.18;
    o.spineTwist = Math.sin(a * 0.5) * 0.4;
    o.headPitch = -0.1 + Math.sin(a * 0.6) * 0.18;
    o.headYaw = Math.sin(a * 0.5 + 0.5) * 0.3;
    o.sLX = -1.4 + wave * 1.3;
    o.sLZ = 0.5 + wave2 * 0.5;
    o.eL = 0.3 + Math.max(0, Math.sin(a * 1.3)) * 0.7;
    o.sRX = -1.4 - wave * 1.3;
    o.sRZ = -0.5 - Math.sin(a * 0.5 - 1.2) * 0.5;
    o.eR = 0.3 + Math.max(0, Math.sin(a * 1.3 + Math.PI)) * 0.7;
    const ext = Math.max(0, Math.sin(a * 0.5 - 0.6));
    o.hLX = -0.15 + shift * 0.35 - ext * 0.5;
    o.hRX = -0.15 - shift * 0.35;
    o.kL = 0.15 + ext * 0.4;
    o.kR = 0.2 + Math.max(0, -shift) * 0.5;
    return o;
  }

  // IDLE (+ optional collapse for the friend)
  if (collapse > 0.001) {
    const c = clamp(collapse, 0, 1);
    o.rootY = -0.75 * c;
    o.lean = 0.1 + 1.0 * c;
    o.roll = 0.35 * c;
    o.spineBend = 0.1 + 0.4 * c;
    o.headPitch = 0.1 + 0.5 * c;
    o.hLX = -1.4 * c;
    o.kL = 1.6 * c;
    o.hRX = -0.3 * c;
    o.kR = 0.8 * c;
    o.sLX = -0.3 - 0.6 * c;
    o.sRX = -0.3 - 0.6 * c;
    o.sLZ = 0.2 + 0.3 * c;
    o.sRZ = -0.2 - 0.3 * c;
  }
  return o;
}
