"use client";

import { forwardRef } from "react";
import type { GroupProps } from "@react-three/fiber";
import * as THREE from "three";

export type MotorcycleProps = GroupProps & {
  headlight?: boolean;
  taillight?: boolean;
};

const WHEEL_R = 0.4;
const TUBE = 0.12;
const WHEEL_Y = 0.5;
const FRONT = -0.94; // "front" of the bike points toward -Z (the game's forward)
const REAR = 0.86;

/** Stylised low-poly motorcycle. Front faces -Z. Rides are cinematic. */
const Motorcycle = forwardRef<THREE.Group, MotorcycleProps>(function Motorcycle(
  { headlight = false, taillight = true, ...groupProps },
  ref,
) {
  const body = <meshStandardMaterial color="#1c2030" roughness={0.5} metalness={0.35} />;
  const chrome = <meshStandardMaterial color="#69727f" roughness={0.25} metalness={0.85} />;
  const rubber = <meshStandardMaterial color="#0b0d12" roughness={0.9} />;

  return (
    <group ref={ref} dispose={null} {...groupProps}>
      {/* --- wheels: disc lies in the YZ plane, hole/axle along X, rolls on Z --- */}
      {[FRONT, REAR].map((z) => (
        <group key={z} position={[0, WHEEL_Y, z]}>
          <mesh castShadow rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[WHEEL_R, TUBE, 12, 28]} />
            {rubber}
          </mesh>
          {/* rim */}
          <mesh rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[WHEEL_R * 0.6, 0.028, 8, 24]} />
            {chrome}
          </mesh>
          {/* hub + axle along X */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.07, 0.07, 0.24, 12]} />
            {chrome}
          </mesh>
          {/* brake disc */}
          <mesh position={[0.13, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.16, 0.16, 0.02, 16]} />
            <meshStandardMaterial color="#3a3f4a" metalness={0.6} roughness={0.45} />
          </mesh>
        </group>
      ))}

      {/* --- frame / body --- */}
      <mesh castShadow position={[0, 0.62, 0.06]}>
        <boxGeometry args={[0.2, 0.24, 1.05]} />
        {body}
      </mesh>
      {/* fuel tank */}
      <mesh castShadow position={[0, 0.82, -0.12]}>
        <boxGeometry args={[0.3, 0.26, 0.58]} />
        <meshStandardMaterial color="#2f3a5c" roughness={0.35} metalness={0.5} />
      </mesh>
      {/* seat */}
      <mesh castShadow position={[0, 0.8, 0.42]}>
        <boxGeometry args={[0.26, 0.12, 0.64]} />
        <meshStandardMaterial color="#0c0e15" roughness={0.8} />
      </mesh>
      {/* tail cowl */}
      <mesh castShadow position={[0, 0.84, 0.8]}>
        <boxGeometry args={[0.18, 0.1, 0.3]} />
        {body}
      </mesh>

      {/* front fork down to the front wheel */}
      <mesh castShadow position={[0, 0.56, FRONT + 0.06]} rotation={[-0.4, 0, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.98, 10]} />
        {chrome}
      </mesh>
      {/* handlebars */}
      <mesh castShadow position={[0, 1.0, FRONT + 0.2]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.022, 0.022, 0.58, 8]} />
        {chrome}
      </mesh>
      {/* rear swingarm */}
      <mesh castShadow position={[0, 0.52, REAR - 0.12]} rotation={[0.5, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.56, 8]} />
        {chrome}
      </mesh>
      {/* exhaust */}
      <mesh castShadow position={[0.17, 0.44, 0.28]} rotation={[Math.PI / 2 - 0.08, 0, 0]}>
        <cylinderGeometry args={[0.045, 0.055, 0.86, 10]} />
        {chrome}
      </mesh>

      {/* headlight (front = -Z) */}
      <mesh position={[0, 0.86, FRONT + 0.03]}>
        <sphereGeometry args={[0.1, 14, 14]} />
        <meshStandardMaterial
          color="#fff2d4"
          emissive="#ffe6bd"
          emissiveIntensity={headlight ? 3.4 : 0.5}
        />
      </mesh>
      {headlight && (
        <>
          <spotLight
            position={[0, 0.86, FRONT - 0.05]}
            target-position={[0, 0.05, FRONT - 16]}
            angle={0.5}
            penumbra={0.7}
            intensity={48}
            distance={36}
            color="#ffe6bd"
            castShadow={false}
          />
          <sprite position={[0, 0.86, FRONT - 0.02]} scale={[2.4, 2.4, 1]}>
            <spriteMaterial
              color="#ffe6bd"
              transparent
              opacity={0.28}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
        </>
      )}
      {taillight && (
        <mesh position={[0, 0.86, 0.96]}>
          <boxGeometry args={[0.13, 0.05, 0.04]} />
          <meshStandardMaterial color="#ff4d5e" emissive="#ff2b3f" emissiveIntensity={2.2} />
        </mesh>
      )}
    </group>
  );
});

export default Motorcycle;
