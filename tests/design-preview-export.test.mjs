// Temporary, branch-only export for reviewing the actual Astro build offline.
// Removed after visual validation; never contacts /api/chat or exports Worker code.
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { brotliCompressSync } from 'node:zlib';

test('export public design preview for visual review', { skip: !process.env.CI }, async () => {
  execFileSync('npm', ['run', 'build'], { stdio: 'pipe', timeout: 240000 });
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    return (await Promise.all(entries.map(e => e.isDirectory() ? walk(path.join(dir, e.name)) : path.join(dir, e.name)))).flat();
  }
  const files = await walk('dist');
  let home;
  for (const file of files.filter(f => path.basename(f) === 'index.html')) {
    if ((await readFile(file, 'utf8')).includes('id="main-content"')) { home = file; break; }
  }
  if (!home) throw new Error('Built homepage not found');
  const root = path.dirname(home);
  const payload = {};
  for (const file of files) {
    const relative = path.relative(root, file).replaceAll('\\', '/');
    if (file === home || (relative.startsWith('_astro/') && /\.(css|js)$/.test(relative))) {
      payload[relative] = (await readFile(file)).toString('base64');
    }
  }
  let sharp;
  try { sharp = (await import('sharp')).default; } catch {}
  for (const name of ['ym-logo.png', 'ym-icon.png']) {
    const source = await readFile(path.join('public', name));
    const bytes = sharp ? await sharp(source).resize({ width: 160, withoutEnlargement: true }).png({ palette: true, quality: 85 }).toBuffer() : source;
    payload[name] = bytes.toString('base64');
  }
  const bundle = brotliCompressSync(Buffer.from(JSON.stringify(payload))).toString('base64');
  console.log('DESIGN_PREVIEW_BEGIN');
  for (const chunk of bundle.match(/.{1,1500}/g) || []) console.log(chunk);
  console.log('DESIGN_PREVIEW_END');
});
