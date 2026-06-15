/**
 * One-off PWA icon generator.  Run:  node scripts/generate-pwa-icons.cjs
 *
 * Produces, from the square brand mark (public/logo-144.png):
 *   - icon-180.png  (apple-touch-icon; opaque, iOS rounds it itself)
 *   - icon-192.png  ("any" purpose)
 *   - icon-512.png  ("any" purpose)
 *   - icon-maskable-512.png  (mark kept inside the ~60% safe zone on a
 *     full-bleed brand background so Android/Chrome masks don't clip it)
 *
 * Source is only 144px, so the 512s are mild upscales — fine for a simple
 * mark; swap in a higher-res source and re-run to sharpen.
 */
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const SRC = path.join(__dirname, "..", "public", "logo-144.png");
const OUT = path.join(__dirname, "..", "public", "icons");
const BRAND_BG = { r: 251, g: 247, b: 241, alpha: 1 }; // #FBF7F1 (manifest background_color)

fs.mkdirSync(OUT, { recursive: true });

async function compose(size, innerRatio, name) {
  const inner = Math.round(size * innerRatio);
  const logo = await sharp(SRC)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BRAND_BG } })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(path.join(OUT, name));
}

Promise.all([
  compose(180, 0.78, "icon-180.png"),
  compose(192, 0.78, "icon-192.png"),
  compose(512, 0.78, "icon-512.png"),
  compose(512, 0.6, "icon-maskable-512.png"),
])
  .then(() => console.log("PWA icons written to public/icons/"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
