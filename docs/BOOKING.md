# Custom booking engine

The existing Next.js / SQLite scheduler now serves Katie (`pro-a`) and Kamilla (`pro-b`). Public booking is `/book`; the massage intake is `/recovery/prepare`. Existing immersive rooms, account routes, schedules, blocks, and audit/outbox records are retained.

## Implemented

- Professional → goal → recommended service → Central Time availability → details / signed intake → confirmation. Katie supports saved grooming preferences, optional add-ons, private reference photos and Book My Usual. Kamilla uses the shared Recovery Room intake with returning-client health confirmation and annual refresh rules.
- Durable appointment lifecycle; transactional rescheduling preserves appointment ID, original price, service duration, reset buffer and cancellation snapshot. `BEGIN IMMEDIATE` and SQLite overlap triggers prevent concurrent conflicts. Repeat submissions use unique request keys.
- Per-service approved price, duration, reset buffer, notice, booking horizon, change cutoff, deposit and card requirement. New services remain closed until configured. Development retains explicitly illustrative grooming offers for verification; massage additionally requires registered business/license fields.
- Katie/Kamilla calendar filtering and owner master calendar, day/week/agenda, existing manual creation and blocked-time/weekly-hours controls, checked-in/in-service/completed/cancelled/no-show transitions, payment balance, intake references and private review.
- Scoped client history/notes, waitlist administration, cancellation opening events, scheduled reminder intents, service value, recorded payments, utilization, rebooking, cancellation and no-show analytics.
- Server-only payment/message contracts, bounded idempotent settlement recording, notification dispatch interface, and extension tables for packages, memberships and recurring plans. These extension tables are foundations, not active subscription sales or automatic recurring reservations.

## Setup

Use Node 24+ and a persistent filesystem-backed `DATABASE_PATH`. Tables and indexes are added idempotently on startup; existing appointment rows are preserved. Back up the SQLite database before upgrading. WAL files and the database must reside together. SQLite is suitable for one persistent application host; this adapter explicitly refuses Vercel's ephemeral filesystem. A shared PostgreSQL implementation is still required for multi-host/serverless deployment.

Create real accounts through sign-up, then use the local administrative command:

```
node --import tsx scripts/assign-staff.ts <existing-email> owner
node --import tsx scripts/assign-staff.ts <katie-email> pro-a
node --import tsx scripts/assign-staff.ts <kamilla-email> pro-b
```

Never promote a development preview account for production. Disable `SEED_DEMO` in production. Set `APP_ORIGIN` to the exact site origin. Set `RECOVERY_ENCRYPTION_KEY` to a stable randomly generated 32-byte hex secret, kept in the server secret manager and backed up separately. Set `RECOVERY_PRACTITIONER_USER_IDS` to Kamilla's authorized user ID. Both calendar assignment and clinical access are checked by the booking intake endpoint. General staff do not receive intake bodies. Medical answers are never placed in appointment notes or notification payloads. Intake read auditing is supplied by the Recovery Room store.

In `/studio/settings`, approve each service and enter actual prices, durations, reset time, lead time, booking horizon and cancellation cutoff. Enter working hours, breaks/time off, address, therapist's board-registered name and license number, and establishment's registered name and license/registration number. No license number has been invented. The massage credential placements follow Louisiana board guidance: https://www.labmt.org/laws-and-rules/ and https://www.labmt.org/archived-notices/ . Owners must verify the actual registered details before launch.

## Payments and communications

No live provider or credentials were supplied. Online payment-required bookings therefore fail closed with a clear message and no charge. Services explicitly configured without an online deposit/card requirement can be booked for payment at the visit. Do not confuse service value with collected revenue.

`booking-integrations.ts` defines `DepositAdapter`, `MessageAdapter`, `recordSettlement` and `dispatchAppointmentMessage`. Connect a selected provider server-side, verify raw signed webhooks before recording settlement, and supply stable event IDs. Implement provider checkout/holds/expiry and a retrying outbox worker before enabling deposit/card-required service sales. `outbox` and `notification_jobs` preserve confirmation, reschedule, cancellation, reminder and waitlist event intent; no messages are sent automatically by the unconfigured app. Booking confirmations explicitly state that messaging is not connected. No browser receives secrets or card details.

## Business information still needed

Katie and Kamilla must approve their actual service menus and duration choices, all pricing/policy fields, schedules/breaks, license/registration details, address/directions, payment provider, communication provider, reminder timing, and staff clinical access. Reference photos have an authenticated private endpoint and a 2 MB / 12-photo client limit. Establish retention/deletion practices and database/key backups before collecting real client information.

## Verification

Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`. Browser tests: `e2e/custom-booking.spec.ts` verifies desktop/mobile Katie booking and rescheduling, disabled massage setup, and configured massage intake/therapist access using synthetic data. Use a separate `/tmp/fic-booking-*.sqlite` database, the matching `APP_ORIGIN` and `TEST_PORT`, `RECOVERY_ENCRYPTION_KEY`, and test practitioner authorization. Never run mutation tests on a live database. Another development server can be isolated with `NEXT_DIST_DIR` or a separate checkout.

The primary verification run passed 25 unit tests (including a two-process reservation race), plus four browser scenarios covering desktop/mobile booking, rescheduling and cancellation, unconfigured massage closure, and configured massage intake / practitioner privacy. Confirmation screenshots are retained under `artifacts/booking/`.

The legacy public booking → new account → staff calendar/client notes → same-record reschedule → cancellation regression also passed after its outdated Business OS heading assertion and cold-development compilation timeouts were updated. Guest/private endpoint and cross-origin mutation checks passed. Final repository lint, typecheck, production build, and diff whitespace checks passed. The wider visual tour was not completed; targeted desktop/mobile booking accessibility and overflow checks passed.
