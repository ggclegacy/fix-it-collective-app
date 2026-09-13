# Sanctum Collective cinematic homepage

## Decision before implementation

The homepage is the destination from the first paint. A native video supplies atmosphere behind persistent identity, an understandable service descriptor, navigation and two links. No modal, scroll lock, focus trap, time-dependent navigation, session gate or automatic redirect belongs in this experience. The opening promise is “A place built around becoming better.” The internal creative concept remains “Enter better. Leave stronger.” This is an editorial judgment informed by the sources below, not a claim that a particular headline has been conversion-tested.

Repository inspection found the Desktop checkout behind GitHub main. The working implementation starts from 0ced74b in an isolated worktree to preserve uncommitted recovery work. The live introduction is RestoreExperience: a fixed dialog, inert website content, locked body overflow, localStorage visit state, 29-second animation, WebGL and synthesized sound. Its six stills show an empty salon chair, towels, empty lounge, symbolic hands, coffee and a Louisiana map. There is no recorded film. None is an adequate primary image of human transformation. These assets will not drive the new homepage.

## Hospitality and storytelling

Aman describes wellness across physical and mental dimensions and personal rituals beyond a stay.[1] Six Senses places wellness, connection and destination experiences within a broader hospitality offer.[2] Their positioning supports treating Sanctum as a place with interrelated environments. This is an inference from brand presentation, not experimental evidence that video increases bookings. Preserve immediate booking and distinct paths while using the film to establish a shared emotional atmosphere.

The first frame must be beautiful and useful: never black while a logo or player initializes. Within eight seconds the permanent page copy already communicates place, purpose, hair, massage, wellness, performance and community. People looking better, releasing tension, preparing for a day and being welcomed carry the visual story. The six-chapter 55-second production arc is arrival (0–5), confidence (5–15), restore (15–25), build (25–35), belong (35–45), become (45–55). Chapter words are decorative, never live announcements or prerequisites to understanding the offer. Avoid rotating paragraphs and brand marks baked into the picture; this preserves readability and mobile framing.

Below the hero, “Three visions. One Sanctum.” introduces Fix It Shop, Casa Valora and Legacy Sanctum. The first two keep existing grooming and recovery routes and their working consultation/booking features. Legacy gets an honest introductory destination, without claiming unimplemented inventory, memberships or performance services are bookable. Keep the veteran-owned story below this architecture. The existing broader community and account features remain reachable.

## Autoplay and playback

Use native video, muted and playsinline, without controls, picture-in-picture, timeline or fullscreen chrome. Chrome documents muted autoplay; WebKit documents muted inline playback, visibility behavior and gesture requirements for sound.[3][4] These policies permit autoplay but do not guarantee it under every device setting, power state or network condition. Catch play() rejection and keep the poster. The webpage must remain complete if playback never starts.

A single restrained sound button is appropriate only when the selected asset actually contains audio. The first preview export will be silent, so a meaningless sound button is omitted. Production configuration can expose sound for an approved mixed audio track. Sound is off initially, changed only by a direct gesture, and silenced/paused on page hiding or scrolling beyond the hero. Explicit motion stop persists on return to view. Native video time controls chapter changes, avoiding an independent timer drifting away from footage.

## Accessibility

WCAG 2.2.2 requires a pause, stop or hide mechanism for nonessential auto-starting motion continuing beyond five seconds alongside other content.[5] A sound-only control is insufficient. Use one quiet “Still image” action instead of a player-like cluster. It replaces motion with the poster and offers “Enable motion” for deliberate reactivation. Reduced-motion preference is a separate default: do not attach a video source or download it when the preference is set. Watch preference changes, stop active playback and remove the source. Save-Data or a known 2G connection also receives the still.[6]

Decorative media has empty alternative text/aria-hidden; permanent text communicates the essential message. Do not announce chapters on a live region. Links and motion controls retain visible focus and generous touch targets. Contrast must hold on every frame through a stable dark scrim, not just on the opening still. Avoid flashing edits, forced focus changes and pointer interception. Native scroll remains available for keyboard, touch, wheel and anchors. Without JavaScript, identity, poster, navigation, booking and portals remain server rendered.

## Poster, preload and loading

Google recommends prioritizing a poster for an LCP video, and avoiding lazy loading above-the-fold LCP media.[7] Its older video basics discussion notes the competing poster download cost.[8] Resolve that tradeoff deliberately: a small responsive, eagerly fetched poster establishes the composition; attach only one selected video after preference checks. Do not preload both desktop and portrait video. Do not lazy-load the hero poster. Lower portal imagery can be lazy. No third-party player library or WebGL is necessary.

preload is a hint, not a hard bandwidth cap; autoplay/play can override it.[9] Set preload="none" before eligible source attachment and initiate playback immediately after eligibility/visibility checks. Resource avoidance comes from withholding src, not trusting preload alone. Pause when offscreen or hidden to stop decoding; pausing does not promise cancellation of bytes already requested. No full-film fetch, blob conversion or service-worker caching. Versioned local assets/CDN paths support caching and byte-range delivery. Avoid per-scroll React state updates.

## Codecs and mobile performance

