"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { hash01, clamp } from "@/lib/math";
import { beatClock } from "@/game/systems/beatClock";

interface CrowdProps {
  count?: number;
  /** rectangular area the crowd fills, centred on `position` */
  area?: [number, number];
  position?: [number, number, number];
  /** they all roughly face this world Z (the stage) */
  faceZ?: number;
  energy?: number | (() => number); // 0..1, scales motion. May be a getter.
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _c = new THREE.Color();

const PALETTE = ["#1b2233", "#242c40", "#2f2438", "#1f2a3a", "#33303e", "#28324a"];

export default function Crowd({
  count = 140,
  area = [46, 26],
  position = [0, 0, 0],
  faceZ = -40,
  energy = 0.5,
}: CrowdProps) {
  const bodies = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  const energyProp = useRef(energy);
  energyProp.current = energy;
  const resolveEnergy = () =>
    typeof energyProp.current === "function" ? energyProp.current() : energyProp.current;

  const people = useMemo(() => {
    const arr: { x: number; z: number; h: number; phase: number; jump: number; face: number }[] = [];
    for (let i = 0; i < count; i++) {
      const x = (hash01(i * 3.1) - 0.5) * area[0];
      const z = (hash01(i * 7.7 + 1) - 0.5) * area[1];
      arr.push({
        x,
        z,
        h: 1.5 + hash01(i * 2.3) * 0.4,
        phase: hash01(i * 5.9) * Math.PI * 2,
        jump: hash01(i * 9.2),
        face: Math.atan2(0 - x, faceZ - (position[2] + z)),
      });
    }
    return arr;
  }, [count, area, faceZ, position]);

  useLayoutEffect(() => {
    const b = bodies.current;
    const h = heads.current;
    if (!b || !h) return;
    b.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    h.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < count; i++) {
      _c.set(PALETTE[i % PALETTE.length]);
      b.setColorAt(i, _c);
      h.setColorAt(i, _c);
    }
    if (b.instanceColor) b.instanceColor.needsUpdate = true;
    if (h.instanceColor) h.instanceColor.needsUpdate = true;
  }, [count]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const bar = beatClock.running ? beatClock.barPhase(2) : 0;
    const pulse = beatClock.running ? 1 - beatClock.phase() : 0;
    const e = clamp(resolveEnergy(), 0, 1);

    for (let i = 0; i < people.length; i++) {
      const person = people[i];
      const sway = Math.sin(t * 1.6 + person.phase) * 0.12 * (0.4 + e);
      const bob =
        Math.abs(Math.sin(t * 2 + person.phase)) * 0.05 * (0.3 + e) +
        (person.jump > 0.7 ? pulse * 0.35 * e : 0);

      _p.set(position[0] + person.x, person.h / 2 + bob, position[2] + person.z);
      _e.set(0, person.face, sway + Math.sin(bar * Math.PI * 2 + person.phase) * 0.05);
      _q.setFromEuler(_e);
      _s.set(0.44, person.h, 0.32);
      _m.compose(_p, _q, _s);
      bodies.current?.setMatrixAt(i, _m);

      _p.set(position[0] + person.x, person.h + 0.16 + bob, position[2] + person.z);
      _s.set(0.22, 0.24, 0.22);
      _m.compose(_p, _q, _s);
      heads.current?.setMatrixAt(i, _m);
    }
    if (bodies.current) bodies.current.instanceMatrix.needsUpdate = true;
    if (heads.current) heads.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh
        ref={bodies}
        args={[undefined, undefined, count]}
        castShadow
        frustumCulled={false}
      >
        <capsuleGeometry args={[0.5, 1, 3, 6]} />
        <meshStandardMaterial roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, count]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
    </group>
  );
}
