# Floating product cards

The homepage uses transparent WebP versions of the 17 bundled product cards in
`public/products/floating/`. Original artwork remains in `public/products/`.
Custom product images continue to use the database URL without substitution.

The hero starts with Snapchat on every page load. Small arrows, keyboard arrows,
and horizontal pointer swipes browse all products. Only the current card and its
two neighbors are rendered. There is no automatic slide advance. Canva and
Autodesk flank Snapchat. Product prices, descriptions, and checkout links retain
their existing sources and wording.

## Artwork recipe

Each original product image was edited with image generation using transparent
background output and this instruction:

> Remove only the outer black backdrop and outer neon ribbons. Keep only the
> original white rounded rectangular product gift card, isolated on actual
> transparent alpha background. Preserve its entire interior artwork, original
> text, logo, colours, black hanger slot, proportions and typography. Do not
> redesign, rewrite or add anything. Keep full rounded card edges, upright front
> view, tight framing with a small transparent margin.

Outputs are resized to at most 720 pixels tall and encoded as WebP at quality 88
with alpha quality 100. Next Image supplies responsive sizes in the storefront.
The floating animation respects reduced motion and the existing pause control.
