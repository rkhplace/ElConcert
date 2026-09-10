import * as THREE from "three";

/**
 * Unified input abstraction. Keyboard and the on-screen joystick both
 * feed the SAME movement vector — the player controller only ever reads
 * `getMovement()`, it never knows which device produced it.
 *
 * Output convention: a screen-space vector where
 *   x = right (+) / left (-)
 *   y = forward (+, "up" on screen / away from camera) / back (-)
 * with length clamped to 1. Analog magnitude is preserved.
 */

const DEAD_ZONE = 0.14;
const _v = new THREE.Vector2();

class InputManagerImpl {
  private keys = new Set<string>();
  private joystick = new THREE.Vector2(0, 0);
  private joystickActive = false;
  private interactQueued = false;
  private bound = false;

  init() {
    if (this.bound || typeof window === "undefined") return;
    window.addEventListener("keydown", this.onKeyDown, { passive: false });
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    this.bound = true;
  }

  dispose() {
    if (!this.bound) return;
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    this.bound = false;
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    this.keys.add(k);
    if (k === "e" || k === "enter" || k === " ") {
      this.interactQueued = true;
      if (k === " ") e.preventDefault();
    }
    if (["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
      e.preventDefault();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
  };

  private onBlur = () => {
    this.keys.clear();
    this.joystick.set(0, 0);
    this.joystickActive = false;
  };

  /** Called by the VirtualJoystick component. x/y already in -1..1, y up. */
  setJoystick(x: number, y: number) {
    this.joystick.set(x, y);
    this.joystickActive = true;
  }

  releaseJoystick() {
    this.joystick.set(0, 0);
    this.joystickActive = false;
  }

  /** Called by the on-screen interaction button. */
  queueInteract() {
    this.interactQueued = true;
  }

  /** Edge-triggered: returns true once per press. */
  consumeInteract(): boolean {
    if (this.interactQueued) {
      this.interactQueued = false;
      return true;
    }
    return false;
  }

  /**
   * Combined analog movement for this frame.
   * @returns object with x, y (clamped to unit circle) and magnitude 0..1
   */
  getMovement(): { x: number; y: number; magnitude: number } {
    // keyboard -> digital vector
    let kx = 0;
    let ky = 0;
    if (this.keys.has("a") || this.keys.has("arrowleft")) kx -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) kx += 1;
    if (this.keys.has("w") || this.keys.has("arrowup")) ky += 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) ky -= 1;

    _v.set(kx, ky);
    if (_v.lengthSq() > 1) _v.normalize();
    const keyboardMag = _v.length();

    // joystick -> analog vector with dead zone + re-scaled magnitude
    let jx = this.joystick.x;
    let jy = this.joystick.y;
    let joyMag = Math.min(1, Math.hypot(jx, jy));
    if (joyMag < DEAD_ZONE) {
      jx = 0;
      jy = 0;
      joyMag = 0;
    } else {
      const scaled = (joyMag - DEAD_ZONE) / (1 - DEAD_ZONE);
      const inv = scaled / joyMag;
      jx *= inv;
      jy *= inv;
      joyMag = scaled;
    }

    // pick whichever device is asking for more movement this frame
    if (joyMag >= keyboardMag) {
      return { x: jx, y: jy, magnitude: joyMag };
    }
    return { x: _v.x, y: _v.y, magnitude: keyboardMag };
  }

  isKeyDown(k: string) {
    return this.keys.has(k.toLowerCase());
  }
}

export const InputManager = new InputManagerImpl();
