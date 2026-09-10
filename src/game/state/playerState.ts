import * as THREE from "three";

/**
 * High-frequency character state. Mutated every frame by the player
 * controller and read by the camera, the cinematic director and the
 * debug panel. Deliberately NOT React state.
 */
export interface PlayerState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  /** facing angle in radians (Y axis) */
  rotationY: number;
  /** planar speed in units/second */
  speed: number;
  /** analog move input this frame, already normalised, length 0..1 */
  moveInput: THREE.Vector2;
  moveMagnitude: number;
  /** set by scene when it spawns the player so controller can reset */
  spawn: THREE.Vector3;
  spawnRotationY: number;
  /** blocks controller integration (used while a cutscene animates the body) */
  frozen: boolean;
}

export const playerState: PlayerState = {
  position: new THREE.Vector3(0, 0, 0),
  velocity: new THREE.Vector3(0, 0, 0),
  rotationY: 0,
  speed: 0,
  moveInput: new THREE.Vector2(0, 0),
  moveMagnitude: 0,
  spawn: new THREE.Vector3(0, 0, 0),
  spawnRotationY: 0,
  frozen: false,
};

export function resetPlayerTo(x: number, z: number, rotationY = 0) {
  playerState.position.set(x, 0, z);
  playerState.velocity.set(0, 0, 0);
  playerState.rotationY = rotationY;
  playerState.speed = 0;
  playerState.spawn.set(x, 0, z);
  playerState.spawnRotationY = rotationY;
  playerState.frozen = false;
}
