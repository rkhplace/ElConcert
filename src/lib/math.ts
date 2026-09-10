/** Small, allocation-free maths helpers shared across systems. */

export const clamp = (v: number, min: number, max: number) =>
  v < min ? min : v > max ? max : v;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const invLerp = (a: number, b: number, v: number) =>
  a === b ? 0 : clamp((v - a) / (b - a), 0, 1);

export const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = invLerp(edge0, edge1, x);
  return t * t * (3 - 2 * t);
};

/**
 * Framerate-independent exponential smoothing.
 * `lambda` ~ how fast it converges (higher = snappier). dt in seconds.
 */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

/** Shortest signed angular difference a -> b, in radians (-PI..PI). */
export const angleDelta = (a: number, b: number) => {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};

/** Damp an angle the short way around. */
export const dampAngle = (
  current: number,
  target: number,
  lambda: number,
  dt: number,
) => current + angleDelta(current, target) * (1 - Math.exp(-lambda * dt));

export const randRange = (min: number, max: number) =>
  min + Math.random() * (max - min);

/** Deterministic-ish hash for stable per-instance variation. */
export const hash01 = (n: number) => {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
};
