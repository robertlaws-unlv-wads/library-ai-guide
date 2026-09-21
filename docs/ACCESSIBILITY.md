# Accessibility

**Target: WCAG 2.1 Level AA.** UNLV is a public entity covered by the ADA
Title II web accessibility rule, which names this standard. This is a legal
requirement.

The public-facing statement is on [about.html](../about.html). This file is
the implementation contract and the test checklist.

---

## Component contract

These are decisions, not accidents. Changing any of them regresses
accessibility, so the reasoning is recorded here.

### Native form controls, always

Every choice in every exercise is a real `<input type="radio">` or
`<input type="checkbox">` inside a `<fieldset>` whose `<legend>` is the
question stem.

Never rebuild these as `<div role="radio">`. Native inputs give you arrow-key
navigation within a group, correct group announcement, "2 of 4" position
reporting, and label association — for free, from the browser, and they stay
correct as assistive technology changes. Hand-rolled ARIA radio groups with
roving `tabindex` are the single most common source of quiz accessibility
failures.

**There is deliberately no custom keyboard-handling code anywhere in this
project.** That is the design goal, and it is why this will still be
accessible in 2031.

Same principle for disclosures: `<details>`/`<summary>`, never a custom
accordion.

### Feedback is announced by moving focus, not by a live region

When an answer is checked, focus moves to the verdict paragraph, which
carries `tabindex="-1"`.

This is more reliable across screen reader and browser combinations than
`aria-live`, and it leaves the user's reading cursor at the start of the
explanation so they can simply continue reading.

**Do not add `role="status"` to a container you also move focus into.** That
produces a double announcement, which is worse than none. There are no live
regions in this project; focus movement is the single announcement mechanism.

Focus moves in exactly these places, all user-initiated:

| Trigger | Focus goes to |
|---|---|
| Checking an answer | the feedback verdict |
| Submitting with nothing selected | the feedback verdict (asking for a selection) |
| Submitting a matrix with gaps | the error summary listing the gaps |
| Advancing to the next question or card | the new question's `<legend>` |
| Finishing the quiz | the results heading |

Focus is never trapped, never moved on page load, and never moved without the
user doing something.

### Graded inputs use `aria-disabled`, never `disabled`

A `disabled` input drops out of the tab order, so a screen reader user could
not go back and review what they picked. Instead the inputs stay focusable,
get `aria-disabled="true"`, and further changes are ignored in JavaScript
(`Engine.lockSelection`).

### Position lives inside the legend

"Question 5 of 10" is rendered inside the `<legend>`, so it forms part of the
group's accessible name and is announced when focus arrives. No separate
announcement is needed.

### Never colour alone

