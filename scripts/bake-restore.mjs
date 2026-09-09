import { build } from "esbuild";
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
// Bake the lightweight Louisiana reveal from the same 3D scene.
// --review also captures representative 3D close-ups for visual verification.
const bundle = await build({
  entryPoints: ["src/lib/restore/world.ts"],
  bundle: true,
  format: "iife",
  globalName: "RestoreWorld",
  write: false,
});
console.log("Bundled world");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 1,
});
console.log("Browser ready");
await page.route("**/restore/**", async (route) => {
  const fs = await import("node:fs/promises");
  const name = new URL(route.request().url()).pathname.split("/").at(-1);
  try {
    await route.fulfill({
      body: await fs.readFile(`public/restore/${name}`),
      contentType: "image/webp",
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch {
    await route.abort();
  }
});
await page.setContent(
  '<base href="http://restore.local/"><style>html,body{margin:0;background:#061a2c}canvas{width:1600px;height:1000px;display:block}</style><canvas></canvas>',
);
await page.addScriptTag({ content: bundle.outputFiles[0].text });
await page.evaluate(() => {
  window.shotTime = 0;
  window.world = RestoreWorld.createWorld(
    document.querySelector("canvas"),
    () => {},
    true,
  );
});
console.log("World ready");
await page.waitForFunction(() => window.world.render(3), null, {
  timeout: 10000,
});
if (process.argv.includes("--review")) {
  for (const time of [3, 7, 11, 16, 19, 22]) {
    const frame = await page.evaluate((time) => {
      window.world.render(time);
      return document.querySelector("canvas").toDataURL("image/png");
    }, time);
    await sharp(Buffer.from(frame.split(",")[1], "base64"))
      .png()
      .toFile(`/tmp/restore-webgl-${time}.png`);
  }
}
await mkdir("public/restore", { recursive: true });
for (const [i, time] of [[6, 23.7]]) {
  const url = await page.evaluate((time) => {
    window.world.render(time);
    return document.querySelector("canvas").toDataURL("image/png");
  }, time);
  const png = Buffer.from(url.split(",")[1], "base64");
  await sharp(png)
    .webp({ quality: 82 })
    .toFile(`public/restore/scene-${i}.webp`);
  console.log(`Baked scene ${i} at ${time}s`);
}
await page.evaluate(() => window.world.dispose());
await browser.close();
