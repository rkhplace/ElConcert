import * as THREE from "three";
import { damp } from "@/lib/math";

/**
 * Owns the camera's *desired* pose. In follow mode the CameraController
 * fills it from the player each frame; in cutscene mode GSAP (or a scene)
 * tweens `pos` / `look` directly. The controller always damps the real
 * camera toward these targets, so scripted and free camera share one
 * smoothing path and never fight.
 */
class CameraDirector {
  pos = new THREE.Vector3(0, 3, 8);
  look = new THREE.Vector3(0, 1.2, 0);

  /** follow tuning */
  followDistance = 6.2;
  followHeight = 3.1;
  followLookHeight = 1.5;
  /** damping strength for the real camera chasing pos/look */
  stiffness = 4.5;

  private shakeAmt = 0;
  private shakeDecay = 1;
  private _tmp = new THREE.Vector3();

  /** compute the follow target from the player's transform */
  frameFollow(playerPos: THREE.Vector3, playerRotY: number) {
    // camera sits behind the player's facing, slightly above
    const behind = this._tmp.set(
      Math.sin(playerRotY) * -this.followDistance,
      this.followHeight,
      Math.cos(playerRotY) * -this.followDistance,
    );
    this.pos.copy(playerPos).add(behind);
    this.look.set(playerPos.x, playerPos.y + this.followLookHeight, playerPos.z);
  }

  shake(intensity: number, duration: number) {
    this.shakeAmt = Math.max(this.shakeAmt, intensity);
    this.shakeDecay = intensity / Math.max(0.0001, duration);
  }

  /** advance the real camera; call every frame from the controller */
  apply(camera: THREE.Camera, dt: number, reducedMotion: boolean) {
    camera.position.x = damp(camera.position.x, this.pos.x, this.stiffness, dt);
    camera.position.y = damp(camera.position.y, this.pos.y, this.stiffness, dt);
    camera.position.z = damp(camera.position.z, this.pos.z, this.stiffness, dt);

    this._tmp.set(
      damp(this._lookNow.x, this.look.x, this.stiffness, dt),
      damp(this._lookNow.y, this.look.y, this.stiffness, dt),
      damp(this._lookNow.z, this.look.z, this.stiffness, dt),
    );
    this._lookNow.copy(this._tmp);

    if (this.shakeAmt > 0.0001 && !reducedMotion) {
      const s = this.shakeAmt;
      camera.position.x += (Math.random() - 0.5) * s;
      camera.position.y += (Math.random() - 0.5) * s;
      this.shakeAmt = Math.max(0, this.shakeAmt - this.shakeDecay * dt);
    }

    camera.lookAt(this._lookNow);
  }

  private _lookNow = new THREE.Vector3(0, 1.2, 0);

  /** hard-set both real and desired pose (used on scene spawn) */
  snap(camera: THREE.Camera) {
    camera.position.copy(this.pos);
    this._lookNow.copy(this.look);
    camera.lookAt(this._lookNow);
  }
}

export const cameraDirector = new CameraDirector();
