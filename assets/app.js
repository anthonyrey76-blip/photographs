/* ==========================================================================
   Manuel de photographie — logique commune
   Thème · navigation · progression · cases à cocher · quiz
   Aucune dépendance externe.
   ========================================================================== */

(function () {
  'use strict';

  /* ---------------- stockage sûr ---------------- */

  var MEM = {};
  var store = {
    get: function (k, fallback) {
      try {
        var v = localStorage.getItem(k);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) {
        return k in MEM ? MEM[k] : fallback;
      }
    },
    set: function (k, v) {
      MEM[k] = v;
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* mode privé */ }
    }
  };

  var K_DONE   = 'photo.exos';       // { id: true }
  var K_QUIZ   = 'photo.quiz';       // { qid: 'ok'|'ko' }
  var K_THEME  = 'photo.theme';      // 'auto' | 'light' | 'dark'
  var K_LAST   = 'photo.last';       // { href, id, title, sub }

  var done = store.get(K_DONE, {}) || {};
  var quiz = store.get(K_QUIZ, {}) || {};

  /* ---------------- thème ---------------- */

  function applyTheme(mode) {
    var root = document.documentElement;
    if (mode === 'light' || mode === 'dark') root.setAttribute('data-theme', mode);
    else root.removeAttribute('data-theme');
    document.querySelectorAll('[data-theme-set]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.themeSet === mode));
    });
  }

  function initTheme() {
    var mode = store.get(K_THEME, 'auto');
    applyTheme(mode);
    document.querySelectorAll('[data-theme-set]').forEach(function (b) {
      b.addEventListener('click', function () {
        var m = b.dataset.themeSet;
        store.set(K_THEME, m);
        applyTheme(m);
      });
    });
    document.querySelectorAll('[data-theme-cycle]').forEach(function (b) {
      b.addEventListener('click', function () {
        var order = ['auto', 'light', 'dark'];
        var cur = store.get(K_THEME, 'auto');
        var next = order[(order.indexOf(cur) + 1) % 3];
        store.set(K_THEME, next);
        applyTheme(next);
      });
    });
  }

  /* ---------------- icônes ---------------- */

  var ICON = {
    check: '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',
    menu:  '<svg viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
    left:  '<svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>',
    right: '<svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>',
    theme: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.2"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.2" y1="4.2" x2="5.6" y2="5.6"/><line x1="18.4" y1="18.4" x2="19.8" y2="19.8"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.2" y1="19.8" x2="5.6" y2="18.4"/><line x1="18.4" y1="5.6" x2="19.8" y2="4.2"/></svg>',
    list:  '<svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3.5" cy="6" r="1.2"/><circle cx="3.5" cy="12" r="1.2"/><circle cx="3.5" cy="18" r="1.2"/></svg>',
    prog:  '<svg viewBox="0 0 24 24"><path d="M4 19V9"/><path d="M10 19V5"/><path d="M16 19v-7"/><path d="M22 19H2"/></svg>'
  };

  /* ---------------- tiroir mobile ---------------- */

  function initDrawer() {
    var sb = document.querySelector('.sidebar');
    var scrim = document.querySelector('.scrim');
    if (!sb || !scrim) return;

    function open()  { sb.classList.add('open');  scrim.classList.add('open');  document.body.style.overflow = 'hidden'; }
    function close() { sb.classList.remove('open'); scrim.classList.remove('open'); document.body.style.overflow = ''; }

    window.__drawer = { open: open, close: close, toggle: function () {
      sb.classList.contains('open') ? close() : open();
    } };

    scrim.addEventListener('click', close);
    document.querySelectorAll('[data-drawer-toggle]').forEach(function (b) {
      b.addEventListener('click', window.__drawer.toggle);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }

  /* ---------------- cases à cocher ---------------- */

  function bindCheckboxes(root, onChange) {
    (root || document).querySelectorAll('.exo[data-exo]').forEach(function (exo) {
      var id = exo.dataset.exo;
      var btn = exo.querySelector('.chk');
      if (!btn) return;
      btn.innerHTML = ICON.check;

      function paint() {
        var on = !!done[id];
        btn.setAttribute('aria-pressed', String(on));
        exo.classList.toggle('done', on);
        btn.setAttribute('aria-label', on ? 'Exercice fait — décocher' : 'Marquer cet exercice comme fait');
      }
      paint();

      btn.addEventListener('click', function () {
        if (done[id]) delete done[id]; else done[id] = true;
        store.set(K_DONE, done);
        paint();
        if (onChange) onChange();
      });
    });
  }

  /* ---------------- quiz interactifs ---------------- */

  function bindQuiz(root, onChange) {
    (root || document).querySelectorAll('.quiz[data-quiz]').forEach(function (qz) {
      var qzid = qz.dataset.quiz;
      var items = qz.querySelectorAll('.qitem');

      function score() {
        var ok = 0, answered = 0;
        items.forEach(function (it) {
          var v = quiz[qzid + '.' + it.dataset.q];
          if (v) { answered++; if (v === 'ok') ok++; }
        });
        return { ok: ok, answered: answered, total: items.length };
      }

      function paintScore() {
        var s = score();
        var el = qz.querySelector('.quizscore');
        if (!el) return;
        el.textContent = s.answered === 0
          ? s.total + ' questions'
          : s.ok + ' / ' + s.answered + ' juste' + (s.ok > 1 ? 's' : '') +
            (s.answered < s.total ? ' · ' + (s.total - s.answered) + ' restante' + (s.total - s.answered > 1 ? 's' : '') : '');
      }

      items.forEach(function (it) {
        var qid = qzid + '.' + it.dataset.q;
        var rev = it.querySelector('.qreveal');
        var showBtn = it.querySelector('[data-reveal]');
        var okBtn = it.querySelector('[data-self="ok"]');
        var koBtn = it.querySelector('[data-self="ko"]');

        function paint() {
          var v = quiz[qid];
          if (okBtn) okBtn.setAttribute('aria-pressed', String(v === 'ok'));
          if (koBtn) koBtn.setAttribute('aria-pressed', String(v === 'ko'));
          if (v && rev) { rev.classList.add('open'); if (showBtn) showBtn.style.display = 'none'; }
        }

        if (showBtn) {
          showBtn.addEventListener('click', function () {
            rev.classList.add('open');
            showBtn.style.display = 'none';
          });
        }
        [['ok', okBtn], ['ko', koBtn]].forEach(function (pair) {
          if (!pair[1]) return;
          pair[1].addEventListener('click', function () {
            quiz[qid] = quiz[qid] === pair[0] ? undefined : pair[0];
            if (quiz[qid] === undefined) delete quiz[qid];
            store.set(K_QUIZ, quiz);
            paint(); paintScore();
            if (onChange) onChange();
          });
        });
        paint();
      });

      var reset = qz.querySelector('[data-quiz-reset]');
      if (reset) reset.addEventListener('click', function () {
        items.forEach(function (it) {
          delete quiz[qzid + '.' + it.dataset.q];
          var rev = it.querySelector('.qreveal');
          var showBtn = it.querySelector('[data-reveal]');
          if (rev) rev.classList.remove('open');
          if (showBtn) showBtn.style.display = '';
          it.querySelectorAll('[data-self]').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
        });
        store.set(K_QUIZ, quiz);
        paintScore();
        if (onChange) onChange();
      });

      var all = qz.querySelector('[data-quiz-all]');
      if (all) all.addEventListener('click', function () {
        items.forEach(function (it) {
          var rev = it.querySelector('.qreveal');
          var showBtn = it.querySelector('[data-reveal]');
          if (rev) rev.classList.add('open');
          if (showBtn) showBtn.style.display = 'none';
        });
      });

      paintScore();
    });
  }

  /* ---------------- exports ---------------- */

  window.PhotoApp = {
    ICON: ICON,
    store: store,
    keys: { done: K_DONE, quiz: K_QUIZ, theme: K_THEME, last: K_LAST },
    done: done,
    quiz: quiz,
    initTheme: initTheme,
    initDrawer: initDrawer,
    bindCheckboxes: bindCheckboxes,
    bindQuiz: bindQuiz,
    saveDone: function () { store.set(K_DONE, done); },
    setLast: function (obj) { store.set(K_LAST, obj); },
    getLast: function () { return store.get(K_LAST, null); },
    countDone: function (ids) {
      var n = 0;
      ids.forEach(function (id) { if (done[id]) n++; });
      return n;
    }
  };
})();
