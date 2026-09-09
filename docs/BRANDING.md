# Approved partner branding · September 9, 2026

The supplied `Untitled design-4.png` is Fix It Collective; `Untitled design-5.png` is Recovery Room by Milla. Both 2000×2000 RGBA originals are retained byte-for-byte in `public/brand/originals`. Lossless WebP derivatives at 96, 192, 512 and 768px preserve proportions, transparency and all artwork. Only resizing/encoding was performed; no artwork was regenerated, recolored, masked or cleaned. Any existing corner artifacts in the supplied source are retained to avoid modifying the approved mark.

`BrandEmblem` selects an appropriate derivative for each placement, declares intrinsic dimensions, and lazy-loads secondary placements. Header and lead partner emblems load eagerly. Decorative duplicates have empty alternative text; standalone identity images name the partner. Fix It app icons are now derived from the approved emblem, replacing the previous unbranded manifest state.

Placements: global header/footer, homepage experience worlds, `/collective` partnership presentation, `/recovery` lead emblem, booking summary and confirmation, client/staff appointment identity. Existing network routes and functionality are preserved.

## Palette provenance

Alpha-qualified pixels were sampled from a 200px downsample of each source, grouping blue, warm gold, and warm light pixels. Channel medians: Fix It blue `#061A2C`, gold `#A0784A`; Recovery blue `#213746`, gold `#A98250`, cream `#E3D1BD`. Fix It blue and gold upper quartiles supply `#0D2338` and `#C79B63`; its light-pixel lower quartile supplies `#EDDCB9`. These are representative pixel statistics, not claimed official Pantone specifications.

`src/app/branding.css` applies those sampled colors through the shared semantic variables. Near-black `#061522` is an intentional supporting shade; secondary steel remains `#BAC9D2 / #7E929F / #354C5D`. Metallic treatment uses solid readable text over a gold surface gradient. The earlier provisional branding notes in `ELEVATION.md` are superseded by this implementation.

Recovery Room bookings remain pending approval of its real services, durations and providers. Artwork integration does not invent business offerings or change the shared scheduler.
