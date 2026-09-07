# Homepage

This directory belongs only to `/` (`app/page.tsx`). Shared storefront components and other routes are intentionally unchanged.

## Design decisions

- A real HTML heading explains the offer before the product artwork. The first CTA jumps directly to subscriptions.
- Snapchat keeps the sole spotlight. The catalog then presents available products by starting price, with existing categories, search, and full-catalog navigation.
- Prices and duration ranges use the existing product offers. Unavailable offers are not advertised as purchasable. No data is changed or removed.
- Ordering steps, receipt requirements, activation timing, and warranty explanations come from repository business rules. Instagram and WhatsApp destinations reuse settings.
- No invented reviews, popularity claims, discounts, or scarcity. Trust comes from clear steps, visible payment methods, policies, and genuine contact channels.
- The page and metadata render in the existing cookie locale. The homepage navigation uses the existing locale, theme, and cart mechanisms, including French.
- Styles are homepage-scoped. Product imagery uses Next Image, reserved dimensions, and lazy loading; only the hero and logo are prioritized. Product-page prefetching is disabled to avoid unnecessary mobile requests.
- FAQs use native disclosure elements. Focus styles, a skip link, RTL logical properties, and reduced-motion rules are included.

## Verification

```sh
npx tsx scripts/test-homepage.ts
npm run lint
npm run typecheck
npm run build
```

The homepage test covers every seeded product, all three languages, immutable input data, unavailable products/offers, zero prices, single and multiple offers, and duration/price ranges.

Browser release checklist:

- Arabic, French and English at 380px and 1440px, both light and dark.
- Extra layout checks at 320px, 768px and 1024px; keyboard focus and reduced motion.
- Category filtering, show-more, search, product links, anchor CTAs, mobile menu, FAQ disclosures, locale and theme persistence, and existing cart badge.
- Confirm all internal homepage destinations respond and the homepage remains server-rendered without JavaScript.
- Block `/api/track` and third-party analytics in automated tests so checks do not create artificial traffic records.
- Recheck the published homepage after deployment. Do not create orders or change production data to test this page.

Conversion improvement is a design hypothesis, not a claimed measured sales uplift. Existing backend latency and non-homepage language/UX behavior remain outside this change.
