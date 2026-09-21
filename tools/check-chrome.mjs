#!/usr/bin/env node
/* ==========================================================================
   Warn if any page's header or footer has drifted from the others.

   Run it: node tools/check-chrome.mjs

   This site has no build step and no template engine, so the site header and
   footer are physically duplicated across every page. That is an accepted
   tradeoff (see docs/MAINTENANCE.md) and it is safe only because the chrome
   is designed never to change: the nav is four permanent links and does not
   list sections, so adding a section never touches it.

   This script is the safety net. It normalises away the differences that are
   SUPPOSED to vary between pages -- relative path depth and the aria-current
   marker -- and reports anything else.
   ========================================================================== */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');

function htmlFiles(dir, found = []) {
  for (const name of readdirSync(dir)) {
    // templates/ holds a copy-me starter with deliberate placeholder
    // links and TODO text. It is not part of the published site.
    if (name.startsWith('.') || name === 'node_modules' || name === 'templates') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) htmlFiles(full, found);
    else if (name.endsWith('.html')) found.push(full);
  }
  return found;
}

function normalise(block) {
  return block
    .replace(/\.\.\//g, '')                      // path depth is allowed to differ
    .replace(/\s+aria-current="page"/g, '')      // the current-page marker is allowed to differ
    .replace(/\s+/g, ' ')
    .trim();
}

function extract(html, startTag, endTag) {
  const start = html.indexOf(startTag);
  const end = html.indexOf(endTag);
  if (start === -1 || end === -1) return null;
  return html.slice(start, end + endTag.length);
}

const pages = htmlFiles(repoRoot).sort();
const bars = new Map();
const headers = new Map();
const footers = new Map();
const problems = [];

for (const page of pages) {
  const rel = relative(repoRoot, page);
  const html = readFileSync(page, 'utf8');

  const bar = extract(html, '<div class="utility-bar">', '</div>\n</div>');
  const header = extract(html, '<header class="site-header">', '</header>');
  const footer = extract(html, '<footer class="site-footer">', '</footer>');

  if (!bar) { problems.push(`${rel}: no university utility bar found.`); continue; }
  if (!header) { problems.push(`${rel}: no site header found.`); continue; }
  if (!footer) { problems.push(`${rel}: no site footer found.`); continue; }

  const bKey = normalise(bar);
  const hKey = normalise(header);
  const fKey = normalise(footer);

  if (!bars.has(bKey)) bars.set(bKey, []);
  if (!headers.has(hKey)) headers.set(hKey, []);
  if (!footers.has(fKey)) footers.set(fKey, []);
  bars.get(bKey).push(rel);
  headers.get(hKey).push(rel);
  footers.get(fKey).push(rel);
}

function report(map, label) {
  if (map.size <= 1) return;
  // The largest group is treated as correct; everything else has drifted.
  const groups = [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  const [, majority] = groups[0];
  problems.push(
    `${label} differs across pages. ${majority.length} pages agree; these do not:`
  );
  for (const [, files] of groups.slice(1)) {
    for (const f of files) problems.push(`    ${f}`);
  }
}

report(bars, 'University utility bar');
report(headers, 'Site header');
report(footers, 'Site footer');

if (problems.length) {
  console.error(`\nDRIFT DETECTED:\n`);
  for (const p of problems) console.error(`  ${p}`);
  console.error(
    '\n  Fix: copy the chrome from a page in the majority group.' +
    '\n  Only the ../ path depth and the aria-current="page" marker may differ.\n'
  );
  process.exit(1);
}

console.log(`Passed — utility bar, header and footer are consistent across ${pages.length} pages.\n`);
