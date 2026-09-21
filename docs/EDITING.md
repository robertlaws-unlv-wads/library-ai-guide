# Editing this site

No build step, no Node, no npm, no local setup. You can make every change
described here in the GitHub web editor, and it will be live in about a
minute.

---

## The one rule that matters most

**Never start an internal link with `/`.**

This site is served from a subpath:
`https://robertlaws-unlv-wads.github.io/library-ai-guide/`

So `/assets/css/site.css` resolves to `github.io/assets/css/site.css` and
404s — while working perfectly when you preview locally. This is the most
common way a GitHub Pages project site breaks, and it fails silently.

| Where you are | Write |
|---|---|
| A page at the root (`index.html`, `quiz.html`) | `assets/css/site.css` |
| A page in `sections/` | `../assets/css/site.css` |

`node tools/check-links.mjs` catches violations, and so does the pull
request check.

---

## Fixing a typo or changing some wording

1. Open the file on github.com.
2. Click the pencil icon.
3. Edit, then commit to `main` with a short message.
4. Wait about a minute and reload the live page.

That is the whole process. Prose lives directly in the HTML files.

---

## Adding a new section

Three files change. No JavaScript is touched — `engine.js` knows nothing
about section names or how many there are.

1. **Copy the template.** Duplicate `templates/section-template.html` into
   `sections/` and give it a descriptive name, e.g.
   `sections/8-something-new.html`.

2. **Fill it in.** Edit the `<title>`, the `<meta name="description">`, the
   `<h1>`, the "In this section" list, the body, the "Key takeaways" list, and
   the previous/next links at the bottom.

3. **Add it to the table of contents** in `index.html` — copy an existing
   `<li class="toc__item">` block and edit it.

4. **Fix the neighbours.** Update the `section-nav` links in the sections
   either side so the chain stays intact. If you appended at the end, that is
   one file; if you inserted in the middle, two.

Then run `node tools/check-links.mjs`, which verifies the prev/next chain
matches the order in the table of contents.

---

## Markup you can use

Stick to this list. Everything here is styled and accessible; anything else
may not be.

```html
<h2>A heading</h2>              <!-- never skip a level: h1 then h2 then h3 -->
<p>A paragraph.</p>
<ul><li>A list item</li></ul>
<ol><li>A numbered item</li></ol>
<strong>important</strong> and <em>emphasis</em>
<a href="relative/path.html">a link</a>
```

**A callout** — the heading is required, because colour alone must never
carry meaning:

```html
<div class="callout">
  <h2 class="callout__title">The point being made</h2>
  <p>Text.</p>
</div>
```

Variants: `callout callout--caution` (amber) and `callout callout--example`
(purple).

**A collapsible section** — native HTML, fully keyboard accessible, no
JavaScript:

```html
<details>
  <summary>Optional deeper explanation</summary>
  <p>Text.</p>
</details>
```

**The two-audience block** that ends each section:

```html
<div class="two-situations">
  <h2 class="two-situations__title">Two situations, one principle</h2>
  <div class="two-situations__grid">
    <div class="two-situations__case">
      <h4>Writing a paper</h4>
      <p>The student version.</p>
    </div>
    <div class="two-situations__case">
      <h4>At a service desk</h4>
      <p>The staff version.</p>
    </div>
  </div>
</div>
```

**A table** — the `<caption>` and `scope` attributes are required, not
optional:

```html
<table>
  <caption>What this table shows</caption>
  <thead><tr><th scope="col">Column</th></tr></thead>
  <tbody><tr><td>Cell</td></tr></tbody>
</table>
```

**An eyebrow** — the small scarlet caps label above a heading. Roboto
Condensed, 11px, never smaller:

```html
<p class="eyebrow">What you will learn</p>
```

**A full-width band** — used on the landing page to alternate grounds.
Goes outside `.wrap`, never inside it:

```html
<section class="band band--sand">
  <div class="wrap">…</div>
</section>
```

Variants: `band--bone` (page ground) and `band--sand` (recessed).

**An exercise** — see [CONTENT-AUTHORING.md](CONTENT-AUTHORING.md):

```html
<div class="exercise-mount" data-exercise="the-id"></div>
```

---

## Previewing locally

Only needed if you want to see a change before committing it. The quiz and
exercises load their content from JSON files, and browsers block that when
you open a file by double-clicking it, so you need a local server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Python 3 ships with macOS; no install
needed.

Editing on github.com and checking the live URL a minute later works just as
well and needs nothing installed.

---

## Before you commit

Optional but quick — these need Node, which you only need for checking, never
for building:

```bash
node tools/validate-content.mjs && node tools/check-links.mjs && node tools/check-chrome.mjs
```

If you open a pull request instead of committing straight to `main`, these
run automatically and you do not have to remember them.

---

## Things not to do

- **Do not add a `package.json`.** This project is deliberately dependency-free
  — see [MAINTENANCE.md](MAINTENANCE.md) for why. The pull request check
  fails if one appears.
- **Do not link to a script, stylesheet or font on another domain.** The About
  page promises zero third-party requests and that promise is checkable in the
  browser's Network tab. Self-host it instead — that is exactly what
  `assets/fonts/` is for. Pasting in a `fonts.googleapis.com` link is the
  most likely version of this mistake, and the pull request check is written
  to catch it.
- **Do not add analytics.** Same reason.
- **Do not remove `.nojekyll`.** Without it GitHub runs Jekyll over the site
  and will try to interpret `{{ }}` wherever it appears.
- **Do not use `--rule` (`#9FA1A4`) for text.** It is 2.36:1 on Bone. The
  brand guide restricts it to rules, dividers and disabled states, and
  [ACCESSIBILITY.md](ACCESSIBILITY.md) records why. Use `--ink-muted`.
- **Do not set an eyebrow below 11px.** That is the floor in the type spec,
  and below it the caps become unreadable as well as non-conformant.
