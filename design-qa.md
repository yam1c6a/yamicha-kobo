# Design QA — やみちゃ工房 atelier redesign

final result: passed

Review date: 2026-11-16. Latest implementation revision: 2317cec (v4).

## Findings and current decision

The homepage has been rendered and exercised successfully in the real cloud browser through the repository's existing Cloudflare branch preview. Desktop v1, v2 and v3 were captured and compared with the selected source images. The primary reviewer then opened every final comparison composite and reviewed all five required fidelity surfaces against v4. The earlier local-preview gateway failure is resolved and does not affect this result.

Final desktop, intermediate and narrow captures, browser geometry checks, visual comparisons and the available console-log review pass. No actionable P0, P1 or P2 finding remains. The accepted P3 variations and the boundaries of the functional checks are recorded below.

| Severity / status | Location | Earlier evidence and impact | Correction and final disposition |
| --- | --- | --- | --- |
| P2 — closed | About illustration, .about-art | The source gives the notebook collage substantial visual weight beside the introduction. In comparison-lower-desktop-v3.jpg, the implementation collage is markedly smaller, weakening the intended text/art balance. | v4 increases the desktop artwork to 145%, capped at 560px. The primary reviewer confirmed the corrected balance, crop and separation from the text in comparison-lower-desktop-final.jpg. |
| P2 — closed | Narrow-layout services heading | comparison-mobile-v3.jpg shows the final 「を。」 stranded on a second line, whereas the source keeps the heading together. | v4 keeps the heading on one line at both 454px and 340px without horizontal overflow. comparison-mobile-final.jpg and mobile-sections-final.jpg confirm the final visual treatment. |
| P2 — closed | 909px services, maintenance and contact headings | The intermediate-width review found awkward wrapping. tablet-v3-contact.jpg records the contact phrase breaking inside 「できる？」. | v4 keeps the services heading and all three service titles on one line, with contact on the intended two lines. Final measurements and comparison-tablet-final.jpg confirm the correction. |

No unresolved P0, P1 or P2 functional issue was identified in the recorded browser checks, independent code review or final comparative review. The final result applies to the tested preview revision and recorded coverage; it is not a production-deployment record.

## Comparison targets and states

| Source visual truth | Pixel dimensions | Intended region |
| --- | --- | --- |
| docs/design/atelier-reference-desktop.webp | 1073 × 1465 | Desktop header, hero and services |
| docs/design/atelier-reference-lower.webp | 876 × 1796 | About, YAMIOS and inquiry |
| docs/design/atelier-reference-mobile.webp | 852 × 1846 | Narrow header, hero, CTA, illustration and start of services |

Implementation: the existing Astro homepage at /, including AtelierHero, Portfolio, ContactForm and the existing ChatConsultation. The repository's Cloudflare Git integration supplied the working HTTPS branch preview. The final stable preview is [design-atelier-home-20261116](https://design-atelier-home-20261116-yamicha-kobo.yam1c6a.workers.dev/). The primary reviewer also opened this alias and confirmed the empty inquiry form, DPR 1, loaded fonts, final hero and 560px artwork cap. The live page was marked as the review deliverable.

Baseline comparison state: /, menu closed, disclosures closed, inquiry fields empty. Additional states exercised include an open mobile menu, expanded technical details and portfolio case, validation errors, inquiry preview, copied text and the privacy dialog. The existing /yamios/ explanatory page was also opened.

## Capture and normalization method

Native DevTools was disabled by organizational policy. That policy was not changed. Responsive coverage used normal browser zoom and the resulting measured CSS viewport and device-pixel ratio. These are browser responsive checks, not physical-phone tests or device-emulation claims.

