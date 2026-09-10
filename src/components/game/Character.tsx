"use client";

import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
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
  speed01: number;
  turnRate: number;
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
  chest: THREE.Group;
  head: THREE.Group;
  shoulderL: THREE.Group;
  shoulderR: THREE.Group;
  elbowL: THREE.Group;
  elbowR: THREE.Group;
  hipL: THREE.Group;
  hipR: THREE.Group;
  kneeL: THREE.Group;
  kneeR: THREE.Group;
  ankleL: THREE.Group;
  ankleR: THREE.Group;
}

interface PoseVals {
  rootY: number;
  lean: number;
  roll: number;
  hipsY: number;
  pelvisYaw: number;
  pelvisRoll: number;
  spineBend: number;
  spineTwist: number;
  chestYaw: number;
  chestPitch: number;
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
  aL: number;
  hRX: number;
  kR: number;
  aR: number;
}

const DEFAULTS: PoseVals = {
  rootY: 0,
  lean: 0.03,
  roll: 0,
  hipsY: 0,
  pelvisYaw: 0,
  pelvisRoll: 0,
  spineBend: 0.05,
  spineTwist: 0,
  chestYaw: 0,
  chestPitch: 0,
  headPitch: 0,
  headYaw: 0,
  sLX: 0.04,
  sLZ: 0.15,
  eL: 0.18,
  sRX: 0.04,
  sRZ: -0.15,
  eR: 0.18,
  hLX: 0,
  kL: 0.06,
  aL: 0.02,
  hRX: 0,
  kR: 0.06,
  aR: 0.02,
};

/** channels that carry soft flesh/cloth lag (two-stage smoothing) */
const LAG: Partial<Record<keyof PoseVals, number>> = {
  sLX: 7,
  sLZ: 7,
  eL: 7,
  sRX: 7,
  sRZ: 7,
  eR: 7,
  spineBend: 6,
  spineTwist: 6,
  chestYaw: 6,
  chestPitch: 6,
  lean: 7,
  roll: 7,
  headPitch: 4.5,
  headYaw: 4.5,
};
/** first-stage responsiveness per channel (legs/pelvis stay crisp) */
const FAST: Partial<Record<keyof PoseVals, number>> = {
  hLX: 16,
  hRX: 16,
  kL: 17,
  kR: 17,
  aL: 15,
  aR: 15,
  hipsY: 13,
  rootY: 13,
  pelvisYaw: 13,
  pelvisRoll: 13,
};
const ANGLE_CH = new Set<keyof PoseVals>([
  "headYaw",
  "spineTwist",
  "chestYaw",
  "pelvisYaw",
  "roll",
  "lean",
]);

