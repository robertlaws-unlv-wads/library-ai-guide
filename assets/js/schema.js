/* ==========================================================================
   AI Literacy Module — content schema
   UNLV University Libraries

   This file is the SINGLE SOURCE OF TRUTH for what valid content looks like.
   It is loaded two ways, deliberately:

     - by tools/validate-content.mjs, which runs in CI on every pull request
       and fails the check before bad content can reach anyone;
     - by the browser at runtime, so that if something slips through anyway
       the page shows a readable explanation rather than a blank space.

   The UMD wrapper below is what lets one file serve both. It has no
   dependencies and must keep having none.
   ========================================================================== */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ContentSchema = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var KINDS = ['single', 'multiple', 'poll', 'matrix', 'deck', 'scenario'];

  function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  }

  function isNonEmptyString(v) {
    return typeof v === 'string' && v.trim().length > 0;
  }

  /* Collect problems as readable sentences naming the offending record.
     "quiz.json question 4 ('privacy-basics'): ..." beats a stack trace when
     the person reading it is a librarian who just edited a JSON file. */
  function Problems(file) {
    this.file = file;
    this.list = [];
  }

  Problems.prototype.at = function (where, message) {
    this.list.push(this.file + ' ' + where + ': ' + message);
  };

  function checkChoices(p, where, item, opts) {
    opts = opts || {};
    var field = opts.field || 'choices';
    var choices = item[field];

    if (!Array.isArray(choices) || choices.length < 2) {
      p.at(where, '`' + field + '` must be an array of at least 2 options.');
      return null;
    }

    var ids = {};
    var order = [];
    choices.forEach(function (choice, i) {
      if (!isPlainObject(choice)) {
        p.at(where, '`' + field + '` item ' + (i + 1) + ' is not an object.');
        return;
      }
      if (!isNonEmptyString(choice.id)) {
        p.at(where, '`' + field + '` item ' + (i + 1) + ' has no `id`.');
        return;
      }
      if (ids[choice.id]) {
        p.at(where, 'two options share the id "' + choice.id + '". Option ids must be unique within a question.');
        return;
      }
      if (!isNonEmptyString(choice.text)) {
        p.at(where, 'option "' + choice.id + '" has no `text`.');
      }
      ids[choice.id] = true;
      order.push(choice.id);
    });

    return order.length ? { ids: ids, order: order } : null;
  }

  function checkCorrect(p, where, item, available, kind) {
    if (kind === 'poll') {
      if (item.correct !== undefined) {
        p.at(where, 'kind "poll" has no right answer, so it must not define `correct`.');
      }
      return;
    }

    if (!Array.isArray(item.correct) || item.correct.length === 0) {
      p.at(where, '`correct` must be a non-empty array of option ids.');
      return;
    }

    if (kind === 'single' && item.correct.length !== 1) {
      p.at(where, 'kind "single" must have exactly one correct option, but `correct` lists ' +
        item.correct.length + '. Use kind "multiple" if more than one answer is right.');
    }

    if (!available) return;

    var seen = {};
    item.correct.forEach(function (id) {
      if (!available.ids[id]) {
        p.at(where, '`correct` references option "' + id +
          '", but the options are: ' + available.order.join(', ') + '.');
      }
      if (seen[id]) {
        p.at(where, '`correct` lists "' + id + '" more than once.');
      }
      seen[id] = true;
    });
  }

  function checkReviewLink(p, where, item) {
    var hasHref = isNonEmptyString(item.reviewHref);
    var hasLabel = isNonEmptyString(item.reviewLabel);
    if (hasHref !== hasLabel) {
      p.at(where, '`reviewHref` and `reviewLabel` must be provided together, or not at all.');
    }
    if (hasHref && item.reviewHref.charAt(0) === '/') {
      p.at(where, '`reviewHref` starts with "/". Links must be relative to the site root ' +
        '(for example "sections/2-when-it-makes-things-up.html"), because the site is ' +
        'served from a subpath and a leading slash will 404.');
    }
  }

  /* --- one question: single / multiple / poll ---------------------------- */

  function validateQuestion(p, where, item, kind) {
    if (!isNonEmptyString(item.prompt)) {
      p.at(where, 'has no `prompt`.');
    }
    if (kind !== 'poll' && !isNonEmptyString(item.explanation)) {
      p.at(where, 'has no `explanation`. Every question must explain why the answer is what it is.');
    }
    var available = checkChoices(p, where, item);
    checkCorrect(p, where, item, available, kind);
    checkReviewLink(p, where, item);
  }

  /* --- matrix / deck: one shared option set applied to several items ----- */

  function validateItemSet(p, where, item) {
    if (!isNonEmptyString(item.title)) p.at(where, 'has no `title`.');

    var available = checkChoices(p, where, item, { field: 'options' });

    if (!Array.isArray(item.items) || item.items.length < 1) {
      p.at(where, '`items` must be a non-empty array.');
      return;
    }

    var seen = {};
    item.items.forEach(function (sub, i) {
      var subWhere = where + ' item ' + (i + 1) +
        (isNonEmptyString(sub && sub.id) ? ' ("' + sub.id + '")' : '');

      if (!isPlainObject(sub)) { p.at(subWhere, 'is not an object.'); return; }
      if (!isNonEmptyString(sub.id)) { p.at(subWhere, 'has no `id`.'); return; }
      if (seen[sub.id]) p.at(subWhere, 'duplicate item id "' + sub.id + '".');
      seen[sub.id] = true;

      if (!isNonEmptyString(sub.text)) p.at(subWhere, 'has no `text`.');
      if (!isNonEmptyString(sub.why)) {
        p.at(subWhere, 'has no `why`. Feedback must name the check to run, not just say "wrong".');
      }
      if (!isNonEmptyString(sub.correct)) {
        p.at(subWhere, 'has no `correct` option id.');
      } else if (available && !available.ids[sub.correct]) {
        p.at(subWhere, '`correct` is "' + sub.correct + '", but the options are: ' +
          available.order.join(', ') + '.');
      }
    });
  }

  /* --- scenario: two steps, consequence panels, no right answer ---------- */

  function validateScenario(p, where, item) {
    if (!isNonEmptyString(item.title)) p.at(where, 'has no `title`.');
    if (!isNonEmptyString(item.situation)) p.at(where, 'has no `situation`.');
    if (!isNonEmptyString(item.leaning)) {
      p.at(where, 'has no `leaning`. A scenario must model expert reasoning, ' +
        'including naming the legitimate alternative.');
    }

    if (!Array.isArray(item.lenses) || item.lenses.length < 2) {
      p.at(where, '`lenses` must be an array of at least 2 entries (the four questions).');
    } else {
      item.lenses.forEach(function (lens, i) {
        if (!isPlainObject(lens) || !isNonEmptyString(lens.id) || !isNonEmptyString(lens.text)) {
          p.at(where, '`lenses` item ' + (i + 1) + ' needs an `id` and `text`.');
        }
      });
    }

    var available = checkChoices(p, where, item, { field: 'options' });
    if (!available) return;

    item.options.forEach(function (opt, i) {
      var optWhere = where + ' option "' + (opt && opt.id ? opt.id : i + 1) + '"';
      var c = opt.consequences;
      if (!isPlainObject(c)) {
        p.at(optWhere, 'has no `consequences` object. Scenarios return consequences, not a verdict.');
        return;
      }
      ['gets', 'risks', 'pushback'].forEach(function (key) {
        if (!isNonEmptyString(c[key])) {
          p.at(optWhere, '`consequences.' + key + '` is missing.');
        }
      });
    });
  }

  /* --- dispatch ---------------------------------------------------------- */

  function validateEntry(p, where, item) {
    if (!isPlainObject(item)) { p.at(where, 'is not an object.'); return; }
    if (!isNonEmptyString(item.id)) { p.at(where, 'has no `id`.'); return; }

    var kind = item.kind;
    if (KINDS.indexOf(kind) === -1) {
      p.at(where, 'has kind "' + kind + '", which is not one of: ' + KINDS.join(', ') + '.');
      return;
    }

    if (kind === 'single' || kind === 'multiple' || kind === 'poll') {
      validateQuestion(p, where, item, kind);
    } else if (kind === 'matrix' || kind === 'deck') {
      validateItemSet(p, where, item);
    } else if (kind === 'scenario') {
      validateScenario(p, where, item);
    }
  }

  function validateCollection(p, entries, label) {
    if (!Array.isArray(entries)) {
      p.at('top level', 'expected an array under `' + label + '`.');
      return;
    }
    var seen = {};
    entries.forEach(function (item, i) {
      var where = label.replace(/s$/, '') + ' ' + (i + 1) +
        (isPlainObject(item) && isNonEmptyString(item.id) ? ' ("' + item.id + '")' : '');
      if (isPlainObject(item) && isNonEmptyString(item.id)) {
        if (seen[item.id]) {
          p.at(where, 'duplicate id "' + item.id + '". Ids must be unique across the file.');
        }
        seen[item.id] = true;
      }
      validateEntry(p, where, item);
    });
  }

  /* --- public API -------------------------------------------------------- */

  function validateChecks(data) {
    var p = new Problems('checks.json');
    if (!isPlainObject(data)) { p.at('top level', 'expected an object.'); return p.list; }
    validateCollection(p, data.checks, 'checks');
    return p.list;
  }

  function validateExercises(data) {
    var p = new Problems('exercises.json');
    if (!isPlainObject(data)) { p.at('top level', 'expected an object.'); return p.list; }
    validateCollection(p, data.exercises, 'exercises');
    return p.list;
  }

  function validateQuiz(data) {
    var p = new Problems('quiz.json');
    if (!isPlainObject(data)) { p.at('top level', 'expected an object.'); return p.list; }

    if (!isPlainObject(data.sections)) {
      p.at('top level', '`sections` must be an object mapping a section key to its label, ' +
        'used for the results breakdown.');
    }

    if (!Array.isArray(data.questions)) {
      p.at('top level', '`questions` must be an array.');
      return p.list;
    }

    if (data.questions.length < 1) {
      p.at('top level', '`questions` is empty.');
      return p.list;
    }

    var seen = {};
    var covered = {};

    data.questions.forEach(function (q, i) {
      var where = 'question ' + (i + 1) +
        (isPlainObject(q) && isNonEmptyString(q.id) ? ' ("' + q.id + '")' : '');

      if (!isPlainObject(q)) { p.at(where, 'is not an object.'); return; }
      if (!isNonEmptyString(q.id)) { p.at(where, 'has no `id`.'); return; }
      if (seen[q.id]) p.at(where, 'duplicate id "' + q.id + '".');
      seen[q.id] = true;

      var kind = q.kind;
      if (kind !== 'single' && kind !== 'multiple') {
        p.at(where, 'quiz questions must be kind "single" or "multiple", not "' + kind + '".');
        return;
      }

      validateQuestion(p, where, q, kind);

      // Every quiz question must be attributable to a section, or the
      // results breakdown silently drops it.
      if (!isNonEmptyString(q.section)) {
        p.at(where, 'has no `section`. The results breakdown needs it.');
      } else {
        covered[q.section] = true;
        if (isPlainObject(data.sections) && !data.sections[q.section]) {
          p.at(where, 'section "' + q.section + '" is not listed in the top-level `sections` map.');
        }
      }

      // Per-distractor feedback is the point of this quiz. Enforce it.
      if (Array.isArray(q.choices) && Array.isArray(q.correct)) {
        q.choices.forEach(function (choice) {
          if (isPlainObject(choice) && isNonEmptyString(choice.id) &&
              q.correct.indexOf(choice.id) === -1 && !isNonEmptyString(choice.why)) {
            p.at(where, 'wrong option "' + choice.id + '" has no `why`. Every distractor must ' +
              'explain the misconception it represents — that is where the teaching is.');
          }
        });
      }
    });

    if (isPlainObject(data.sections)) {
      Object.keys(data.sections).forEach(function (key) {
        if (!covered[key]) {
          p.at('coverage', 'section "' + key + '" (' + data.sections[key] +
            ') has no quiz question. Every section needs at least one.');
        }
      });
    }

    return p.list;
  }

  return {
    KINDS: KINDS,
    validateChecks: validateChecks,
    validateExercises: validateExercises,
    validateQuiz: validateQuiz
  };
});
