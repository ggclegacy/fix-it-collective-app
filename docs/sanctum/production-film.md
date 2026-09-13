# Sanctum production film brief

## Preview versus final footage

The homepage currently plays a 55-second, silent H.264 concept animatic made from five generated editorial stills, with subtle movement and dissolves. It demonstrates the complete page behavior and six-part timing. It is not footage of the premises, Katie, Kamilla, their clients or their services. The public page marks the imagery as conceptual. No old map, empty-chair, floating-thread or product-led scenes are used.

The final commissioned edit must replace both MP4 exports and posters. Keep the same permanent UI. The website never waits for the film, including during its closing shot. All essential brand meaning remains in normal HTML even with media unavailable.

| Time | Chapter | Required production replacement | Framing / transition |
| --- | --- | --- | --- |
| 0–5 | Arrival | Actual dark entrance opens into warm light; a guest crosses the threshold and is welcomed. | Establish a human in the first shot; no black lead. Eunice is small HTML text, never a map. First and last shots should join naturally. |
| 5–15 | Confidence | Katie drapes cape, works through hair with scissors, finishes texture, and the real client responds to their reflection. | Human face plus working hands. Match cut from doorway hand to stylist hand. No pole or implied barber licensing. |
| 15–25 | Restore | Kamilla prepares the room, applies controlled professional pressure, and a properly draped client visibly relaxes. | Match cut hands to hands; use authentic massage practice and consent. Navy, cream and warm practical light. |
| 25–35 | Build | Personal-care ritual, water, recovery/training preparation, someone heading into their day. | A person performs an action; objects support it. Avoid product label closeups or unsupported health claims. |
| 35–45 | Belong | Katie talks with a client; Kamilla greets a guest; authentic coffee conversation, laughter and welcome. | Faces matter. Include men and women; avoid a staged corporate handshake montage. |
| 45–55 | Become / The Sanctum | Elegant montage of real hair, massage, wellness, conversation and mirror shots resolves to the shared destination and open door. | Slow final two seconds; neutral exposure joining the first shot. The page supplies the name and CTAs throughout. |

## Delivery specification

Deliver a 16:9 desktop cut and separately composed portrait cut. Supply clean masters without baked captions or logos. Keep people and actions in the upper/middle mobile frame and preserve clear space for navigation above and the message below. Verify each shot at 320, 390 and 430 CSS pixels wide; do not assume a centered crop is safe. In the concept mobile export, a wider crop is placed in the upper portion of a navy portrait canvas to retain groups and hands.

Start with 24 fps H.264 MP4, yuv420p, faststart enabled. Optional VP9 WebM must earn inclusion through lower bytes and actual-device smoothness. Avoid massive 4K background files. Production targets: mobile 4–7 MB or less at 540×960/720×1280; desktop 7–12 MB or less at 1280×720/1600×900. These are quality budgets, not fixed requirements. Generate posters from frame zero and inspect the image-to-motion transition. Choose the first poster as intentionally as any print campaign.

Sound is off by default. The current preview has no audio track, so it correctly has no sound toggle. If a cleared ambient mix is supplied, set hasAudio true in src/lib/sanctum-film.ts; the existing restrained sound button then unmutes only on a direct gesture, and media is silenced when hidden/offscreen. Do not add spoken information absent from the HTML; if voiceover becomes essential, provide a separate accessible film presentation with captions/transcript rather than hiding it in background video.

## Asset map and provenance

All generated images used the built-in image generation tool, photorealistic-natural direction, on September 13, 2026. They are fictional visual placeholders. No source images claimed to depict real staff were supplied. Saved web assets:

- public/sanctum/arrival.webp — doorway and welcoming people.
- public/sanctum/confidence.webp — stylist finishing a client’s textured hair.
- public/sanctum/restore.webp — professional massage and a relaxed, draped client.
- public/sanctum/build.webp — personal wellness / preparation for a day.
- public/sanctum/belong.webp — relaxed conversation in a shared place.
- public/sanctum/poster-mobile.webp — portrait frame zero extracted from the video.
- public/sanctum/concept-desktop-v1.mp4 and concept-mobile-v1.mp4 — generated stills assembled as a silent animatic.

## Prompt set

Common direction: one 16:9 photorealistic editorial image; premium but believable small Louisiana-town hospitality; deep navy interiors, gold practical daylight, natural cream skin, documentary 35mm feel. People grouped middle/right, left third dark editorial space. No text, logos, barber poles, fantasy architecture, floating gold threads, nightclub lighting, or fake product labels. Fictional casting; never a real owner likeness.

Arrival: adult male guest stepping through a real dark timber doorway into warm light, welcomed with a natural smile by an adult female host in black. Both heads and welcoming hands visible. Intimate scale and real materials.

Confidence: adult male client in a navy salon cape, three-quarter profile, relaxed subtle confidence, freshly styled textured hair. Female stylist in black behind him, hands gently finishing the hair. Anatomically credible hands and unretouched skin; no razor or barber-pole cues.

Restore: female massage practitioner in navy applying controlled palm pressure to an adult client’s upper back. Proper cream-towel draping and relaxed face on a headrest. Professional, modest, private environment; people and technique outweigh towels or bottles.

Build: woman in a navy athletic jacket holding water and preparing for her day, training bag at a bench. Calm confidence, face and hands visible, quiet ritual instead of product advertising.

Belong: a groomed male guest and a woman in cream knit warmly laughing with a female host at a walnut communal counter. Faces visible; subtle training tote and water suggest life beyond the visit. No glowing coffee-cup links.

## Replacement checklist

Approve actual environment names and identity assets with the business; obtain client/talent releases and clear music usage. Replace conceptual images in the portals and Legacy page as well as the film. Review the existing downstream provider pages separately for their older Recovery Room/Fix It Collective naming; the homepage now establishes Sanctum hierarchy while preserving those routes and features. Do not imply a newly named environment is a newly licensed service or an already-open retail range.
