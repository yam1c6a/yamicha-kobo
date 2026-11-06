# Corporate homepage design

## Intent

Use the approved navy/cyan network, GIS and software-development visual while
presenting the studio's services and customer value rather than an individual
resume. The main headline is 「技術で、ビジネスの可能性を広げる。」.

- Keep the existing brand assets, eight development examples and contact address.
- Preserve the existing AI consultation component and `/api/chat`; move the
  component to `#consult`, with links from the hero, mobile menu and footer.
- Keep existing section anchors, including `#skills` for technical solutions.
- Do not add unimplemented blog links, company-size claims or career-year claims.
- Scope the new palette to `.corporate-site` so product/privacy pages are unchanged.

## Artwork

`public/images/technology-hero.avif` is an optimized crop of the user-approved,
AI-generated homepage concept from 2026-11-06. It is a conceptual illustration,
not an actual client system screenshot. The header, headline, navigation and CTA
buttons are real HTML, not baked into the image. The original logo is retained.

## Checks

`npm ci && npm run build && node scripts/verify-home.mjs`

The GitHub Actions workflow runs the production build and verifies the actual
rendered homepage: section anchors, unique IDs, all eight examples, contact link,
hero asset and existing chat form. No AI request or deployment is performed by
that workflow. The existing Cloudflare deployment remains responsible for main.

For visual checks, inspect desktop and mobile layouts, native details-based
navigation (including Escape), expandable case-study details and the AI chat.
Live AI behavior requires the existing Cloudflare bindings and is not exercised
by the structural verification script.
