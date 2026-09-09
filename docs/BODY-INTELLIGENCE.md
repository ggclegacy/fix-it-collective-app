# Body Intelligence Map

Implemented in the existing `/recovery/prepare` intake; all six steps, consent, returning-client refresh, booking references, and practitioner authorization remain in place. The public `/recovery` consultation preview remains unchanged. No additional runtime dependency was added.

## Research and decisions (9 September 2026)

- [Tablet symptom-mapping usability study](https://pmc.ncbi.nlm.nih.gov/articles/PMC6000481/): supports clear body outlines, guided views and symptom descriptors. This is adjacent evidence from clinical symptom mapping, not validation of this massage interface. We use front/back navigation, explicit anatomical left/right, and a named-area alternative.
- [Longitudinal digital pain-mapping study](https://pubmed.ncbi.nlm.nih.gov/33104012/): location, intensity and quality can be tracked together. We retain signed reports and compare their fields without inferring treatment effectiveness or calling removed regions “resolved.”
- [AMTA client communication](https://www.amtamassage.org/publications/massage-therapy-journal/better-client-communication/) and [session expectations](https://www.amtamassage.org/find-massage-therapist/what-to-expect-at-massage-session/): intake supports conversation, boundaries, pressure preferences, and relevant health context. Choosing an area does not grant treatment consent; the existing health questions and signed consent are retained.
- [AMTA SOAP notes](https://www.amtamassage.org/resources/forms-templates/soap-notes/): ongoing records belong with appointment charting. Existing encrypted, revisioned Session Mode SOAP records remain the place for treated areas, observations, response and plans. Their area options now share the client's 21-region vocabulary and retain previously selected legacy labels.
- [WCAG target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [pointer gestures](https://www.w3.org/WAI/WCAG21/Understanding/pointer-gestures.html), and [dragging alternatives](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html): 44-pixel map hit targets, named controls, keyboard-operable selects, and tap-based upper/lower detail exploration. Do not disable browser zoom. No operation requires dragging or a multi-finger gesture.
- [Native dialog behavior](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog): native modal dialogs provide top-layer rendering and modal focus behavior. Escape dismisses the region editor first; the full-screen map has an explicit return action and restores focus to its opener.
- Inspected the repository's installed Next.js 16.3.4 `use-client` documentation. The interactive map remains a client component; decrypted storage access and authorization stay server-side.

## Visual and technical approach

Shaded SVG anatomy, mineral highlights, restrained gold selections and a navy surround follow the established Recovery Room visual system. A lightweight SVG with native HTML controls avoids the extra loading, hit-testing and accessible fallback complexity of a WebGL scene. Although Three.js is installed for the separate Restore experience, it is unnecessary for a reliable intake map.

Front/back views are the navigation equivalent used in this version. Upper/lower detail enlarges the body; users can always select all areas by name. Full-screen mode uses viewport and safe-area sizing and scrolls on short screens. Reduced-motion preferences disable transitions. Selected and avoided areas use symbols and text as well as color.

Each selected region supports existing symptoms plus stiffness, numbness/tingling and recovery/fatigue; optional integer intensity 0–10; and one treatment intention (focus, normal, light pressure, avoid). Intensity is explicitly unrated until supplied. Existing reports without intensity continue to load. Boundaries take priority: the no-problem path asks before clearing symptoms and preserves avoid selections. It does not skip health or consent questions.

## Persistence and practitioner records

The existing encrypted `recovery_profiles` and `recovery_profile_revisions` payloads store the additional fields; no parallel client store or localStorage copy is created. Signed revisions are immutable snapshots used by booking references. Existing optimistic revision checks prevent overwriting another tab's save. GET remains authenticated and private/no-store. Drafts remain in memory until final submission, matching the established intake policy.

Body History sends only body reports, revision numbers, timestamps, and the no-problem answer to the client. It shows up to 12 recent signed reports. Practitioners receive an automatic deterministic Session Brief with every region's symptoms, intensity and instructions. Numbness/tingling is flagged for discussion, not interpreted. Existing health/medication flags remain clinician-review items. No LLM or external service receives health data.

Session Mode already stores encrypted SOAP revisions by appointment with author attribution and conflict checks. Updated region choices support precise treated-area documentation while preserving historical broad labels. Client self-reports and practitioner treatment records remain separate. The existing protected handoff notes are unchanged.

## Integration repairs

Inspection found an extra bound consent-text value in the existing profile upsert (seven placeholders, eight arguments). Removed the extra value; signed consent wording remains in the revision archive. Also corrected the pre-existing booking confirmation state type to match its user/client/revision string and deferred the intake-status hook's initial refresh through a cancellable callback for the existing lint rules.

## Limitations

- This is an illustrative semi-3D surface map, not a diagnostic anatomical model. No free rotation, side view, freehand drawing or custom pinch handler; guided views and detail controls provide the supported exploration.
- Body History is report history, not one report per treatment visit. It does not synthesize clinical outcomes, diagnosis, pressure recommendations or symptom severity thresholds.
- The latest 12 reports are shown; older signed reports remain stored. The page needs reload to fetch history added in another tab.
- Existing hosted Vercel preview intentionally disables account persistence. Full save/history/booking tests run against the local server and isolated SQLite database. Production still requires the existing durable database, encryption key, authentication and practitioner configuration.
- Automated browser checks cannot replace hands-on VoiceOver/TalkBack and physical iOS/Android usability testing. Client and Kamilla feedback is still needed before calling this clinically validated.

## Validation

See the implementation's new `tests/body-intelligence.test.ts` and `e2e/body-intelligence.spec.ts`. They cover old payload compatibility, invalid and contradictory values, encrypted reopen, private history, booking snapshots, responsive map behavior, modal Escape/focus, accessibility scans, draft navigation, no-problem/avoid preservation, full intake submission, reload, and returning-client comparison.

Verified locally:

- Production build, TypeScript check and ESLint: pass.
- Full backend suite: 43 tests pass, including encrypted persistence, authorization, booking lifecycle, history, and SOAP concurrency.
- Combined body-map, custom booking and business-OS browser suite: 11 tests pass, zero skipped. Includes configured Kamilla intake → booking → therapist calendar → returning visit; Katie booking/rescheduling/cancellation on desktop and mobile; encrypted SOAP revisions and front-desk access denial.
- Additional mobile rerun using actual browser touch events: both 390px and 320px tests pass.
- Final body-map rerun after consistency refinements: all 4 tests pass, including a second signed submission, reload, and both historical intensity reports.
- Axe checks: no violations in tested map and region-dialog states for WCAG 2 A/AA, 2.1 AA and 2.2 AA tags at 1440, 390 and 320 pixels. No client page errors in tested map flows.
- Native modal Escape propagation was fixed after a browser test exposed simultaneous editor/map dismissal. Focus restoration now passes.
- Visual evidence: [desktop](body-intelligence/desktop.png), [mobile](body-intelligence/mobile.png). Short viewports scroll within full-screen mode.

Browser suites used an isolated `/private/tmp/fix-it-business-os-body-final.sqlite` database, not the shared app's records. During navigation one development-server stream-close message appeared; the associated test and all client-side checks passed.
