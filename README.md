# AI Literacy Module — UNLV University Libraries

A self-paced module for UNLV students and staff on using generative AI
carefully: how it works, how it fails, what not to share, and how to decide
when to use it. Seven sections, five interactive exercises, and a
ten-question quiz. About 40 minutes.

**Live:** https://robertlaws-unlv-wads.github.io/library-ai-guide/

---

## How it is built

Hand-written HTML, one stylesheet, and about 900 lines of vanilla JavaScript.
**No build step. No `package.json`. No dependencies. No third-party
requests.**

That last point is not incidental. The module tells people to think about
where their data goes, so its own privacy claim has to be verifiable rather
than asserted: open DevTools and the Network tab shows no third-party
requests, the Application tab shows no cookies and no stored data.

| | |
|---|---|
| **Hosting** | GitHub Pages, served from the `main` branch |
| **Deploy** | `git push`. Live in about a minute. |
| **Content** | Prose in the HTML; all quiz and exercise content in `content/*.json` |
| **Validation** | `tools/*.mjs`, Node standard library only, run on every pull request |
| **Accessibility** | WCAG 2.1 AA — see [docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md) |
| **Type** | Self-hosted Roboto Slab + Roboto — the UNLV official typefaces (Apache 2.0, 93 KB). Roboto Condensed comes from Roboto's width axis, not a third file. |

---

## Layout

```
index.html  quiz.html  summary.html  about.html  404.html
sections/         the seven lesson pages
assets/css/       the only stylesheet
assets/fonts/     self-hosted Roboto Slab + Roboto and their licence
assets/js/        schema.js (shared validation) + engine.js + exercises.js + quiz.js
content/          quiz, checks and exercise content as JSON -- edit these, not the code
templates/        copy-me starter for a new section
tools/            zero-dependency checkers
docs/             editing, authoring, accessibility, maintenance
```

## Working on it

Nothing to install. Edit on github.com and it is live in a minute, or
preview locally:

```bash
python3 -m http.server 8000
```

Check your work (needs Node, only for checking — never for building):

```bash
node tools/validate-content.mjs && node tools/check-links.mjs && node tools/check-chrome.mjs
```

## Documentation

- **[docs/EDITING.md](docs/EDITING.md)** — change wording, add a section
- **[docs/CONTENT-AUTHORING.md](docs/CONTENT-AUTHORING.md)** — write quiz questions and exercises
- **[docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md)** — the component contract and test checklist
- **[docs/MAINTENANCE.md](docs/MAINTENANCE.md)** — review cycle, why there is no build step, what was deliberately not built

## Licence

Instructional content: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
Code: MIT. See [LICENSE](LICENSE).

Adapting this for another institution? The parts most needing change are the
UNLV-licensed tools named in Section 4 and the campus policy links throughout.
