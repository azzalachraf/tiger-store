# Tiger Store

Tiger Store is a Next.js 16 App Router storefront selling digital subscriptions to customers in Algeria. Production domain: `https://www.digitaldz.shop`.

## Audience

Customers are Arabic-speaking, mobile-first Algerians arriving from Facebook or Instagram ads, often inside the Meta in-app browser on a mid-range Android phone using 4G.

Customers pay by manual transfer without buyer protection. Every UX and copy decision must reduce fear, explain what happens next, and make the store feel legitimate.

## Locked business decisions

* No customer accounts or login.
* Guest checkout only.
* No online payment gateway.
* Payments: BaridiMob, Binance, and RedotPay. Flexy is available only for Snapchat Plus checkout links.
* A receipt screenshot is uploaded during checkout.
* Supabase is the source of truth for orders, products, settings, stock alerts, and private receipt storage.
* Orders are managed through the secure admin panel.
* After checkout, the server will notify the owner through WhatsApp Business Cloud API.
* Customers stay on an internal thank-you page and are never redirected to WhatsApp.
* WhatsApp integration and checkout changes require their own approved phase.
* Customer communication uses WhatsApp at `+213 556 97 45 93` and Instagram.
* Never invent reviews, order counts, guarantees, delivery times, social proof, or availability.
* Do not change these decisions without asking the owner.

## Fulfillment, warranty, and refunds

* Activation usually takes 15 minutes–12 hours after payment verification.
* Receipt upload is mandatory.
* Warranty duration is defined per product/plan.
* For a Tiger Store-caused covered failure, attempt replacement first.
* If replacement is impossible, calculate the refund using integer DZD and remaining covered days: `refund = floor(price_paid × remaining_covered_days ÷ total_covered_days)`.
* Customer-caused problems are excluded.
* Preserve and normalize all 24 Supabase products; never delete remote-only products.

## Data and security

* Store money as integer DZD values. Never use floats or a currency library.
* Resolve products, options, and prices server-side.
* The browser may submit only stable product slugs, option IDs, and quantities, never trusted prices.
* `SUPABASE_SERVICE_ROLE_KEY`, Telegram tokens, Meta CAPI tokens, session secrets, and admin credentials are server-only.
* Never prefix secrets with `NEXT_PUBLIC_`.
* Never import server-only modules into `"use client"` files.
* Validate every API input with Zod before using it.
* Every route handler must export `runtime = "nodejs"`.
* Keep the receipts bucket private.
* Never commit `.env.local`, secrets, customer information, receipts, or build output.
* Public order tracking must reveal status only, never private customer information.

## Engineering

* TypeScript strict.
* No `any` in new code.
* Preserve unrelated user changes.
* Prefer Server Components; add Client Components only where interaction requires them.
* Keep JavaScript and dependencies small.
* Do not weaken TypeScript, ESLint, authentication, or validation to make a build pass.
* Use small conventional commits, separated by concern.
* Run available tests, lint/type checks, and `npm run build` before declaring work complete.
* Never push, merge, deploy, mutate production data, or register a webhook unless explicitly instructed.

## UX and design

* Arabic is the default language with correct RTL server rendering.
* English remains available.
* Translate product names, descriptions, options, features, warranties, stock messages, validation messages, metadata, checkout copy, and status copy.
* Prices remain in Western digits, for example `900 DA`.
* Use a calm light surface with dark orange and black Tiger branding.
* Design the 380px mobile view first.
* No countdown timers, popups, carousels, scroll-jacking, fake urgency, or heavy animation.
* Respect reduced motion, keyboard focus, semantic HTML, and accessible contrast.
* Use logical CSS properties that work in RTL and LTR.
* No dead buttons, fake forms, placeholder testimonials, or public empty sections.

## Completion

Before completing a phase:

1. Review the entire diff.
2. Confirm no secrets or unrelated files were included.
3. Run relevant checks and `npm run build`.
4. Test the changed flow at 380px in Arabic and English.
5. Report changed files, commands run, results, remaining risks, and the commit hash.
