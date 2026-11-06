# Live consultation acceptance results — 2026-11-06

## Provenance and scope

Owner-requested live API test, using synthetic questions only. Production endpoint: https://yamicha.com/api/chat . The homepage returned HTTP 200 and the expected studio name before requests were sent.

- Workflow run: https://github.com/yam1c6a/yamicha-kobo/actions/runs/42165628572
- Job ID: 127721326600. Raw questions and complete responses are in its RESULT_JSON log lines.
- Test commit: 078849a7f5d7aa4e6fbc204c24a1d06252d0c7b2.
- Production main stayed at f587bf84a0674a474a496bbec9b43331ea644e65; no production code, model, prompt or billing setting changed.
- Only the QA branch qa/live-consultation-20261106 was created/updated. No merge to main.
- Three conversations, two turns each. Actual first replies were included in follow-up history using the browser's compact history fields.
- Six requests, six HTTP 200 responses. This is transport success, not a blanket quality pass.
- Measured API round-trip latency: 6.205–12.140 seconds; mean 9.0005 seconds. GitHub's runner was in westus3. These timings do not directly compare with Japanese browser measurements or identify the production model. Model ID was not exposed.
- One observation per question; no retries, load test, browser-rendering check or statistical performance guarantee.

## Observed responses

| Scenario | Time | Observation | Review |
| --- | ---: | --- | --- |
| AWS: existing Windows/IIS/.NET Framework app, not containerized | 10.709 s | Recommends EC2; claims the system can be migrated as-is | Direction reasonable, but migration feasibility is overconfident without dependency checks |
| AWS: change to a Linux container, no persistent local state or OS login, reduce OS maintenance | 12.140 s | Switches to ECS/Fargate; returned sources=[] | Correctly adapts the principal choice, but repeats the follow-up question in reply and questions[] |
| LLM: Japanese quality and operational burden, external transmission permission still being checked | 10.042 s | Discusses API/local tradeoffs; asks whether external transmission permission has been decided | Re-asks a condition already explicitly described as pending; first safe evaluation steps are vague |
| LLM: documents, questions, embedding inputs and logs must stay inside the company | 7.931 s | Removes external API and proposes Python/PostgreSQL/local LLM; sources=[llm-selection] | Does not justify the DB choice; proposes saving questions/logs without discussing necessity; local embedding and actual outbound-path controls need clearer treatment |
| Automation: combine 30 same-schema Excel files monthly, group amounts by department, no Python maintainer | 6.205 s | Says AI is unnecessary, proposes VBA; steps are develop/test/deploy/operate | Avoids forced AI/Python, but misses a lower-code Power Query comparison and concrete operations |
| Automation: add free-text classification and reply drafts, retain exact numeric aggregation and human approval | 6.976 s | Keeps VBA aggregation and uses AI for classification/drafts | Correct separation of deterministic and AI work; introduces learning from existing inquiries too early and leaks the history label into prose |

All six responses contain a structured follow-up question. This does not by itself prove every question is unnecessary; the LLM permission question is clearly redundant with the supplied condition.

## Reproduced presentation defect

AWS follow-up reply ends with:

> 確認したこと: 現在のシステムの予想されるCPUとメモリの使用率はどの程度ですか?

The same response has questions[0]:

> 現在のシステムの予想されるCPUとメモリの使用率はどの程度ですか？

The existing deduplication normalizes punctuation but does not strip the prefix 確認したこと:. Thus this observed variation is not covered by the earlier fix. Another response also includes this history label before explanatory text. The matching client-history label may have influenced generation; causality has not been tested.

## Retrieval finding

At the production baseline, technical-context.js recognizes only a bounded set of follow-up prefixes. 条件を変更します and 条件を追加します are not in that set. The second AWS question contains no AWS-domain keyword, so this continuation does not inherit the earlier AWS topic for retrieval. The entire conversation still reaches the model; this is not loss of all conversation history.

The second LLM question contains LLM, but no llm-local keyword such as ローカル or 社外に出. With no inherited previous topic, the response cites only llm-selection. Retrieval of local-execution guidance is fragile under these paraphrases.

## Priority for a separate change

1. Improve explicit continuation and condition-update handling in retrieval without dragging unrelated old topics into a genuine topic change; add these exact questions as regressions.
2. Prevent duplicate questions and history-label leakage without deleting explanatory or quoted text.
3. Respect pending/already-provided conditions, avoid mandatory final questions, and explain concrete next operations rather than generic stages. Evaluate with these unchanged questions before claiming improvement.

No such production fixes were applied as part of this test.

## Primary references used for review

- AWS Fargate: https://docs.aws.amazon.com/ja_jp/AmazonECS/latest/developerguide/AWS_Fargate.html
- Windows containers on Fargate: https://docs.aws.amazon.com/ja_jp/AmazonECS/latest/developerguide/windows-considerations.html
- Ollama local execution and cloud disabling: https://docs.ollama.com/faq
- Power Query same-schema file combination: https://learn.microsoft.com/ja-jp/power-query/combine-files-overview

Fargate supports Windows containers; the initial AWS test is about an existing app that is NOT containerized, not a blanket Windows restriction. VBA is not an incorrect solution: the review concern is missing a low-code alternative and actionable steps. Encryption should not be presented as a substitute for a prohibition on outbound transmission.
