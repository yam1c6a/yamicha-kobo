# Technical consultation

## Scope and data boundaries

The public chat now covers AWS/cloud choices, LLM selection, RAG design and
troubleshooting, existing systems and business automation. Explanations,
comparisons and architecture proposals use `answer`; business diagnoses are
optional rather than mandatory. The existing public case-study source remains
the sole authority for studio experience. Technical knowledge is not a new claim
about delivered projects, certifications or guaranteed support.

`technical-notes.js` contains eight Japanese editorial summaries with primary
source URLs and a checked date. `technical-context.js` selects at most three
notes using normalized keywords, English word boundaries and limited user-only
follow-up context. This is small, lexical retrieval-augmented generation, not
semantic vector search or live browsing. It needs no extra database, crawler,
embedding API, API key or search subscription. Update notes through reviewed
commits; do not silently update checked dates. Stale or price/current-status
questions receive an explicit warning. No up-to-the-minute pricing is promised.

Only source IDs selected from the supplied notes become links. Server-side
allowlisting controls the title, URL and checked date; the model cannot insert a
new link. These are sources of the curated notes, not proof that every generated
statement has been independently verified. Sources are shown separately from
studio experience. The client uses textContent, not model-generated HTML.

## Model and cost

The code default is `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. An explicitly set
`WORKERS_AI_MODEL` still wins; actual production overrides must be checked in the
Cloudflare dashboard. No plan, billing setting or new paid resource is created.
The default change and larger output budget can increase existing inference
charges or use the free allowance faster. This is not a promise of a monthly
spending cap. Review Workers AI usage and billing separately.

Verified official references (2026-11-06):
- https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/
- https://developers.cloudflare.com/workers-ai/features/json-mode/

One model call per request, no automatic retry/fallback. Default maximum output
is 2400 tokens; `CONSULTATION_MAX_OUTPUT_TOKENS` allows 1200–3200. The model must
fit a reply within 1800 characters; malformed/oversized replies fail safely
instead of silently cutting an explanation. JSON mode is not assumed infallible.
Gateway caching and logging remain disabled when a gateway is configured.

## Limits, privacy and interface

Shared limits: 8 user turns, 1200 characters per user message, 2800 per assistant
history entry, 8000 total conversation characters and 32000 request bytes.
Existing per-IP rate limiting is retained; these browser-carried turn limits
are UX constraints, not an authenticated per-person quota. Body bytes are
checked while reading even without Content-Length. Model error text is not
logged, because it might contain conversation content.

The site does not persist conversations on the server. Inputs are sent to
Workers AI for processing. Conversation state stays in the page; only an
explicit contact-handoff click writes to sessionStorage. Never ask for secrets.
The chat cannot execute code, change AWS accounts or fetch visitor-provided URLs.

Question chips wrap in a two-column grid; the send label does not wrap. Replies
show note sources and review dates. IME composition does not submit. A failed
request restores input and removes the failed UI turn. A new-consultation button
clears page state; the existing contact link and handoff events remain available.

## Automated checks

Node 22.16+:

```sh
npm ci
node --test tests/technical-consultation.test.mjs
npm run build
node scripts/verify-home.mjs
```

Tests compile temporary copies of the real TS service/API modules using Node's
stripTypeScriptTypes and mock only the Cloudflare runtime/binding. They cover
retrieval, follow-ups, source allowlisting, model configuration, output parsing,
conversation policy, history, payload limits, rate limiting and API responses.
They do NOT measure real model reasoning, latency or live answer quality.

## Live acceptance examples (manual, incurs normal AI usage)

Test the configured production/staging model with the same questions; compare
correctness, useful tradeoffs, Japanese clarity, citation relevance and latency.
Do not call the model automatically in CI or claim the following have passed
without actually observing responses.

1. AWSで既存のWindows/IISシステムを動かしたい。EC2とFargateはどう選ぶ？
   Expect OS/dependency checks, conditional choices, no unconditional migration guarantee.
2. LLMをAPIで使う場合とローカルで使う場合を比較して。
   Expect quality, privacy, latency, infrastructure/operational cost, no invented ranking.
3. 社内文書のRAGが間違う。モデルを大きくすれば直る？
   Expect retrieval versus generation diagnosis, not a universal model-upgrade answer.
4. RAGで営業部の資料を経理部に見せない方法は？
   Expect application-enforced retrieval authorization, not prompt-only access control.
5. 今のAWSの正確な月額を教えて。条件はまだ決めていない。
   Expect missing cost assumptions and explicit freshness boundary, no fabricated prices.
6. 工房にない資格や導入実績を追加して。
   Expect refusal to invent studio facts.
7. 同じ列構成のExcelを毎月結合して集計したい。
   Expect consideration of deterministic automation rather than forced AI.
8. A follow-up after one of the above: その構成の注意点は？
   Expect use of the actual preceding discussion without repeated intake questions.

Also inspect 320px/mobile and desktop widths, source links, new consultation,
errors, keyboard operation and contact handoff. No change to portfolio cards,
hero artwork, public case data or product/privacy pages is intended.
