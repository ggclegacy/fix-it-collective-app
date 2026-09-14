/** Offline photographic film. People remain intact; this does not synthesize actions.
 * npm install --prefix /tmp/sanctum-render @napi-rs/canvas ffmpeg-static
 * RENDER_TOOLS=/tmp/sanctum-render/node_modules node scripts/render-photo-film.mjs
 */
import { createRequire } from "node:module";
import { mkdir, writeFile, stat, rename } from "node:fs/promises";
import { spawn } from "node:child_process";
import { once } from "node:events";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(
  path.join(
    process.env.RENDER_TOOLS || "/private/tmp/sanctum-tools/node_modules",
    "loader.cjs",
  ),
);
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const ffmpeg = process.env.FFMPEG || require("ffmpeg-static");
const fps = 30,
  shotLength = 6,
  duration = 30;
const output = path.join(root, "public/sanctum/photo-film-v1");
await mkdir(output, { recursive: true });
const scenes = await Promise.all(
  [
    ["arrival.webp", "ARRIVE", 0.66],
    ["people-v2/katie.webp", "CONFIDENCE", 0.78],
    ["people-v2/kamilla.webp", "RESTORE", 0.76],
    ["people-v2/neil-tan-v3.webp", "BUILD", 0.76],
    ["belong.webp", "BELONG", 0.65],
  ].map(async ([file, word, focus]) => ({
    image: await loadImage(path.join(root, "public/sanctum", file)),
    word,
    focus,
  })),
);

function frame(ctx, w, h, t, mobile) {
  const index = Math.floor(t / shotLength) % scenes.length;
  const age = t % shotLength;
  const scene = (i, local) => {
    const { image, focus } = scenes[i % scenes.length];
    ctx.fillStyle = "#07141d";
    ctx.fillRect(0, 0, w, h);
    const box = mobile
      ? { x: 0, y: h * 0.09, w, h: h * 0.6 }
      : { x: 0, y: 0, w, h };
    // Fractional canvas transforms avoid integer crop/zoompan judder.
    const p = (local + 1.2) / 7.2;
    const scale =
      Math.max(box.w / image.width, box.h / image.height) * (1.045 + 0.045 * p);
    const iw = image.width * scale,
      ih = image.height * scale;
    const x = box.x - (iw - box.w) * focus - w * 0.012 * (p - 0.5);
    const y = box.y - (ih - box.h) * 0.35 + h * 0.005 * (p - 0.5);
    ctx.save();
    ctx.beginPath();
    ctx.rect(box.x, box.y, box.w, box.h);
    ctx.clip();
    ctx.drawImage(image, x, y, iw, ih);
    // Broad diffused light, not flashing exposure or particles over faces.
    const light = ctx.createRadialGradient(
      w * (0.91 - 0.12 * p),
      h * 0.18,
      0,
      w * (0.91 - 0.12 * p),
      h * 0.18,
      w * 0.65,
    );
    light.addColorStop(0, "rgba(235,185,111,0.105)");
    light.addColorStop(1, "rgba(235,185,111,0)");
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, w, h);
    // Defocused near-lens architecture travels faster than the photo plane.
    const edge = w * (0.1 - 0.15 * p);
    const shadow = ctx.createLinearGradient(
      edge - w * 0.2,
      0,
      edge + w * 0.13,
      0,
    );
    shadow.addColorStop(0, "rgba(3,10,15,.82)");
    shadow.addColorStop(0.4, "rgba(3,10,15,.42)");
    shadow.addColorStop(1, "rgba(3,10,15,0)");
    ctx.fillStyle = shadow;
    ctx.fillRect(0, 0, Math.max(0, edge + w * 0.13), h);
    const reflection = ctx.createLinearGradient(
      w * (0.94 - 0.045 * p),
      0,
      w * (1.05 - 0.045 * p),
      0,
    );
    reflection.addColorStop(0, "rgba(190,142,77,0)");
    reflection.addColorStop(0.6, "rgba(190,142,77,.09)");
    reflection.addColorStop(1, "rgba(190,142,77,0)");
    ctx.fillStyle = reflection;
    ctx.fillRect(w * 0.82, 0, w * 0.18, h);
    ctx.restore();
    if (mobile) {
      const fade = ctx.createLinearGradient(0, h * 0.5, 0, h * 0.67);
      fade.addColorStop(0, "rgba(7,20,29,0)");
      fade.addColorStop(1, "#07141d");
      ctx.fillStyle = fade;
      ctx.fillRect(0, h * 0.5, w, h * 0.5);
      const top = ctx.createLinearGradient(0, h * 0.1, 0, h * 0.2);
      top.addColorStop(0, "#07141d");
      top.addColorStop(1, "rgba(7,20,29,0)");
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, w, h * 0.2);
    }
  };
  scene(index, age);
  if (age >= 4.8) {
    const u = (age - 4.8) / 1.2;
    const eased = u * u * (3 - 2 * u);
    const boundary = (-0.22 + 1.44 * eased) * w;
    // The next shot is revealed behind a passing, defocused doorway edge.
    // No face-to-face dissolve, flashes, frame resets, or blank intervals.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, Math.max(0, boundary), h);
    ctx.clip();
    scene(index + 1, age - 6);
    ctx.restore();
    const feather = w * 0.2;
    const veil = ctx.createLinearGradient(
      boundary - feather,
      0,
      boundary + feather,
      0,
    );
    veil.addColorStop(0, "rgba(4,12,18,0)");
    veil.addColorStop(0.35, "rgba(4,12,18,.94)");
    veil.addColorStop(0.5, "rgba(4,12,18,1)");
    veil.addColorStop(0.65, "rgba(4,12,18,.94)");
    veil.addColorStop(1, "rgba(4,12,18,0)");
    ctx.fillStyle = veil;
    ctx.fillRect(boundary - feather, 0, feather * 2, h);
  }
}

