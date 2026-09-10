import * as THREE from "three";

/**
 * Draw text onto a canvas and return it as a texture. Keeps us free of
 * any external font files (nothing to 404).
 */
export function makeTextTexture(
  lines: string[],
  opts: {
    width?: number;
    height?: number;
    fontSize?: number;
    color?: string;
    bg?: string;
    weight?: string;
    letterSpacing?: number;
    align?: CanvasTextAlign;
  } = {},
): THREE.CanvasTexture {
  const {
    width = 512,
    height = 256,
    fontSize = 64,
    color = "#ffffff",
    bg = "rgba(0,0,0,0)",
    weight = "600",
    letterSpacing = 4,
    align = "center",
  } = opts;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.font = `${weight} ${fontSize}px "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  // manual letter spacing for a poster feel
  const lh = fontSize * 1.25;
  const startY = height / 2 - ((lines.length - 1) * lh) / 2;

  lines.forEach((line, i) => {
    const y = startY + i * lh;
    if (letterSpacing) {
      const chars = line.split("");
      const totalW =
        chars.reduce((w, c) => w + ctx.measureText(c).width, 0) +
        letterSpacing * (chars.length - 1);
      let x = align === "center" ? width / 2 - totalW / 2 : 24;
      ctx.textAlign = "left";
      chars.forEach((c) => {
        ctx.fillText(c, x, y);
        x += ctx.measureText(c).width + letterSpacing;
      });
      ctx.textAlign = align;
    } else {
      ctx.fillText(line, width / 2, y);
    }
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}
