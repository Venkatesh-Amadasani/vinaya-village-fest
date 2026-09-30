# Vinaya Festival Hub

Build the production-quality foundation for a permanent Village Vinaya Chavithi Festival Management, Financial Transparency & Community Engagement Platform.

This is NOT a simple CRUD demo. Treat the following as the product specification and source of truth.

PRODUCT:
A permanent, reusable village festival web app. One codebase/database supports 2026, 2027, 2028 and future festival years. A permanent public /current route and QR can always resolve to the active festival. Historical years retain their own data and branding.

TECH DIRECTION:
Use the platform's full-stack TypeScript stack with React, TypeScript, Tailwind, shadcn/ui, and a proper backend/data layer. Structure code modularly so a PostgreSQL-backed production backend can be integrated cleanly. Do not fake security in the UI. Keep business rules centralized.

CORE MODULES:
- Festival year management and lifecycle: PLANNING, ACTIVE, FINAL_REVIEW, CLOSED, ARCHIVED.
- Year-specific branding: festival name, logo, idol image, banner, theme/accent.
- Users: GENERAL and ADMIN base roles, granular permissions, festival-specific Youth memberships.
- Permissions: YOUTH_ACCESS, donation/expense/auction/contribution add/edit/delete, APPROVE_RECORDS, VIEW_YOUTH_DATA, VIEW_COMBINED_DATA.
- Public users do not need registration to view public information.
- General financial transparency is public.
- Youth-specific data requires authenticated approved Youth access.
- Admin sees everything.
- English + Telugu throughout the UI, with a language selector. User-entered names/content are preserved exactly as entered.
- Donations: GENERAL, YOUTH, BOTH. For BOTH, general_amount + youth_amount must equal total_amount. Payment methods Cash, PhonePe, Google Pay, UPI, Bank Transfer, Other. Proof optional.
- Expenses: GENERAL/YOUTH, configurable categories, receipts optional.
- Auctions: FINAL RESULT ONLY, NO BID HISTORY. Fields include auction_year and for_festival_year. Individual or Group. Final amount and payment status.
- Auction contributions are separate records; remaining = final amount - sum(contributions). Youth/group auction public view must hide individual contributor names/amounts; approved Youth can see them.
- Dashboards: Public/General, Youth, Combined, Admin.
- Manual highlights only: no automatic highlight generation. Add/edit/delete/enable/disable/reorder, English/Telugu, optional image, optional related auction/donation.
- Congratulations posts and permanent festival memories with multiple photos/videos; year-wise gallery/archive; public/youth/admin visibility.
- User-based in-app notifications: per-user notification center, unread count, mark read/all read, festival-aware notifications, notification preferences, automatic meaningful notifications and admin-created announcements.
- Audit logs: who, action, entity, record, old value, new value, reason, timestamp. Financial corrections preserve history. Financial records should use soft deletion rather than silent destruction.
- Reports/exports are planned: PDF, Excel/CSV, festival data export.
- Backup/data ownership is planned.
- Search/filter and pagination for large datasets.

VISIBILITY:
Public: General dashboard, general donors/donations, general expenses, public auction info, public highlights/media, previous years.
Youth: General + Youth + Combined, Youth contributors and amounts, Youth auction contributions, Youth logs, permitted Youth media.
Admin: everything.
Backend/API must enforce this; frontend-only hiding is insufficient.

DESIGN/UX:
Mobile-first, Android-friendly, desktop responsive, polished but practical village-friendly interface. Large clear controls, quick-entry forms, readable financial cards, accessible tables, excellent Telugu typography. Use a premium festival visual identity without excessive decoration. Avoid dark-heavy enterprise styling; make public pages warm, trustworthy, celebratory, and transparent.

PUBLIC LANDING PAGE:
1. Year-specific branding
2. Festival name/idol image
3. English | తెలుగు
4. Manually managed rolling highlights if any; if none, hide the section entirely
5. General financial transparency cards
6. Donations
7. Expenses
8. Auctions
9. Gallery
10. Previous Years

INITIAL IMPLEMENTATION:
Start with the foundation and a realistic working UI, not placeholders:
- Create the core app shell, responsive navigation, public landing page, auth shell, general/youth/admin dashboard shells.
- Establish data/domain types and a clean module structure for festivals, users/permissions, donations, expenses, auctions/contributions, highlights/memories/media, notifications, audit.
- Seed/demo the 2026 active festival and 2027 historical/upcoming relationship where useful.
- Build reusable components for financial KPI cards, charts, tables, filters, notification center, highlight carousel, language switching, festival selector, and role/permission-aware navigation.
- Include representative demo data so the UI is immediately understandable.
- Add clear TODO boundaries for production database/storage/auth integrations; do not pretend mock data is persistent production data.
- Make the UI usable end-to-end with demo state while keeping the architecture ready for real backend integration.
- Include validation for donation BOTH split and auction contribution remaining calculations in the domain/UI layer.
- Do not implement bidding history.
- Do not implement paid external notification channels yet; in-app notifications only.
- Do not overbuild speculative features.

DATABASE/DATA MODEL TO REFLECT IN TYPES:
users, permissions, user_permissions, festivals, festival_memberships, festival_branding, donations, expense_categories, expenses, auctions, auction_contributions, highlights, memory_posts, media, notifications, notification_preferences, audit_logs.

QUALITY:
Use TypeScript types strictly, avoid any, keep components modular, accessible, responsive, and production-oriented. Include loading, empty, error, and permission-denied states. Financial numbers should be formatted in INR. Dates should use Indian-friendly formatting. The app should feel like a serious real-world product from the first screen.

Do not ask me to restate the requirements. Start implementing this foundation now and leave the project in a runnable state.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/56845f10-bd85-4440-be06-aaab33af1963).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
