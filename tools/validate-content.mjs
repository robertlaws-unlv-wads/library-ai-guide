#!/usr/bin/env node
/* ==========================================================================
   Validate every JSON content file against the shared schema.

   Run it:      node tools/validate-content.mjs
   In CI:       .github/workflows/validate.yml, on pull requests only.

   Node standard library only. There is no package.json in this repository
   and there must never be one: a dependency-free checker cannot break from
   a transitive update, a registry change, or a supply-chain compromise.

   This check NEVER gates deployment. GitHub Pages serves from the branch, so
   a red X here is information, not an outage.
   ========================================================================== */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');

// The same rules the browser applies at runtime. One source of truth.
const ContentSchema = require(join(repoRoot, 'assets/js/schema.js'));

const FILES = [
  { path: 'content/checks.json',    validate: ContentSchema.validateChecks },
  { path: 'content/exercises.json', validate: ContentSchema.validateExercises },
  { path: 'content/quiz.json',      validate: ContentSchema.validateQuiz }
];

let problemCount = 0;
let checkedCount = 0;

for (const file of FILES) {
  const abs = join(repoRoot, file.path);

  if (!existsSync(abs)) {
    console.error(`\n  ${file.path}\n    MISSING — expected this file to exist.`);
    problemCount += 1;
    continue;
  }

  let data;
  try {
    data = JSON.parse(readFileSync(abs, 'utf8'));
  } catch (err) {
    // A trailing comma or a missing brace lands here. Give the position,
    // because "Unexpected token" on its own is not actionable.
    console.error(`\n  ${file.path}\n    Not valid JSON: ${err.message}`);
    problemCount += 1;
    continue;
  }

  const problems = file.validate(data);
  checkedCount += 1;

  if (problems.length === 0) {
    console.log(`  ok  ${file.path}`);
  } else {
    console.error(`\n  ${file.path} — ${problems.length} problem${problems.length === 1 ? '' : 's'}:`);
    for (const problem of problems) console.error(`    • ${problem}`);
    problemCount += problems.length;
  }
}

// Cross-file check: every reviewHref must point at a file that exists.
// A dead remediation link is invisible until a learner gets the question
// wrong, which is the worst possible moment to discover it.
const deadLinks = [];

function collectReviewHrefs(data, label) {
  const out = [];
  const walk = (entries) => {
    if (!Array.isArray(entries)) return;
    for (const entry of entries) {
      if (entry && typeof entry.reviewHref === 'string' && entry.reviewHref) {
        out.push({ href: entry.reviewHref, id: entry.id, label });
      }
    }
  };
  walk(data?.checks);
  walk(data?.exercises);
  walk(data?.questions);
  return out;
}

for (const file of FILES) {
  const abs = join(repoRoot, file.path);
  if (!existsSync(abs)) continue;
  let data;
  try { data = JSON.parse(readFileSync(abs, 'utf8')); } catch { continue; }

  for (const ref of collectReviewHrefs(data, file.path)) {
    const target = join(repoRoot, ref.href.split('#')[0]);
    if (!existsSync(target)) {
      deadLinks.push(`${ref.label} "${ref.id}": reviewHref points at ${ref.href}, which does not exist.`);
    }
  }
}

if (deadLinks.length) {
  console.error(`\n  Dead review links — ${deadLinks.length}:`);
  for (const d of deadLinks) console.error(`    • ${d}`);
  problemCount += deadLinks.length;
}

console.log('');

if (problemCount > 0) {
  console.error(`FAILED — ${problemCount} problem${problemCount === 1 ? '' : 's'} across ${FILES.length} file${FILES.length === 1 ? '' : 's'}.`);
  console.error('Nothing was published. Fix the items above and run this again.\n');
  process.exit(1);
}

console.log(`Passed — ${checkedCount} content file${checkedCount === 1 ? '' : 's'}, no problems.\n`);
