"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { beatClock } from "@/game/systems/beatClock";
import { clamp, damp } from "@/lib/math";

interface StageProps {
  position?: [number, number, number];
  /** master 0..1 — the incident drives this toward ~0.15. May be a getter. */
  level?: number | (() => number);
}

const LED_FRAG = `
  precision mediump float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uBeat;
  uniform float uLevel;
  void main() {
    vec2 uv = vUv;
    float bars = step(0.5, fract(uv.x * 14.0 + sin(uv.y * 6.0 + uTime * 0.6)));
    float scan = 0.5 + 0.5 * sin(uv.y * 40.0 - uTime * 3.0);
    float wave = 0.5 + 0.5 * sin(uv.x * 8.0 + uTime * 1.5) * cos(uv.y * 5.0 - uTime);
    vec3 cool = vec3(0.22, 0.45, 0.95);
    vec3 violet = vec3(0.55, 0.3, 0.9);
    vec3 warm = vec3(0.95, 0.6, 0.35);
    vec3 col = mix(cool, violet, wave);
    col = mix(col, warm, uBeat * 0.35 * bars);
    col *= 0.35 + 0.65 * scan;
    col *= 0.5 + uBeat * 0.8;
    col *= uLevel;
    gl_FragColor = vec4(col, 1.0);
  }
`;
const LED_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export default function ConcertStage({ position = [0, 0, -40], level = 1 }: StageProps) {
  const ledMat = useRef<THREE.ShaderMaterial>(null);
  const spot1 = useRef<THREE.SpotLight>(null);
  const spot2 = useRef<THREE.SpotLight>(null);
  const spot3 = useRef<THREE.SpotLight>(null);
  const spot4 = useRef<THREE.SpotLight>(null);
  const cones = useRef<THREE.Group>(null);
  const glow = useRef<THREE.PointLight>(null);
  const resolveLevel = () => (typeof level === "function" ? level() : level);
  const shownLevel = useRef(resolveLevel());

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uBeat: { value: 0 }, uLevel: { value: 1 } }),
    [],
  );

  const smoke = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        x: (Math.random() - 0.5) * 24,
        y: 1 + Math.random() * 4,
        z: -3 - Math.random() * 6,
        s: 8 + Math.random() * 8,
        sp: 0.1 + Math.random() * 0.2,
        ph: Math.random() * 10,
      })),
    [],
  );

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const t = state.clock.elapsedTime;
    shownLevel.current = damp(shownLevel.current, resolveLevel(), 3, dt);
    const lv = shownLevel.current;

    const beat = beatClock.running ? Math.pow(1 - beatClock.phase(), 2) : 0.15;
    const bar = beatClock.running ? beatClock.barPhase(4) : 0;

    if (ledMat.current) {
      uniforms.uTime.value = t;
      uniforms.uBeat.value = beat * lv;
      uniforms.uLevel.value = clamp(lv, 0.05, 1);
    }

    const sweep = Math.sin(bar * Math.PI * 2);
    const spots = [spot1, spot2, spot3, spot4];
    spots.forEach((s, i) => {
      if (!s.current) return;
      const dir = i % 2 === 0 ? 1 : -1;
      s.current.target.position.set(
        position[0] + sweep * 10 * dir + (i - 1.5) * 3,
        0,
        position[2] + 14 + Math.cos(t * 0.7 + i) * 4,
      );
      s.current.target.updateMatrixWorld();
      s.current.intensity = (i < 2 ? 60 : 40) * (0.25 + beat * 0.9) * lv;
    });

    if (cones.current) {
      cones.current.children.forEach((c, i) => {
        const m = (c as THREE.Mesh).material as THREE.MeshBasicMaterial;
        m.opacity = (0.04 + beat * 0.12) * lv;
        c.rotation.z = Math.sin(t * 0.6 + i) * 0.25;
      });
    }

    if (glow.current) glow.current.intensity = (8 + beat * 26) * lv;

    if (cones.current) {
      // reuse cones group timing for smoke drift handled below
    }
  });

  const truss = <meshStandardMaterial color="#0d0f16" roughness={0.7} metalness={0.5} />;

  return (
    <group position={position}>
      {/* stage deck */}
      <mesh receiveShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[30, 1, 12]} />
        <meshStandardMaterial color="#0a0c14" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.02, 0]}>
        <boxGeometry args={[29, 0.04, 11]} />
        <meshStandardMaterial color="#161a26" roughness={0.4} metalness={0.3} />
      </mesh>

      {/* LED wall */}
      <mesh position={[0, 7, -5.6]}>
        <planeGeometry args={[26, 12]} />
        <shaderMaterial
          ref={ledMat}
          uniforms={uniforms}
          vertexShader={LED_VERT}
          fragmentShader={LED_FRAG}
          toneMapped={false}
        />
      </mesh>
      {/* side LED strips */}
      {[-13.5, 13.5].map((x) => (
        <mesh key={x} position={[x, 6, -3]}>
          <boxGeometry args={[0.4, 10, 0.4]} />
          <meshStandardMaterial color="#3a6bd6" emissive="#3a6bd6" emissiveIntensity={2} toneMapped={false} />
        </mesh>
      ))}

      {/* truss frame */}
      <mesh position={[0, 13, -3]}>
        <boxGeometry args={[28, 0.5, 0.5]} />
        {truss}
      </mesh>
      {[-13, 13].map((x) => (
        <mesh key={x} position={[x, 7, -3]}>
          <boxGeometry args={[0.5, 13, 0.5]} />
          {truss}
        </mesh>
      ))}

      {/* speaker stacks */}
      {[-16, 16].map((x) => (
        <group key={x} position={[x, 0, 2]}>
          {[0, 2.2, 4.4].map((y) => (
            <mesh key={y} castShadow position={[0, y + 1.2, 0]}>
              <boxGeometry args={[2.4, 2, 2.2]} />
              <meshStandardMaterial color="#0c0e15" roughness={0.85} />
            </mesh>
          ))}
        </group>
      ))}

      {/* moving heads */}
      <spotLight ref={spot1} position={[-10, 12.5, -2]} angle={0.32} penumbra={0.7} distance={60} color="#6ea8ff" castShadow={false} />
      <spotLight ref={spot2} position={[10, 12.5, -2]} angle={0.32} penumbra={0.7} distance={60} color="#b98bff" castShadow={false} />
      <spotLight ref={spot3} position={[-4, 12.5, -2]} angle={0.28} penumbra={0.8} distance={55} color="#ffd9a8" castShadow={false} />
      <spotLight ref={spot4} position={[4, 12.5, -2]} angle={0.28} penumbra={0.8} distance={55} color="#8ff0e0" castShadow={false} />

      {/* fake volumetric cones */}
      <group ref={cones}>
        {[-10, -4, 4, 10].map((x, i) => (
          <mesh key={x} position={[x, 7, -2]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[3.4, 12, 16, 1, true]} />
            <meshBasicMaterial
              color={i % 2 ? "#b98bff" : "#6ea8ff"}
              transparent
              opacity={0.08}
              depthWrite={false}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ))}
      </group>

      {/* smoke */}
      {smoke.map((s, i) => (
        <sprite key={i} position={[s.x, s.y, s.z]} scale={[s.s, s.s, 1]}>
          <spriteMaterial
            color="#2a3350"
            transparent
            opacity={0.12}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      ))}

      <pointLight ref={glow} position={[0, 4, 4]} color="#7aa2ff" intensity={12} distance={40} decay={2} />
    </group>
  );
}
