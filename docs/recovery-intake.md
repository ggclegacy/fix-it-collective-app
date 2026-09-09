# Current project location

The active app is this project directory, not the older Desktop checkout. The Recovery Room stays in `ProviderEnvironment`; the full intake is additive at `/recovery/prepare`. Guests can open it immediately and sign in inline before saving. Kamilla uses the current booking engine professional ID `pro-b`. Do not replace the cinematic provider page with the old Desktop landing page.

# Recovery Room session preparation

The existing app now exposes `/recovery/prepare` through Recovery Room and My visits. It uses the existing account/session system. The six stages collect routine, a front/back body map, intention/pressure, conditional health context, medications/bruising and a signed review. Returning clients can confirm no change or select only changed categories. Full review is required after 365 days or a consent-version change; no-change never moves that deadline. The ready screen uses actual upcoming Kamilla appointment details or explicitly states that no appointment exists.

## Catalog boundary

The approved catalog currently contains only hair/grooming services and placeholder professionals. No massage prices, durations or availability have been invented. When adding the approved practitioner, use professional ID `pro-b` and service brand `recovery`. Booking confirmation and appointment cards then offer preparation automatically. The session lookup uses that practitioner ID and confirmed future appointments. Until that catalog work, clients can prepare a profile before booking. Profile completion is never treatment clearance.

## Data and access

- `src/lib/recovery/model.ts`: versioned schema, explicit screening, normalization, annual refresh and brief derivation.
- `src/lib/recovery/store.ts`: server-side data access using the existing SQLite database, isolated `recovery_profiles` and `recovery_notes` tables. Answers and signatures use AES-256-GCM with a random IV and client-bound associated data. Notes use a separate associated-data namespace. General `form_responses`, booking outbox, analytics, URLs and browser storage do not receive intake answers.
- Production requires `RECOVERY_ENCRYPTION_KEY`, exactly 64 hexadecimal characters (32 random bytes), supplied through secret management. Back up keys separately; losing the key makes records unreadable. Development creates a 0600 random key beside the configured database. Use sample data only in the existing platform preview. Encryption is not a claim of regulatory compliance.
- `RECOVERY_PRACTITIONER_USER_IDS` is a comma-separated allowlist of authenticated staff/owner user IDs. General studio access, including owner role alone, does not grant health-record access. Assign Kamilla's real account before launch. Development-only demo access is limited to `demo-staff` reading `demo-client`; it grants no access to newly created client accounts.
- Clients can read/write only their own profile. Practitioners can read authorized profiles and update the separate last-session handoff. That handoff is not a longitudinal clinical treatment-note system. It is never exposed to the client or general staff.
- Submission is validated on the server. Revisions prevent silent overwriting from concurrent windows. Hidden follow-up values are cleared when conditions no longer apply. No draft is saved to localStorage/sessionStorage. Failed saves keep in-page answers for retry; leaving before save discards them.
- Signatures carry server timestamps and a consent version. No-change confirmations preserve original signing/full-review dates and advance the confirmation date. The system retains the current profile, not historical health snapshots. Metadata-only events in `recovery_access_log` record actor, client, action and timestamp for reads/updates without answer content. Error and success responses are no-store; preparation is private, noindex and no-referrer.

## Operational launch work

Before real health information is collected, provision the encrypted durable database and secret/backups, real practitioner access, approved massage catalog and availability, and a retention/deletion policy that fits the practice. Review the intake and consent with Kamilla and the appropriate Louisiana professional/legal reviewer; the software does not assert that electronic signatures, treatment documentation or retention meet every practice obligation. Agree whether annual refresh is appropriate and version changes to consent explicitly. Set a policy for historical signed records if required: this implementation deliberately stores only the current profile. Do not use general client notes for Recovery Room health data.

The copy follows the prior brief and professional intake principles from [AMTA's session expectations](https://www.amtamassage.org/find-massage-therapist/what-to-expect-at-massage-session/), [AMTA's client communication guidance](https://www.amtamassage.org/publications/massage-therapy-journal/better-client-communication/), and [ABMP's intake, consent and treatment notes guidance](https://www.abmp.com/massage-and-bodywork-magazine/issues/julyaugust-2020/intake-informed-consent-treatment-notes). Clinical answers are surfaced for a practitioner, never interpreted as a diagnosis or automated permission to treat.

## Verification

`npm test` covers schema, conditional validation, encryption, authorization, stale writes, annual refresh, no-change dates and isolated practitioner notes. `npx playwright test e2e/recovery.spec.ts` exercises a 390px client journey, front/back marking, conditional diabetes/allergy/medication fields, consent, failed-save retry, real persistence, no-change and targeted updates, guest/cross-origin rejection, and general-staff isolation. It also verifies the authorized therapist brief and private handoff persistence. It checks serious/critical accessibility findings and overflow on key mobile screens. Screenshot evidence is written under `/tmp/recovery-*-mobile.png`.
