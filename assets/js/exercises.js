/* ==========================================================================
   AI Literacy Module — inline exercise mounting
   UNLV University Libraries

   Finds every <div class="exercise-mount" data-exercise="ID"> on the page and
   renders the matching entry from content/checks.json or content/exercises.json.

   Read the accessibility contract at the top of engine.js before editing.
   In short: native inputs, focus-move as the announcement, aria-disabled
   rather than disabled, and never color alone.
   ========================================================================== */

(function () {
  'use strict';

  var E = window.Engine;
  if (!E) return;

  function el(tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;
    return n;
  }

  function shell(entry) {
    var box = el('section', 'exercise');
    var header = el('div', 'exercise__header');
    if (entry.kicker) header.appendChild(el('span', 'exercise__kicker', entry.kicker));
    var h = el('h3', 'exercise__title', entry.title || 'Check yourself');
    header.appendChild(h);
    box.appendChild(header);

    var body = el('div', 'exercise__body');
    box.appendChild(body);

    if (entry.intro) body.appendChild(el('p', 'exercise__intro', entry.intro));

    return { box: box, body: body, heading: h };
  }

  /* -------------------------------------------------- single / multiple / poll */

  function renderQuestion(mount, entry) {
    var parts = shell(entry);
    var kind = entry.kind;

    var fs = E.buildQuestion(entry, kind, { idPrefix: entry.id });
    parts.body.appendChild(fs);

    var row = E.actionRow();
    var check = E.button(kind === 'poll' ? 'Show me' : 'Check my answer');
    row.appendChild(check);
    parts.body.appendChild(row);

    check.addEventListener('click', function () {
      var selection = E.readSelection(fs);

      if (selection.length === 0) {
        E.showFeedback(fs, {}, 'incorrect', {
          verdict: kind === 'multiple'
            ? 'Choose at least one option first.'
            : 'Choose an option first.'
        });
        return;
      }

      var result = kind === 'poll' ? 'poll' : E.grade(entry, selection);
      E.markChoices(fs, entry, selection, kind);
      E.lockSelection(fs, selection);

      var opts = {};
      if (kind === 'poll') {
        opts.verdict = 'Thanks — keep that in mind as you read on.';
        // A poll has no explanation field; the section prose does the work.
        E.showFeedback(fs, { explanation: entry.pollNote || '' }, 'partial', opts);
      } else {
        E.showFeedback(fs, entry, result, opts);
      }

      row.removeChild(check);
      if (row.childNodes.length === 0) parts.body.removeChild(row);
    });

    mount.appendChild(parts.box);
  }

  /* ------------------------------------------------------------------ matrix
     One shared option set applied to several items, all visible at once. */

  function renderMatrix(mount, entry) {
    var parts = shell(entry);
    var fieldsets = [];

    entry.items.forEach(function (item, i) {
      var q = {
        id: entry.id + '-' + item.id,
        prompt: item.text,
        choices: entry.options,
        correct: [item.correct]
      };
      var fs = E.buildQuestion(q, 'single', {
        idPrefix: entry.id + '-' + item.id,
        hint: i === 0 ? 'Pick the description that fits.' : ' '
      });
      parts.body.appendChild(fs);
      fieldsets.push({ fs: fs, q: q, item: item });
    });

    var row = E.actionRow();
    var check = E.button('Check all five');
    row.appendChild(check);
    parts.body.appendChild(row);

    var summary = el('div', 'feedback');
    parts.body.appendChild(summary);

    check.addEventListener('click', function () {
      var missing = [];
      fieldsets.forEach(function (f, i) {
        if (E.readSelection(f.fs).length === 0) missing.push({ index: i, fs: f.fs });
      });

      if (missing.length) {
        E.showErrorSummary(parts.body, missing.map(function (m) { return m.fs.id.replace(/^q-/, ''); }),
          function (id) {
            var n = 0;
            fieldsets.forEach(function (f, i) { if (('q-' + id) === f.fs.id) n = i + 1; });
            return 'Claim ' + n + ' has no answer selected';
          });
        return;
      }

      E.clearErrorSummary(parts.body);

      var right = 0;
      fieldsets.forEach(function (f) {
        var selection = E.readSelection(f.fs);
        var result = E.grade(f.q, selection);
        if (result === 'correct') right += 1;
        E.markChoices(f.fs, f.q, selection, 'single');
        E.lockSelection(f.fs, selection);

        // Per-item feedback, written in place. No focus move here — the
        // summary below takes focus once, for the whole exercise.
        var fb = f.fs.querySelector('.feedback');
        fb.setAttribute('data-result', result);
        var verdict = el('p', 'feedback__verdict');
        var icon = el('span', 'feedback__icon', result === 'correct' ? '✓' : '✗');
        icon.setAttribute('aria-hidden', 'true');
        verdict.appendChild(icon);
        verdict.appendChild(document.createTextNode(
          result === 'correct' ? 'Correct.' : 'Not quite.'));
        fb.appendChild(verdict);
        fb.appendChild(el('p', null, f.item.why));
      });

      summary.setAttribute('data-result', right === fieldsets.length ? 'correct' : 'partial');
      var sv = el('p', 'feedback__verdict',
        'You identified ' + right + ' of ' + fieldsets.length + ' correctly.');
      sv.setAttribute('tabindex', '-1');
      summary.appendChild(sv);
      if (entry.closing) summary.appendChild(el('p', null, entry.closing));

      row.removeChild(check);
      parts.body.removeChild(row);
      sv.focus();
    });

    mount.appendChild(parts.box);
  }

  /* -------------------------------------------------------------------- deck
     Same data shape as matrix, presented one card at a time. */

  function renderDeck(mount, entry) {
    var parts = shell(entry);
    var stage = el('div');
    parts.body.appendChild(stage);

    var index = 0;
    var correctCount = 0;

    function renderCard() {
      while (stage.firstChild) stage.removeChild(stage.firstChild);

      if (index >= entry.items.length) {
        var done = el('div', 'feedback');
        done.setAttribute('data-result', correctCount === entry.items.length ? 'correct' : 'partial');
        var dv = el('p', 'feedback__verdict',
          'You sorted ' + correctCount + ' of ' + entry.items.length + ' the way we would.');
        dv.setAttribute('tabindex', '-1');
        done.appendChild(dv);
        if (entry.closing) done.appendChild(el('p', null, entry.closing));
        stage.appendChild(done);
        dv.focus();
        return;
      }

      var item = entry.items[index];
      var q = {
        id: entry.id + '-' + item.id,
        prompt: item.text,
        choices: entry.options,
        correct: [item.correct]
      };

      var fs = E.buildQuestion(q, 'single', {
        idPrefix: entry.id + '-' + item.id,
        position: index + 1,
        total: entry.items.length,
        hint: 'Where can this go?'
      });
      stage.appendChild(fs);

      var row = E.actionRow();
      var check = E.button('Check');
      row.appendChild(check);
      stage.appendChild(row);

      check.addEventListener('click', function () {
        var selection = E.readSelection(fs);
        if (selection.length === 0) {
          E.showFeedback(fs, {}, 'incorrect', { verdict: 'Choose an option first.' });
          return;
        }

        var result = E.grade(q, selection);
        if (result === 'correct') correctCount += 1;
        E.markChoices(fs, q, selection, 'single');
        E.lockSelection(fs, selection);
        E.showFeedback(fs, { explanation: item.why }, result);

        row.removeChild(check);
        var next = E.button(
          index + 1 < entry.items.length ? 'Next card' : 'See the pattern', 'secondary');
        row.appendChild(next);
        next.addEventListener('click', function () {
          index += 1;
          renderCard();
          // Focus the new card's legend so position is announced.
          var legend = stage.querySelector('legend');
          if (legend) {
            legend.setAttribute('tabindex', '-1');
            legend.focus();
          }
        });
      });
    }

    renderCard();
    mount.appendChild(parts.box);
  }

  /* ---------------------------------------------------------------- scenario
     Two steps. Returns consequences, never a verdict. */

  function renderScenario(mount, entry) {
    var parts = shell(entry);

    parts.body.appendChild(el('p', null, entry.situation));

    var stepOne = el('div');
    parts.body.appendChild(stepOne);

    var lensQ = {
      id: entry.id + '-lenses',
      prompt: entry.lensPrompt || 'Which of the four questions bear on this?',
      choices: entry.lenses,
      correct: []
    };
    var lensFs = E.buildQuestion(lensQ, 'multiple', {
      idPrefix: entry.id + '-lens',
      hint: 'Select all that apply. This part is not scored — it is here to surface your reasoning.'
    });
    stepOne.appendChild(lensFs);

    var row1 = E.actionRow();
    var cont = E.button('Continue');
    row1.appendChild(cont);
    stepOne.appendChild(row1);

    cont.addEventListener('click', function () {
      var selection = E.readSelection(lensFs);
      if (selection.length === 0) {
        E.showFeedback(lensFs, {}, 'incorrect',
          { verdict: 'Pick at least one before you continue.' });
        return;
      }

      E.markChoices(lensFs, { correct: [], choices: entry.lenses }, selection, 'poll');
      E.lockSelection(lensFs, selection);
      E.showFeedback(lensFs, { explanation: entry.lensNote }, 'partial',
        { verdict: 'Here is how we read it.' });

      row1.removeChild(cont);
      stepOne.removeChild(row1);
      renderStepTwo();
    });

    function renderStepTwo() {
      var stepTwo = el('div');
      parts.body.appendChild(stepTwo);

      var actQ = {
        id: entry.id + '-act',
        prompt: entry.choicePrompt || 'What do you do?',
        choices: entry.options,
        correct: []
      };
      var actFs = E.buildQuestion(actQ, 'single', {
        idPrefix: entry.id + '-act',
        hint: 'There is no single right answer here. Pick what you would actually do.'
      });
      stepTwo.appendChild(actFs);

      var row2 = E.actionRow();
      var choose = E.button('See what follows');
      row2.appendChild(choose);
      stepTwo.appendChild(row2);

      choose.addEventListener('click', function () {
        var selection = E.readSelection(actFs);
        if (selection.length === 0) {
          E.showFeedback(actFs, {}, 'incorrect', { verdict: 'Choose an option first.' });
          return;
        }

        var chosenId = selection[0];
        E.markChoices(actFs, { correct: [], choices: entry.options }, selection, 'poll');
        E.lockSelection(actFs, selection);

        row2.removeChild(choose);
        stepTwo.removeChild(row2);

        var out = el('div', 'feedback');
        out.setAttribute('data-result', 'partial');
        var v = el('p', 'feedback__verdict', 'What follows from each option');
        v.setAttribute('tabindex', '-1');
        out.appendChild(v);
        out.appendChild(el('p', null,
          'No score here, deliberately — this is a judgment call. Your choice is marked first, ' +
          'then the others, because comparing them is where the thinking is.'));

        var panels = el('div', 'consequences');

        function panel(opt) {
          var p = el('div', 'consequence');
          if (opt.id === chosenId) p.setAttribute('data-chosen', 'true');
          p.appendChild(el('p', 'consequence__label',
            opt.id === chosenId ? 'What you chose' : 'Another option'));
          p.appendChild(el('p', null, opt.text));
          var dl = el('dl');
          dl.appendChild(el('dt', null, 'What this gets you'));
          dl.appendChild(el('dd', null, opt.consequences.gets));
          dl.appendChild(el('dt', null, 'What it risks'));
          dl.appendChild(el('dd', null, opt.consequences.risks));
          dl.appendChild(el('dt', null, 'What a colleague might push back on'));
          dl.appendChild(el('dd', null, opt.consequences.pushback));
          p.appendChild(dl);
          return p;
        }

        entry.options.forEach(function (opt) {
          if (opt.id === chosenId) panels.appendChild(panel(opt));
        });
        entry.options.forEach(function (opt) {
          if (opt.id !== chosenId) panels.appendChild(panel(opt));
        });

        out.appendChild(panels);

        var lean = el('div', 'callout');
        lean.appendChild(el('h4', 'callout__title', 'What we would lean toward'));
        lean.appendChild(el('p', null, entry.leaning));
        out.appendChild(lean);

        stepTwo.appendChild(out);
        v.focus();
      });

      var legend = stepTwo.querySelector('legend');
      if (legend) {
        legend.setAttribute('tabindex', '-1');
        legend.focus();
      }
    }

    mount.appendChild(parts.box);
  }

  /* ------------------------------------------------------------------ mount */

  function mountAll(index) {
    var mounts = document.querySelectorAll('.exercise-mount');
    for (var i = 0; i < mounts.length; i++) {
      (function (mount) {
        var id = mount.getAttribute('data-exercise');
        var entry = index[id];

        if (!entry) {
          E.renderError(mount, 'Exercise "' + id + '" was not found', [
            'This page asks for an exercise with the id "' + id + '", but no entry with ' +
            'that id exists in content/checks.json or content/exercises.json.',
            'Either the id on the page is misspelled, or the exercise has not been written yet.'
          ]);
          return;
        }

        try {
          if (entry.kind === 'matrix') renderMatrix(mount, entry);
          else if (entry.kind === 'deck') renderDeck(mount, entry);
          else if (entry.kind === 'scenario') renderScenario(mount, entry);
          else renderQuestion(mount, entry);
        } catch (err) {
          E.renderError(mount, 'Exercise "' + id + '" could not be displayed', [
            String(err && err.message ? err.message : err)
          ]);
        }
      })(mounts[i]);
    }
  }

  function init() {
    var mounts = document.querySelectorAll('.exercise-mount');
    if (mounts.length === 0) return;

    Promise.all([
      E.loadJSON('content/checks.json'),
      E.loadJSON('content/exercises.json')
    ]).then(function (results) {
      var schema = window.ContentSchema;
      var problems = [];

      if (schema) {
        problems = problems
          .concat(schema.validateChecks(results[0]))
          .concat(schema.validateExercises(results[1]));
      }

      if (problems.length) {
        for (var i = 0; i < mounts.length; i++) {
          E.renderError(mounts[i], 'The exercise content has a problem', problems);
        }
        return;
      }

      var index = {};
      (results[0].checks || []).forEach(function (c) { index[c.id] = c; });
      (results[1].exercises || []).forEach(function (x) { index[x.id] = x; });
      mountAll(index);
    }).catch(function (err) {
      var mounts = document.querySelectorAll('.exercise-mount');
      for (var i = 0; i < mounts.length; i++) {
        E.renderError(mounts[i], 'The exercises could not be loaded', [
          String(err && err.message ? err.message : err),
          'If you are previewing locally by double-clicking the file, that will not work — ' +
          'browsers block loading JSON from file:// URLs. Run  python3 -m http.server 8000  ' +
          'in the project folder and open http://localhost:8000 instead.'
        ]);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