Every graded state carries three cues: a text label ("Correct answer — you
did not pick this"), an icon, and a border plus tint. Icons that duplicate
adjacent text are `aria-hidden="true"` so they are not read twice.

Links in body prose are always underlined.

### Colour tokens are measured, not estimated

Every colour in `assets/css/site.css` has its contrast ratio in a comment
beside it. Re-measure after any change:

```bash
node tools/contrast.mjs "#b10202" "#f7f4ef"
```

`node tools/check-css.mjs` separately verifies that every `var(--x)` has a
definition — an undefined custom property silently drops the whole rule.

**The brand palette as issued contains two contrast failures.** Both are
corrected here, and the corrections must not be reverted:

| Brand swatch | Measured | Problem | Used instead |
|---|---|---|---|
| Gray Dark `#6A737B` | 4.40:1 on Bone | Assigned to eyebrows, metadata and captions — all normal-size text needing 4.5:1 | `--ink-muted` `#5F676E` (5.24:1). `#6A737B` kept as `--rule-strong` for non-text roles, where it is fine. |
| Scarlet Bright `#E31837` | 3.84:1 on Rich Black | Assigned as "accent on dark", but the eyebrows it sits on are 11px caps | `--scarlet-on-dark` `#F2445C` (4.97:1). `#E31837` still serves large display text and UI accents on dark, where 3:1 is the bar. |

Two further values were derived rather than taken from the palette:

- `--numeral` `#868A8E` for the large card ordinals. UNLV Gray `#9FA1A4` is
  2.59:1 and those numerals are large text, so 3:1 applies.
- `--border-ui` `#767D84` for form-control boundaries. `--rule-soft` is only
  1.3:1 against a card, and a `.choice` row is the hit area for a control.

`--rule` `#9FA1A4` is 2.36:1 on Bone and may **only** be used for decorative
rules, dividers and disabled states, exactly as the brand guide specifies. It
must never carry text or identify a control.

### Fonts are self-hosted, never fetched from a CDN

Roboto Slab (display and headings) and Roboto (interface and body) are the
UNLV official typefaces, Apache 2.0, served from `assets/fonts/`.

Loading them from `fonts.googleapis.com` would be a third-party request, and
the privacy claim on the About page has to survive someone opening the
Network tab.

Roboto Condensed — used for eyebrows and labels — is **not a third file**.
The bundled Roboto is a variable font with a width axis, so `font-stretch:
75%` renders the condensed width from it, saving 22 KB and a request. That
is why the `@font-face` declares `font-stretch: 75% 100%`.

Eyebrows are 11px and must never go below that, per the type spec. At that
size they are normal text and need the full 4.5:1.

Roboto has no ✓ ✗ → ◑ glyphs, which the quiz feedback uses. Those fall back
per-glyph to the system stack. That is intended — **do not add an icon font
for them**; they sit alongside a text label in every case and carry
`aria-hidden="true"`.

Apache 2.0 requires the licence ship with the fonts, so
`assets/fonts/Roboto-Apache-License.txt` must stay. CI fails if the fonts are
present and it is not.

### Progressive enhancement

All seven sections, the start page, the summary and the About page are fully
functional with JavaScript disabled. Only the quiz and the inline exercises
need it, and `quiz.html` carries a `<noscript>` block explaining that and
pointing at the summary. Instruction is never behind a script.

---

## Test checklist

Run before launch, after any significant change, and at each six-month review.

### Automated
- [ ] `node tools/check-css.mjs` — every custom property resolves.
- [ ] Contrast sweep across all 12 pages, including `::before`/`::after`
      generated content. The last full run was clean; the four card ordinals
      and three stats-bar separators it caught are fixed. Re-run after any
      colour change.
- [ ] axe DevTools: zero violations on `index.html`, one section, and
      `quiz.html` — **checked both before and after submitting an answer**,
      since the graded state is different markup.
- [ ] WAVE extension on the same three pages.
- [ ] W3C HTML validator (validator.w3.org) on every page.
- [ ] `node tools/check-links.mjs` and `node tools/check-chrome.mjs`.

### Keyboard only
- [ ] Skip link is the first thing Tab reaches and it works.
- [ ] Every link, button, radio, checkbox and `<summary>` is reachable and
      operable.
- [ ] Focus is visible at every single step.
- [ ] Arrow keys move within a radio group; Space toggles checkboxes.
- [ ] After grading, you can Tab back through the answers to review them.
- [ ] Focus lands correctly at each of the five points in the table above.

### Screen reader
- [ ] VoiceOver + Safari: complete the quiz start to finish.
- [ ] Submit with nothing selected — the prompt to choose is announced.
- [ ] Submit a matrix with gaps — the error summary is announced and its
      links jump to the right questions.
- [ ] Finishing announces the results heading and score **once, not twice**.
- [ ] NVDA + Firefox, if a Windows machine is available.

### Visual and reflow
- [ ] 320px width: no horizontal scrolling anywhere.
- [ ] 400% browser zoom: everything still usable.
- [ ] Windows High Contrast / forced-colors mode.
- [ ] Text-spacing bookmarklet (WCAG 1.4.12): nothing clips or overlaps.

### Privacy, which is also an accessibility question
- [ ] Network tab: zero third-party requests on every page.
- [ ] Application tab: no cookies, no localStorage, no sessionStorage —
      including after completing the quiz and typing a name into the
      completion note.

### Without JavaScript
- [ ] Every section page reads completely.
- [ ] `quiz.html` shows the `<noscript>` explanation rather than an empty page.

---

## Known limitations

State these honestly on `about.html` rather than claiming full conformance:

- The quiz requires JavaScript. All instructional content does not.
- Light theme only; no dark mode yet. Tokens are structured so adding one is
  a `@media` block, but it doubles the contrast-testing surface, so it should
  not be added without re-running the checklist.
- Screen reader testing has covered VoiceOver/Safari but not JAWS.

Automated tools catch roughly a third of WCAG issues. Passing axe is a floor,
not a conformance claim — the manual passes above are what the claim rests on.
