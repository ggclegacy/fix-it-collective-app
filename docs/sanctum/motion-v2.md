# Current delivery

The user subsequently chose a no-subscription photographic film. See [photo-film.md](./photo-film.md) for the implemented approach. The human-action proposal below is historical and is not the current delivery.

# Reference-based cinematic production

## Current delivery status

Katie, Kamilla and Neil now have reference-based generated scene assets in public/sanctum/people-v2. The experience cards and Legacy Sanctum destination use these assets. The homepage still plays the previous concept animatic. Actual human-motion footage is **not yet generated**: no video-generation tool is connected in this session. Do not confuse the new keyframes with moving footage or regenerate a zooming slideshow as the production replacement.

The native player now releases failed/blocked/stalled transfers, retains its poster, and provides user retry; motion/data preferences and ordinary scrolling remain intact. A production manifest allows both final exports and matching posters to activate together. It is null until genuine motion assets exist.

## Identity and composition

All three scenes were generated with the built-in image-generation tool, using user-supplied photographs. Raw reference photos remain outside the public app. They are not exact documentary likenesses. Katie's visible sleeve design is approximated; selfie orientation and the unseen portion of the sleeve require confirmation before final footage. Kamilla's HEIC was decoded locally to inspect and use as a reference.

- Katie: dark brown wavy hair, light eyes, recognizable smile and colored floral sleeve. Black professional short-sleeve top, men's salon combing/finishing service. Approve tattoo side and full pattern. Avoid barber branding.
- Kamilla: warm complexion, brown eyes, dark wavy hair, navy professional attire. Palm pressure on properly draped adult client. Review technique, wrist posture, believable tissue/fabric movement and stable facial identity.
- Neil: facial reference from close-up plus shaved head, build and charcoal/black styling from seated reference. Friendly product demonstration with adult male guest. Packaging remains illustrative until actual products are supplied.

Keep each identity anchored to the same approved reference set and wardrobe. 35mm-style natural perspective, navy/cream/walnut, warm practical light, moderate depth of field. Preserve faces and hands for separately composed portrait footage. No generative logos, unverified product claims, or important text baked into video.

## Motion shot list (30 seconds)

| File        | Duration | Direction                                                                                                                              |
| ----------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| arrival.mp4 | 3s       | Door opens; guest steps in; welcoming host gesture; leaves move softly.                                                                |
| katie.mp4   | 7s       | Comb lifts one section; fingertips finish texture; cape shifts; client breathes and reacts to mirror. Keep tattoo stable.              |
| kamilla.mp4 | 7s       | One controlled palm-pressure stroke with body-weight shift, natural breathing, subtle hair and towel compression.                      |
| neil.mp4    | 5s       | Neil demonstrates a small amount of grooming product between his hands; guest responds warmly. Keep packaging and fingers stable.      |
| belong.mp4  | 5s       | Two or three people share relaxed conversation; restrained smiles, nods and small hand gestures. Reuse approved identities when shown. |
| become.mp4  | 3s       | Return toward the welcoming doorway; match opening exposure and framing for loop.                                                      |

Use single-action source clips, generating longer takes and trimming the best interval. Compose match cuts through hand movement; avoid dissolving faces together. The assembly script uses clean cuts; any intentional transition can be prepared within reviewed source clips. There is no browser-side scene swapping or canvas rendering.

## Production tools and evidence

Recommended initial workflow: Runway Gen-4 image references for approved keyframes → Gen-4.5 image-to-video. Alternatives: Veo 3.1 reference images and first/last-frame control; Seedance 2.0 for motion-reference inputs. These have not been tested against these people in this session. Provider availability, input limits and output quality must be checked on connection. Real filmed service footage remains the strongest fidelity option.

- https://help.runwayml.com/hc/en-us/articles/48324313115155-Image-to-Video-Prompting-Guide
- https://help.runwayml.com/hc/en-us/articles/40042718905875-Creating-with-Gen-4-Image-References
- https://ai.google.dev/gemini-api/docs/veo
- https://help.runwayml.com/hc/en-us/articles/50488490233363-Creating-with-Seedance-2-0
- https://web.dev/learn/performance/video-performance
- https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Video_codecs
- https://www.w3.org/WAI/WCAG21/Understanding/pause-stop-hide.html

## Assembly and activation

Prepare desktop/ and mobile/ directories containing the six named MP4 files above. Desktop inputs are landscape; mobile inputs are independently framed portrait. Install ffmpeg/ffprobe or supply FFMPEG and FFPROBE paths. Run:

```sh
node scripts/assemble-motion-film.mjs /absolute/path/to/reviewed-clips
```

Outputs: content-versioned 30-second H.264 MP4 files, 24 fps, faststart, no audio, 1280×720 desktop and 720×1280 mobile, plus posters extracted from the exact first frames and delivery.json. Enforces 8 MB/4 MB budgets and validates duration/audio before activation. Inspect video at 320/390/430px mobile and wide desktop, including hands, tattoos, reflection, loop seam and text contrast. Then use the same command with --activate to switch both exports via src/lib/sanctum-film-production.json.

The assembly step requires actual footage; it does not manufacture video from the scene images. Generation does not run in the browser. No video service API keys or raw identity photos belong in public/. No full-video service-worker precache. Select one device export per visit; keep current source through orientation changes. H.264 first; optional VP9/AV1 only after bytes and real-device hardware-decoding tests justify them.

## Generation prompts used

Katie: identity-preserving 16:9 salon scene, recognizable facial proportions/light blue eyes/dark wavy hair/colored floral sleeve, black professional attire, comb and fingertips working adult male's textured hair, navy cape, correct hands, navy/walnut/cream/gold lighting, people middle-right and dark left-third copy space; no barber-pole, razor, text or logo.

Kamilla: identity-preserving 16:9 massage scene, recognizable face/warm complexion/brown eyes/wavy brunette hair, navy scrubs, hair secured back, controlled palm pressure on draped adult female client's upper back, supported head, modest professional framing, correct hands, natural skin, navy/walnut/cream/gold lighting; no text or logos.

Neil: both photos used as references, facial features/full beard from close-up, shaved head/build/charcoal jacket-black shirt from seated photo; friendly product demonstration rubbing tiny balm amount between own hands for male guest at walnut counter; blank charcoal/amber containers, correct anatomy, warm navy/gold room, natural 35mm composition and dark left-third; no drink, invented brand or writing.

## Verification completed

- All 11 Chromium homepage scenarios passed across the main run and corrected stalled-network rerun. Both added recovery scenarios passed again after the final buffering guard.
- Production build completed successfully. TypeScript and lint passed before the final small buffering guard; final checks are run separately.
- Visually inspected all three experience cards on desktop and mobile and Neil's Legacy destination on mobile. No horizontal overflow at 390px; images loaded successfully.
- Assembly script passes syntax/help validation. Full footage encoding has not been run because the real-motion input clips are not available. No final motion delivery has been activated or deployed.
