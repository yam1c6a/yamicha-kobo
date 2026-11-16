# Design QA — やみちゃ工房 atelier redesign

final result: blocked

## Comparison targets

Source visual truth:

- `docs/design/atelier-reference-desktop.webp` — 1073 × 1465 pixels. Selected desktop hero and services mock.
- `docs/design/atelier-reference-lower.webp` — 876 × 1796 pixels. About, YAMIOS and inquiry mock.
- `docs/design/atelier-reference-mobile.webp` — 852 × 1846 pixels. Selected mobile arrangement.

Implementation: the existing Astro homepage in `src/pages/index.astro` and its imported components, built under `dist/client/`.

Implementation screenshot path: unavailable. The browser returned a gateway error instead of the site. That error image is not accepted as implementation evidence.

Intended viewport coverage: desktop 1440px; tablet 920px and 768px; mobile 390px and 320px. Observed cloud-browser viewport during the failed navigation: 1363 × 936 pixels. No implementation CSS viewport or deviceScaleFactor could be verified. Density normalization and matched-state comparison remain pending.

State requested: `/`, closed menu and disclosures, empty inquiry form; additional menu, case disclosure, privacy dialog and contact-preview states.

## Blocking finding

- [P1, verification gate] Browser-rendered implementation could not be captured. `sites-preview` reported running, and an HTTP request from the same development process returned status 200 with the correct homepage. However, the cloud browser at the required `http://terminal.local:4173/` repeatedly returned `upstream connect error or disconnect/reset before headers`. This is infrastructure evidence, not a visual review.
- Starting the preview outside the isolated execution environment was rejected by the automatic approval policy, which does not permit sandbox escalation.
- A lower-exposure alternative, opening a compiled local copy via `file://`, was rejected by the browser URL policy (HTTP/HTTPS only). No browser security setting, alternate control surface, or access restriction was bypassed.
- Full-view comparison evidence: unavailable. No source/implementation composite was produced because there was no valid implementation capture.
- Focused-region comparison evidence: unavailable for the same reason. Hero typography and imagery, service rows, contact controls, and mobile menu remain the required regions.

## Required fidelity surfaces

These are implementation facts and remaining checks, not claims of visual fidelity:

| Surface | Implemented | Browser verification remaining |
| --- | --- | --- |
| Fonts / typography | Noto Serif JP headings and Noto Sans JP body; responsive type sizes | Confirm loaded font, Japanese wrapping, hierarchy, and narrow-screen overflow |
| Spacing / layout rhythm | Large two-line headline; left artwork/right copy on desktop; text and CTA before art on mobile; unboxed service and portfolio rows | Compare section positions, image crop, margins, and above-the-fold density against normalized mocks |
| Colors / tokens | Paper #F4F0E7, ink #302F29, olive #45553E, peach accents | Confirm rendered paper texture, contrast, focus, and interaction states |
| Images / assets | Generated workstation, notebook, botanical accent and paper texture; genuine raster assets; standard Phosphor action icons | Confirm all actual crops/scales and seam-free background in page context; source assets were individually opened |
| Copy / content | Selected headline and service copy; existing eight cases and confidentiality boundary; honest mail-app handoff | Confirm visual text density, labels and full dialog text at each breakpoint |

## Checks completed

- `node --test tests/*.test.mjs`: 148 passed, 0 failed.
- `npm run build`: passed, including all existing product and privacy routes.
- `node scripts/verify-home.mjs`: passed for structure, content, anchor/ARIA references and existing chat IDs.
- `git diff --check`: passed.
- Independent code review corrected three inquiry handoff issues: Unicode-safe excerpt clipping, clearing custom validity after autofill, and explicit 4000-character append failure feedback without losing input. Focused execution of the real component script passed the relevant boundary scenarios.

Primary interactions tested in a real browser: none; blocked before rendering. Form validation, dialog keyboard/focus, clipboard fallback, menu behavior and case expansion require browser testing. Existing AI behavior was covered by mock-provider regression tests; no live AI inference or email was sent.

Browser console errors checked: no application console could be assessed because the page never loaded.

## Comparison history

No valid visual comparison iteration has occurred. Preview troubleshooting, build checks and code review are not design-QA iterations. No claim of a passing visual review is made.

## Implementation checklist before approval

1. Open a working HTTP/HTTPS preview of this exact branch in the browser.
2. Capture reference and implementation at matching normalized viewports; combine each pair into the same comparison input.
3. Check all five fidelity surfaces with focused hero/form/menu regions; resolve every actionable P0/P1/P2 finding.
4. Exercise navigation, mobile menu, disclosures, inquiry validation, dialog dismissal/copy, and AI-to-form handoff. Check the application console.
5. Update this report with actual screenshot paths, dimensions, comparison history and result. Keep the PR as draft until `final result: passed`.