for (const mobile of process.env.VARIANT === "mobile"
  ? [true]
  : [false, true]) {
  const name = mobile ? "mobile" : "desktop";
  const w = mobile ? 720 : 1280,
    h = mobile ? 1280 : 720;
  const canvas = createCanvas(w, h),
    ctx = canvas.getContext("2d");
  const destination = path.join(output, `${name}.pending.mp4`);
  const encoder = spawn(
    ffmpeg,
    [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "rawvideo",
      "-pix_fmt",
      "rgba",
      "-s",
      `${w}x${h}`,
      "-r",
      String(fps),
      "-i",
      "pipe:0",
      "-an",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      mobile ? "25" : "24",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-g",
      "60",
      destination,
    ],
    { stdio: ["pipe", "ignore", "inherit"] },
  );
  const completed = once(encoder, "close");
  for (let n = 0; n < duration * fps; n++) {
    frame(ctx, w, h, n / fps, mobile);
    if (n === 0)
      await writeFile(
        path.join(output, `${name}-poster.jpg`),
        canvas.toBuffer("image/jpeg", 88),
      );
    if (process.env.PROOF && [180, 345, 360, 540, 885].includes(n))
      await writeFile(
        path.join(output, `${name}-proof-${n}.jpg`),
        canvas.toBuffer("image/jpeg", 85),
      );
    if (
      !encoder.stdin.write(
        Buffer.from(ctx.getImageData(0, 0, w, h).data.buffer),
      )
    )
      await once(encoder.stdin, "drain");
    if (n % 180 === 0) console.log(`${name}: ${n / fps}s rendered`);
  }
  encoder.stdin.end();
  const [code] = await completed;
  if (code !== 0) throw new Error(`Encoder failed: ${code}`);
  const size = (await stat(destination)).size;
  if (size > (mobile ? 4 : 8) * 1024 * 1024)
    throw new Error(`${name} exceeds transfer budget: ${size}`);
  await rename(destination, path.join(output, `${name}.mp4`));
  console.log(`${name}: ${(size / 1024 / 1024).toFixed(2)} MiB`);
}
await writeFile(
  path.join(root, "src/lib/sanctum-film-production.json"),
  JSON.stringify(
    {
      film: {
        desktop: "/sanctum/photo-film-v1/desktop.mp4",
        mobile: "/sanctum/photo-film-v1/mobile.mp4",
        poster: "/sanctum/photo-film-v1/desktop-poster.jpg",
        mobilePoster: "/sanctum/photo-film-v1/mobile-poster.jpg",
        hasAudio: false,
        chapters: scenes.map(({ word }, i) => ({ at: i * shotLength, word })),
      },
    },
    null,
    2,
  ) + "\n",
);