| Browser condition | Measured CSS viewport | DPR | Capture / normalization |
| --- | --- | --- | --- |
| Desktop v1–v4 | 1363 × 936 | 1 | Actual desktop content captures are 1348px wide. The 15px difference is the viewport/scrollbar/capture-width distinction, not a layout defect. Use the actual image width for comparison scaling. |
| Narrow v3/v4 | 454 × 312 | 3 | Explicit clip calculated from CSS bounds × DPR, then normalized to 454px output width. v4 client width is 449px. |
| Narrow interaction/v4 check | 340 × 234 | 4 | Explicit density-aware clip. v4 client width is 337px; a 341px output can result from capture rounding. |
| Intermediate v3/v4 | 909 × 624 | 1.5 | Explicit density-aware clip. v4 client width is 899px. The focused v3 contact output is 909 × 500px. |

At zoomed settings, the full-page capture API initially interpreted clipping/density incorrectly. The 84 × 1698px mobile-v2-340.jpg and its composite comparison-mobile-v2.jpg are **invalid for fidelity judgments** and excluded from acceptance evidence. They do not establish a product overflow or font-size defect. The corrected mobile-v2-340-hero.jpg is 341 × 1000px and supports the qualitative earlier mobile review.

For comparison-mobile-v3.jpg, the source was normalized from 852px to 426px wide. The 454px implementation capture was proportionally reduced to 426px on the same comparison canvas. The final mobile composite places the source beside the 454px and 340px implementation views. **The underlying CSS widths differ.** These comparisons support hierarchy, order, artwork and text rhythm; they are not pixel-perfect comparisons at one shared viewport. The additional intermediate-width comparison supplies 909px coverage.

Desktop comparisons use the real content capture width. The lower-page composite aligns the source's 876px width with the corresponding implementation regions. Existing process and FAQ sections are omitted from that composite only so About/YAMIOS and inquiry can be compared directly. They remain in the actual page; this composite is not a continuous full-page screenshot.

## Evidence inventory

Captures originated in /workspace/shared/atelier-qa/. The evidence below is saved in the repository, and file presence and image dimensions have been checked. The primary reviewer opened the final desktop, lower-page, mobile and intermediate composites, plus the mobile section detail sheet. The v1 desktop composite was rebuilt using the actual 1348px capture width, removing the earlier 15px black strip.

| Repository evidence path | Pixels / format | Purpose |
| --- | --- | --- |
| docs/design/qa/desktop-v1.jpg | 1348 × 6176 | First complete rendered page |
| docs/design/qa/desktop-v2.jpg | 1348 × 6569 | Full page after initial typography/layout fixes |
| docs/design/qa/desktop-v3.jpg | 1348 × 6809 | Full page after the second correction pass |
| docs/design/qa/comparison-desktop-v1.jpg | 2170 × 1660 | Source/first implementation together, corrected to the actual 1348px capture width |
| docs/design/qa/comparison-desktop-v2.jpg | 2166 × 1670 | Hero/services comparison after v2 |
| docs/design/qa/comparison-desktop-v3.jpg | 2170 × 1674 | Hero/services comparison after v3 |
| docs/design/qa/comparison-lower-desktop-v3.jpg | 1772 × 1969 | Lower-page comparison after v3 corrections |
| docs/design/qa/mobile-v3-454.jpg | 454 × 1100 | Valid normalized narrow capture |
| docs/design/qa/comparison-mobile-v3.jpg | 876 × 1068 | Mobile source/implementation together |
| docs/design/qa/tablet-v3-contact.jpg | 909 × 500 | Intermediate contact-heading wrap evidence |
| docs/design/qa/contact-dialog-v1.jpg | 1363 × 936 | Live inquiry preview with successful copy status |
| docs/design/qa/desktop-final.jpg | 1348 × 6809 | Final complete desktop page |
| docs/design/qa/desktop-final-metrics.json | JSON | Final desktop geometry/fonts/images |
| docs/design/qa/tablet-final-contact.jpg | 909 × 500 | Final intermediate contact region |
| docs/design/qa/tablet-final-metrics.json | JSON | Intermediate heading geometry |
| docs/design/qa/mobile-final-454-full.jpg | 454 × 6323 | Final narrow full page |
| docs/design/qa/mobile-final-454-metrics.json | JSON | 454px layout geometry |
| docs/design/qa/mobile-final-340-full.jpg | 341 × 6593 | Final narrow full page with capture rounding |
| docs/design/qa/mobile-final-340-metrics.json | JSON | 340px layout geometry |
| docs/design/qa/comparison-desktop-final.jpg | 2170 × 1664 | Final source/hero/services comparison |
| docs/design/qa/comparison-lower-desktop-final.jpg | 1776 × 2086 | Final About/YAMIOS/inquiry comparison |
| docs/design/qa/comparison-mobile-final.jpg | 1326 × 1285 | Source beside final 454px and 340px implementation views |
| docs/design/qa/comparison-tablet-final.jpg | 2775 × 536 | Source excerpt beside v3 and final intermediate contact views |
| docs/design/qa/mobile-sections-final.jpg | 1410 × 1875 | Final narrow services, portfolio, About, YAMIOS and inquiry details |
| docs/design/qa/console-review.json | JSON | Classification of all 153 retrieved console entries |

