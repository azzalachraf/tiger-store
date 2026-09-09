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
- `npm run test:admin-actions`: real admin handlers with isolated mock services; 25 unauthorized action/read checks, all 23 privileged mutation handlers, input validation, payment overrun, preserved product fields and a 1,201-order read. No environment files or production connections are loaded.
- `npm run test:admin-ui`: bundled real client components with mocked server actions. Covers 380px/1440px, Arabic/English document directions, both storefront theme settings, filters, pagination, exports, confirmation, mobile modal, saving and retry. The admin workspace intentionally has one consistent dark theme, independent of storefront theme. Uses a locally installed Playwright module (`PLAYWRIGHT_MODULE`) and Chrome (`PLAYWRIGHT_CHANNEL`, default `chrome`). Screenshots are generated in the OS temp directory. The fixture is not a Next.js route.
- Existing finance-reporting, admin-cycle-statistics, owner-analytics, traffic-range and tiger-new-sheet regression suites.

These tests do not submit real orders, delete records, modify stock, send Telegram messages or record payments. Production mutation acceptance is intentionally not performed against live customer data. Authentication is retained; unauthenticated production smoke checks are read-only.

Deploy using the existing Vercel project. No new credentials or configuration are required. Rollback is the previous Vercel deployment; no data rollback is necessary.

## Simplified workspace controls

- Overview, Statistics and Finances open with **Net profit** selected. **Show → Revenue** switches the result and chart labels without changing stored data. Both views use the same completed-sale ledger; cancelled/refunded orders are excluded, Telegram sales are not counted twice as website orders, and recorded zero-credit salary arrangements remain zero. Net profit deducts recorded card costs, admin credit and advertising, including advertising-only days. Missing costs remain clearly flagged. Focused admin/plan totals retain the existing explicit before-advertising treatment.

- Settings, Banners and Stock Alerts are removed from navigation. Their existing routes and data remain intact. Meta Integration and Customers are unchanged.
- Finances has validated reporting periods, admin/plan filters, paginated sales and CSV/Excel exports. Full-period profit subtracts recorded advertising; filtered subsets explicitly show profit before business-wide advertising. Missing advertising is flagged, and absent website costs are not invented. Lifetime balances and existing payment/settings actions remain in collapsible sections.
- Team supports confirmed access disabling instead of destructive deletion. Owner accounts are protected, and admins with active operations must finish or cancel them first. Existing records and credit remain accessible. Re-enable through the owner's existing Telegram approval workflow. Disabling does not abort an already executing request.
- Tiger New Sheet retains its ten export columns, including empty Spend and Cost cells. Search, status/copy/admin/payment/date filters, selection, pagination, refresh, CSV/Excel and repeat copying preserve the records. Only successful **Copy new rows** records copy status; **Copy again** and downloads do not. New-copy batches are capped at 1,000 rows.
- Card Stock separates uploads from searchable, paginated card management. Reserved and completed-operation cards remain protected; only eligible manually used cards can be restored.
- Statistics has focused sales/customer/product/stock views with date-matched exports. Traffic can compare the previous equal-length period and export aggregate counts; traffic reads are batched.
- Browser verification covers 88 combinations of mobile/desktop, Arabic/English direction and theme settings. It also checks the net-profit default and revenue switch, safe disabling, stock protections, copy history, clipboard failure and finance filtering. Actions use synthetic fixtures, never live customer records.

Changed implementation files: `app/admin/{finance,card-stock,statistics,team,tiger-new-sheet,marketing/funnel}`, `components/admin/{AdminNavigation,FinanceLedger,ReportRangeControls,StockWorkspace,TeamWorkspace,TigerNewSheetCopy,reporting,data-tools}`, and `lib/tiger-new-sheet.ts`. Regression fixtures and admin test scripts are updated alongside this document.
