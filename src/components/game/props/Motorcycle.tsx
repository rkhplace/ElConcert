"use client";

import { forwardRef } from "react";
import * as THREE from "three";

export interface MotorcycleProps {
  headlight?: boolean;
  taillight?: boolean;
}

/** Stylised low-poly motorcycle. Purely visual — rides are cinematic. */
const Motorcycle = forwardRef<THREE.Group, MotorcycleProps>(function Motorcycle(
  { headlight = false, taillight = true },
  ref,
) {
  const dark = <meshStandardMaterial color="#1a1d26" roughness={0.6} metalness={0.3} />;
  const chrome = <meshStandardMaterial color="#5a6472" roughness={0.3} metalness={0.8} />;

  return (
    <group ref={ref} dispose={null}>
      {/* wheels */}
      {[-0.95, 0.95].map((z) => (
        <group key={z} position={[0, 0.42, z]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh castShadow>
            <torusGeometry args={[0.42, 0.13, 10, 20]} />
            <meshStandardMaterial color="#0c0e14" roughness={0.9} />
          </mesh>
          <mesh>
            <cylinderGeometry args={[0.16, 0.16, 0.1, 10]} />
            {chrome}
          </mesh>
        </group>
      ))}

      {/* body */}
      <mesh castShadow position={[0, 0.72, 0]}>
        <boxGeometry args={[0.34, 0.3, 1.5]} />
        {dark}
      </mesh>
      {/* tank */}
      <mesh castShadow position={[0, 0.92, 0.35]}>
        <boxGeometry args={[0.36, 0.26, 0.6]} />
        <meshStandardMaterial color="#2c3550" roughness={0.4} metalness={0.5} />
      </mesh>
      {/* seat */}
      <mesh castShadow position={[0, 0.9, -0.42]}>
        <boxGeometry args={[0.3, 0.12, 0.7]} />
        <meshStandardMaterial color="#0d0f16" roughness={0.8} />
      </mesh>
      {/* handlebar */}
      <mesh castShadow position={[0, 1.06, 0.78]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.03, 0.03, 0.7, 8]} />
        {chrome}
      </mesh>
      {/* forks */}
      <mesh castShadow position={[0, 0.72, 0.9]} rotation={[0.35, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.9, 8]} />
        {chrome}
      </mesh>

      {/* headlight */}
      <mesh position={[0, 0.95, 1.02]}>
        <sphereGeometry args={[0.11, 12, 12]} />
        <meshStandardMaterial
          color="#fff3d6"
          emissive="#ffe9bf"
          emissiveIntensity={headlight ? 3 : 0.4}
        />
      </mesh>
      {headlight && (
        <>
          <spotLight
            position={[0, 0.95, 1.1]}
            target-position={[0, 0.2, 12]}
            angle={0.5}
            penumbra={0.6}
            intensity={40}
            distance={30}
            color="#ffe9bf"
            castShadow={false}
          />
          <sprite position={[0, 0.95, 1.05]} scale={[2.2, 2.2, 1]}>
            <spriteMaterial color="#ffe9bf" transparent opacity={0.25} depthWrite={false} />
          </sprite>
        </>
      )}
      {taillight && (
        <mesh position={[0, 0.9, -0.82]}>
          <boxGeometry args={[0.12, 0.06, 0.04]} />
          <meshStandardMaterial color="#ff4d5e" emissive="#ff2b3f" emissiveIntensity={2} />
        </mesh>
      )}
    </group>
  );
});

export default Motorcycle;
