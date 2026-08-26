# Tiger Store

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
