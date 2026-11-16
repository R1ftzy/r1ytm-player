#!/usr/bin/env node
// Release notes for one version, from the CHANGELOG in src/changelog.js (the same list the "What's new" popup shows).
//
//   node scripts/release-notes.mjs 1.9.8            plain text: the title, then one "- " line per item
//   node scripts/release-notes.mjs 1.9.8 --amo      AMO metadata JSON for `web-ext sign --amo-metadata`
//
// Exits 1 when the version has no CHANGELOG entry, so a release never goes out without notes.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const [version, flag] = process.argv.slice(2);
if (!version) { console.error('usage: release-notes.mjs <version> [--amo]'); process.exit(2); }

const src = readFileSync(fileURLToPath(new URL('../src/changelog.js', import.meta.url)), 'utf8');
const start = src.indexOf('const CHANGELOG = [');
const end = src.indexOf('\n  ];', start);
if (start < 0 || end < 0) { console.error('CHANGELOG not found in src/changelog.js'); process.exit(2); }
// the array is a plain literal (strings and objects), so it can be evaluated on its own
const CHANGELOG = new Function(`return ${src.slice(start + 'const CHANGELOG = '.length, end + 4)}`)();

const entry = CHANGELOG.find(e => e.v === version);
if (!entry) { console.error(`no CHANGELOG entry for ${version}`); process.exit(1); }

const text = [entry.title, ...entry.items.map(i => '- ' + i)].filter(Boolean).join('\n');
if (flag === '--amo') {
  // `version` is applied to the new version on addons.mozilla.org (its "release notes" field)
  console.log(JSON.stringify({ version: { release_notes: { 'en-US': text } } }, null, 2));
} else {
  console.log(text);
}