Full-view evidence consists of the actual desktop page captures plus their source/implementation composites. Focused comparisons were necessary because whole-page scaling makes form labels, Japanese breaks and artwork proportions too small to assess. The lower-page composites, mobile composite, tablet contact crop and dialog capture supply that detail. Source and implementation were opened together in the composites rather than inferred from separate filenames or code.

## Required fidelity surfaces

| Surface | Evidence-based assessment through v3 | Final v4 result |
| --- | --- | --- |
| **Fonts and typography** | Browser metrics record the Noto Serif JP heading chain, Noto Sans JP body chain and fonts.status as loaded. The raster source does not establish an exact font-family name. The implementation preserves Mincho display headings and sans-serif body text. v1 navigation, hero copy, CTA and services were undersized; v2 enlarges them. v3 fixes the isolated hero word, service sentence grouping, About breaks and undersized form text. | **Passed.** fonts.status is loaded. The final composites confirm the intended hierarchy, line spacing and intermediate/narrow heading grouping. Live Mincho strokes remain slightly finer than the raster mock; this is accepted P3, not evidence of a fallback-font failure. |
| **Spacing and layout rhythm** | Desktop artwork/copy pairing, the large two-line headline, horizontal rules and unboxed services retain the selected direction. Narrow layouts put text and CTA before the illustration. v2 corrects the excessive hero gap; v3 reduces mobile header/hero excess and uses three-line mobile explanatory copy. Existing portfolio/process/FAQ content intentionally adds page length. | **Passed.** Desktop, 909px, 454px and 340px measurements report zero horizontal overflow. The final lower-page comparison confirms that the enlarged About artwork restores visual balance without crowding copy. The final mobile section sheet confirms the vertical rhythm through inquiry. |
| **Colors and visual tokens** | The composites show warm paper, dark ink, olive actions and peach accents. Implementation tokens are paper #F4F0E7, ink #302F29, olive #45553E and peach #D9A17D; these are not claimed exact samples from the source raster. Focus/dialog states were exercised. A complete numeric contrast audit is not claimed. | **Passed.** Final visual comparison retains the chosen palette, rules, muted fields and olive controls across the reviewed regions. No unintended earlier blue/pink surface treatment appears. Paper-grain variation is accepted. |
| **Image quality and asset fidelity** | Workstation, notebook and botanical imagery are actual generated raster assets guided by the mock. Paper fibers, hand-torn edges and subjects retain the art direction. Standard action icons use icon assets; illustrations were not replaced by CSS drawings, handcrafted SVG or placeholder shapes. v2 enlarges the service accent; v3 restores the contact accent. | **Passed.** All four page images are complete with valid natural widths. Final desktop/lower/mobile comparisons confirm usable sharpness, crop and alpha edges, including the corrected About scale. The smaller contact plant and omitted lower YAMIOS decorative leaf are accepted P3 differences. |
| **Copy and content** | Selected headline, practical service copy and YAMIOS development status remain. Eight public cases, anonymization and shared AI facts are covered by structural tests. v3 groups service text at meaningful boundaries. The inquiry CTA accurately says 「相談メールを作成する」 and explains the mail-app step because this creates a draft rather than submitting to a server. /yamios/ opens the existing explanation. | **Passed.** The final composites confirm readable labels and intentional heading breaks. Existing case facts, YAMIOS development status and accurate mail-draft wording remain intact. |

