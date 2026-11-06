import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

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
for (const id of ['services', 'works', 'skills', 'about', 'consult', 'contact', 'chat-form', 'chat-input']) {
  assert.ok(ids.includes(id), `Missing section or existing chat element: ${id}`);
}
assert.equal((html.match(/<h1\b/g) || []).length, 1, 'Homepage must have one main heading');
assert.ok(html.includes('ビジネスの可能性を'), 'Corporate headline missing');
assert.ok(html.includes('contact@yamicha.com'), 'Existing contact address missing');
assert.ok(html.includes('/images/technology-hero.avif'), 'Approved hero artwork missing');
assert.ok(files.some((file) => file.endsWith(`${path.sep}images${path.sep}technology-hero.avif`)), 'Hero asset was not copied');
assert.ok(!html.includes('20年以上'), 'Personal career claim must not appear');
assert.ok(!html.includes('>SKILLS<'), 'Resume-style section label must not appear');
assert.equal((html.match(/class=["']portfolio-card["']/g) || []).length, 8, 'All eight existing projects must remain');
console.log(`Homepage verification passed: ${ids.length} unique IDs; anchors, 8 cases, contact, artwork and chat preserved.`);
