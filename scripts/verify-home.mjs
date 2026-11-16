import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { caseStudies, publicCaseKnowledge } from '../src/data/case-studies.js';

// Verify the actual Astro output, not a fixture. Supports flat and client/ output.
const outputRoot = path.resolve(process.argv[2] || 'dist');
async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const name = path.join(directory, entry.name);
    return entry.isDirectory() ? filesIn(name) : [name];
  }));
  return nested.flat();
}
const files = await filesIn(outputRoot);
let home;
for (const file of files.filter((file) => path.basename(file) === 'index.html')) {
  const html = await readFile(file, 'utf8');
  if (/id=["']main-content["']/.test(html)) { home = { file, html }; break; }
}
assert.ok(home, 'Homepage was not generated');
const { html } = home;
const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
assert.equal(new Set(ids).size, ids.length, 'Duplicate HTML IDs');
for (const match of html.matchAll(/\bhref=["']#([^"']*)["']/g)) {
  assert.ok(match[1] && ids.includes(match[1]), `Broken anchor: #${match[1]}`);
}
for (const match of html.matchAll(/\baria-(?:labelledby|describedby|controls)=["']([^"']+)["']/g)) {
  for (const id of match[1].split(/\s+/)) assert.ok(ids.includes(id), `Broken accessible label: ${id}`);
}
for (const id of ['services', 'system-development', 'ai-solutions', 'legacy-maintenance', 'cloud-aws', 'works', 'skills', 'about', 'consult', 'contact', 'contact-form', 'contact-name', 'contact-email', 'contact-message', 'chat-form', 'chat-input']) {
  assert.ok(ids.includes(id), `Missing section or existing chat element: ${id}`);
}
assert.equal((html.match(/<h1\b/g) || []).length, 1, 'Homepage must have one main heading');
const headline = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1].replace(/<[^>]*>/g, '').replace(/\s+/g, '');
assert.equal(headline, 'いつもの仕事に、ちょうどいいAIを。', 'Selected atelier headline missing');
assert.match(html, /\bhref=["']mailto:contact@yamicha\.com(?:[?"'])/, 'Existing email link missing');
const contactForm = html.match(/<form\b[^>]*\bid=["']contact-form["'][^>]*>[\s\S]*?<\/form>/)?.[0];
assert.ok(contactForm, 'Contact form missing');
for (const id of ['contact-name', 'contact-email', 'contact-message']) {
  assert.ok(contactForm.includes(`id="${id}"`) && contactForm.includes(`for="${id}"`), `Contact field or its label missing: ${id}`);
}
assert.ok(!html.includes('YAMIOS') && !html.includes('href="/yamios/"'), 'YAMIOS must not be promoted on the corporate homepage');
// Keep the independent service destinations while allowing the selected visual design.
const serviceRows = [...html.matchAll(/<article\b[^>]*\bclass=["'][^"']*\bservice-row\b[^"']*["'][^>]*>[\s\S]*?<\/article>/g)].map((m) => m[0]);
assert.equal(serviceRows.length, 3, 'Expected three service rows');
assert.deepEqual(serviceRows.map((row) => row.match(/\bid=["']([^"']+)["']/)?.[1]).sort(), ['ai-solutions', 'legacy-maintenance', 'system-development'], 'Each service must retain its own destination');
for (const row of serviceRows) assert.ok(!/<span\b[^>]*>\s*0[123]\s*<\/span>/.test(row), 'Decorative service numbering must not return');
const technicalDetails = html.match(/<details\b[^>]*\bid=["']skills["'][^>]*>([\s\S]*?)<\/details>/)?.[1];
assert.ok(technicalDetails && /\bid=["']cloud-aws["']/.test(technicalDetails) && technicalDetails.includes('AWS'), 'AWS information and anchor must remain in the technical details');
assert.ok(!html.includes('workflow-inputs') && !html.includes('workflow-core'), 'The misleading all-services-to-AI hero must not return');
assert.match(html, /<img\b[^>]*\bsrc=["']\/images\/atelier\/hero-workshop\.webp["']/, 'Selected atelier hero artwork missing');
assert.ok(html.includes('開発に関わった実績'), 'Portfolio heading missing');
const featuredLinks = [...html.matchAll(/<a\b[^>]*href="#case-([^"]+)"[^>]*\bdata-case-link\b/g)].map((match) => match[1]);
assert.deepEqual(featuredLinks.sort(), ['ai-agent-platform', 'geospatial-versions', 'public-documents'], 'Featured cards must link to their full existing cases');
// Preserve the featured case selection and all eight detailed cases without requiring diagrams.
const featuredCards = [...html.matchAll(/<article\b[^>]*class="featured-card"[^>]*>[\s\S]*?<\/article>/g)].map((m) => m[0]);
assert.equal(featuredCards.length, 3, 'Expected three featured cases');
const maintenanceCard = featuredCards.find((card) => card.includes('href="#case-geospatial-versions"'));
assert.ok(maintenanceCard, 'Maintenance case must be featured');
assert.ok(maintenanceCard.includes('>既存システムの改修・保守</h3>'), 'Maintenance heading missing');
assert.ok(maintenanceCard.includes('レガシーシステム') && maintenanceCard.includes('不具合'), 'Maintenance scope must be grounded in the existing case');
assert.ok(!html.includes('maintenance-detail'), 'Redundant maintenance detail section must not return');
assert.ok(!featuredCards.some((card) => card.includes('経理システム')), 'Accounting must not remain featured');
assert.ok(html.includes('id="case-public-accounting"'), 'Accounting case must remain in all works');
for (const card of featuredCards) assert.ok(!/EC運営|商品リサーチ|出品管理|在庫確認|diagram-commerce/.test(card), 'EC material must not remain in the featured cases');
assert.match(html, /id="case-ec-operations"/, 'Existing EC case must remain in the full portfolio');
assert.match(html, /<details\b[^>]*id="all-works"/, 'Full portfolio must be accessible through a native disclosure');
assert.ok(html.includes('守秘義務に配慮'), 'Public portfolio confidentiality notice missing');
assert.ok(!html.includes('20年以上'), 'Personal career claim must not appear');
assert.ok(!html.includes('>SKILLS<'), 'Resume-style section label must not appear');
const cards = [...html.matchAll(/<article\b[^>]*\bclass=["']portfolio-card["'][^>]*>[\s\S]*?<\/article>/g)].map((match) => match[0]);
assert.equal(cards.length, 8, 'All eight existing projects must remain');
assert.equal(caseStudies.length, 8, 'Expected eight shared case studies');
assert.equal(new Set(caseStudies.map((item) => item.id)).size, 8, 'Case IDs must be unique');
const escapeHtml = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
for (const project of caseStudies) {
  const card = cards.find((item) => item.includes(`id="case-${project.id}"`));
  assert.ok(card, `Missing case: ${project.id}`);
  for (const text of [project.title, project.overview, project.purpose, '用途・目的', '主な機能', '設計・実装のポイント', 'システム構成']) {
    assert.ok(card.includes(escapeHtml(text)), `Missing case content: ${project.id}: ${text}`);
  }
  assert.ok(project.features.length >= 3 && project.design.length >= 2 && project.stack.length >= 2, `Incomplete case: ${project.id}`);
  for (const feature of project.features) {
    assert.ok(card.includes(escapeHtml(feature.title)) && card.includes(escapeHtml(feature.description)), `Missing feature: ${project.id}`);
  }
  for (const text of [...project.design, ...project.stack.map((item) => item.value)]) {
    assert.ok(card.includes(escapeHtml(text)), `Missing design or stack: ${project.id}`);
  }
  assert.equal((card.match(/<details\b/g) || []).length, 1, `Expected native details for ${project.id}`);
  assert.ok(!/<details\b[^>]*\bopen(?:[\s=>])/.test(card), `Details should start collapsed: ${project.id}`);
  assert.ok(!/(?:担当(?:業務|範囲|工程)|\d+名(?:体制)?|\d+年以上|PMとして|単独開発)/.test(card), `Personal career detail in ${project.id}`);
  assert.ok(publicCaseKnowledge.includes(project.title) && publicCaseKnowledge.includes(project.overview), `AI context is out of sync: ${project.id}`);
}
const game = caseStudies.find((item) => item.id === 'game-localization');
assert.ok(!/不具合|テスト|入力処理/.test(JSON.stringify(game)), 'Game case must not add work outside the confirmed scope');
assert.ok(publicCaseKnowledge.includes('税務上の最終判断は税理士'), 'Human review boundary must be explicit');
assert.ok(!/Playwright|1名体制|10年以上/.test(publicCaseKnowledge), 'Retired facts must not return in AI context');
const aiSource = await readFile(new URL('../src/services/ai/studio-knowledge.ts', import.meta.url), 'utf8');
assert.ok(aiSource.includes("from '../../data/case-studies.js'") && aiSource.includes('${publicCaseKnowledge}'), 'AI must consume the shared public case source');
console.log(`Homepage verification passed: ${ids.length} unique IDs; 3 service destinations; atelier hero art; AWS details; 3 featured and 8 detailed cases; shared AI facts, confidentiality, anchors, contact form and existing chat.`);
