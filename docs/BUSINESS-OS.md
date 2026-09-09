# Fix It Collective Business OS

The private application remains at `/studio`; `/admin` redirects there. It extends the existing Next.js application and SQLite booking system without replacing public pages, provider environments, veteran branding, client identities, recovery intake, or existing reservations.

## Working flows

- Command Center: provider/company context, chronological Today list with quick client disclosure, booked value, actual receipts, working-minute utilization, unoccupied capacity, tips, retail sales, outstanding checkout, cancellations/no-shows, new/returning clients, goals, and prioritized checkout/stock/tasks.
- Existing public and staff booking share the same appointments, availability, blocks, rules, policy snapshots, waitlist and reminders. Shared provider resources additionally constrain slots and database writes. State includes requested, confirmed, checked-in, in-service, completed, checked-out, cancelled, late cancellation, and no-show. The existing booking entry creates confirmed appointments; requested is available for imported/future approval workflows. Legacy appointment status is retained as a coarse booking-occupancy state; `booking_details.stage` holds detailed progress. Checked-out requires a paid order; payment state never closes a service automatically.
- Client 360: existing search/directory, preference forms, intake, haircut references, notes, timeline of visits, acknowledgments, orders, draft communications, purchase history and per-provider relationship/return/referral information.
- Katie Chair Mode: previous visit/profile/service notes/product recommendations, lifecycle actions, append-only visit notes, existing reference photos, checkout and rebooking links.
- Kamilla Session Mode: existing recovery prep/flags/intake, lifecycle actions, structured encrypted SOAP, areas treated, techniques, pressure, response and follow-up. SOAP revisions use optimistic concurrency and retain all prior versions. Existing recovery handoffs now retain prior revisions as well.
- Checkout: completed service plus retail, server-owned prices, quantities, proportional discounts, configured tax rates and tips. Save an unpaid order, review its total, explicitly record cash received, then finish the visit and rebook. Prior appointment payments reduce the balance. No simulated card success.
- Products and inventory: owner-managed actual catalog, SKU, price, tax, reorder/replenishment thresholds; receipts, damage, adjustments, returns, and checkout sales. Stock is derived from immutable movements. Sale movements and cash receipts commit in one transaction. Insufficient stock rolls back settlement. Unpaid orders can be voided; open orders do not reserve stock.
- Business reporting: 7/30/90 days, receipts, service/retail sales, tips, recorded refunds/fees, average ticket, utilization, new/returning clients, current rebooking, mature second-visit retention, booked forecast, source counts, item/provider performance, daily receipt table and monthly receipts goals.
- Growth: explicit refresh persists deterministic overdue, underutilization, waitlist-match, replenishment, review, retention-decline and leading-source opportunities. IDs are stable, dismissals persist, no-longer-applicable signals resolve, and each insight leads to an operational record/view. Review requests and communications can be prepared as drafts; nothing is sent.
- Global command search: permitted clients, appointments, status, products, orders/unpaid status, dates/today/tomorrow and report destinations. No clinical free-text indexing or LLM dependency.
- Mobile: Today, Calendar, Clients, Growth, More and a persistent Quick Action. Desktop uses the established deep blue, cream, steel and gold variables. Private styling does not replace public branding.

## Schema and migration

`src/lib/business/schema.ts` runs the transactional `business-os-1` and `business-os-2` migrations during database initialization. Back up the database **and its WAL consistently** before first opening the upgraded application. A SQLite online backup or stopping the application before copying is appropriate. Existing rows remain in place; `booking_details` is copied into a replacement with the expanded stage constraint in a transaction. Migration startup rechecks the version after acquiring the write lock.

The migration adds organizations, locations, providers, service catalog identity, team roles, provider resources, client relationships, appointment sources, service records, encrypted SOAP revisions, orders/items/payments, products/stock movements, purchase-order foundations, gift-card foundations, message/campaign/review/lead/referral foundations, opportunities, tasks, goals and audit events. Existing `users` is the central client identity; `working_hours`, `appointments`, `blocks`, recovery intake, reference photos, entitlements, recurring plans, notification jobs and verified appointment payment events remain authoritative. Catalog names and service configuration remain owned by the existing catalog/rules layer.

The second migration adds checkout request fingerprints to databases opened during the staged rollout, preserving prior orders. Old request keys without a fingerprint fail safely rather than replaying an ambiguous checkout. Restart the application to load the new migrations.

No manual schema command is required locally. This is a single-organization application with one configured location, not a finished multi-tenant product. Organization tables prepare future expansion; they do not establish cross-organization isolation.

## Access and sensitive records

Existing `users.role` remains client/staff/owner. `team_roles` adds admin/provider/front-desk business roles and an explicit clinical flag. `staff_assignments` scopes provider and front-desk calendars. Owners manage team and inventory. Admins can operate both calendars but do not automatically receive clinical access. Front desk is explicitly denied clinical access even if an environment allowlist includes that account. An explicit clinical grant is separate from ownership.

