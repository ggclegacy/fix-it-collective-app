# Provider environments

Implemented September 9, 2026 in the existing Next.js application. `/grooming` is Katie’s studio; `/recovery` is Recovery Room by Milla. `/services` remains the shared catalog and `/men` remains the existing public wellness network. Official artwork is unchanged. Atmospheric WebP assets derive from the existing cinematic project imagery; they are illustrative environments, not photographs of either provider’s actual premises.

## Working flows

- Distinct responsive provider environments, local section navigation, a clear Collective return, mobile primary action, reduced-motion and reduced-transparency fallbacks.
- Grooming service discovery uses existing catalog IDs, durations, prices and booking routes. The preview warning remains. No preview professional is silently renamed to Katie.
- Grooming DNA includes cut/style, fade, beard, product finish, routine time, consultation questions and a downloadable brief. A reference-photo preview supports JPEG/PNG/WebP up to 5 MB, uses a temporary object URL and never uploads or saves the image. URLs are revoked on replacement, removal and unmount.
- Camilla’s goal selector, seven-area body map and accessible checkbox list stay synchronized. Pressure and quiet-session preferences feed a live downloadable session brief. No treatment is recommended or booked from these selections because there is no approved Recovery Room service catalog.
- Authenticated preferences genuinely persist in the existing local database. Saving requires an explicit checkbox each time. Deletion is available on the same screen. Drafts stay in React memory; neither localStorage nor sessionStorage holds intake/preferences.
- Existing Collective visits and only client-visible notes appear in Katie’s returning-client area. These are clearly labeled Collective records, not asserted to be Katie’s work. Rebooking retains both service and professional ID.
- In the booking details step, clients can explicitly import their own saved grooming brief, review/edit it and then submit it using existing appointment intake. Importing replaces the current draft and the UI explains that booking shares the notes with studio staff. Private profiles are otherwise not shared with practitioners or staff.

## Persistence and authorization

`provider_profiles` has composite primary key `(client_id, provider)`, a schema version, preferences JSON and update timestamp. It is created idempotently through `provider-store.ts`. The `provider-profiles.ts` schema and summary formatter contain no server imports and can be reused by clients/tests.

`GET /api/provider-profile?provider=katie|camilla` reads only the authenticated user’s record. `PUT /api/provider-profile` validates a strict, length-bounded schema including literal consent. `DELETE` validates a strict provider-only request. No API accepts a target user ID. Mutations enforce the existing origin/content-type checks. No profile data is emitted in logs, marketing or notification events. The API uses existing no-store responses. Provider notes remain behind the existing client-visibility filter.

These preference records are personal planning tools, not clinical intake forms, medical records, diagnostic assessments or completed treatment records. Medical details are deferred to the practitioner. Enabling staff access later requires explicit consent rules and provider-specific access controls; do not expose the whole JSON to the existing general staff role.

## Deployment boundary

The current application explicitly rejects SQLite on Vercel. This change retains that protection. Hosted provider screens therefore offer in-memory planning and downloadable briefs with a clear account-saving-unavailable message. The local account/profile/booking implementation remains functional. The Vercel project `fix-it-collective-app` exists and is linked to `ggclegacy/fix-it-collective-app`.

**This is a deployable provider experience, not activation of live bookings/payments.** Before claiming a production business launch, implement the durable database adapter for all existing scheduling/auth tables as well as `provider_profiles`, preserve transaction and conflict invariants, migrate data, configure identity/origin/retention/backups, and run the existing security/booking checks against that adapter. Remove the hosted saving guard only after those checks pass. Do not point SQLite at ephemeral serverless storage.

## Integration contracts still needed

| Capability                         | Required source and behavior                                                                                                                                                                                            |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Katie availability                 | Approved mapping from Katie to an actual professional ID; approved offerings, schedules and pricing in the shared catalog. Existing availability endpoint remains authoritative.                                        |
| Camilla services/durations         | Approved catalog entries with `brand: recovery`, practitioner assignment, durations/buffers/pricing and working hours. Goal chips express client intent and must not create offerings or make medical promises.         |
| Saved photo library                | Private object storage, authenticated signed upload/download, ownership, MIME/content/size checks, retention/deletion and provider-specific consent. Never store photos in browser storage or public asset folders.     |
| Transformation gallery             | Approved before/after asset pairs, descriptive alt text, photographer rights and explicit client publication consent. Public lookbook stays empty until supplied; no fictional client results.                          |
| Camilla session history            | Provider-attributed appointments and versioned treatment records. Never present grooming visits or generic shared notes as Camilla treatment history.                                                                   |
| Recovery plans/progress            | Provider-approved guide records tied to a real completed session, areas addressed, follow-up, revision/approval timestamps and consent-aware visibility. No generated exercise prescription or invented progress graph. |
| Product discovery                  | Katie-approved products, fit/routine guidance and real fulfillment links. Current personalized routine is a conversation brief, not an endorsement or storefront.                                                       |
| Packages/memberships/loyalty/gifts | Approved SKUs and terms, a real entitlement/ledger model, checkout, idempotent webhooks and refunds. Current UI states these cannot be purchased.                                                                       |
| Deposits/receipts                  | Existing `PaymentProvider` contract plus verified checkout/webhooks. No card details, payment success states or receipts are fabricated.                                                                                |
| Follow-up                          | Existing transactional outbox with an actual delivery provider, opt-in, templates, unsubscribe and retry semantics. No messages sent.                                                                                   |

## Verification

The staff-note and provider-preference forms remain disabled until their JavaScript submit handlers are attached. This fixes a slow-load regression where the browser could submit a native GET and discard a staff-note draft before hydration.

New unit tests cover schema rejection and provider-specific brief generation. Browser tests cover four viewport sizes (320/390/768/1440), WCAG checks, map/list synchronization, reduced motion, draft reset, brief download, persistence/reload/deletion, unauthorized/cross-origin requests and explicit booking import. Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:e2e`. The standard test server uses port 3000. Production mutations require `APP_ORIGIN`; local development additionally accepts the active loopback origin.

### Release verification

- Lint, TypeScript and formatting checks passed for the changed code.
- All 15 unit tests passed, including scheduling conflicts, ownership and origin validation.
- All 22 browser checks passed against an isolated checkout matching the release code. Coverage includes the existing booking → staff notes → rescheduling → cancellation flow, public branding/wellness safety, and provider privacy/persistence and mobile/accessibility cases.
- Both the normal build and the hosted (`VERCEL=1`) production build passed. The provider routes prerender successfully in hosted mode without opening SQLite.
- Browser verification used Chromium at 320, 390, 768 and 1440 pixels; the expanded header was also checked at 1250 pixels. The isolated harness used longer time allowances for compilation and accessibility scans. No assertions were removed to obtain a passing result.
