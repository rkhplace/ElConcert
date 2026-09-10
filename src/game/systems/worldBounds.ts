import * as THREE from "three";
import { clamp } from "@/lib/math";

export interface AABB {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * Per-scene walkable limits + solid boxes the player is pushed out of.
 * Scenes call `setBounds` on mount; the player controller reads it.
 */
class WorldBounds {
  minX = -60;
  maxX = 60;
  minZ = -400;
  maxZ = 60;
  colliders: AABB[] = [];

  set(b: Partial<Pick<WorldBounds, "minX" | "maxX" | "minZ" | "maxZ">>, colliders: AABB[] = []) {
    if (b.minX !== undefined) this.minX = b.minX;
    if (b.maxX !== undefined) this.maxX = b.maxX;
    if (b.minZ !== undefined) this.minZ = b.minZ;
    if (b.maxZ !== undefined) this.maxZ = b.maxZ;
    this.colliders = colliders;
  }

  reset() {
    this.minX = -60;
    this.maxX = 60;
    this.minZ = -400;
    this.maxZ = 60;
    this.colliders = [];
  }

  /** clamp + resolve a position in place */
  resolve(pos: THREE.Vector3, radius = 0.35) {
    pos.x = clamp(pos.x, this.minX + radius, this.maxX - radius);
    pos.z = clamp(pos.z, this.minZ + radius, this.maxZ - radius);

    for (const c of this.colliders) {
      if (
        pos.x > c.minX - radius &&
        pos.x < c.maxX + radius &&
        pos.z > c.minZ - radius &&
        pos.z < c.maxZ + radius
      ) {
        // push out along the smallest penetration axis
        const dxL = pos.x - (c.minX - radius);
        const dxR = c.maxX + radius - pos.x;
        const dzT = pos.z - (c.minZ - radius);
        const dzB = c.maxZ + radius - pos.z;
        const m = Math.min(dxL, dxR, dzT, dzB);
        if (m === dxL) pos.x = c.minX - radius;
        else if (m === dxR) pos.x = c.maxX + radius;
        else if (m === dzT) pos.z = c.minZ - radius;
        else pos.z = c.maxZ + radius;
      }
    }
  }
}

export const worldBounds = new WorldBounds();
