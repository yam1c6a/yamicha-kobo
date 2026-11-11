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
for (const match of html.matchAll(/\baria-labelledby=["']([^"']+)["']/g)) {
  for (const id of match[1].split(/\s+/)) assert.ok(ids.includes(id), `Broken accessible label: ${id}`);
}
for (const id of ['services', 'works', 'skills', 'about', 'consult', 'contact', 'chat-form', 'chat-input']) {
  assert.ok(ids.includes(id), `Missing section or existing chat element: ${id}`);
}
assert.equal((html.match(/<h1\b/g) || []).length, 1, 'Homepage must have one main heading');
assert.match(html, /<h1\b[^>]*>AIエージェントと、<br\s*\/?\s*>システム開発で、<br\s*\/?\s*><span[^>]*>業務の課題を解決。<\/span><\/h1>/, 'Homepage headline missing');
assert.ok(html.includes('href="mailto:contact@yamicha.com?'), 'Existing email link missing');
assert.ok(html.includes('class="project-diagram diagram-hero"') && html.includes('活用イメージ'), 'Labeled hero diagram missing');
assert.ok(html.includes('開発に関わった実績'), 'Portfolio heading missing');
assert.equal((html.match(/説明用イメージ/g) || []).length, 3, 'Expected three labeled case diagrams');
const featuredLinks = [...html.matchAll(/<a\b[^>]*href="#case-([^"]+)"[^>]*\bdata-case-link\b/g)].map((match) => match[1]);
assert.deepEqual(featuredLinks, ['ai-agent-platform', 'geospatial-versions', 'ec-operations'], 'Featured cards must link to their full existing cases');
assert.match(html, /<details\b[^>]*id="all-works"/, 'Full portfolio must be accessible through a native disclosure');
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
console.log(`Homepage verification passed: ${ids.length} unique IDs; 8 detailed cases, shared AI facts, anchors, contact, labeled diagrams and chat.`);
