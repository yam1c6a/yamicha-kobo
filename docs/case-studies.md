# Public development case studies

## Editorial policy

The eight examples describe systems, not an individual resume. Use the system's
purpose, implemented functions, design choices and technical configuration. Do
not publish personal details, dates, career duration, roles, team sizes, client
names, service-specific names, private screenshots or unconfirmed outcomes.
These are examples of development involvement, not a claim that the studio alone
contracted and delivered every entire system. No performance or savings metrics
have been supplied, so no such claims are added.

The content was checked against the owner-supplied source on 2026-11-06. Do not
commit that source document: it contains personal information.

## Content and presentation

- `src/data/case-studies.js` is the shared public source for all eight examples.
- `Portfolio.astro` renders overview and purpose immediately, followed by native
  expandable details for functions, design and configuration. No client script is
  needed to read the details. IDs are stable and labels are unique per example.
- `studio-knowledge.ts` uses the compact `publicCaseKnowledge` export from the same
  source. Model configuration, API handlers, limits and chat behavior are unchanged.
- Existing hero, contact details, all eight cases, technical solutions and other
  pages are retained.

## Accuracy boundaries

- EC operations and the AI agent platform both use SQLite in the supplied source.
- The AI agent platform is Python/JavaScript/Pi with Claude API, RAG and tool use;
  final tax decisions remain with a tax professional (Human-in-the-Loop).
- GIS examples use a custom database. The viewer includes editing, WFS-based data
  access, server sharing and an EC2/Windows Server/IIS setup.
- The accounting example covers budget management/execution and expenditure
  procedures; it is not an unsupported claim to cover every accounting function.
- Game localization covers code analysis/modification, Windows porting, character
  encoding, fonts and layout. Do not reintroduce testing, bug-fixing or input-control
  work as confirmed experience for this case.

## Verification

`npm ci && npm run build && node scripts/verify-home.mjs`

The existing CI checks the actual generated homepage, preserved anchors and chat,
all eight detailed cases, accessible labels, corporate-tone exclusions and shared
AI context. This does not exercise live AI inference. Separately inspect narrow
and wide viewports with details both collapsed and expanded, including keyboard
operation and horizontal overflow.
