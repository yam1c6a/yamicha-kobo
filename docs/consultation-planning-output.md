# Dedicated technical-planning output / 2026-11-06

The 48d4dbe live verification intentionally failed its completeness assertion: five of six substantive planning requests selected discovery with questions=[], leaving only a short conclusion. Nine HTTP 200 responses were not a quality pass. This exposed a model-selected format branch, not a lost browser-rendering section.

Explicit technical architecture / procedure requests now use a smaller model-facing schema containing only reply, non-null plan, questions and source_ids. There is no phase, diagnosis or CTA branch. The matching system prompt preserves the shared behavioral and input-safety rules, replaces the incompatible base output instructions, and asks for generated reasons, operations and cautions. The validated public API response is assembled as answer with the existing reply text. Missing sections are rejected, not silently filled. Any unexpected raw phase also cannot bypass validation. No second inference or canned technical answer is used.

Selection requires an explicit planning request and an active technical topic. Short definitions and unrelated requests retain the original answer/out-of-scope handling. Missing implementation details do not justify invented facts: the planning instruction permits a conditional proposal and safe validation steps, with at most one indispensable question.

The previous public catalogue route remains deterministic and clearly identified as public-catalog. It is not counted as model generation in test analysis. Model, output budget, inference limit, pricing configuration, source allowlist and publication safeguards are unchanged.

Re-run all unit/API tests, build and homepage verification. Then use the unchanged nine-case acceptance fixture, checking all six planning responses for complete shape, all generated content for correctness, and catalogue provenance separately. Results must be recorded even when a candidate fails; HTTP success alone is not approval.
