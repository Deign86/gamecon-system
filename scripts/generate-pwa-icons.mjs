/**
 * Generate PWA icons from the existing logo.png
 * Run with: node scripts/generate-pwa-icons.mjs
 */
import sharp from "sharp";

const BG = { r: 8, g: 8, b: 8, alpha: 1 }; // gc-void

const sizes = [192, 512];

for (const s of sizes) {
  await sharp("public/logo.png")
    .resize(s, s, { fit: "contain", background: BG })
    .png()
    .toFile(`public/icon-${s}.png`);

  // Maskable icons get 10% safe-zone padding
  const inner = Math.round(s * 0.8);
  await sharp("public/logo.png")
    .resize(inner, inner, { fit: "contain", background: BG })
    .extend({
      top: Math.round((s - inner) / 2),
      bottom: Math.round((s - inner) / 2),
      left: Math.round((s - inner) / 2),
      right: Math.round((s - inner) / 2),
      background: BG,
    })
    .png()
    .toFile(`public/icon-maskable-${s}.png`);

  console.log(`✓ ${s}×${s}`);
}

console.log("Done — icons written to public/");
