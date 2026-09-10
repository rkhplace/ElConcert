"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { hash01 } from "@/lib/math";
import { makeTextTexture } from "@/lib/textTexture";

/* ------------------------------------------------------------------ ground */

export function Ground({
  size = 500,
  color = "#0b1020",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial color={color} roughness={0.95} metalness={0} />
    </mesh>
  );
}

/* ------------------------------------------------------------- street lamp */

export function StreetLamp({
  position,
  light = false,
  tone = "#f0c27b",
  height = 5,
}: {
  position: [number, number, number];
  light?: boolean;
  tone?: string;
  height?: number;
}) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.06, 0.08, height, 6]} />
        <meshStandardMaterial color="#20242e" roughness={0.8} />
      </mesh>
      <mesh position={[0.35, height - 0.1, 0]}>
        <boxGeometry args={[0.8, 0.08, 0.08]} />
        <meshStandardMaterial color="#20242e" />
      </mesh>
      <mesh position={[0.7, height - 0.2, 0]}>
        <boxGeometry args={[0.34, 0.16, 0.34]} />
        <meshStandardMaterial color={tone} emissive={tone} emissiveIntensity={2.6} toneMapped={false} />
      </mesh>
      {/* fake glow */}
      <sprite position={[0.7, height - 0.2, 0]} scale={[3.4, 3.4, 1]}>
        <spriteMaterial
          color={tone}
          transparent
          opacity={0.2}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      {light && (
        <pointLight
          position={[0.7, height - 0.35, 0]}
          color={tone}
          intensity={32}
          distance={20}
          decay={2}
          castShadow={false}
        />
      )}
    </group>
  );
}

/* -------------------------------------------------------------- low building */

export function LowBuilding({
  position,
  size = [6, 10, 6],
  seed = 1,
  windowTone = "#ffd8a8",
}: {
  position: [number, number, number];
  size?: [number, number, number];
  seed?: number;
  windowTone?: string;
}) {
  const [w, h, d] = size;
  const windows = useMemo(() => {
    const arr: { x: number; y: number; on: boolean; z: number; face: number }[] = [];
    const cols = Math.max(1, Math.floor(w / 1.6));
    const rows = Math.max(1, Math.floor(h / 2.2));
    for (let f = 0; f < 2; f++) {
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const on = hash01(seed * 13 + f * 97 + c * 7 + r * 3) > 0.55;
          arr.push({
            x: (c - (cols - 1) / 2) * 1.5,
            y: 1.4 + r * 2.1,
            z: f === 0 ? d / 2 + 0.02 : -d / 2 - 0.02,
            face: f,
            on,
          });
        }
      }
    }
    return arr;
  }, [w, h, d, seed]);

  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#141a2b" roughness={0.9} />
      </mesh>
      {windows.map((win, i) => (
        <mesh key={i} position={[win.x, win.y, win.z]} rotation={[0, win.face === 0 ? 0 : Math.PI, 0]}>
          <planeGeometry args={[0.7, 1.1]} />
          <meshStandardMaterial
            color={win.on ? windowTone : "#0c1120"}
            emissive={win.on ? windowTone : "#000000"}
            emissiveIntensity={win.on ? 1.4 : 0}
          />
        </mesh>
      ))}
    </group>
  );
}

/* --------------------------------------------------------------- ambient dust */

export function AmbientDust({
  count = 220,
  area = 40,
  height = 14,
  color = "#9fb4e6",
}: {
  count?: number;
  area?: number;
  height?: number;
  color?: string;
}) {
  const ref = useRef<THREE.Points>(null);
  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * area;
      positions[i * 3 + 1] = Math.random() * height;
      positions[i * 3 + 2] = (Math.random() - 0.5) * area;
      speeds[i] = 0.2 + Math.random() * 0.5;
    }
    return { positions, speeds };
  }, [count, area, height]);

  useFrame((_, delta) => {
    const pts = ref.current;
    if (!pts) return;
    const arr = pts.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += speeds[i] * delta * 0.6;
      arr[i * 3] += Math.sin((arr[i * 3 + 1] + i) * 0.5) * delta * 0.15;
      if (arr[i * 3 + 1] > height) arr[i * 3 + 1] = 0;
    }
    pts.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color={color}
        transparent
        opacity={0.5}
        depthWrite={false}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ------------------------------------------------------------------ sign board */

export function SignBoard({
  position,
  rotation = [0, 0, 0],
  text = "SUMMARECON",
  tone = "#8fd0ff",
  scale = 1,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  text?: string;
  tone?: string;
  scale?: number;
}) {
  const tex = useMemo(
    () => makeTextTexture([text], { color: tone, fontSize: 88, letterSpacing: 8 }),
    [text, tone],
  );
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh>
        <planeGeometry args={[8, 2]} />
        <meshBasicMaterial map={tex} transparent />
      </mesh>
      <sprite scale={[10, 3, 1]}>
        <spriteMaterial
          color={tone}
          transparent
          opacity={0.1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </group>
  );
}
