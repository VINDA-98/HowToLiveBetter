import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname, relative, sep } from 'node:path';
import { parseArgs } from 'node:util';
import { ROOT, readBook, gitCommit, buildStamp } from './lib/book.mjs';

const { values } = parseArgs({ options: { out: { type: 'string' }, release: { type: 'string' }, reuse: { type: 'boolean' } } });
const output = resolve(values.out || resolve(ROOT, 'dist/vinda-life'));
if (output === ROOT || ROOT.startsWith(output + sep)) throw new Error('Output must not overwrite the source tree.');
const corpus = readBook();
const assets = ['vinda-life.css', 'vinda-life.js', 'vinda-life.json', 'vinda-icons.js', 'vinda-brand.svg', 'vinda-manrope.ttf', 'LUCIDE-LICENSE.txt', 'MANROPE-LICENSE.txt'];
const files = [...new Set(['index.html', 'selfcheck.html', 'README.md', 'LICENSE', 'LICENSE-CODE', ...assets, ...corpus.bookFiles, ...corpus.docFiles])];
const sponsor = JSON.parse(readFileSync(resolve(ROOT, 'vinda-life.json'), 'utf8')).sponsor;
if (sponsor?.enabled) {
  const url = new URL(sponsor.href);
  if (url.protocol !== 'https:' || url.username || url.password || !sponsor.title?.trim()) throw new Error('Invalid sponsor configuration.');
  if (sponsor.image) {
    if (!/^sponsor-[a-z0-9-]+\.(?:webp|png|jpe?g)$/.test(sponsor.image)) throw new Error('Sponsor image must be an allowlisted local asset.');
    files.push(sponsor.image);
  }
}
for (const file of files) {
  const source = resolve(ROOT, file);
  if (relative(ROOT, source).startsWith('..') || !existsSync(source)) throw new Error(`Missing or unsafe file: ${file}`);
}
const hash = createHash('sha256');
for (const file of files.toSorted()) hash.update(file).update('\0').update(readFileSync(resolve(ROOT, file)));
const adaptationHash = hash.digest('hex');
const sourceCommit = gitCommit();
const releaseId = values.release || `${sourceCommit.slice(0, 7)}-${adaptationHash.slice(0, 12)}`;
if (!/^[a-z0-9][a-z0-9.-]{0,79}$/.test(releaseId)) throw new Error('Invalid release ID.');
const releaseRoot = resolve(output, 'releases', releaseId);
const publicRoot = resolve(releaseRoot, 'life');
if (existsSync(releaseRoot)) {
  if (!values.reuse) throw new Error(`Release already exists; do not overwrite an immutable snapshot: ${releaseId}`);
  const existing = JSON.parse(readFileSync(resolve(releaseRoot, 'manifest.json'), 'utf8'));
  if (existing.sourceCommit !== sourceCommit || existing.adaptationHash !== adaptationHash) throw new Error('Existing snapshot source differs.');
  for (const file of existing.files) {
    if (!/^life\//.test(file.path) || file.path.split('/').some(part => part === '..' || part === '.')) throw new Error('Unsafe snapshot path.');
    const data = readFileSync(resolve(releaseRoot, file.path));
    if (data.length !== file.bytes || createHash('sha256').update(data).digest('hex') !== file.sha256) throw new Error(`Snapshot checksum differs: ${file.path}`);
  }
  writeFileSync(resolve(output, 'preview.json'), JSON.stringify({ releaseId, releaseRoot, publicRoot }, null, 2) + '\n');
  console.log(`Verified existing immutable snapshot: ${releaseId}`);
  process.exit(0);
}
const syncedAt = buildStamp();
const corpusBase = `/life/_releases/${releaseId}/life/`;
const release = { releaseId, sourceCommit, adaptationHash, syncedAt, corpusBase };
const injection = `<script>window.__LIFE_RELEASE__=${JSON.stringify(release).replace(/</g, '\\u003c')};</script>`;
mkdirSync(publicRoot, { recursive: true });
const manifest = [];
for (const file of files) {
  const source = resolve(ROOT, file);
  const destination = resolve(publicRoot, file);
  mkdirSync(dirname(destination), { recursive: true });
  if (file.endsWith('.html')) {
    let html = readFileSync(source, 'utf8').replace(/\r\n?/g, '\n');
    if (!html.includes('<!-- vinda:release -->')) throw new Error(`Missing release marker in ${file}`);
    html = html.replace('<!-- vinda:release -->', injection);
    for (const asset of ['vinda-life.css', 'vinda-life.js', 'vinda-icons.js', 'vinda-brand.svg']) {
      html = html.replaceAll(`="${asset}"`, `="${corpusBase}${asset}"`);
    }
    if (/googletagmanager|google-analytics|G-NTPGXCLMP6|4\.mcyyy\.com|wechat-reward/.test(html)) throw new Error(`Unwanted external integration in ${file}`);
    writeFileSync(destination, html);
  } else if (/\.(?:md|js|css|json|txt)$/.test(file) || /^LICENSE(?:-CODE)?$/.test(file)) {
    writeFileSync(destination, readFileSync(source, 'utf8').replace(/\r\n?/g, '\n'));
  } else {
    copyFileSync(source, destination);
  }
  const data = readFileSync(destination);
  manifest.push({ path: `life/${file}`, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') });
}
const entries = corpus.bookFiles.reduce((count, file) => count + [...readFileSync(resolve(ROOT, file), 'utf8').matchAll(/^### \d+[.]/gm)].length, 0);
const record = { ...release, chapters: corpus.bookFiles.length, entries, docs: corpus.docFiles.length, files: manifest };
writeFileSync(resolve(releaseRoot, 'manifest.json'), JSON.stringify(record, null, 2) + '\n');
writeFileSync(resolve(output, 'preview.json'), JSON.stringify({ releaseId, releaseRoot, publicRoot }, null, 2) + '\n');
console.log(`Reader snapshot ${releaseId}: ${record.chapters} chapters, ${entries} entries, ${record.docs} long reads, ${manifest.length} allowlisted files.`);
console.log(`Output: ${releaseRoot}`);
