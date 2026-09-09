# Resource networks

Built into the existing local preview; this change does not deploy the app or change booking/authentication. `/men` is Katie’s wellness network; `/women` is Camilla’s support network. Both are linked in the header and in a shared homepage story section. The existing text brand treatment and palette are preserved. The repository contains no approved logo artwork; do not invent or substitute marks.

## What is live in this preview

- Separate, optional guided journeys with all requested needs. Women can choose Survive, Stabilize, Restore or Ascend, skip the guide, or start unsure. These are entry points, not a required progression.
- Need-specific next steps and expandable resource profiles with specialties, intended audience, service area, delivery, payment caveats, review provenance and direct actions.
- Nine real public resources. “Public source reviewed” means public information was checked, **not** provider credential vetting, endorsement, affiliation, real-time availability, eligibility, or a guaranteed match.
- Parish filtering removes only records whose explicit coverage excludes the chosen parish. Records without a complete parish list remain visible with a coverage caveat. No precise location or device geolocation is collected.
- No account requirement, remote navigator requests, free-text intake, notifications, saved resources or referral submissions. Existing account/booking features remain separate.

## Source ledger — reviewed September 9, 2026

The authoritative URLs and review dates are also stored with each resource in `src/lib/networks.ts` and exposed in profile details.

| Resource                           | Official source                                                | Facts used                                                                                    |
| ---------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Faith House                        | https://faithhouseacadiana.com/                                | 1-888-411-1333, 24/7 crisis support, domestic violence support/shelter, seven listed parishes |
| LCADV                              | https://lcadv.org/resources-and-other-publications/            | Same statewide 24/7 hotline, local routing, member program resources                          |
| Hearts of Hope                     | https://theheartsofhope.org/                                   | 337-233-7273, 24-hour crisis support, Acadiana sexual assault services, no-cost services      |
| LaFASA                             | https://www.lafasa.org/                                        | Statewide sexual assault support; channel availability must be checked on official site       |
| Acadiana Legal Service Corporation | https://www.la-law.org/get-help/                               | 1-866-275-2572, civil legal aid application, eligibility/capacity limits                      |
| Louisiana 211                      | https://www.louisiana211.org/                                  | Dial 211, all 64 parishes, health/social service information and routing                      |
| HRSA                               | https://findahealthcenter.hrsa.gov/                            | Health-center locator, not a specialty-provider endorsement                                   |
| SAMHSA                             | https://www.samhsa.gov/resource/dbhis/findtreatmentgov-english | FindTreatment.gov mental health/substance use locator                                         |
| 988                                | https://988lifeline.org/                                       | Crisis support through call, text and chat                                                    |
| NNEDV Safety Net                   | https://www.techsafety.org/internetbrowserprivacytips          | Browser/device monitoring limitations and safer-device guidance                               |

There are nine resource records (Faith House and LCADV share the hotline). Recheck contact details before business launch and assign a named resource owner and routine review schedule. Do not copy third-party listings over an official source without reconciling differences. Phone availability, costs and eligibility can change.

## Safety boundaries

`NetworkSafety` is rendered above the shared header on `/women` and all nested women’s routes, keeping Quick Exit above the mobile menu. The fixed-at-scroll Quick Exit anchor works without JavaScript; with JavaScript it replaces the current history entry with a neutral weather site, also via Escape. Earlier entries, browser history, account/device monitoring, and network logs may still reveal visits. Never claim a safe or erased browser history. The warning is visible next to the control; deeper guidance is linked on the page.

Navigator choices live only in component memory and clear on page lifecycle events, reload and explicit reset. No choice is written to cookies, storage, URL parameters, account records or telemetry. The page uses a discreet title, no-index metadata, a no-referrer response/meta policy, and noreferrer external links. Framework/hosting cache behavior must be audited on the production target: cache directives are not a privacy guarantee. No support data is present in server-rendered personalized content because no such data is collected.

No analytics, session replay, third-party widgets, advertising, automatic geolocation or service workers were introduced. Future changes must keep those out of sensitive journeys. Do not add account redirects or marketing capture to crisis pathways. The root app still has ordinary server access logs and browser history; copy deliberately discloses that visits may be recorded.

Immediate help is reachable before the navigator. No-JavaScript users have direct hotline links, a native expandable organization list, and a native exit link. Calling/texting and visiting external sites can leave records; choose a safer device/contact method as appropriate.

## Extension contracts

`Resource`, `Need`, `NavigatorInput`, `SafeContact`, `ReferralRecord` and `SavedResource` are typed contracts, not active backend services. `matchResources` is a deterministic function suitable for a future server or navigator adapter; keep the current explicit user-choice flow as a fallback.

Before adding a partner: establish permission to list/accept referrals; verify license and relevant credentials with authoritative registries; confirm specialties, patient suitability, service area, accessibility, language support, insurance/self-pay and booking access; record reviewer, date, evidence and review expiry. Extend verification rendering before enabling `partner-vetted` records. No mock clinician profiles are published.

Before enabling referral or save features:

1. Add authenticated, authorized backend storage separated from ordinary booking and studio notes. Define least-privilege staff access, encryption, deletion/retention limits and audit access without recording sensitive content in application logs.
2. Capture explicit per-referral consent and a user-selected safe-contact method. Default to no contact, no voicemail and no notifications. Record allowed times and what may be said. Never infer consent from a booking profile, prior referral, phone number or account email.
3. Implement server-enforced transitions: need identified → matched → referral sent → accepted → scheduled → follow-up, with declined/closed alternatives, timestamps, responsible party, idempotent sends and consent revocation. Outbound click events must never count as a sent/accepted referral.
4. Confirm partner acceptance workflow, responsibilities and user-visible failure states. Do not promise monitoring, shelter availability or a response time without an operational service behind it.
5. Enable saved resources only with explicit consent, a clear removal action, expiry and safety copy; avoid device persistence by default on women's pages.
6. Any future AI navigator must rely on reviewed resources, explain uncertainty, preserve direct crisis links, avoid diagnosis/legal advice, and avoid collecting survivor narratives by default. Decide data handling and escalation with qualified operational reviewers before enabling it.

Camilla’s nonprofit vision remains a future organizational decision. The current site does not solicit donations or claim nonprofit status.

## Verification

Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:e2e`. New unit tests cover all routes to resources, coverage exclusions and medical placeholders; new browser tests cover routing, reset, storage/URL boundaries, Quick Exit history replacement and Escape, no-JavaScript help, metadata, overflow and accessibility at 1440, 700, 390 and 320 pixels. Existing end-to-end tests exercise booking/account/studio workflows.
