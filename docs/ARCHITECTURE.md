# Architecture and initial build decisions

## Repository inspection

The canonical Desktop directory contained no files, and GitHub reported an empty repository. There was no package manifest, framework, route, CSS, auth, database, deployment configuration, or existing Git history to preserve. A working checkout was created within the authorized workspace and is synchronized back to the canonical Desktop location at delivery. Git origin is the supplied GitHub repository.

## Stack and boundaries

Next.js App Router with React and strict TypeScript. Public narrative pages are server components. Booking and operating controls are focused client components using route handlers; business decisions are server-side. Luxon computes availability in the studio timezone; stored instants are normalized ISO UTC strings. Dependencies are pinned and locked.

- `catalog.ts`: centralized sample brand, services, add-ons, professionals, prices, and policies. This is the boundary for replacing samples with an owner-managed catalog.
- `db.ts`: local SQLite connection, schema initialization, indexes, integrity constraints/triggers, transactions, and isolated preview seed. Database I/O is server-only by import graph.
- `scheduling.ts`: quotes/availability use, ownership-aware appointment reads, booking, cancellation, rescheduling, transactional audit and message outbox.
- `auth.ts`: password hashing, cookie sessions, user/role resolution, development-only preview sessions, and persistent throttles.
- `validation.ts`, `http.ts`: request schemas, origin enforcement, consistent API responses.
- `staff.ts`: CRM aggregates derived from persisted visits.
- `types.ts`: stable domain shapes and payment/message provider contracts. Unconfigured payment adapter fails explicitly.

## Scheduling invariants

Working hours use ISO weekdays and local minutes since midnight. Each slot must fit the service + chosen add-ons + cleanup buffer, meet minimum notice, remain inside the booking horizon, and avoid appointments and blocks. Best available chooses a qualified professional at each displayed time; the selected professional and exact price are visible before confirmation.

Booking rechecks availability inside `BEGIN IMMEDIATE`; SQLite triggers provide a second guard against appointment overlaps. The same transaction saves appointment, policy/version/intake, audit, and notification intent. Concurrent double booking fails. Rescheduling updates the existing appointment atomically; failure preserves the original. Staff can cancel inside the client cutoff. Only started appointments can be completed or marked no-show. Weekly schedule changes cannot invalidate existing future appointments.

Date-only values are interpreted in America/Chicago, not the viewer's timezone. All stored intervals use UTC. DST has a dedicated test. Overnight working hours are intentionally unsupported in V1.

## Data and authorization

Users own appointments, intake responses, preferences, and care notes. Session cookies are HttpOnly, SameSite=Lax, Secure in production, expiring after seven days; only token hashes are persisted. Passwords use salted scrypt. Mutation origins must match an explicit production `APP_ORIGIN`; local development allows only the two documented loopback origins.

Every protected route handler verifies the user/role. Studio layouts and server pages also verify staff access. Public availability exposes time/professional/price only. Clients see only their appointments and notes marked `client`; internal notes are never serialized into their experience. No payment details or provider secrets are stored.

Roles presently distinguish client from studio staff/owner; staff members can see the whole studio. Fine-grained professional assignment, location roles, and owner-only administration are a launch-phase change, not an existing guarantee.

## Extensions and production migration

The local SQL adapter is an initial development source of truth. It is not a serverless production database. A production PostgreSQL repository layer should preserve these domain contracts, use UTC timestamps, explicit migrations, row ownership, transaction locks and a database exclusion constraint on professional time ranges. Catalog entities should move to relational tables for locations, services, variants, professionals, and professional offerings before admin catalog editing or multi-location use.

Use the outbox with idempotent provider workers and retry/backoff when communications are connected. Store minimal event payloads and read current appointment state before dispatch. Reminders are not yet scheduled. Versioned form responses already attach to both appointments and clients; service-specific form definitions and assignment UI are next.

Payments should have independent payment/intent/receipt/refund records, verified webhook events, idempotency keys, and a booking hold/expiration policy. Do not treat scheduled or completed service value as settled revenue. Memberships, retail, gift cards, waitlists, and community features should extend these domains after the core launch requirements pass.
