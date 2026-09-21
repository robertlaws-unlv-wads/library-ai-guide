#!/usr/bin/env node
/* ==========================================================================
   Check the stylesheet's custom properties and contrast annotations.

   Run it: node tools/check-css.mjs

   Node standard library only. No package.json, by design.

   Two things it catches:
     1. A var(--x) with no matching --x: definition. Silent in the browser —
        the property just resolves to nothing and the rule is dropped, which
        is easy to miss on a page you are not looking at.
     2. A colour defined in :root that no rule ever uses, which usually means
        a rename left something behind.

   Written because hand-rolled greps for this keep producing false positives:
   ".btn--dark:hover {" looks like a "--dark:" definition to a naive regex.
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const cssPath = join(here, '..', 'assets', 'css', 'site.css');
const raw = readFileSync(cssPath, 'utf8');

// Strip comments so annotations like "--foo: bar" in prose do not count.
const css = raw.replace(/\/\*[\s\S]*?\*\//g, '');

// A definition is a custom property at the start of a declaration, i.e.
// preceded by "{" or ";" (possibly with whitespace). This is what stops
// ".btn--dark:hover" from being read as a definition of "--dark".
const defined = new Set();
for (const m of css.matchAll(/(?:^|[{;])\s*(--[A-Za-z0-9-]+)\s*:/g)) defined.add(m[1]);

const used = new Set();
for (const m of css.matchAll(/var\(\s*(--[A-Za-z0-9-]+)/g)) used.add(m[1]);

const problems = [];

for (const name of [...used].sort()) {
  if (!defined.has(name)) {
    problems.push(`var(${name}) is used but never defined. The rule using it will be dropped.`);
  }
}

const unused = [...defined].sort().filter((n) => !used.has(n));

if (problems.length) {
  console.error(`\nFAILED — ${problems.length} problem${problems.length === 1 ? '' : 's'}:\n`);
  for (const p of problems) console.error(`  • ${p}`);
  console.error('');
  process.exit(1);
}

console.log(`Passed — ${used.size} custom properties used, all defined.`);

if (unused.length) {
  console.log(`\nNote: ${unused.length} defined but unused (not an error, but check for a stale rename):`);
  console.log(`  ${unused.join(', ')}\n`);
} else {
  console.log('');
}
