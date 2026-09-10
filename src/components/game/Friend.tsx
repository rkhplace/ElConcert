"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Character, { CharacterHandle } from "./Character";

export interface FriendHandle {
  char: CharacterHandle | null;
  group: THREE.Group | null;
}

interface FriendProps {
  position?: [number, number, number];
  rotation?: number;
}

/** Elvira's friend. Idle "enjoying the show" by default; the venue scene
 *  drives the faint through the exposed Character handle. */
const Friend = forwardRef<FriendHandle, FriendProps>(function Friend(
  { position = [0, 0, 0], rotation = 0 },
  ref,
) {
  const group = useRef<THREE.Group>(null);
  const char = useRef<CharacterHandle>(null);
  const bob = useRef(0);

  useImperativeHandle(ref, () => ({
    get char() {
      return char.current;
    },
    get group() {
      return group.current;
    },
  }));

  // gentle "watching the concert" idle unless a scene has taken over the pose
  useFrame((state) => {
    bob.current = state.clock.elapsedTime;
  });

  return (
    <group ref={group} position={position} rotation={[0, rotation, 0]}>
      <Character ref={char} variant="friend" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.5, 20]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.26} depthWrite={false} />
      </mesh>
    </group>
  );
});

export default Friend;
