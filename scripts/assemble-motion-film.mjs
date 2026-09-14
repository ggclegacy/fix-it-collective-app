/** Assemble actual moving footage only. Never generates motion from stills. */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
  statSync,
} from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const scenes = [
  ["arrival", 3, "ARRIVE"],
  ["katie", 7, "CONFIDENCE"],
  ["kamilla", 7, "RESTORE"],
  ["neil", 5, "BUILD"],
  ["belong", 5, "BELONG"],
  ["become", 3, "BECOME"],
];
const input = process.argv[2];
if (!input || process.argv.includes("--help")) {
  console.log(
    "Usage: node scripts/assemble-motion-film.mjs /absolute/clip-directory [--activate]\nRequires ffmpeg and ffprobe (or FFMPEG/FFPROBE paths).\nEach desktop/ and mobile/ directory must contain arrival.mp4, katie.mp4, kamilla.mp4, neil.mp4, belong.mp4, become.mp4.\nUse reviewed genuine-motion clips with independently composed portrait framing. Outputs are a review candidate unless --activate is supplied.",
  );
  process.exit(input ? 0 : 1);
}
const ffmpeg = process.env.FFMPEG || "ffmpeg";
const ffprobe = process.env.FFPROBE || "ffprobe";
function run(bin, args, capture = false) {
  const result = spawnSync(bin, args, {
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
  });
  if (result.error || result.status !== 0)
    throw new Error(result.error?.message || result.stderr || `${bin} failed`);
  return result.stdout;
}
function probe(file) {
  return JSON.parse(
    run(
      ffprobe,
      ["-v", "error", "-show_streams", "-show_format", "-of", "json", file],
      true,
    ),
  );
}
const hash = createHash("sha256");
// Complete preflight before writing or encoding any output.
for (const layout of ["desktop", "mobile"]) {
  for (const [scene, duration] of scenes) {
    const file = resolve(input, layout, `${scene}.mp4`);
    if (!existsSync(file))
      throw new Error(`Missing moving-footage clip: ${file}`);
    const info = probe(file);
    const video = info.streams.find((s) => s.codec_type === "video");
    if (!video || Number(info.format.duration) < duration)
      throw new Error(`${file} must contain at least ${duration}s of video`);
    if (layout === "mobile" && video.width >= video.height)
      throw new Error(
        `${file} must be independently composed portrait footage`,
      );
    if (layout === "desktop" && video.width <= video.height)
      throw new Error(`${file} must be landscape footage`);
    hash.update(readFileSync(file));
  }
}
// Version the encoding recipe as well as the footage, so URLs remain immutable.
hash.update("motion-film-v1-24fps-720p-desktop-portrait-crf24-26");
const version = `film-${hash.digest("hex").slice(0, 12)}`;
const out = join(root, "public", "sanctum", version);
mkdirSync(out, { recursive: true });
for (const layout of ["desktop", "mobile"]) {
  const [width, height, budget] =
    layout === "desktop" ? [1280, 720, 8_000_000] : [720, 1280, 4_000_000];
  const args = ["-hide_banner", "-loglevel", "error", "-y"];
  for (const [scene] of scenes)
    args.push("-i", resolve(input, layout, `${scene}.mp4`));
  const filters = scenes.map(
    ([, duration], i) =>
      `[${i}:v]trim=duration=${duration},setpts=PTS-STARTPTS,fps=24,scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,format=yuv420p[v${i}]`,
  );
  filters.push(
    scenes.map((_, i) => `[v${i}]`).join("") +
      `concat=n=${scenes.length}:v=1:a=0[out]`,
  );
  const output = join(out, `${layout}.mp4`);
  run(ffmpeg, [
    ...args,
    "-filter_complex_threads",
    "1",
    "-filter_complex",
    filters.join(";"),
    "-map",
    "[out]",
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    layout === "desktop" ? "24" : "26",
    "-maxrate",
    layout === "desktop" ? "2000k" : "950k",
    "-bufsize",
    layout === "desktop" ? "4000k" : "1900k",
    "-g",
    "48",
    "-movflags",
    "+faststart",
    output,
  ]);
  const info = probe(output);
  if (
    Math.abs(Number(info.format.duration) - 30) > 0.1 ||
    info.streams.some((s) => s.codec_type === "audio")
  )
    throw new Error(`Invalid delivery: ${output}`);
  if (statSync(output).size > budget)
    throw new Error(
      `${layout} exceeds ${budget} byte budget; adjust footage/encoding before activation`,
    );
  run(ffmpeg, [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    output,
    "-frames:v",
    "1",
    "-quality",
    "85",
    join(out, `poster-${layout}.webp`),
  ]);
}
let at = 0;
const chapters = scenes.map(([, seconds, word]) => {
  const entry = { at, word };
  at += seconds;
  return entry;
});
const delivery = {
  film: {
    desktop: `/sanctum/${version}/desktop.mp4`,
    mobile: `/sanctum/${version}/mobile.mp4`,
    poster: `/sanctum/${version}/poster-desktop.webp`,
    mobilePoster: `/sanctum/${version}/poster-mobile.webp`,
    hasAudio: false,
    chapters,
  },
};
writeFileSync(
  join(out, "delivery.json"),
  JSON.stringify(delivery, null, 2) + "\n",
);
if (process.argv.includes("--activate")) {
  const manifest = join(root, "src/lib/sanctum-film-production.json");
  writeFileSync(manifest + ".tmp", JSON.stringify(delivery, null, 2) + "\n");
  renameSync(manifest + ".tmp", manifest);
}
console.log(
  `Created 30-second motion film candidate: ${out}. ${process.argv.includes("--activate") ? "Activated in app." : "Review both crops and the end/start cut, then rerun with --activate."}`,
);