### v4 measured responsive evidence

- Desktop: 1363 × 936 CSS px, DPR 1, client width 1348px, horizontal overflow 0; all four page images complete with valid natural dimensions; fonts loaded.
- Intermediate: 909 × 624 CSS px, DPR 1.5, client width 899px. Services heading height 57.97px equals its 57.97px line height. All three service titles are about 45.06px high against 45.07px line height. Each contact heading span is 68.51px high against 68.51px line height, producing the intended two lines. About heading remains two lines.
- Narrow: 454 × 312 CSS px / DPR 3 / client 449px and 340 × 234 CSS px / DPR 4 / client 337px both report horizontal overflow 0 and a single-line services heading. At 340px, hero and contact headings each retain the intended two lines.

These browser measurements support the completed side-by-side visual review. The final composites, rather than geometry alone, establish the visual disposition above.

## Comparison history

| Iteration | Revision | Earlier findings | Fixes and post-fix evidence |
| --- | --- | --- | --- |
| v1 | fa04b8 | P2: excessive hero top/line gap; small wordmark/navigation/body/CTA/service text; small service botanical accent. | v2 (31b08) tightens hero rhythm and enlarges the relevant text, CTA and service composition. Compare comparison-desktop-v1.jpg with comparison-desktop-v2.jpg. |
| v2 | 31b08 | P2: enlarged hero copy strands 「で。」; services wrap mid-phrase; About copy leaves an awkward final fragment; form labels/CTA are too small and contact art is absent. Corrected narrow capture shows excessive header/hero spacing and long mobile explanation. The malformed mobile full-page capture is excluded. | v3 (14c0ba) changes desktop hero copy from 32px to 30px, groups service sentences, corrects About breaks, adds the contact plant, enlarges form/CTA text, reduces mobile header spacing and uses three-line mobile copy. See desktop-v2.jpg → desktop-v3.jpg, the corresponding desktop composites, comparison-lower-desktop-v3.jpg and valid comparison-mobile-v3.jpg. |
| v3 | 14c0ba | Earlier desktop copy/CTA/service issues visibly improve. P2 remains: small About art, orphaned mobile service-heading ending and awkward intermediate services/maintenance/contact wraps. | v4 (2317cec) enlarges About art to 145% with a 560px cap and adjusts mobile/intermediate type. Final measurements and the opened final comparison composites confirm all three P2 corrections. |
| v4 | 2317cec | No actionable P0, P1 or P2 finding remains. Accepted P3: finer live font strokes, smaller contact plant and omitted lower YAMIOS decorative leaf. | Final desktop, lower-page, mobile and intermediate comparisons and the mobile section sheet pass all five surfaces. The stable preview alias also confirms the final empty-form baseline, loaded fonts and artwork sizing. |

Preview setup, build troubleshooting and code review are not visual-comparison iterations. The screenshot-based rows above are the comparison history.

## Real-browser interactions completed

The primary reviewer performed these checks in the working HTTPS preview. They replace the earlier stale statement that browser interaction was impossible.

| Area | Observed result |
| --- | --- |
| Navigation | Navigation/contact anchors reach the intended regions; technical-details links automatically open the containing disclosure. |
| Portfolio | A featured link opens all-works and the case-ai-agent-platform details. Existing complete-case content remains available. |
| Product route | /yamios/ opens the correct existing explanatory page. |
| Mobile menu | Open, Escape, link-selection close and outside-click close work. |
| Validation | Empty required fields, invalid email and whitespace-only message are rejected. Valid input opens the inquiry preview. |
| Preview/copy | Copy writes the actual preview body to the clipboard. Returning to edit retains entered values. No sent-message confirmation is implied. |
| Privacy and keyboard | Privacy dialog opens; Escape closes it and returns focus. Scroll locking is removed after dismissal. |
| 340px inquiry | Preview/dialog have no horizontal overflow in the tested state; copy and return-to-edit preservation also work. |
| Existing chat | 「やみちゃ工房の実績を教えてください」 returns eight public catalogue cases. 「新しい相談」 resets the conversation. |

