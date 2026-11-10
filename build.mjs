#!/usr/bin/env node
// Builds every copy of the script from src/.
//
//   src/*.js (edit these)  ->  extension/content.js
//                          ->  r1ytm.user.js   (committed; the README links to it for userscript installs)
//
// The src files are NOT separate modules: they are joined, in the order of
// SECTIONS below, inside one (() => { ... })() wrapper and share its scope.
// So a const/let/function in one file is visible in every later file (and in
// earlier ones once the code runs), exactly as in the old single file. Order
// matters: a top-level statement can only use a const/let from a file above it.
//
// The version comes from extension/manifest.json.
//
//   node build.mjs           write all outputs
//   node build.mjs --check   exit 1 if any output is out of date (no writes)

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SECTIONS = [
  'config',          // tunable constants (animation timings etc.)
  'helpers',         // SVG icons, DOM helpers
  'ytm-hooks',       // reading / driving YT Music's own player
  'player-page',     // smooth player page open / background fade
  'more-menu',       // our "more" popup
  'ytm-menus',       // YTM's 3-dot menus everywhere else
  'hide-ytm-bar',    // hide YTM's bar, gray strip, reserved space
  'styles',          // injected CSS
  'bar',             // build the bar
  'title-links',     // clickable title / artists / album
  'settings-panel',  // sidebar "r1ytm" entry -> settings panel
  'look',            // custom font + custom background
  'gradient-maker',  // gradient maker
  'bar-position',    // bar at the bottom or the top (in YTM's header / under it)
  'zen',             // zen mode: locked, title-card listening screen
  'sync-loop',       // the interval that keeps everything in sync + teardown
];

const PROLOGUE = `// Apple Music-style bar for YouTube Music
// Browser extension content script (Chrome + Firefox).
// Injected on https://music.youtube.com/* only.
(() => {
  'use strict';

`;
const EPILOGUE = '})();\n';

const root = dirname(fileURLToPath(import.meta.url));
const p = f => join(root, f);
const check = process.argv.includes('--check');

// every src file must be listed, and every listed file must exist
const onDisk = readdirSync(p('src')).filter(f => f.endsWith('.js')).map(f => f.slice(0, -3));
const unlisted = onDisk.filter(n => !SECTIONS.includes(n));
const missing = SECTIONS.filter(n => !onDisk.includes(n));
if (unlisted.length || missing.length) {
  if (unlisted.length) console.error(`src/ files not in SECTIONS (build.mjs): ${unlisted.join(', ')}`);
  if (missing.length) console.error(`SECTIONS entries with no src/ file: ${missing.join(', ')}`);
  process.exit(1);
}

const parts = SECTIONS.map(n => {
  const t = readFileSync(p(`src/${n}.js`), 'utf8');
  return t.endsWith('\n') ? t : t + '\n';
});
const content = PROLOGUE + parts.join('') + EPILOGUE;

const { version } = JSON.parse(readFileSync(p('extension/manifest.json'), 'utf8'));
const header = `// ==UserScript==
// @name         r1ytm
// @namespace    r1ytm
// @version      ${version}
// @description  A floating, Apple Music-style control bar for YouTube Music.
// @match        https://music.youtube.com/*
// @grant        none
// @run-at       document-idle
// @downloadURL  https://raw.githubusercontent.com/R1ftzy/r1ytm-player/main/r1ytm.user.js
// @updateURL    https://raw.githubusercontent.com/R1ftzy/r1ytm-player/main/r1ytm.user.js
// ==/UserScript==
`;
const userscript = header + content;

const outputs = [
  ['extension/content.js', content],
  ['r1ytm.user.js', userscript],
];

let stale = 0;
for (const [file, text] of outputs) {
  let old = null;
  try { old = readFileSync(p(file), 'utf8'); } catch {}
  if (old === text) { console.log(`ok       ${file}`); continue; }
  if (check) { console.log(`STALE    ${file}`); stale++; continue; }
  writeFileSync(p(file), text);
  console.log(`wrote    ${file}`);
}
console.log(`version  ${version}`);
if (stale) {
  console.error('\nRun: node build.mjs');
  process.exit(1);
}