SOAP access requires both the appointment's provider scope and clinical authorization. Intake uses the existing Recovery Room authorization. SOAP is encrypted with authenticated additional data containing appointment and revision identity. Audit events record actor, entity, action and time, without note bodies or search text. Mutation endpoints check session, origin, schema and entity authorization. Private pages and business API responses are marked no-store/noindex. No HIPAA compliance assertion is made.

## Runtime configuration

- Node **24+**, as required by the existing `node:sqlite` implementation.
- `DATABASE_PATH`: writable, persistent SQLite storage. Default remains `data/collective.sqlite`.
- `APP_ORIGIN`: exact browser origin, required for production mutations and recommended for local previews using a non-default port.
- `RECOVERY_ENCRYPTION_KEY`: stable random 32-byte key encoded as 64 hex characters. Required in production for recovery/SOAP. Store and back it up separately from the database. Development uses the existing restricted-permission local recovery key.
- `RECOVERY_PRACTITIONER_USER_IDS`: existing explicit practitioner allowlist, or use the new owner Team & Permissions clinical grant. Front-desk denial takes precedence.
- `INTAKE_ENCRYPTION_KEY`: retain the original key only when historical `private_intakes` records exist. New bookings use Recovery Room; a compatibility reader preserves old records with the same explicit clinical restrictions.
- `SEED_DEMO`: keep false in production. Development already seeds sample clients; the new Command Center labels development/demo records.
- `NEXT_DIST_DIR`: optional isolated build directory for concurrent verification.

No new payment or messaging credentials were invented. The existing durable-database guard still refuses Vercel deployment with local SQLite. Production requires a backed-up persistent host or a deliberate migration to a managed relational database, plus real staff provisioning, service prices, licenses, policies, stock, tax configuration and encryption secrets.

## Calculation definitions

Amounts are integer cents. Taxes are integer basis points and rounded per discounted line. Collected receipts are actual cash/order payment events plus verified appointment payment events, selected by payment date; tips and taxes are included. Appointment deposits are deducted from checkout balances without recording a duplicate receipt. Service/retail sales use settled orders created in the report period, before tips/tax. These are distinct views of cash flow and sales, not accounting profit.

Utilization clips appointments/buffers to working intervals and subtracts merged block intervals. Open minutes are unoccupied working minutes, not a guarantee that a service can be sold in every fragment. The booking engine rechecks notice, buffers, resources and conflicts. Rebooking is the share of period-completed clients currently holding a future appointment, not historical prebooking-at-checkout. Retention uses first visits 30–60 days ago, with a second completed visit within 30 days. Decline signals compare that cohort to first visits 60–90 days ago, require at least five clients per cohort and a ten-percentage-point decline. Missing source, fee or sufficient history remains unknown.

## Deliberately deferred

The operational core above is implemented; the entire long-term platform is not launch complete.

- Live card checkout, verified order-payment webhook implementation, card refunds, mixed tender, split payments, payouts, expense accounting and profit. `CheckoutPaymentAdapter` defines the boundary. Existing verified deposit settlement infrastructure remains; no public endpoint trusts browser payment-success claims.
- Tax-engine integration and jurisdiction configuration; rates currently come from owner-entered product/service tax settings.
- Package/membership/gift-card redemption, purchase-order receiving workflows and supplier integrations. Schema foundations and existing entitlements are preserved, not represented as working fulfillment.
- Actual campaign/review/SMS/email sending, scheduling/worker execution, opt-out enforcement at send time and delivery-provider retries. Draft records and notification jobs are not delivery.
- Resource-specific hours/blocks and conditional service-resource requirements. Current resource assignment reserves the resource for every booking by its assigned providers.
- Drag-and-drop calendar editing and a true fullscreen/distraction-free session view; existing reschedule controls and focused visit pages work.
- New-client staff onboarding without account signup, photo capture tied to a specific service revision, editable visual SOAP body maps (areas treated and existing intake body map work), finalized/signed clinical chart locking, export/retention policies and full intake revision archives.
- Historical prebooking, source acquisition cost/ROI, advanced cohort segmentation, automated growth scheduling, natural-language date/opening parsing and multi-location time zones.
- Ask Fix It execution, AI explanations or agents. Future intelligence should call the same scoped deterministic query functions and require separately authorized actions; it must never be the source of financial or clinical truth.
- Production load testing, pagination of large reports/client datasets, managed database deployment and independent security/privacy review.

## Verification

Domain tests: `npm test`. Business tests cover migration preservation/foreign keys, scope denials, checkout arithmetic/idempotency, stock rollback, immutable ledgers, explicit clinical access, encrypted revision history, stale revision rejection, scoped reporting, opportunity deduplication/resolution, shared-room conflicts and block-union capacity.

Browser suite: use an isolated database whose path starts with `/private/tmp/fix-it-business-os-`, set matching `APP_ORIGIN` and `TEST_PORT`, then run `playwright test e2e/business-os.spec.ts`. It provisions temporary test accounts only in that database. Business OS desktop/mobile screenshots are emitted under `artifacts/`; test traces remain under `test-results/`. Public booking regression tests remain in `e2e/custom-booking.spec.ts` and `e2e/platform.spec.ts`.
