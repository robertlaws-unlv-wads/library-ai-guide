/* ==========================================================================
   AI Literacy Module — shared exercise engine
   UNLV University Libraries

   One primitive underlies every interaction in this module: present choices,
   collect a selection, reveal feedback. Knowledge checks, the confabulation
   matrix, the privacy card deck, prompt diagnosis and the final quiz are all
   configurations of it, which is why adding an exercise is a JSON edit rather
   than a code change.

   ACCESSIBILITY CONTRACT — read before changing anything in here.

   1. Native form controls only. Radios and checkboxes inside a <fieldset>
      with the question stem as its <legend>. Never role="radiogroup", never
      a div pretending to be an input. Arrow-key navigation within a radio
      group, group announcement, and "2 of 4" position come free from the
      browser and stay correct as assistive tech changes. There is
      deliberately NO custom keyboard handling anywhere in this file.

   2. Feedback is announced by MOVING FOCUS, not by a live region. Focus
      lands on the verdict heading (tabindex="-1"), which every major screen
      reader announces, leaving the reading cursor at the start of the
      explanation. We deliberately do NOT also put role="status" on that
      container: a focused live region is announced twice, which is worse
      than not at all.

   3. Graded inputs get aria-disabled="true", never the disabled attribute.
      A disabled input drops out of the tab order, so a screen-reader user
      could not go back and review what they picked. We ignore further input
      instead (see lockSelection).

   4. Correctness is never carried by color alone. Every graded choice gets
      a text mark ("Correct answer", "Your answer — not correct") and an
      aria-hidden icon in addition to the border and tint.

   5. All author-supplied strings go in via textContent, never innerHTML.
      The content is trusted, but this removes an entire class of bug for
      free and costs nothing.
   ========================================================================== */

