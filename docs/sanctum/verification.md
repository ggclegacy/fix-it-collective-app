# Sanctum homepage verification

## Completed checks

- 43 existing application unit tests passed, including scheduling, persistence, intake encryption, access boundaries and Business OS rules.
- Nine cinematic homepage tests passed in Chromium: immediate access, real muted inline playback, native scrolling, stopping/restarting motion, offscreen pause, reduced motion, Save-Data, failed media, autoplay rejection, live preference changes, responsive source selection, silent-control behavior and no-JavaScript content.
- The same nine homepage scenarios passed in WebKit (eight on the initial run, with the corrected responsive-grid case rerun successfully).
- Existing partner-emblem checks passed across desktop/mobile public and booking surfaces.
- Existing booking regression passed from the new hero through account creation, booking, studio visibility, private-note isolation, rescheduling and cancellation. The isolated development server requires APP_ORIGIN=http://127.0.0.1:3010.
- Automated homepage accessibility audit reported no violations after naming the existing preview-notice region.
- Lint and TypeScript checks passed. Local production build passed; Vercel also built the preview successfully.
- Desktop and mobile compositions were inspected visually, including the three portals and mobile faces/hands. Screenshots are in evidence/.

## Corrections found by verification

The former global streaming loading boundary could strand the no-JavaScript homepage behind “One moment.” Loading UI now belongs to transactional route segments. WebKit retained portal intrinsic widths after a 390-to-320px resize; minmax(0,1fr) and zero minimum widths fix the underlying grid problem. The portrait picture element now has explicit positioning for Next Image. The hero message wraps independently from the film composition.

## Media delivery

The 55-second concept film is H.264, 24 fps, silent, with faststart metadata before the media data in both exports. Desktop: 2,240,332 bytes; mobile: 952,839 bytes. Mobile frame-zero poster: 13,278 bytes; desktop arrival source image: 84,826 bytes (Next Image serves a responsive optimized version). The selected source is attached only after checking motion/data preferences. One source remains selected across orientation changes, avoiding duplicate full-film downloads.

No meaningful soundtrack was supplied, so the preview does not show a sound toggle. The approved-audio configuration and gesture-only sound implementation are present but audible output cannot be verified against a silent asset. Sound is never enabled automatically.

## Limits

This is a visual/functional preview using generated placeholder imagery, not a completed live-action film. Real-device iPhone low-power mode, hardware decoding, final footage crops, final music and field Core Web Vitals remain production acceptance work. Browser emulation and lab timings do not substitute for those checks. Existing hosted booking/account restrictions remain: the app does not enable live booking until its production backend is configured. The functioning local sample-data flow was preserved.