The chat request used the source-verified deterministic catalogue path: publicCaseCatalog returns before WorkersAIProvider.generate and env.AI.run. It performs no model inference and returns answerSource=public-catalog with cta.show=false. Therefore this check does **not** exercise the chat-to-contact button. No generated AI response or actual email send was tested or claimed.

The chat-to-contact handoff received targeted local VM execution of the real component script: Unicode-safe clipping at 3400 UTF-16 units, mail-body encoding at an emoji boundary, clearing custom validity after autofill, preserving existing input on a 4000-character append failure, and retrying the retained excerpt after shortening the input. This is code-level evidence, not an end-to-end browser handoff claim.

## Build, regression and console evidence

- Recorded node --test tests/*.test.mjs run: 148 passed, 0 failed. These controlled/mock-provider tests do not measure live model quality.
- Recorded npm run build: passed, including existing product/privacy routes.
- Recorded node scripts/verify-home.mjs: passed for eight cases, shared AI facts, structure, anchor/ARIA references, inquiry fields and existing chat IDs.
- Recorded git diff --check: passed.
- Independent code review found and corrected three handoff defects; focused component-script checks passed.
- Final console retrieval requested up to 1000 entries and returned 153. All 153 are metadata-send errors originating from chrome-extension:// URLs; applicationOrOther is empty. docs/design/qa/console-review.json records this classification. No application or other error was observed in the retrieved review-session logs; this is not a claim about every possible browser session.

## Intentional differences and coverage limits

- Existing portfolio, process, FAQ, technical disclosure and AI consultation remain in the actual homepage. They extend the selected composition. The lower comparison omits process/FAQ only to align corresponding regions.
- Navigation retains 「仕事の紹介」 for the existing portfolio. The mock's shorter navigation is not treated as a requirement to remove it.
- Regenerated illustration details differ while retaining the selected paper-collage subjects and palette. The formerly undersized About artwork was corrected in v4 and confirmed in the final lower-page comparison.
- The mock's send-style CTA becomes an accurate mail-draft action with preview/copy fallback. No unimplemented server-delivery success state is shown.
- Responsive coverage is browser zoom at actual 340/454/909/1363px CSS widths. Exact 320/390/768/920/1440px device coverage or physical-phone testing is not claimed.
- A complete cross-browser, screen-reader and numeric contrast audit was not performed. Those are coverage limits, not evidence that the observed checks failed.

## Accepted P3 variations

- Browser Mincho strokes are slightly finer than parts of the raster mock. The live text remains readable and preserves the intended hierarchy.
- The contact botanical accent is smaller than the mock's corresponding plant, while the form retains clear visual priority.
- The lower decorative leaf beneath YAMIOS is omitted. The product explanation and route remain present.

The primary reviewer accepted these differences after viewing the final composites. They do not require a further correction pass for this delivery.

## Final acceptance record

- [x] Final captures correspond to implementation revision 2317cec and use the same selected source images.
- [x] The primary reviewer opened final desktop/lower/mobile/intermediate composites and mobile section details, assessed all five fidelity surfaces, and closed every P2 finding.
- [x] The available final console logs were classified; no application or other error was observed in that set.
- [x] Valid acceptance evidence is saved in docs/design/qa/ with verified paths and image dimensions. The malformed mobile-v2 full-page capture is excluded.
- [x] Accepted P3 variations and the limits of browser, AI and email coverage are explicit.
- [x] The final stable preview alias was opened successfully and marked as the live review deliverable.

The recorded preview passes design QA with no actionable P0, P1 or P2 issue remaining.
