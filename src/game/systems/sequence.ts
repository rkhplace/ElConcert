import gsap from "gsap";
import * as THREE from "three";
import { game, GameState, PlayerAnim } from "@/game/state/gameState";
import { playerState } from "@/game/state/playerState";
import { cameraDirector } from "@/game/systems/cameraDirector";

/** Promise sleep. */
export const wait = (sec: number) =>
  new Promise<void>((r) => setTimeout(r, Math.max(0, sec * 1000)));

/** Show cinematic lines and resolve once the whole cue has played out. */
export const say = (
  lines: string[],
  opts?: { pace?: number },
) =>
  new Promise<void>((resolve) => {
    game().showCinematic(lines, { pace: opts?.pace, onDone: () => resolve() });
  });

export const setState = (s: GameState) => game().setState(s);
export const setAnim = (a: PlayerAnim) => game().setPlayerAnim(a);
export const setObjective = (t: string) => game().setObjective(t);
export const lockInput = (v: boolean) => game().setInputLocked(v);
export const cameraMode = (m: "follow" | "cutscene") => game().setCameraMode(m);

/** Tween the camera's desired pose. */
export const moveCamera = (
  to: { pos?: [number, number, number]; look?: [number, number, number] },
  duration = 2,
  ease = "power2.inOut",
) =>
  new Promise<void>((resolve) => {
    const tl = gsap.timeline({ onComplete: () => resolve() });
    if (to.pos) {
      tl.to(cameraDirector.pos, { x: to.pos[0], y: to.pos[1], z: to.pos[2], duration, ease }, 0);
    }
    if (to.look) {
      tl.to(
        cameraDirector.look,
        { x: to.look[0], y: to.look[1], z: to.look[2], duration, ease },
        0,
      );
    }
    if (!to.pos && !to.look) resolve();
  });

/** Walk the (frozen) player body to a point, facing the direction of travel. */
export const walkPlayerTo = (
  x: number,
  z: number,
  opts?: { speed?: number; anim?: PlayerAnim; faceOnly?: boolean },
) =>
  new Promise<void>((resolve) => {
    const p = playerState;
    p.frozen = true;
    const dx = x - p.position.x;
    const dz = z - p.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.05 && !opts?.faceOnly) p.rotationY = Math.atan2(dx, dz);
    const speed = opts?.speed ?? 1.6;
    const duration = opts?.faceOnly ? 0.5 : Math.max(0.4, dist / speed);
    game().setPlayerAnim(opts?.anim ?? (speed > 3 ? "RUN" : dist > 0.2 ? "WALK" : "IDLE"));
    gsap.to(p.position, {
      x,
      z,
      duration,
      ease: opts?.faceOnly ? "none" : "sine.inOut",
      onComplete: () => {
        game().setPlayerAnim(null);
        resolve();
      },
    });
  });

/** Face the player toward a world point without moving. */
export const facePlayer = (x: number, z: number, duration = 0.5) =>
  new Promise<void>((resolve) => {
    const p = playerState;
    const target = Math.atan2(x - p.position.x, z - p.position.z);
    const obj = { r: p.rotationY };
    // unwrap for shortest path
    let t = target;
    while (t - obj.r > Math.PI) t -= Math.PI * 2;
    while (t - obj.r < -Math.PI) t += Math.PI * 2;
    gsap.to(obj, {
      r: t,
      duration,
      ease: "power2.inOut",
      onUpdate: () => (p.rotationY = obj.r),
      onComplete: () => resolve(),
    });
  });

export const releasePlayer = () => {
  playerState.frozen = false;
  game().setPlayerAnim(null);
};

/** Fade the diegetic screen veil (used to mask scene-root swaps). */
export const veil = (to: number, duration = 0.6) =>
  new Promise<void>((resolve) => {
    const obj = { v: game().veil };
    gsap.to(obj, {
      v: to,
      duration,
      ease: "power1.inOut",
      onUpdate: () => game().setVeil(obj.v),
      onComplete: () => resolve(),
    });
  });

export const shake = (intensity: number, duration: number) => {
  if (!game().reducedMotion) cameraDirector.shake(intensity, duration);
};

export const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
