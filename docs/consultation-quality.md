# Consultation answer quality / 2026-11-06

This change addresses the unresolved privacy advice and vague next steps in the live acceptance run for 497c7b3. It does not change the inference model, billing plan, output token cap or request limits.

## Changes

- Preserve real user/assistant roles when calling Workers AI. The reference JSON is included in the first user message and explicitly treated as data, not authority.
- Keep the system contract focused. Supply the existing public studio facts for studio-related requests only; do not repeat all eight project descriptions on unrelated technical questions.
- Prioritize external-transmission permission, all local processing paths, conditional security claims, deterministic numeric processing, low-code options, and human approval of reply drafts.
- Add a deliberately narrow publication guard for two observed failures: an unconditional local-LLM privacy guarantee and advice to compare actual internal documents via an external API while permission is explicitly pending/prohibited. It checks reply, diagnosis and CTA. It withholds the answer with AI_ADVICE_REVIEW_REQUIRED; it never substitutes a fixed expected answer, retries, or claims that a blocked request passed quality review. The guard is lexical, not comprehensive semantic validation.
- API diagnostic headers expose only the configured public Workers AI model identifier passed to inference and a code revision marker. Never return environment contents, keys, account IDs or conversation content in headers. This is not independent attestation by the model provider.

## Sources reviewed

- https://docs.ollama.com/faq : local inference vs cloud-hosted models; disabling cloud features; actual configuration and communication routes need inspection. No universal guarantee of zero outbound traffic is inferred.
- https://learn.microsoft.com/ja-jp/power-query/combine-files-overview : combining same-schema files, filtering target files. Department grouping and reconciliation are implementation advice.
- https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/ : public model identifier and chat messages API.

## Verification

Run node --test tests/*.test.mjs, npm run build, node scripts/verify-home.mjs. Retest the same six synthetic live questions separately after deployment, including real first replies in follow-up history. Record output, diagnostic headers, latency and any blocked answers. A successful build/HTTP request is not an answer-quality verdict. Do not silently publish generated answers which the guard rejects. Live results are recorded in the QA branch rather than invented here.
