# Structured planning responses (2026-11-06)

The first quality retest against d386eaac returned six answers, but this was not a quality pass: EC2 was incorrectly described as a fully managed OS, the Fargate response omitted container-image patch responsibility, and procedure requests could end after a short conclusion. The runtime model header identified the configured Workers AI model as @cf/meta/llama-3.3-70b-instruct-fp8-fast. No model replacement is made in this change.

Explicit architecture / procedure requests now request a structured plan: generated conclusion, reasons, steps and cautions. The server validates and composes those generated fields into the existing reply field, preserving the public API and UI. Missing required fields or over-budget output fail explicitly, without canned replacements, truncation or another model call. Brief definitions and out-of-scope requests do not require a made-up plan. This shape check does not prove factual accuracy.

The AWS compute note now distinguishes guest OS responsibility on EC2 from Fargate infrastructure responsibility and customer container-image/IAM/network responsibility. The local LLM note separates generation, embedding, retrieval, telemetry and logs; local generation alone does not establish that every processing path remains local. These are reviewed facts plus clearly marked conditional design guidance, not new studio case studies.

Primary sources reviewed on 2026-11-06:
- https://aws.amazon.com/jp/compliance/shared-responsibility-model/
- https://docs.aws.amazon.com/AmazonECS/latest/developerguide/security-shared-model.html
- https://docs.ollama.com/faq
- https://developers.cloudflare.com/workers-ai/features/json-mode/

A narrow additional publication check rejects the observed EC2 fully-managed-OS misstatement while allowing an explicit denial of that claim. This is not a general cloud verifier. Existing privacy guards and API error handling remain in place. Limits, model, plan and billing are unchanged; longer generated answers can consume more of the existing output allowance. Tests and unchanged live acceptance questions must be reviewed separately before declaring completion.
