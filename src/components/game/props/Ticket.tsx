"use client";

import { forwardRef, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { makeTextTexture } from "@/lib/textTexture";

interface TicketProps {
  position?: [number, number, number];
  picked?: boolean;
}

const Ticket = forwardRef<THREE.Group, TicketProps>(function Ticket(
  { position = [0, 0, 0], picked = false },
  ref,
) {
  const inner = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);

  const tex = useMemo(
    () =>
      makeTextTexture(["NEXT SHOW"], {
        width: 512,
        height: 200,
        fontSize: 60,
        color: "#0a0c14",
        bg: "#f4f1e8",
        letterSpacing: 6,
      }),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (inner.current) {
      inner.current.position.y = 1 + Math.sin(t * 1.4) * 0.12;
      inner.current.rotation.y = t * 0.7;
    }
    if (light.current) light.current.intensity = 6 + Math.sin(t * 3) * 2;
  });

  return (
    <group ref={ref} position={position}>
      <group ref={inner}>
        <mesh castShadow>
          <boxGeometry args={[1.5, 0.62, 0.04]} />
          <meshStandardMaterial
            map={tex}
            emissive="#fff4d8"
            emissiveIntensity={0.35}
            roughness={0.5}
          />
        </mesh>
        {/* perforation stub */}
        <mesh position={[0.5, 0, 0.03]}>
          <boxGeometry args={[0.02, 0.62, 0.02]} />
          <meshStandardMaterial color="#c9c3b2" />
        </mesh>
        <sprite scale={[3.4, 3.4, 1]}>
          <spriteMaterial
            color="#ffe9bf"
            transparent
            opacity={picked ? 0.05 : 0.28}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      </group>
      <pointLight
        ref={light}
        position={[0, 1.2, 0]}
        color="#ffe4b0"
        intensity={6}
        distance={12}
        decay={2}
      />
    </group>
  );
});

export default Ticket;