Baseline delivery is H.264 MP4, yuv420p, faststart metadata at the head, 24 fps and restrained motion. This maximizes the practical compatibility of the preview and lets decoding begin without the entire file. WebM VP9 is an optional smaller alternative only after visual quality, decode energy and browser checks; AV1 is not assumed optimal on every phone.[8][9] A 55-second portrait export should target roughly 4–7 MB at 540×960 or 720×1280; desktop roughly 7–12 MB at 1280×720 or 1600×900. These are project budgets, not universal standards, and must be adjusted based on hair texture, skin quality and dark-band performance. Do not ship a 4K master as a background.

Select one source at startup using the viewport and capability data. On orientation change retain the existing source to avoid a second full download. Give portrait source its own cut and focal points; CSS object-fit: cover alone cannot preserve a face and hands spaced across a landscape frame. object-position is a framing tool, not a substitute for editorial art direction.[10] Keep significant faces/hands in the upper/middle portrait-safe region, with text below and navigation above. Test short landscapes and browser chrome using stable small viewport units; permit content growth at zoom rather than clipping controls to a rigid height.

## Scroll transition

Use the hero in normal document flow and a long bottom navy gradient matching the next section. At any playback time that gradient dissolves the image into the portal section. There is no requirement to reach a final frame; scroll never seeks or pins the film. IntersectionObserver stops playback only once the hero is out of view. Smooth anchor movement follows browser conventions and becomes immediate under reduced-motion preference. No wheel listeners, scroll hijacking, animated page zoom or fixed full-screen overlay.

## Production film and acceptance

The preview can demonstrate actual muted video delivery with an explicitly documented concept animatic. Generated stills are placeholders, not documentary footage or likenesses of the owners. Replacing them with real people is a production requirement. Capture both landscape and portrait takes, the real entrance, Katie working through hair and the finished mirror response, Kamilla applying appropriate massage pressure, a personal-care/performance ritual, warm greetings and a final shared-space shot. Obtain releases, clear music, and use real setting/product details. Do not introduce a barber pole, razor-service claim, medical-result promise, statewide map or fantasy light thread.

Acceptance includes first-load and returning navigation, scrolling within two seconds, actual video time advancement, muted state, no native controls, playback rejection, failed media, reduced motion at initial load and during playback, Save-Data source avoidance, still-image persistence, below-hero pausing, no-JS content, portrait/desktop/short-landscape overflow, keyboard use and automated contrast/accessibility. Run lint, types, relevant existing flow tests and production build. Measure lab LCP/CLS and transferred asset sizes, clearly distinguishing local lab figures from real-user Core Web Vitals; Google’s guidance makes clear LCP has multiple loading and rendering contributors.[11] Real iPhone low-power behavior remains a physical-device check beyond desktop WebKit emulation.

## Sources

1. Aman. [Wellness](https://www.aman.com/wellness). Accessed September 13, 2026. Primary brand positioning; no conversion claims inferred.
2. Six Senses. [Official homepage](https://www.sixsenses.com/en/) and [Hotels and resorts](https://www.sixsenses.com/en/hotels-resorts/). Accessed September 13, 2026.
3. François Beaufort, Chrome for Developers. [Autoplay policy in Chrome](https://developer.chrome.com/blog/autoplay/). Policy dates to Chrome 66; current official page checked September 13, 2026.
4. Jer Noble, WebKit. [New video policies for iOS](https://webkit.org/blog/6784/new-video-policies-for-ios/), July 25, 2016. Foundational policy, not proof of identical behavior across modern device power settings.
5. W3C WAI. [Understanding SC 2.2.2: Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html). WCAG 2.2, accessed September 13, 2026.
6. MDN. [prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion). Updated June 10, 2026; accessed September 13, 2026.
7. Jeremy Wagner and Barry Pollard, web.dev. [Lazy loading video](https://web.dev/articles/lazy-loading-video). Updated July 2, 2026.
8. web.dev. [Going beyond images with basic video for the web](https://web.dev/articles/video-basics). Accessed September 13, 2026.
9. MDN. [The video element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/video), and web.dev. [The video and source tags](https://web.dev/articles/video-and-source-tags). Accessed September 13, 2026.
10. MDN. [object-position](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/object-position). Accessed September 13, 2026.
11. web.dev. [Optimize Largest Contentful Paint](https://web.dev/articles/optimize-lcp). Accessed September 13, 2026.

Local implementation reference: Next.js 16.3.4 bundled video guide and Server/Client Components guide, read before code changes. Browser-independent content remains server rendered; the isolated media controller is the client boundary.

## Implementation record

The design decisions above were saved before source edits. During verification, the global loading boundary was found to leave a streaming loading screen visible when JavaScript was disabled. Its reusable loading component now belongs to transactional route segments; the public homepage renders directly. The existing preview banner received a named region so it is contained by an accessibility landmark. These fixes support the requirement that real site content is available immediately.

The concept now uses five human-focused images across all six narrative intervals, with a return to the entrance for the closing moment. The mobile export preserves the wider human group within a portrait navy canvas, with an identical frame-zero poster; it does not rely on a landscape center crop. All imagery remains provisional and disclosed. The old dialog component, CSS, WebGL story and synthesized soundtrack are removed.
