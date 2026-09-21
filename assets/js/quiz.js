/* ==========================================================================
   AI Literacy Module — final quiz
   UNLV University Libraries

   Ten situations, one at a time, immediate feedback, manual advance.

   Nothing is stored. No cookies, no localStorage, no sessionStorage, no
   network call after the initial content load. The score exists in a
   JavaScript variable and dies with the tab. That is the whole design, and
   it is why the results screen has to do all the remediation work up front:
   there is no second session to follow up in.

   Read the accessibility contract at the top of engine.js before editing.
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

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  var root, data, questions, sectionLabels;
  var index = 0;
  var answers = [];   // { id, selection, result }

  function start(mount) {
    root = mount;
    index = 0;
    answers = [];
    renderQuestion();
  }

  /* ------------------------------------------------------------- question */

  function renderQuestion() {
    clear(root);

    var q = questions[index];

    // A decorative progress bar, not a second copy of the position text.
    // The legend already carries "Question 5 of 10" as part of the group's
    // accessible name, so this is aria-hidden -- announcing it again would
    // just be noise.
    var progress = el('div', 'quiz-progress');
    progress.setAttribute('aria-hidden', 'true');
    for (var p = 0; p < questions.length; p++) {
      var pip = el('span', 'quiz-progress__pip');
      if (p < index) pip.setAttribute('data-state', 'done');
      else if (p === index) pip.setAttribute('data-state', 'current');
      progress.appendChild(pip);
    }
    root.appendChild(progress);

    var fs = E.buildQuestion(q, q.kind, {
      idPrefix: q.id,
      position: index + 1,
      total: questions.length
    });
    root.appendChild(fs);

    var row = E.actionRow();
    var check = E.button('Check my answer');
    row.appendChild(check);
    root.appendChild(row);

    check.addEventListener('click', function () {
      var selection = E.readSelection(fs);

      if (selection.length === 0) {
        E.showFeedback(fs, {}, 'incorrect', {
          verdict: q.kind === 'multiple'
            ? 'Choose at least one option before checking.'
            : 'Choose an option before checking.'
        });
        return;
      }

      var result = E.grade(q, selection);
      answers.push({ id: q.id, selection: selection, result: result, question: q });

      E.markChoices(fs, q, selection, q.kind);
      E.lockSelection(fs, selection);
      E.showFeedback(fs, q, result);

      row.removeChild(check);
      var next = E.button(
        index + 1 < questions.length ? 'Next question' : 'See my results', 'secondary');
      row.appendChild(next);

      next.addEventListener('click', function () {
        index += 1;
        if (index < questions.length) {
          renderQuestion();
          // Focus the new question's legend. Position is inside the legend,
          // so screen readers announce "Question 6 of 10" on arrival.
          var legend = root.querySelector('legend');
          if (legend) {
            legend.setAttribute('tabindex', '-1');
            legend.focus();
          }
        } else {
          renderResults();
        }
      });
    });

    // Focus the legend on every question after the first.
    if (index > 0) {
      var legend = fs.querySelector('legend');
      if (legend) legend.setAttribute('tabindex', '-1');
    }
  }

  /* -------------------------------------------------------------- results */

  function renderResults() {
    clear(root);

    var right = answers.filter(function (a) { return a.result === 'correct'; }).length;
    var missed = answers.filter(function (a) { return a.result !== 'correct'; });

    // No percentage and no pass/fail line. A threshold implies a stake that
    // does not exist here, and it makes 7 of 10 feel like a failure.
    var h = el('h2', 'results__heading', 'Your results');
    h.setAttribute('tabindex', '-1');
    root.appendChild(h);

    root.appendChild(el('p', 'results__score',
      'You answered ' + right + ' of ' + questions.length + ' correctly.'));

    root.appendChild(el('p', null, missed.length === 0
      ? 'Nothing to revisit. The breakdown below is there if you want to check your reasoning against ours.'
      : 'The breakdown below shows where the gaps are. Working through those sections again is worth more than the number above.'));

    /* --- by section: the most useful thing on this page ------------------ */

    var bySection = {};
    answers.forEach(function (a) {
      var key = a.question.section;
      if (!bySection[key]) bySection[key] = { right: 0, total: 0 };
      bySection[key].total += 1;
      if (a.result === 'correct') bySection[key].right += 1;
    });

    var breakdown = el('div', 'breakdown');
    breakdown.appendChild(el('h3', null, 'How it broke down'));

    Object.keys(sectionLabels).forEach(function (key) {
      var stat = bySection[key];
      if (!stat) return;

      var rowEl = el('div', 'breakdown__row');
      rowEl.setAttribute('data-all-correct', stat.right === stat.total ? 'true' : 'false');

      var link = el('a', null, sectionLabels[key]);
      link.href = E.rootPath(sectionHref(key));
      var nameCell = el('div');
      nameCell.appendChild(link);

      rowEl.appendChild(nameCell);
      rowEl.appendChild(el('div', 'breakdown__score', stat.right + ' of ' + stat.total));
      breakdown.appendChild(rowEl);
    });

    root.appendChild(breakdown);

    /* --- review ---------------------------------------------------------- */

    if (missed.length) {
      var missedBox = el('details');
      missedBox.setAttribute('open', '');
      missedBox.appendChild(el('summary',
        null, 'Review the ' + missed.length + ' you missed'));
      missed.forEach(function (a) { missedBox.appendChild(reviewItem(a)); });
      root.appendChild(missedBox);
    }

    var allBox = el('details');
    allBox.appendChild(el('summary', null, 'Review all ' + questions.length + ' questions'));
    answers.forEach(function (a) { allBox.appendChild(reviewItem(a)); });
    root.appendChild(allBox);

    /* --- actions --------------------------------------------------------- */

    var row = E.actionRow();
    var retake = E.button('Retake the quiz');
    retake.addEventListener('click', function () {
      start(root);
      var legend = root.querySelector('legend');
      if (legend) { legend.setAttribute('tabindex', '-1'); legend.focus(); }
    });
    row.appendChild(retake);

    var summaryLink = el('a', 'btn btn--secondary', 'Go to the summary page');
    summaryLink.href = E.rootPath('summary.html');
    row.appendChild(summaryLink);
    root.appendChild(row);

    /* --- data posture, restated where it matters most --------------------- */

    var posture = el('div', 'callout');
    posture.appendChild(el('h3', 'callout__title', 'Where this result goes'));
    posture.appendChild(el('p', null,
      'Nowhere. This score was worked out in your browser and was never sent anywhere. ' +
      'We cannot see it, your instructor cannot see it, and your supervisor cannot see it. ' +
      'Closing this tab erases it, and there is no way for us to recover it.'));
    root.appendChild(posture);

    /* --- self-issued completion note -------------------------------------- */

    root.appendChild(completionNote(right));

    h.focus();
  }

  function sectionHref(key) {
    var map = {
      '1': 'sections/1-what-youre-talking-to.html',
      '2': 'sections/2-when-it-makes-things-up.html',
      '3': 'sections/3-whose-world.html',
      '4': 'sections/4-what-not-to-paste.html',
      '5': 'sections/5-using-it-honestly.html',
      '6': 'sections/6-deciding-when-to-use-it.html',
      '7': 'sections/7-getting-better-output.html'
    };
    return map[key] || 'index.html';
  }

  function reviewItem(a) {
    var wrap = el('div', 'consequence');
    wrap.appendChild(el('p', 'consequence__label',
      a.result === 'correct' ? 'You got this one right' : 'You missed this one'));
    wrap.appendChild(el('p', null, a.question.prompt));

    var correctText = a.question.choices
      .filter(function (c) { return a.question.correct.indexOf(c.id) !== -1; })
      .map(function (c) { return c.text; })
      .join('  /  ');

    var dl = el('dl');
    dl.appendChild(el('dt', null, 'Correct answer'));
    dl.appendChild(el('dd', null, correctText));
    dl.appendChild(el('dt', null, 'Why'));
    dl.appendChild(el('dd', null, a.question.explanation));
    wrap.appendChild(dl);

    if (a.question.reviewHref && a.question.reviewLabel) {
      var p = el('p');
      var link = el('a', null, a.question.reviewLabel);
      link.href = E.rootPath(a.question.reviewHref);
      p.appendChild(link);
      wrap.appendChild(p);
    }

    return wrap;
  }

  /* A completion note the learner issues to themselves. Honest about what it
     is: we did not verify it and we have no record of it. That honesty is
     consistent with everything else the module teaches. */
  function completionNote(right) {
    var box = el('details');
    box.appendChild(el('summary', null,
      'Make a completion note for your own records'));

    box.appendChild(el('p', null,
      'Some people need something to put in an annual review or a training log. ' +
      'You can fill this in and print it. It is self-reported — the Libraries did not ' +
      'verify it and holds no record of it — and it says so on the printout, because ' +
      'claiming otherwise would be exactly the kind of thing this module warns about.'));

    var label = el('label', null, 'Your name (optional, stays in this browser)');
    label.setAttribute('for', 'completion-name');
    box.appendChild(label);

    var input = document.createElement('input');
    input.type = 'text';
    input.id = 'completion-name';
    input.autocomplete = 'off';
    input.style.display = 'block';
    input.style.margin = '0.5rem 0 1rem';
    input.style.padding = '0.6rem';
    input.style.font = 'inherit';
    input.style.minHeight = '44px';
    input.style.width = '100%';
    input.style.maxWidth = '28rem';
    input.style.border = '2px solid var(--border-strong)';
    input.style.borderRadius = '4px';
    box.appendChild(input);

    var out = el('div', 'takeaways');
    var name = el('p', null, '—');
    out.appendChild(el('h3', null, 'AI Literacy Module — completion note'));
    out.appendChild(name);
    out.appendChild(el('p', null,
      'Completed ' + new Date().toLocaleDateString('en-US',
        { year: 'numeric', month: 'long', day: 'numeric' }) +
      '. Quiz result: ' + right + ' of ' + questions.length + '.'));
    out.appendChild(el('p', 'meta',
      'Self-reported. UNLV University Libraries did not verify this and holds no record of it.'));
    box.appendChild(out);

    input.addEventListener('input', function () {
      name.textContent = input.value.trim() || '—';
    });

    var printRow = E.actionRow();
    var printBtn = E.button('Print this note', 'secondary');
    printBtn.addEventListener('click', function () { window.print(); });
    printRow.appendChild(printBtn);
    box.appendChild(printRow);

    return box;
  }

  /* ----------------------------------------------------------------- init */

  function init() {
    var mount = document.getElementById('quiz');
    if (!mount) return;

    E.loadJSON('content/quiz.json').then(function (loaded) {
      var schema = window.ContentSchema;
      if (schema) {
        var problems = schema.validateQuiz(loaded);
        if (problems.length) {
          E.renderError(mount, 'The quiz content has a problem', problems);
          return;
        }
      }

      data = loaded;
      questions = data.questions;
      sectionLabels = data.sections;
      start(mount);
    }).catch(function (err) {
      E.renderError(mount, 'The quiz could not be loaded', [
        String(err && err.message ? err.message : err),
        'If you are previewing locally by double-clicking the file, that will not work — ' +
        'browsers block loading JSON from file:// URLs. Run  python3 -m http.server 8000  ' +
        'in the project folder and open http://localhost:8000 instead.'
      ]);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
