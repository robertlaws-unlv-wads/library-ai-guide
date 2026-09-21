#!/usr/bin/env node
/* ==========================================================================
   Check that every internal link resolves, and that no link is root-absolute.

   Run it: node tools/check-links.mjs

   Node standard library only. No package.json, by design.

   The root-absolute check is the important one. This site is served from
   https://<user>.github.io/library-ai-guide/, so href="/about.html" resolves
   to github.io/about.html and 404s -- while working perfectly in local
   preview. It is the most common way a GitHub Pages project site breaks and
   it fails silently.
   ========================================================================== */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, relative } from 'node:path';

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

const pages = htmlFiles(repoRoot).sort();
const problems = [];
let linkCount = 0;

for (const page of pages) {
  const rel = relative(repoRoot, page);
  const html = readFileSync(page, 'utf8');
  const pageDir = dirname(page);

  const attrs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);

  for (const raw of attrs) {
    // Skip external, anchors, and non-navigational schemes.
    if (/^(https?:|mailto:|tel:|data:|#)/.test(raw)) continue;
    linkCount += 1;

    if (raw.startsWith('/')) {
      problems.push(
        `${rel}: "${raw}" is root-absolute. Use a relative path instead ` +
        `(the site is served from a subpath, so this will 404 in production).`
      );
      continue;
    }

    const target = resolve(pageDir, raw.split('#')[0]);
    if (!existsSync(target)) {
      problems.push(`${rel}: "${raw}" does not resolve to a file.`);
    }
  }
}

/* --- prev/next chain must match the order of the table of contents ------- */

const indexHtml = readFileSync(join(repoRoot, 'index.html'), 'utf8');
const tocOrder = [...indexHtml.matchAll(/class="toc__link" href="(sections\/[^"]+)"/g)]
  .map((m) => m[1]);

for (let i = 0; i < tocOrder.length; i += 1) {
  const pagePath = join(repoRoot, tocOrder[i]);
  if (!existsSync(pagePath)) continue;
  const html = readFileSync(pagePath, 'utf8');

  const prevMatch = html.match(/section-nav__prev">\s*<a href="([^"]+)"/);
  const nextMatch = html.match(/section-nav__next">\s*<a href="([^"]+)"/);

  const expectedPrev = i === 0
    ? '../index.html'
    : tocOrder[i - 1].replace('sections/', '');
  const expectedNext = i === tocOrder.length - 1
    ? '../quiz.html'
    : tocOrder[i + 1].replace('sections/', '');

  if (prevMatch && prevMatch[1] !== expectedPrev) {
    problems.push(
      `${tocOrder[i]}: "Previous" points at "${prevMatch[1]}" but the table of ` +
      `contents in index.html says it should be "${expectedPrev}".`
    );
  }
  if (nextMatch && nextMatch[1] !== expectedNext) {
    problems.push(
      `${tocOrder[i]}: "Next" points at "${nextMatch[1]}" but the table of ` +
      `contents in index.html says it should be "${expectedNext}".`
    );
  }
}

if (problems.length) {
  console.error(`\nFAILED — ${problems.length} problem${problems.length === 1 ? '' : 's'}:\n`);
  for (const p of problems) console.error(`  • ${p}`);
  console.error('');
  process.exit(1);
}

console.log(`Passed — ${linkCount} internal links across ${pages.length} pages, all resolve.`);
console.log(`Passed — prev/next chain matches the table of contents.\n`);
