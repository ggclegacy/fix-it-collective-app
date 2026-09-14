# Photographic hero delivery

The user chose an offline photographic film without a paid video-generation service. The homepage now selects `photo-film-v1` through `src/lib/sanctum-film-production.json`.

## What moves

30-second loop, 30 fps: arrival (0–6), Katie (6–12), Kamilla (12–18), Neil (18–24), belonging (24–30). Each shot has fractional camera translation and a restrained push-in, independent near-lens shadow/reflection layers, and a broad warm light layer. During the final 1.2 seconds of each shot, a feathered dark architectural edge reveals the next shot. The last reveal leads back into the opening with matching camera time.

This is photographic motion design, not synthesized human action. The people, room and contact points remain one intact photographic plane; there are no separately segmented people, invented hand actions, facial animation, or simulated massage. Foreground depth comes from the independently moving overlays. Keeping the existing people intact avoids distortion of likeness, tattoos and hands. Neil uses `neil-tan-v3.webp`. Real actions would require filmed or generated footage in a future delivery.

## Rendering and delivery

`scripts/render-photo-film.mjs` uses an offline Canvas renderer and FFmpeg. Install `@napi-rs/canvas` and `ffmpeg-static` in a separate tools directory and set `RENDER_TOOLS` to its node_modules path. No runtime app dependency, API key, video subscription or external media request is introduced. Set `VARIANT=mobile` for only the portrait export; default renders both. It activates the manifest only after successful rendering and size checks. Treat the versioned directory as immutable after deployment; increment its name for subsequent published exports.

H.264, yuv420p, silent MP4, faststart, keyframes every two seconds. Desktop 1280×720; mobile 720×1280 with intentional portrait framing and navy feathering behind the live page text. Transfer ceilings are 8 MiB desktop / 4 MiB mobile. The actual initial exports are approximately 2.94 / 1.50 MiB. Matching first-frame posters are included. Text and navigation remain HTML, outside the movie.

The existing player chooses one device source, handles muted inline autoplay rejection, returns to a poster after playback failure or prolonged buffering, respects reduced motion and connection-saving signals, pauses offscreen/in hidden tabs, and exposes the still-image toggle. Homepage scrolling and booking never depend on finishing the film. No full-film service-worker precache is added.

## Research basis

- [Adobe: animate a photograph](https://helpx.adobe.com/ph_fil/after-effects/how-to/animate-picture.html): distinguishes foreground/background separation and camera parallax. Full subject segmentation was deliberately not used in this delivery; the overlays provide the additional depth planes.
- [web.dev: animation performance](https://web.dev/articles/animations-guide): avoid repeated browser layout/paint work. Here the light and shadow compositing is baked offline, leaving native video playback and a simple opacity reveal in the browser.
- [FFmpeg filter reference](https://ffmpeg.org/ffmpeg-filters.html): frame/time-based composition and consistent output timing. Fractional Canvas sampling was selected to avoid coarse integer crop stepping.
- Local Next.js video guide: native video, muted inline autoplay, poster/fallback and accessible control considerations.

## Verification

Inspected desktop and portrait exports at the people scenes and a scene boundary. Adjusted portrait gradients to eliminate the image-edge line. Production build passed, targeted lint passed, and both files decoded all 900 frames without errors or detected black intervals (30 seconds, silent H.264). The browser tool refused live localhost access because it could not verify its admin policy; no alternate browser path was used to circumvent that restriction. Existing playback regression tests were updated to match the new nested asset paths but were not rerun under that browser restriction.