(function (global) {
  'use strict';

  var Engine = {};

  /* ---------------------------------------------------------------- utils */

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  /* Resolve a path relative to the site root, from any page depth.
     Pages declare their depth with <body data-root="../">. */
  function rootPath(path) {
    var root = document.body.getAttribute('data-root') || '';
    return root + path;
  }

  Engine.rootPath = rootPath;

  /* Set of ids -> sorted array, so comparisons are order-independent. */
  function sortedIds(set) {
    return Object.keys(set).filter(function (k) { return set[k]; }).sort();
  }

  function sameMembers(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  /* --------------------------------------------------------------- errors */

  /* The runtime substitute for build-time schema validation. If content is
     malformed we render something the person who broke it can act on, rather
     than a blank space they will not notice. */
  Engine.renderError = function (mount, title, problems) {
    clear(mount);
    var box = el('div', 'content-error');
    box.appendChild(el('h2', null, title));
    box.appendChild(el('p', null,
      'This is a content problem, not something you did. The page is otherwise fine.'));
    var list = el('ul');
    problems.forEach(function (p) { list.appendChild(el('li', null, p)); });
    box.appendChild(list);
    box.appendChild(el('p', null,
      'Maintainers: run  node tools/validate-content.mjs  to see every problem at once.'));
    mount.appendChild(box);
    if (global.console && console.error) {
      console.error('[ai-literacy] ' + title, problems);
    }
  };

  /* ------------------------------------------------------------ item render
     An "item" is one question: a stem, a set of choices, and a correct
     answer. Used by every exercise kind. */

  /* kind: 'single' | 'multiple' | 'poll'
     opts: { position, total, idPrefix, hint } */
  Engine.buildQuestion = function (item, kind, opts) {
    opts = opts || {};
    var prefix = opts.idPrefix || item.id;

    var fs = el('fieldset', 'q');
    fs.id = 'q-' + prefix;

    var legend = el('legend');
    if (opts.position && opts.total) {
      // Position is inside the legend so it is part of the group's
      // accessible name and is announced on focus.
      legend.appendChild(el('span', 'q__position',
        'Question ' + opts.position + ' of ' + opts.total));
    }
    legend.appendChild(document.createTextNode(item.prompt));
    fs.appendChild(legend);

    var hint = opts.hint || item.hint ||
      (kind === 'multiple' ? 'Select all that apply.' : '');
    if (hint) {
      var hintEl = el('p', 'q__hint', hint);
      hintEl.id = 'hint-' + prefix;
      fs.appendChild(hintEl);
    }

    var choices = el('div', 'q__choices');
    var inputType = kind === 'multiple' ? 'checkbox' : 'radio';

    item.choices.forEach(function (choice) {
      var inputId = 'c-' + prefix + '-' + choice.id;

      var label = el('label', 'choice');
      label.setAttribute('for', inputId);
      label.setAttribute('data-choice', choice.id);

      var input = document.createElement('input');
      input.type = inputType;
      input.id = inputId;
      input.name = 'q-' + prefix;
      input.value = choice.id;

      label.appendChild(input);
      label.appendChild(el('span', 'choice__text', choice.text));
      choices.appendChild(label);
    });

    fs.appendChild(choices);

    // Feedback container ships empty and is filled on submit. It is NOT a
    // live region — see contract note 2 at the top of this file.
    var feedback = el('div', 'feedback');
    feedback.id = 'fb-' + prefix;
    fs.appendChild(feedback);

    return fs;
  };

  /* Read the current selection out of a rendered question. */
  Engine.readSelection = function (fieldset) {
    var out = [];
    var inputs = fieldset.querySelectorAll('input');
    for (var i = 0; i < inputs.length; i++) {
      if (inputs[i].checked) out.push(inputs[i].value);
    }
    return out.sort();
  };

  /* Prevent further changes without removing the inputs from the tab order.
     `disabled` would make the graded answers unreachable by keyboard, so a
     screen-reader user could not review what they had picked. */
  Engine.lockSelection = function (fieldset, selection) {
    var chosen = {};
    selection.forEach(function (id) { chosen[id] = true; });

    var inputs = fieldset.querySelectorAll('input');
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].setAttribute('aria-disabled', 'true');
    }

    fieldset.addEventListener('change', function (ev) {
      var inputs = fieldset.querySelectorAll('input');
      for (var i = 0; i < inputs.length; i++) {
        inputs[i].checked = !!chosen[inputs[i].value];
      }
      ev.stopPropagation();
    }, true);

    // Clicking a locked label would otherwise still toggle before our
    // change handler restores it, producing a visible flicker.
    fieldset.addEventListener('click', function (ev) {
      if (ev.target && ev.target.tagName === 'INPUT') ev.preventDefault();
    }, true);
  };

  /* Mark each choice with its graded state, in text and in style. */
  Engine.markChoices = function (fieldset, item, selection, kind) {
    var correct = {};
    (item.correct || []).forEach(function (id) { correct[id] = true; });
    var chosen = {};
    selection.forEach(function (id) { chosen[id] = true; });

    var labels = fieldset.querySelectorAll('.choice');
    for (var i = 0; i < labels.length; i++) {
      var label = labels[i];
      var id = label.getAttribute('data-choice');
      var isCorrect = !!correct[id];
      var isChosen = !!chosen[id];
      var state = null;
      var mark = '';

      if (kind === 'poll') {
        if (isChosen) { state = 'chosen'; mark = 'Your answer'; }
      } else if (isChosen && isCorrect) {
        state = 'correct'; mark = '✓ Correct — you picked this';
      } else if (isChosen && !isCorrect) {
        state = 'incorrect'; mark = '✗ You picked this — not correct';
      } else if (!isChosen && isCorrect) {
        state = 'missed'; mark = '→ Correct answer — you did not pick this';
      }

      if (state) label.setAttribute('data-state', state);
      if (mark) {
        var markEl = el('span', 'choice__mark', mark);
        label.appendChild(markEl);
      }

      // Per-option rationale, where the author supplied one. This is where
      // most of the teaching happens in the final quiz.
      var source = item.choices.filter(function (c) { return c.id === id; })[0];
      if (source && source.why && (isChosen || isCorrect)) {
        label.appendChild(el('p', 'choice__why', source.why));
      }
    }
  };

  /* Grade a selection. Returns 'correct' | 'incorrect' | 'partial'. */
  Engine.grade = function (item, selection) {
    var correct = (item.correct || []).slice().sort();
    if (sameMembers(selection, correct)) return 'correct';
    var anyRight = selection.some(function (id) { return correct.indexOf(id) !== -1; });
    var anyWrong = selection.some(function (id) { return correct.indexOf(id) === -1; });
    if (anyRight && !anyWrong) return 'partial';
    return 'incorrect';
  };

  /* Fill the feedback container and move focus to it. This is the single
     announcement mechanism in the module. */
  Engine.showFeedback = function (fieldset, item, result, opts) {
    opts = opts || {};
    var feedback = fieldset.querySelector('.feedback');
    clear(feedback);
    feedback.setAttribute('data-result', result === 'poll' ? 'partial' : result);

    var verdictText;
    if (opts.verdict) {
      verdictText = opts.verdict;
    } else if (result === 'correct') {
      verdictText = 'Correct.';
    } else if (result === 'partial') {
      verdictText = 'Partly right.';
    } else {
      verdictText = 'Not quite.';
    }

    var verdict = el('p', 'feedback__verdict');
    verdict.setAttribute('tabindex', '-1');
    var icon = el('span', 'feedback__icon',
      result === 'correct' ? '✓' : result === 'partial' ? '◑' : '✗');
    icon.setAttribute('aria-hidden', 'true');
    verdict.appendChild(icon);
    verdict.appendChild(document.createTextNode(verdictText));
    feedback.appendChild(verdict);

    if (item.explanation) {
      feedback.appendChild(el('p', null, item.explanation));
    }

    if (item.reviewHref && item.reviewLabel) {
      var p = el('p');
      var a = el('a', null, item.reviewLabel);
      a.href = rootPath(item.reviewHref);
      p.appendChild(a);
      feedback.appendChild(p);
    }

    if (opts.extra) opts.extra(feedback);

    // Focus move is the announcement. Do not add role="status" here.
    verdict.focus();
    return feedback;
  };

  /* A submit button row. */
  Engine.actionRow = function () {
    return el('div', 'btn-row');
  };

  Engine.button = function (text, variant) {
    var b = el('button', 'btn' + (variant ? ' btn--' + variant : ''), text);
    b.type = 'button';
    return b;
  };

  /* Error summary for unanswered questions (WCAG 3.3.1). Focused, not
     announced via role="alert" — same reasoning as feedback. */
  Engine.showErrorSummary = function (container, missing, labelFor) {
    var existing = container.querySelector('.error-summary');
    if (existing) existing.parentNode.removeChild(existing);

    var box = el('div', 'error-summary');
    box.setAttribute('tabindex', '-1');
    box.appendChild(el('h3', null,
      missing.length === 1
        ? 'One question still needs an answer'
        : missing.length + ' questions still need an answer'));

    var list = el('ul');
    missing.forEach(function (m) {
      var li = el('li');
      var a = el('a', null, labelFor(m));
      a.href = '#q-' + m;
      list.appendChild(li);
      li.appendChild(a);
    });
    box.appendChild(list);

    container.insertBefore(box, container.firstChild);
    box.focus();
    return box;
  };

  Engine.clearErrorSummary = function (container) {
    var existing = container.querySelector('.error-summary');
    if (existing) existing.parentNode.removeChild(existing);
  };

  /* ----------------------------------------------------------------- fetch */

  Engine.loadJSON = function (path) {
    return fetch(rootPath(path), { cache: 'no-cache' }).then(function (res) {
      if (!res.ok) {
        throw new Error('Could not load ' + path + ' (HTTP ' + res.status + ')');
      }
      return res.text();
    }).then(function (text) {
      try {
        return JSON.parse(text);
      } catch (e) {
        throw new Error(path + ' is not valid JSON: ' + e.message);
      }
    });
  };

  global.Engine = Engine;
})(window);
