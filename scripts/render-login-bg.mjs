/**
 * Render the login-bg shader frame-by-frame and pipe raw pixels
 * directly into FFmpeg for a perfectly smooth 60 fps MP4.
 *
 * Usage:  node scripts/render-login-bg.mjs
 * Requires: ffmpeg in PATH
 */

import { spawn } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { statSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Config ─────────────────────────────────────────────────
const W = 1920;
const H = 1080;
const FPS = 60;
const SHADER_SPEED = 3.0;
const LOOP_SHADER_T = 20.0;
const LOOP_SECONDS = LOOP_SHADER_T / SHADER_SPEED;
const TOTAL_FRAMES = Math.round(LOOP_SECONDS * FPS); // 400
const FRAME_DT = 1 / FPS;

const ROOT = resolve(__dirname, "..");
const OUT_FILE = resolve(ROOT, "public", "login-bg.mp4");

// ── Pre-compute lookup tables for speed ────────────────────
// UV coordinates per pixel (avoid recomputing every frame)
const minRes = Math.min(W, H);
const uvXArr = new Float64Array(W);
const uvYArr = new Float64Array(H);
for (let x = 0; x < W; x++) uvXArr[x] = ((x + 0.5) * 2.0 - W) / minRes;
for (let y = 0; y < H; y++) uvYArr[y] = ((y + 0.5) * 2.0 - H) / minRes;

// Pre-compute len and modVal per pixel
const lenArr = new Float64Array(W * H);
const modArr = new Float64Array(W * H);
for (let y = 0; y < H; y++) {
  const uy = uvYArr[y];
  for (let x = 0; x < W; x++) {
    const ux = uvXArr[x];
    const idx = y * W + x;
    lenArr[idx] = Math.sqrt(ux * ux + uy * uy);
    modArr[idx] = ((ux + uy) % 0.2 + 0.2) % 0.2;
  }
}

// Pre-compute vignette multiplier per pixel
function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
const vigArr = new Float64Array(W * H);
for (let i = 0; i < W * H; i++) {
  const vig = 1.0 - smoothstep(0.4, 1.8, lenArr[i]);
  vigArr[i] = 0.15 + 0.85 * vig;
}

// ── Render full frame into buffer ──────────────────────────
const FRAME_BYTES = W * H * 3;
const frameBuf = Buffer.alloc(FRAME_BYTES);

// i*i values: 0, 1, 4, 9, 16
const II = [0, 1, 4, 9, 16];
const LINE_W = 0.006;
const LW = [LINE_W * 0, LINE_W * 1, LINE_W * 4, LINE_W * 9, LINE_W * 16]; // pre-mult

function renderFrame(time) {
  const t = time * 0.05;
  // Pre-compute per-iteration bases
  const bases = new Float64Array(5);
  for (let i = 0; i < 5; i++) bases[i] = t + i * 0.01;

  for (let vy = 0; vy < H; vy++) {
    // Video y=0 is top, GLSL y=0 is bottom → flip
    const shaderY = H - 1 - vy;
    const rowOff = shaderY * W;
    const bufRowOff = vy * W * 3;

    for (let x = 0; x < W; x++) {
      const pi = rowOff + x;
      const len = lenArr[pi];
      const modVal = modArr[pi];
      const target = modVal - len; // pre-subtract len

      let r0 = 0, r1 = 0, r2 = 0;
      for (let i = 0; i < 5; i++) {
        const lw = LW[i];
        if (lw === 0) continue; // i=0 contributes nothing
        const b = bases[i];
        const d0 = Math.abs((((b       ) % 1 + 1) % 1) * 5.0 + target);
        const d1 = Math.abs((((b - 0.01) % 1 + 1) % 1) * 5.0 + target);
        const d2 = Math.abs((((b - 0.02) % 1 + 1) % 1) * 5.0 + target);
        r0 += lw / (d0 || 1e-6);
        r1 += lw / (d1 || 1e-6);
        r2 += lw / (d2 || 1e-6);
      }

      // Crimson tint (1.6, 0.06, 0.28) * boost 4.5
      const m = vigArr[pi];
      let r = r0 * 7.2  * m; // 1.6 * 4.5 = 7.2
      let g = r1 * 0.27 * m; // 0.06 * 4.5 = 0.27
      let b_ = r2 * 1.26 * m; // 0.28 * 4.5 = 1.26

      const bi = bufRowOff + x * 3;
      frameBuf[bi]     = r > 1 ? 255 : (r * 255) | 0;
      frameBuf[bi + 1] = g > 1 ? 255 : (g * 255) | 0;
      frameBuf[bi + 2] = b_ > 1 ? 255 : (b_ * 255) | 0;
    }
  }
}

// ── Start FFmpeg ───────────────────────────────────────────
console.log(`\n  Rendering ${TOTAL_FRAMES} frames @ ${W}x${H} -> FFmpeg (H.264, CRF 18, ${FPS} fps)\n`);

const ff = spawn("ffmpeg", [
  "-y",
  "-f", "rawvideo",
  "-pix_fmt", "rgb24",
  "-s", `${W}x${H}`,
  "-r", String(FPS),
  "-i", "pipe:0",
  "-c:v", "libx264",
  "-preset", "medium",
  "-crf", "18",
  "-pix_fmt", "yuv420p",
  "-movflags", "+faststart",
  OUT_FILE,
], { stdio: ["pipe", "inherit", "inherit"] });

ff.on("error", (err) => {
  console.error("Failed to start FFmpeg:", err.message);
  process.exit(1);
});

async function run() {
  const start = Date.now();

  for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
    const shaderTime = frame * FRAME_DT * SHADER_SPEED;
    renderFrame(shaderTime);

    // Write entire frame at once
    const ok = ff.stdin.write(frameBuf);
    if (!ok) {
      await new Promise(r => ff.stdin.once("drain", r));
    }

    if (frame % 10 === 0 || frame === TOTAL_FRAMES - 1) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      const pct = ((frame / (TOTAL_FRAMES - 1)) * 100).toFixed(0);
      const fps = (frame / (Date.now() - start) * 1000).toFixed(1);
      process.stdout.write(`\r  Frame ${frame + 1}/${TOTAL_FRAMES}  (${pct}%)  ${fps} fps  ${elapsed}s`);
    }
  }

  ff.stdin.end();
  console.log("\n\n  Waiting for FFmpeg to finish encoding...\n");

  const code = await new Promise(r => ff.on("close", r));
  if (code !== 0) {
    console.error(`FFmpeg exited with code ${code}`);
    process.exit(1);
  }

  const size = (statSync(OUT_FILE).size / 1024 / 1024).toFixed(2);
  console.log(`  Done -> ${OUT_FILE}  (${size} MB)\n`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
