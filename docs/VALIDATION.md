# Initial build verification

Verified locally on Node 24.19.0 with Next.js 16.3.4 and Chromium.

- Strict TypeScript: passed.
- ESLint: passed.
- Optimized production build: passed; 15 application pages, manifest, and six API route groups generated.
- Nine domain/database tests: passed. Covers pricing/add-ons, working hours and buffers, minimum notice, day-off behavior, client/staff persistence, database conflict triggers, atomic rescheduling rollback, role/ownership restrictions, time blocks, DST, booking horizon, and persistence after reconnect.
- Four browser tests: passed in a single run. The full workflow registered a new sample client during booking, retained the selected slot and add-on, confirmed the displayed price, persisted the appointment to both client and studio, kept an internal note private, rescheduled the same appointment ID, and cancelled it from the client account.
- Public, booking, studio, account, and profile screens checked at 1440px and 390px widths: no document-level horizontal overflow and no serious/critical violations in the checked WCAG 2 A/AA and 2.1 AA rules. The weekly calendar and studio navigation intentionally scroll within their own containers on small screens.
- Screenshots visually inspected for public home, booking, studio dashboard, and client account, including phone layouts.
- Guest access and forged cross-origin mutations: rejected.
- Dependency audit during installation: no known vulnerabilities reported.
- No provider secrets or generated local database files committed.

These checks validate the local preview, not a live payment, messaging, production identity, or hosted-database integration. Keyboard/assistive-technology review and real-device coverage should expand before launch. GitHub Actions is configured to repeat lint, domain tests, build, type checking, and the browser suite on pushes and pull requests.

No existing Vercel project is linked to the canonical repository. No production deployment was created. See LAUNCH.md for activation requirements.
