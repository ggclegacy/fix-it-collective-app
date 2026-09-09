# RESTORE cinematic entry

The existing homepage now sits behind a 29-second, user-activated RESTORE experience. The original homepage, booking, accounts and support routes remain the destination. The entry uses the official Fix It Collective artwork; the finale assembles four clipped views of that same asset into the unmodified mark. Recovery Room artwork is untouched.

## Creative implementation

0–2 seconds: a small gold spark in a deep-blue field. 2–6: leather, steel, barber ritual. 6–10: warm towels, hands and relief. 10–14: two welcoming chairs and room for support. 14–18: an offered hand and an open, welcoming doorway. 18–21: the shared table. 21–24: the camera pulls out to the connected Louisiana world. 24–27: the official emblem locks together and RESTORE CONFIDENCE. TOGETHER. holds. 27–29: the emblem expands past the camera as the real homepage emerges.

This is a hybrid web-native film: art-directed photographic stills projected onto shallow curved 3D surfaces, connected by a moving Three.js camera, particles, lighting and a geographic reveal. The people within the photographs are not independently animated, and this is not a prerendered video or a fully modeled photorealistic film. The lightweight path uses the same photographs with restrained motion and crossfades. There is no stock-media dependency or generated logo. The custom scene imagery is illustrative, not documentary photography of the real premises or staff.

`src/lib/restore/story.ts` owns timing, captions and the geographic staging outline. `world.ts` owns the continuous 3D space and camera. `audio.ts` supplies optional low-level ambience, stereo-positioned tones and synthesized material cues. `restore-experience.tsx` owns the entry, playback, fallback and cleanup. `restore.css` owns the shared visual layer and homepage passage.

## User control

- First visit: ENTER THE EXPERIENCE and Skip Experience. Escape exits at any point.
- Seen before: ENTER SITE and Replay Experience. The homepage also has Replay Experience.
- Playback: pause/resume, sound off by default, optional sound toggle and progress.
- Reduced motion: ENTER SITE first; the optional story advances only when the visitor chooses Continue story. No camera motion or automatic advance.
- Keyboard focus stays within the entry/film; the site underneath is inert until handoff. Focus lands on the homepage heading after exit.
- Background tabs pause playback and audio; returning does not unexpectedly resume them.
- JavaScript disabled: the film layer is hidden and the server-rendered homepage remains available. Interactive booking retains its existing JavaScript requirements.
- Local storage is optional and contains only the versioned seen flag `fic.restore.v1`, not support-network choices.

## Performance and failure handling

The entry is server rendered with a fixed layout, a small official emblem and system fonts. Three.js and audio are dynamically imported only following user action. The six optimized WebP scene assets total approximately 430 KB; none is required for the initial entry. The lightweight player preloads one upcoming image. WebGL loads its five texture plates after activation.

Rendering is capped near 30 fps, with device pixel ratio capped at 1.5 desktop / 1.25 narrow screens. Save-Data, low memory/core hints, missing WebGL2 and software renderers select the lightweight path. Sustained slow rendering and context loss fall back without resetting the timeline. Late engine imports are ignored after 2.5 seconds; the lightweight story is already available. Missing texture plates keep the corresponding lightweight image visible. Exit/unmount releases the animation loop, geometry, materials, textures, renderer, context and audio.

The Louisiana fallback is baked from the same world using `node scripts/bake-restore.mjs`. Add `--review` to capture representative WebGL frames in `/tmp`. Close-up scene assets are authored imagery and are not overwritten by the bake script.

## Review and validation

Run `APP_ORIGIN=http://127.0.0.1:3011 npm run dev -- --port 3011` for the local preview. `TEST_PORT=3011 npm run test:e2e` targets that server without colliding with a separate project on port 3000. The cinematic suite covers entry, keyboard escape/focus, returning visits, all film chapters, pause/audio controls, mobile reduced motion, forced WebGL failure and no-JavaScript access. Existing public/booking/network tests explicitly enter the site before continuing their original flows.

Validated locally on September 9, 2026: lint and TypeScript checks; all 15 unit tests; all five cinematic browser tests against the production preview; official-brand asset checks; desktop/mobile layout and accessibility checks; client visits/preferences; and the complete booking, staff visibility, rescheduling and cancellation flow. Browser suites were run in separate targeted passes. Demo account checks use development mode because production intentionally disables preview login. Representative desktop/mobile film frames and offline WebGL camera renders were visually inspected. The in-app browser's interactive check was unavailable because its security service could not verify the action; the automated local browser suite completed independently.

Local checks and asset budgets are not a production Core Web Vitals guarantee. Validate LCP, INP and CLS with field traffic on the deployment and test physical iOS/Android devices before publishing. No production deployment is included in this change.

Implementation references: [Next.js lazy loading](https://nextjs.org/docs/app/guides/lazy-loading), [Three.js renderer controls](https://threejs.org/docs/pages/WebGLRenderer.html).