const Character = forwardRef<CharacterHandle, CharacterProps>(function Character(
  { variant = "elvira", pose = "IDLE", speed01 = 0, turnRate = 0, collapse = 0 },
  ref,
) {
  const g = useRef<Partial<Rig>>({});
  const phase = useRef(0);
  const clock = useRef(Math.random() * 40);
  const spin = useRef(0);
  const cur = useRef<PoseVals>({ ...DEFAULTS });
  const disp = useRef<PoseVals>({ ...DEFAULTS });
  const input = useRef<CharInput>({ pose, speed01, turnRate, collapse });

  useImperativeHandle(ref, () => ({
    setInput: (partial) => Object.assign(input.current, partial),
    get group() {
      return g.current.root ?? null;
    },
  }));

  const colors = useMemo(() => {
    return variant === "elvira"
      ? { skin: "#e8b48c", top: "#c9d7ff", bottom: "#39457a", hair: "#241c2b", accent: "#eef2ff" }
      : { skin: "#e6b493", top: "#f2c3d1", bottom: "#494452", hair: "#2b241f", accent: "#ffd9e2" };
  }, [variant]);

  useFrame((_, delta) => {
    const dt = Math.min(delta || 0, 1 / 20);
    if (!Number.isFinite(dt) || dt <= 0) return;
    clock.current += dt;
    const { pose: p, speed01: s01, turnRate: tr, collapse: col } = input.current;
    const s = clamp(Number.isFinite(s01) ? s01 : 0, 0, 1);

    if (!Number.isFinite(cur.current.rootY)) {
      cur.current = { ...DEFAULTS };
      disp.current = { ...DEFAULTS };
    }

    const locFreq = 4.4 + s * 5.4;
    if (p === "WALK" || p === "RUN") phase.current += dt * locFreq;
    else if (p === "DANCE") phase.current += dt * 3.1;
    else phase.current += dt * 1.2;

    const safeTr = Number.isFinite(tr) ? tr : 0;
    const safeCol = clamp(Number.isFinite(col) ? col : 0, 0, 1);
    const tgt = makeTarget(p, s, phase.current, clock.current, safeTr, safeCol);

    const c = cur.current;
    const d = disp.current;
    (Object.keys(tgt) as (keyof PoseVals)[]).forEach((k) => {
      const l1 = FAST[k] ?? 10;
      if (ANGLE_CH.has(k)) c[k] = dampAngle(c[k], tgt[k], l1, dt);
      else c[k] = damp(c[k], tgt[k], l1, dt);
      const l2 = LAG[k];
      if (l2 != null) {
        if (ANGLE_CH.has(k)) d[k] = dampAngle(d[k], c[k], l2, dt);
        else d[k] = damp(d[k], c[k], l2, dt);
      } else {
        d[k] = c[k];
      }
    });

    if (p === "DANCE") spin.current += dt * 0.5;
    else spin.current = dampAngle(spin.current, 0, 3, dt);

    const r = g.current;
    if (r.root) {
      r.root.position.y = d.rootY;
      r.root.rotation.x = d.lean;
      r.root.rotation.z = d.roll;
      r.root.rotation.y = spin.current;
    }
    if (r.hips) {
      r.hips.position.y = 0.92 + d.hipsY;
      r.hips.rotation.y = d.pelvisYaw;
      r.hips.rotation.z = d.pelvisRoll;
    }
    if (r.spine) {
      r.spine.rotation.x = d.spineBend;
      r.spine.rotation.y = d.spineTwist;
    }
    if (r.chest) {
      r.chest.rotation.y = d.chestYaw;
      r.chest.rotation.x = d.chestPitch;
    }
    if (r.head) {
      r.head.rotation.x = d.headPitch;
      r.head.rotation.y = d.headYaw;
    }
    if (r.shoulderL) r.shoulderL.rotation.set(d.sLX, 0, d.sLZ);
    if (r.shoulderR) r.shoulderR.rotation.set(d.sRX, 0, d.sRZ);
    if (r.elbowL) r.elbowL.rotation.x = -Math.abs(d.eL);
    if (r.elbowR) r.elbowR.rotation.x = -Math.abs(d.eR);
    if (r.hipL) r.hipL.rotation.x = d.hLX;
    if (r.hipR) r.hipR.rotation.x = d.hRX;
    if (r.kneeL) r.kneeL.rotation.x = Math.max(0, d.kL);
    if (r.kneeR) r.kneeR.rotation.x = Math.max(0, d.kR);
    if (r.ankleL) r.ankleL.rotation.x = d.aL;
    if (r.ankleR) r.ankleR.rotation.x = d.aR;
  });

  const setRef = (key: keyof Rig) => (o: THREE.Group | null) => {
    if (o) g.current[key] = o;
  };
  const top = <meshStandardMaterial color={colors.top} flatShading roughness={0.85} />;
  const limb = <meshStandardMaterial color={colors.bottom} flatShading roughness={0.9} />;
  const skinMat = <meshStandardMaterial color={colors.skin} flatShading roughness={0.85} />;
  const hairMat = <meshStandardMaterial color={colors.hair} flatShading roughness={0.95} />;

  return (
    <group ref={setRef("root")} dispose={null}>
      <group ref={setRef("hips")} position={[0, 0.92, 0]}>
        {/* pelvis */}
        <mesh castShadow>
          <boxGeometry args={[0.36, 0.22, 0.24]} />
          {limb}
        </mesh>

        {/* legs */}
        {([-1, 1] as const).map((side) => (
          <group
            key={side}
            ref={setRef(side === -1 ? "hipL" : "hipR")}
            position={[0.12 * side, -0.05, 0]}
          >
            <mesh castShadow position={[0, -0.24, 0]}>
              <boxGeometry args={[0.17, 0.44, 0.18]} />
              {limb}
            </mesh>
            <group ref={setRef(side === -1 ? "kneeL" : "kneeR")} position={[0, -0.46, 0]}>
              <mesh castShadow position={[0, -0.22, 0]}>
                <boxGeometry args={[0.15, 0.42, 0.16]} />
                {limb}
              </mesh>
              <group
                ref={setRef(side === -1 ? "ankleL" : "ankleR")}
                position={[0, -0.44, 0]}
              >
                <mesh castShadow position={[0, -0.03, 0.07]}>
                  <boxGeometry args={[0.15, 0.09, 0.3]} />
                  {hairMat}
                </mesh>
              </group>
            </group>
          </group>
        ))}

        {/* lower spine */}
        <group ref={setRef("spine")} position={[0, 0.12, 0]}>
          <mesh castShadow position={[0, 0.17, 0]}>
            <boxGeometry args={[0.4, 0.36, 0.24]} />
            {top}
          </mesh>

          {/* chest (counter-rotates against the pelvis) */}
          <group ref={setRef("chest")} position={[0, 0.35, 0]}>
            <mesh castShadow position={[0, 0.12, 0]}>
              <boxGeometry args={[0.44, 0.32, 0.24]} />
              {top}
            </mesh>
            <mesh castShadow position={[0, 0.32, 0]}>
              <boxGeometry args={[0.5, 0.12, 0.28]} />
              <meshStandardMaterial color={colors.accent} flatShading roughness={0.7} />
            </mesh>

            {/* arms */}
            {([-1, 1] as const).map((side) => (
              <group
                key={side}
                ref={setRef(side === -1 ? "shoulderL" : "shoulderR")}
                position={[0.27 * side, 0.28, 0]}
              >
                <mesh castShadow position={[0, -0.2, 0]}>
                  <boxGeometry args={[0.13, 0.4, 0.13]} />
                  {top}
                </mesh>
                <group ref={setRef(side === -1 ? "elbowL" : "elbowR")} position={[0, -0.4, 0]}>
                  <mesh castShadow position={[0, -0.19, 0]}>
                    <boxGeometry args={[0.11, 0.38, 0.11]} />
                    {skinMat}
                  </mesh>
                </group>
              </group>
            ))}

            {/* head */}
            <group ref={setRef("head")} position={[0, 0.56, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.25, 0.29, 0.25]} />
                {skinMat}
              </mesh>
              <mesh castShadow position={[0, 0.1, -0.02]}>
                <boxGeometry args={[0.31, 0.22, 0.31]} />
                {hairMat}
              </mesh>
              <mesh castShadow position={[0, -0.04, -0.17]}>
                <boxGeometry args={[0.27, 0.36, 0.08]} />
                {hairMat}
              </mesh>
              {/* ponytail — swings with the head */}
              <mesh castShadow position={[0, -0.16, -0.24]} rotation={[0.5, 0, 0]}>
                <boxGeometry args={[0.12, 0.34, 0.12]} />
                {hairMat}
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
});

export default Character;

/* ------------------------------------------------------------------ poses */

function makeTarget(
  pose: CharPose,
  s: number,
  t: number,
  clk: number,
  turnRate: number,
  collapse: number,
): PoseVals {
  const o: PoseVals = { ...DEFAULTS };
  const turnLean = clamp(-turnRate * 0.1, -0.22, 0.22);

  // ---- living idle baseline (layered, incommensurate) -------------------
  const breath = Math.sin(clk * 1.7);
  const sway = Math.sin(clk * 0.55); // slow weight shift
  const sway2 = Math.sin(clk * 0.9 + 1.3);
  o.hipsY = breath * 0.006 - Math.abs(sway) * 0.01;
  o.pelvisRoll = sway * 0.05;
  o.pelvisYaw = sway2 * 0.03;
  o.spineBend = 0.06 + breath * 0.016;
  o.spineTwist = sway * 0.04;
  o.chestYaw = -sway * 0.06;
  o.chestPitch = -breath * 0.02;
  o.headPitch = -0.03 + Math.sin(clk * 0.8) * 0.03;
  o.headYaw = Math.sin(clk * 0.37) * 0.1 - sway * 0.05;
  o.roll = turnLean;
  o.lean = 0.03;
  o.sLX = 0.05 + sway * 0.05;
  o.sRX = 0.05 - sway * 0.05;
  o.sLZ = 0.14 + breath * 0.02;
  o.sRZ = -0.14 - breath * 0.02;
  o.eL = 0.2 + Math.max(0, sway) * 0.1;
  o.eR = 0.2 + Math.max(0, -sway) * 0.1;
  // knees micro-bend on the unweighted side
  o.kL = 0.06 + Math.max(0, -sway) * 0.12;
  o.kR = 0.06 + Math.max(0, sway) * 0.12;
  o.hLX = -sway * 0.04;
  o.hRX = sway * 0.04;

  if (pose === "WALK" || pose === "RUN") {
    const run = s;
    const amp = 0.45 + run * 0.75;
    const gL = t;
    const gR = t + Math.PI;

    const legPitch = (g: number) => Math.sin(g) * 0.55 * amp;
    // knee: near-straight in stance, sharp bend through swing
    const kneeBend = (g: number) => {
      const swingPhase = Math.max(0, Math.sin(g + 0.5));
      return 0.12 + swingPhase * swingPhase * (1.15 * amp) + Math.max(0, -Math.sin(g)) * 0.12;
    };
    const ankle = (g: number) => {
      const swingPhase = Math.max(0, Math.sin(g + 0.5));
      return -Math.sin(g - 0.6) * 0.22 * amp + swingPhase * 0.28 - 0.05;
    };

    o.hLX = legPitch(gL);
    o.hRX = legPitch(gR);
    o.kL = kneeBend(gL);
    o.kR = kneeBend(gR);
    o.aL = ankle(gL);
    o.aR = ankle(gR);

    // double bob per stride, lowest at mid-stance
    o.rootY = -0.03 + Math.abs(Math.sin(t * 2 + 0.3)) * (0.03 + run * 0.05);
    o.hipsY = -0.02 - run * 0.03;
    o.pelvisYaw = Math.sin(t) * (0.12 + run * 0.06);
    o.pelvisRoll = Math.sin(t + 0.4) * (0.06 + run * 0.05);

    o.lean = 0.07 + run * 0.3 + turnLean * 0.5;
    o.roll = turnLean * 1.3;
    o.spineBend = 0.09 + run * 0.16;
    o.spineTwist = Math.sin(t) * 0.05;
    o.chestYaw = -Math.sin(t) * (0.14 + run * 0.08);
    o.chestPitch = run * 0.08;
    o.headPitch = -0.05 - run * 0.06 - Math.abs(Math.sin(t * 2)) * 0.02;
    o.headYaw = -Math.sin(t) * 0.05;

    // arms swing opposite the same-side leg, elbow flexes on the forward swing
    const armAmp = 0.5 + run * 0.5;
    o.sLX = -Math.sin(gL) * armAmp;
    o.sRX = -Math.sin(gR) * armAmp;
    o.sLZ = 0.11 + run * 0.02;
    o.sRZ = -0.11 - run * 0.02;
    o.eL = 0.3 + run * 0.5 + Math.max(0, -Math.sin(gL)) * (0.5 + run * 0.3);
    o.eR = 0.3 + run * 0.5 + Math.max(0, -Math.sin(gR)) * (0.5 + run * 0.3);
    return o;
  }

  if (pose === "TURN") {
    o.roll = clamp(-turnRate * 0.16, -0.32, 0.32);
    o.pelvisYaw = clamp(-turnRate * 0.12, -0.3, 0.3);
    o.chestYaw = clamp(turnRate * 0.14, -0.35, 0.35);
    o.headYaw = clamp(-turnRate * 0.22, -0.5, 0.5);
    return o;
  }

  if (pose === "INTERACT") {
    o.lean = 0.14;
    o.spineBend = 0.18;
    o.chestPitch = 0.12;
    o.headPitch = 0.16;
    o.sRX = -1.2 + Math.sin(clk * 5) * 0.06;
    o.sRZ = -0.04;
    o.eR = 0.4;
    o.sLX = -0.25;
    o.eL = 0.3;
    o.kL = 0.16;
    o.kR = 0.12;
    return o;
  }

  if (pose === "LOOK_AROUND") {
    const look = Math.sin(clk * 1.05);
    const look2 = Math.sin(clk * 0.6);
    o.headYaw = look * 0.7;
    o.chestYaw = look * 0.22;
    o.spineTwist = look * 0.14;
    o.headPitch = 0.04 + look2 * 0.06;
    o.pelvisYaw = look * 0.08;
    o.sLZ = 0.19;
    o.sRZ = -0.19;
    return o;
  }

  if (pose === "SURPRISED") {
    o.lean = -0.2;
    o.rootY = 0.04;
    o.spineBend = -0.1;
    o.chestPitch = -0.14;
    o.headPitch = -0.26;
    o.sLX = -0.8;
    o.sLZ = 0.55;
    o.eL = 1.0;
    o.sRX = -0.8;
    o.sRZ = -0.55;
    o.eR = 1.0;
    o.hLX = -0.18;
    o.hRX = 0.12;
    o.kL = 0.24;
    o.kR = 0.12;
    return o;
  }

  if (pose === "HELP") {
    const b = Math.sin(clk * 1.8);
    o.rootY = -0.44;
    o.lean = 0.3;
    o.spineBend = 0.34;
    o.chestPitch = 0.16;
    o.headPitch = 0.34;
    o.hipsY = -0.1;
    o.hLX = -1.35;
    o.kL = 1.55;
    o.aL = 0.4;
    o.hRX = 0.15;
    o.kR = 1.95;
    o.aR = -0.2;
    o.sLX = -0.95 + b * 0.05;
    o.sLZ = 0.12;
    o.eL = 0.55;
    o.sRX = -1.05 + Math.sin(clk * 1.8 + 1) * 0.05;
    o.sRZ = -0.08;
    o.eR = 0.65;
    return o;
  }

  if (pose === "CELEBRATE") {
    const hop = Math.abs(Math.sin(clk * 5.5));
    o.rootY = hop * 0.14;
    o.lean = -0.06;
    o.chestPitch = -0.08;
    o.headPitch = -0.18;
    o.sLX = -2.5 + Math.sin(clk * 7) * 0.18;
    o.sLZ = 0.45;
    o.eL = 0.22;
    o.sRX = -2.5 + Math.sin(clk * 7 + 1) * 0.18;
    o.sRZ = -0.45;
    o.eR = 0.22;
    o.kL = 0.12 + hop * 0.35;
    o.kR = 0.12 + hop * 0.35;
    o.aL = hop * 0.3;
    o.aR = hop * 0.3;
    return o;
  }

  if (pose === "DANCE") {
    const a = t;
    const slow = clk * 0.8;
    const shift = Math.sin(a * 0.5);
    const wave = Math.sin(a);
    const wave2 = Math.sin(a * 0.5 + 1.2);
    const rise = Math.max(0, Math.sin(slow * 0.5));

    o.roll = shift * 0.17;
    o.lean = 0.04 + Math.sin(a * 0.5) * 0.13;
    o.rootY = Math.abs(Math.sin(a)) * 0.05 + rise * 0.06;
    o.hipsY = shift * 0.03;
    o.pelvisRoll = shift * 0.14;
    o.pelvisYaw = Math.sin(a * 0.4) * 0.2;
    o.spineBend = 0.05 + Math.sin(a * 0.7) * 0.2;
    o.spineTwist = Math.sin(a * 0.5) * 0.34;
    o.chestYaw = -Math.sin(a * 0.5 + 0.4) * 0.32;
    o.chestPitch = Math.sin(a * 0.6) * 0.14;
    o.headPitch = -0.08 + Math.sin(a * 0.6) * 0.2;
    o.headYaw = Math.sin(a * 0.5 + 0.5) * 0.34;

    o.sLX = -1.35 + wave * 1.35;
    o.sLZ = 0.5 + wave2 * 0.55;
    o.eL = 0.3 + Math.max(0, Math.sin(a * 1.3)) * 0.8;
    o.sRX = -1.35 - wave * 1.35;
    o.sRZ = -0.5 - Math.sin(a * 0.5 - 1.2) * 0.55;
    o.eR = 0.3 + Math.max(0, Math.sin(a * 1.3 + Math.PI)) * 0.8;

    const ext = Math.max(0, Math.sin(a * 0.5 - 0.6));
    o.hLX = -0.12 + shift * 0.4 - ext * 0.55;
    o.hRX = -0.12 - shift * 0.4;
    o.kL = 0.16 + ext * 0.45;
    o.kR = 0.22 + Math.max(0, -shift) * 0.55;
    o.aL = -0.15 + ext * 0.5;
    o.aR = 0.1 + Math.max(0, -shift) * 0.3;
    return o;
  }

  // IDLE (+ optional collapse for the friend)
  if (collapse > 0.001) {
    const c = clamp(collapse, 0, 1);
    o.rootY = -0.78 * c;
    o.lean = 0.1 + 1.0 * c;
    o.roll = 0.4 * c;
    o.pelvisRoll = 0.25 * c;
    o.spineBend = 0.1 + 0.45 * c;
    o.chestPitch = 0.3 * c;
    o.headPitch = 0.1 + 0.5 * c;
    o.hLX = -1.4 * c;
    o.kL = 1.7 * c;
    o.hRX = -0.3 * c;
    o.kR = 0.9 * c;
    o.sLX = -0.3 - 0.7 * c;
    o.sRX = -0.3 - 0.7 * c;
    o.sLZ = 0.2 + 0.35 * c;
    o.sRZ = -0.2 - 0.35 * c;
    o.eL = 0.2 + 0.5 * c;
    o.eR = 0.2 + 0.5 * c;
  }
  return o;
}
