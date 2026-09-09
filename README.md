# FIX IT COLLECTIVE

The first connected build of the Fix It Collective operating platform: public website → booking → client account → studio operations, sharing one database.

**Status: working local preview, not a live business launch.** Both the supplied Desktop folder and canonical GitHub repository were empty at inspection. No previous code, history, assets, auth configuration, database, or deployment setup was replaced.

## Run locally

Requires Node 24+. From this folder:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000. The development server seeds an illustrative service catalog, two preview professionals, two clients, and sample appointments. Visit `/signin` for client preview access, or `/signin?next=/studio` for studio preview access. You may also register a new sample client account using a password of at least 12 characters.

The **preview sign-in shortcut only exists in development**, regardless of seed settings. No shared production password is embedded. Use sample information only.

Data persists in `data/collective.sqlite`, including actual account sessions and appointments. Keep that file private and backed up if retaining a preview. It is excluded from Git. Do not use this local adapter on serverless hosting; the application explicitly refuses SQLite access on Vercel to prevent silently losing bookings.

## What works

- Blue/gold public home, service discovery, collective/team placeholders, and visit/policy pages.
- Service → professional/best available → available time → account/intake/policy → confirmation.
- Optional add-ons change duration and price before availability is calculated.
- Server-calculated schedules, buffers, booking notice/horizon, time off, professional pricing, database-enforced conflicts, atomic rescheduling and cancellation.
- Password hashing, persistent opaque sessions, role checks, request origin checks, throttled authentication, and client record ownership checks.
- Client visits/history, rebooking, profile/contact details, preferred professional, communication preference, and client-visible care notes.
- Studio Today, day/week calendar, client search, client booking, completion/no-show/cancellation, profiles/history, private/shared notes, intake acknowledgments, working hours, and time blocks.
- Appointment-derived service-value metrics and a queue of clients with completed visits but no next visit.
- Transactional event outbox and audit records; provider interfaces for payments/communications.
- Web app manifest and scalable app icon; responsive mobile layouts. No service worker or offline appointment caching.

## Routes

| Surface           | Routes                                                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| Public            | `/`, `/services`, `/collective`, `/policies`                                                                     |
| Booking & sign-in | `/book`, `/signin`                                                                                               |
| Client            | `/account`, `/account/profile`                                                                                   |
| Professional      | `/studio`, `/studio/calendar`, `/studio/clients`, `/studio/clients/[id]`, `/studio/insights`, `/studio/settings` |
| API               | `/api/auth`, `/api/availability`, `/api/appointments`, `/api/appointments/[id]`, `/api/profile`, `/api/staff`    |

The same appointment ID persists through rescheduling and is visible in both authorized client and studio views. Internal notes never enter client page data.

## Validation

```sh
npm run lint
npm run typecheck
npm test
npm run build
# With the development server running:
npm run test:e2e
npm run format:check
```

Playwright needs its Chromium browser installed (`npx playwright install chromium` on a new machine). Browser tests create only sample clients/appointments in the local development database. They check registration during booking, persistence into the staff view, private-note isolation, rescheduling, cancellation, API boundaries, responsive overflow, and WCAG accessibility rules.

## Real versus pending

Persistence and booking/account operations are real **locally**. The brand service descriptions, professionals, prices, opening hours, and policies are illustrative. There are no claimed real addresses, testimonials, biographies, certifications, or photos.

Payment processing, deposits, refunds, cards, tips, receipts, email/SMS/push delivery, staff invitations, password recovery, email verification, file uploads, memberships, waitlists, recurring bookings, retail, tax, and discounts are **not implemented as live integrations**. The UI does not pretend they work. No notification is sent and no charge is collected.

See [Architecture](docs/ARCHITECTURE.md) for boundaries and [Launch requirements](docs/LAUNCH.md) for the next phase. All design tokens start in `src/app/globals.css`; illustrative catalog and policy configuration live in `src/lib/catalog.ts`.
