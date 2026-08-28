# Tiger Store

## Private Telegram operations

The owner-maintained Google Sheet is the only source for Snapchat redeem-card uploads. See [Telegram operations setup](docs/telegram-operations.md) for the service-account setup, owner approval flow, and private card-operation commands. No code is stored or logged in plaintext.

Tiger Store is a mobile-first Next.js App Router storefront for digital subscriptions in Algeria at `digitaldz.shop`.

The site uses Arabic RTL by default, generated product thumbnails from `public/products`, WhatsApp-only checkout, and an admin-only dashboard. There are no customer accounts and no online payment gateway.

## Local CMD Usage

```cmd
cd site
npm install
npm run dev
```

Then open:

```txt
http://localhost:3000
```

## Commands

```bash
npm install
npm run dev
npm run build
npm start
```

## Environment Variables

Create `.env.local` locally from `.env.local.example`:

```env
ADMIN_EMAIL=your-admin-email@example.com
ADMIN_PASSWORD=change-this-password
```

Do not commit real credentials.

## Admin Dashboard

Admin routes:

- `/admin/login`
- `/admin`
- `/admin/products`
- `/admin/orders`
- `/admin/settings`
- `/admin/payment-methods`
- `/admin/banners`

Authentication uses `ADMIN_EMAIL` and `ADMIN_PASSWORD`, then sets a secure httpOnly cookie session.

## Product Images

Default product thumbnails live in:

```txt
public/products
```

Use optimized `.webp` images where possible. Product image paths are editable from admin forms. For Vercel production uploads, connect persistent storage such as Supabase Storage, S3, or Vercel Blob later. The current admin image field supports a local public path or external URL.

## Data Storage

The pre-migration source export remains in:

```txt
data/admin-store.json
```

This JSON-backed abstraction is in:

```txt
lib/admin-store.ts
```

Supabase is the application source of truth for products, settings, orders, stock alerts, and private receipts. Apply `supabase/schema.sql` manually, then follow [the catalogue migration guide](docs/catalogue-migration.md). Do not delete the JSON export until the import is verified.

## Checkout

Checkout is WhatsApp-only:

- No customer login
- No customer account
- No online payment gateway
- Cart persists in `localStorage`
- Final order opens WhatsApp with an encoded order message

WhatsApp number:

```txt
+213 556 97 45 93
```

## Warranty certificates

After an order has been marked **delivered**, open **Admin → Orders**. Each delivered product has an **Issue warranty certificate** control. Enter the exact covered period in days, create the link, and send that private link to the customer.

For a sale made through messages, use **Create link for an off-site sale** on the same page instead. Select the plan, record the exact integer DZD amount paid and payment method, then send the link. The order is not created at link generation; the customer name and Algerian phone number are collected when the customer completes the form, at which point one delivered order is saved automatically.

The customer enters the name that should appear on the certificate, confirms receipt, and can download a PDF immediately. Warranty links are signed server-side, tied to one order item, expire after two years, and cannot reveal an order without a valid link. No receipt, payment, customer login, email, or new database table is used for this flow.

For stronger key separation, configure `WARRANTY_LINK_SECRET` with a random 32+ character server-only value. Existing deployments safely fall back to the existing server-only session/encryption secret until it is configured.

## Discounts

Discounts are calculated automatically from `oldPrice` and `price`.

If `oldPrice` is missing or lower than/equal to `price`, no discount badge appears.

## Vercel Deployment

1. Push the project to GitHub.
2. Import the repository in Vercel.
3. Add environment variables:
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
4. Build command:
   - `npm run build`
5. Start command:
   - `npm start`

Important: local JSON writes are not durable on Vercel serverless deployments. Use Supabase for production admin CRUD and order storage.

## Design Notes

- Dark orange/black Tiger Store identity
- Foxy Store-like catalog structure
- Mobile-first layout for Meta ads traffic
- Lightweight UI with no aggressive popups, countdowns, sliders, or heavy animations
- Product cards use `next/image`
- Product grids lazy-load thumbnails
# Tiger Store

## Telegram operations foundation

The private Telegram registration, owner/admin roles, webhook verification, and operations-schema setup are documented in [`docs/telegram-operations.md`](docs/telegram-operations.md). Apply the SQL migrations manually, configure the documented server-only variables, and register the webhook only after deployment. No product price, receipt, customer data, token, or code is trusted from Telegram input.
