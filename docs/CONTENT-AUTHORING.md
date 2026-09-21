# Writing quiz questions and exercises

All interactive content lives in three JSON files under `content/`. You can
edit them on github.com without touching any code.

| File | Holds |
|---|---|
| `content/checks.json` | Inline knowledge checks and pre-questions |
| `content/exercises.json` | The four large exercises |
| `content/quiz.json` | The final ten-question quiz |

After editing, run `node tools/validate-content.mjs`. It checks every rule
below and tells you exactly which record is wrong. The same check runs on
every pull request, and the browser runs it again at page load, so a mistake
shows a readable error rather than a blank space.

---

## Putting an exercise on a page

Add a mount point wherever it should appear:

```html
<div class="exercise-mount" data-exercise="s1-check"></div>
```

The `data-exercise` value is the `id` of an entry in `checks.json` or
`exercises.json`. If no entry matches, the page says so in plain language
rather than failing silently.

---

## The six kinds

| Kind | What it does | Used for |
|---|---|---|
| `single` | One right answer, radio buttons | Most knowledge checks |
| `multiple` | Several right answers, checkboxes | Prompt diagnosis, some quiz questions |
| `poll` | No right answer | Pre-questions asked before the content |
| `matrix` | One shared option set applied to several items, all shown at once | Spot the confabulation |
| `deck` | Same data as `matrix`, shown one card at a time | The privacy card deck |
| `scenario` | Two steps, consequence panels, no verdict | The three judgment scenarios |

---

## `single` and `multiple`

```json
{
  "id": "s1-check",
  "kind": "single",
  "section": "1",
  "prompt": "The question.",
  "choices": [
    { "id": "a", "text": "An option.", "why": "Why this is wrong." },
    { "id": "b", "text": "Another.",   "why": "Why this is right." }
  ],
  "correct": ["b"],
  "explanation": "The reasoning, shown after answering.",
  "reviewHref": "sections/1-what-youre-talking-to.html",
  "reviewLabel": "Back to Section 1"
}
```

- `id` must be unique within the file.
- `choices` needs at least two, each with a unique `id`.
- `correct` must list real option ids. `single` takes exactly one.
- `why` is per-option feedback. **Required on every wrong option in
  `quiz.json`** — the validator enforces it, because distractor feedback is
  where most of the teaching happens.
- `reviewHref` is relative to the site root and must point at a file that
  exists. Supply it with `reviewLabel` or not at all.

## `poll`

Same shape, but **no `correct` and no `explanation`** — there is no right
answer. Add `hint` to say so. Used to ask what someone thinks before they
read, which makes the content that follows stick better.

## `matrix` and `deck`

One shared set of `options`, applied to every entry in `items`:

```json
{
  "id": "would-you-paste",
  "kind": "deck",
  "kicker": "Exercise",
  "title": "Would you put this in a prompt?",
  "intro": "Shown above the first card.",
  "options": [
    { "id": "safe",  "text": "Fine anywhere" },
    { "id": "never", "text": "Not into any AI tool" }
  ],
  "items": [
    { "id": "p1", "text": "The thing being judged.",
      "correct": "safe", "why": "The feedback for this item." }
  ],
  "closing": "Shown after the last item, tying it together."
}
```

`matrix` shows everything at once with a single Check button; `deck` steps
through one at a time. Switching between them is a one-word edit.

**Write `why` to name the check, not the verdict.** "Not quite" teaches
nothing. "The DOI resolves — to a different article. Paste any DOI into
doi.org; it takes ten seconds" teaches the move.

## `scenario`

Deliberately returns no score. The learner picks an action and gets
consequences for every option, theirs first.

```json
{
  "id": "scenario-desk",
  "kind": "scenario",
  "kicker": "Scenario 1 of 3",
  "title": "The citations do not exist",
  "situation": "The setup.",
  "lensPrompt": "Which of the four questions bear on this?",
  "lenses": [ { "id": "check", "text": "Can I check it?" } ],
  "lensNote": "Shown after step one.",
  "choicePrompt": "What do you do?",
  "options": [
    {
      "id": "a",
      "text": "A course of action.",
      "consequences": {
        "gets":     "What this gets you.",
        "risks":    "What it risks.",
        "pushback": "What a colleague might push back on."
      }
    }
  ],
  "leaning": "What we would lean toward, and why — naming the legitimate alternative."
}
```

All three `consequences` fields are required, as is `leaning`. A scenario
that only presents options without modelling expert reasoning is not doing
its job.

---

## Editorial standards

These are not style preferences; they are why the exercises work.

**Always include at least one item that is entirely fine.** Without it,
learners conclude the answer is always "be suspicious" or "don't use it,"
which is not literacy. Claim 3 in the confabulation exercise and Scenario 2
both exist for this reason.

**Say so when something is genuinely ambiguous.** Several privacy cards have
no clean answer, and the feedback admits it. Fake certainty on judgment calls
destroys credibility fast, especially with the staff audience.

**Every distractor should be a real misconception.** Not filler — something
a person actually believes. The feedback then names the belief and corrects
it.

**Scenario questions, not recall questions.** "What does LLM stand for?" has
no payoff when nothing is scored. "A student brings you this — what do you do
first?" pays off immediately.

**Never name model versions.** Describe capabilities ("tools that search the
web and cite sources"). Capabilities age in years; version numbers age in
weeks.

---

## Coverage rules the validator enforces

- Every quiz question needs a `section` that appears in the top-level
  `sections` map.
- Every section in that map needs at least one quiz question. Add a section
  and forget the question, and the check fails.
- Every wrong option in `quiz.json` needs a `why`.
- Every `reviewHref` must point at a file that exists.
