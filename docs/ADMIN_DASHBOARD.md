# Admin workspace redesign

## Scope and operation

- Admin-only shell, active desktop navigation, accessible mobile menu and bottom navigation; customer routes and global styles are unchanged.
- Overview has date presets/custom range, collected revenue, order pipeline and order exports.
- Orders have client/product/contact search, status/payment/date filters, sorting, pagination, individual selection and confirmed bulk status changes. Bulk updates use existing actions sequentially: if one fails, earlier saves can have succeeded. Review affected orders before retrying.
- Private receipt URLs are generated only on demand after server-side authentication, rather than signing every receipt on each page load. Select **Load private receipt**, then **View private receipt**. Existing private storage is unchanged.
- Product editor retains bilingual names, descriptions, features, plan IDs, per-plan compatibility, availability, pricing, details, FAQs and images. Invalid option JSON is rejected rather than silently discarded. Uploads retain the existing 4 MB limit.
- CSV includes a UTF-8 BOM, correct quoting and formula-injection protection. Excel export is typed SpreadsheetML (`.xml`), preserving phone numbers as text and money as numbers. Exports include all matching or explicitly selected rows, not only the visible page. Confidential exports must be stored securely.
- Orders are loaded in 500-record batches for overview, customer analytics, statistics and exports. Existing finance calculations and authentication remain in place. No migration or production-data update is needed.
- Accounts retain existing import/edit/password controls, with pagination and save errors that preserve input. Google Sheets copying never removes order records.

## Verification

Run `npm run typecheck`, `npm run lint`, `npm run build`.

- `npm run test:admin-dashboard`: CSV/XML escaping, formula protection, Algiers dates, filters and product-option serialization.
- `npm run test:admin-actions`: real admin handlers with isolated mock services; 24 unauthorized action/read checks, all 22 privileged mutation handlers, input validation, payment overrun, preserved product fields and a 1,201-order read. No environment files or production connections are loaded.
- `npm run test:admin-ui`: bundled real client components with mocked server actions. Covers 380px/1440px, Arabic/English document directions, both storefront theme settings, filters, pagination, exports, confirmation, mobile modal, saving and retry. The admin workspace intentionally has one consistent dark theme, independent of storefront theme. Uses a locally installed Playwright module (`PLAYWRIGHT_MODULE`) and Chrome (`PLAYWRIGHT_CHANNEL`, default `chrome`). Screenshots are generated in the OS temp directory. The fixture is not a Next.js route.
- Existing finance-reporting, admin-cycle-statistics, owner-analytics, traffic-range and tiger-new-sheet regression suites.

These tests do not submit real orders, delete records, modify stock, send Telegram messages or record payments. Production mutation acceptance is intentionally not performed against live customer data. Authentication is retained; unauthenticated production smoke checks are read-only.

Deploy using the existing Vercel project. No new credentials or configuration are required. Rollback is the previous Vercel deployment; no data rollback is necessary.
