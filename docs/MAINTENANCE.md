# Maintaining this site

The code here will not rot. The content will, faster than almost anything
else the Libraries publishes. Budget accordingly: this is a writing
commitment, not a software one.

---

## Deploying

`git push` to `main`. Live in about a minute.

GitHub Pages serves directly from the branch — there is no build, no Actions
workflow in the deploy path, and nothing to break. Editing a file in the
github.com web interface is fully supported and is the recommended route for
prose changes.

**Rollback:** `git revert` the commit and push. Pages caches for roughly ten
minutes, so a hard refresh may be needed.

---

## The six-month review

Put it on a calendar. Nobody will remember otherwise.

- [ ] Read every section for anything that has stopped being true.
- [ ] Update the "Last reviewed" date on every page (one line per page).
- [ ] Re-check every statistic against its primary source.
- [ ] Verify which AI tools UNLV licenses and what protections they carry —
      this changes as contracts are signed and end, and Section 4 and the
      privacy card deck both name specific tools.
- [ ] Check external links still resolve, especially UNLV policy pages.
- [ ] Confirm current citation-style guidance for AI output (it has been
      revised more than once).
- [ ] Re-run the [accessibility checklist](ACCESSIBILITY.md).
- [ ] `node tools/validate-content.mjs && node tools/check-links.mjs && node tools/check-chrome.mjs`

### Content that dates fastest

In rough order: named AI tools and what they are licensed for; detector
policy and institutional practice; citation-style guidance; published
statistics; UNLV policy URLs.

**Never name model versions in prose.** Describe capabilities — "tools that
search the web and cite sources" — not products. Capabilities age in years,
version numbers age in weeks. The existing prose follows this rule; keep it.

---

## Why there is no build step

Deliberate, and worth defending when someone suggests adding a framework.

What kills small institutional sites over five years is almost never "the
HTML stopped working." It is `npm ci` failing, a build tool's major version
changing its config, an Actions deprecation, a CI runner's Node version
moving, a dependency being compromised, or the person who set it up leaving
and nobody else being able to run the toolchain.

This project has no `package.json`, so none of those can happen. The pull
request check enforces that.

The costs we accepted instead:

| Cost | How it is handled |
|---|---|
| Page chrome duplicated across 12 files | The chrome is designed never to change — the nav has four permanent links and does not list sections, so adding a section never touches it. `tools/check-chrome.mjs` catches drift. |
| Prose in HTML rather than Markdown | A restricted tag vocabulary with copy-paste snippets in [EDITING.md](EDITING.md). |
| No build-time schema validation | Recovered with `tools/validate-content.mjs` on every pull request, plus the same checks again in the browser at runtime. |
| Local preview needs a server | `python3 -m http.server 8000`, which ships with macOS. |

**When to reconsider:** if the site passes roughly 30 pages, or needs listings
generated from metadata. Below that, duplication is cheaper than a build that
fails in 2031 and costs a day to whoever inherits it. If you do adopt a
generator, prefer one that emits plain HTML you could keep by hand.

---

## Deliberately not built

Recorded so they do not get added later by someone who assumes they were
overlooked. Each was considered and rejected.

- **Drag-and-drop sorting** — an accessibility trap with no learning gain
  over buttons.
- **Points, badges, streaks, leaderboards** — nothing is recorded, so there
  is nothing to attach them to, and a badge reads as condescending to a
  50-year-old colleague.
- **Progress gating** — punishes without teaching and breaks the self-paced
  promise.
- **Timers** — conflicts with WCAG 2.2.1 and adds anxiety for no gain.
- **Simulated typing animation** on the canned AI output — charming once,
  irritating on revisit, an accessibility problem, and it burns seconds from
  a 40-minute budget.
- **A robot mascot** — condescending to at least half the audience.
- **A live embedded chatbot** — breaks the static premise, needs a key, costs
  money, invites abuse, and makes output non-reproducible, which means
  feedback cannot be written reliably.
- **Storing progress** — see below.

### On storing progress

The site writes nothing to the browser: no cookies, no localStorage, no
sessionStorage. This makes "we store nothing" checkable in DevTools rather
than merely asserted, which matters for a module that spends a section
telling people to think about where their data goes.

The cost is that closing the tab loses your place in the quiz. Sections are
separate pages, so browser history already handles the reading order.

If learners ask for it, the upgrade path is a single explicitly opt-in
"remember my place on this device" checkbox writing one key, with a visible
Clear button — and the About page updated to match. Do not add it silently.

---

## What can and cannot break

**Cannot break:** the build (there is none), dependencies (there are none),
CI in the deploy path (there is none), the host runtime (GitHub's problem).

**Can break:** external links rot; UNLV policy pages move; the tools named in
Section 4 change licensing; statistics go stale; citation guidance is
revised.

All of those are content problems, which is where the maintenance burden
should be for a site about a fast-moving topic.

---

## Handover test

The real test of this documentation is not whether it reads well. Give
[EDITING.md](EDITING.md) to a colleague and ask them to add a throwaway
section without help. If they cannot, the documentation is wrong — not the
colleague. Fix it and try again with someone else.
