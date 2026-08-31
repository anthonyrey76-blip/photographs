/* ==========================================================================
   Manuel théorique — navigation par onglets, progression, accueil
   ========================================================================== */

(function () {
  'use strict';

  var App = window.PhotoApp;
  var META = window.CHAPTERS || [];
  var ORDER = ['accueil'].concat(META.map(function (m) { return m.id; }));

  function meta(id) {
    for (var i = 0; i < META.length; i++) if (META[i].id === id) return META[i];
    return null;
  }
  function exoIds(id) {
    var m = meta(id); if (!m) return [];
    var out = [];
    for (var i = 1; i <= m.exos; i++) out.push(id + '-e' + i);
    return out;
  }
  function allExoIds() {
    var out = [];
    META.forEach(function (m) { out = out.concat(exoIds(m.id)); });
    return out;
  }

  /* ---------------- barre latérale ---------------- */

  function buildSidebar() {
    var ul = document.getElementById('navlist');
    var html = '';

    html += '<li><button class="navlink" data-go="accueil">' +
            '<span class="num">·</span><span>Accueil</span></button></li>';

    var started = false;
    META.forEach(function (m) {
      if (m.kind === 'chapter' && !started) {
        html += '<li><div class="nav-sep">Les 11 chapitres</div></li>';
        started = true;
      }
      if (m.kind === 'back') {
        html += '<li><div class="nav-sep">Annexe</div></li>';
      }
      var label = m.kind === 'chapter' ? m.title : m.title;
      html += '<li><button class="navlink" data-go="' + m.id + '">' +
              '<span class="num">' + (m.num || '·') + '</span>' +
              '<span>' + esc(label) + '</span>' +
              '<span class="dot" aria-hidden="true"></span></button></li>';
    });

    html += '<li><div class="nav-sep">À côté</div></li>';
    html += '<li><a class="navlink" href="exercices.html">' +
            '<span class="num">·</span><span>Exercices quotidiens</span></a></li>';

    ul.innerHTML = html;
    ul.querySelectorAll('[data-go]').forEach(function (b) {
      b.addEventListener('click', function () {
        show(b.dataset.go);
        if (window.__drawer) window.__drawer.close();
      });
    });
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* ---------------- pieds de chapitre ---------------- */

  function buildChapNavs() {
    META.forEach(function (m, i) {
      var nav = document.querySelector('#' + m.id + ' [data-chapnav]');
      if (!nav) return;
      var prev = i === 0 ? { id: 'accueil', title: 'Accueil' } : META[i - 1];
      var next = META[i + 1];
      var h = '<button data-go="' + prev.id + '"><span class="dir">← Précédent</span>' +
              '<span class="ttl">' + esc(prev.title) + '</span></button>';
      if (next) {
        h += '<button class="next" data-go="' + next.id + '"><span class="dir">Suivant →</span>' +
             '<span class="ttl">' + esc(next.title) + '</span></button>';
      } else {
        h += '<a class="next" href="exercices.html"><span class="dir">Passer à la pratique →</span>' +
             '<span class="ttl">Exercices quotidiens</span></a>';
      }
      nav.innerHTML = h;
      nav.querySelectorAll('[data-go]').forEach(function (b) {
        b.addEventListener('click', function () { show(b.dataset.go); });
      });
    });
  }

  /* ---------------- accueil ---------------- */

  function buildHome() {
    var grid = document.getElementById('chaptercards');
    var h = '';
    META.filter(function (m) { return m.kind === 'chapter'; }).forEach(function (m) {
      h += '<button class="card" data-go="' + m.id + '">' +
           '<span class="cn">Chapitre ' + m.num + '</span>' +
           '<span class="ct">' + esc(m.title) + '</span>' +
           '<span class="cmeta"><span data-cardcount="' + m.id + '">0/' + m.exos + '</span>' +
           '<span class="minitrack"><span class="minifill" data-cardfill="' + m.id + '"></span></span></span>' +
           '</button>';
    });
    grid.innerHTML = h;
    grid.querySelectorAll('[data-go]').forEach(function (b) {
      b.addEventListener('click', function () { show(b.dataset.go); });
    });
  }

  function refreshHome() {
    var ids = allExoIds();
    var nd = App.countDone(ids);
    setText('stat-exos', nd + ' / ' + ids.length);

    var qTotal = 0, qOk = 0, qAns = 0;
    META.forEach(function (m) {
      qTotal += m.questions;
      for (var i = 1; i <= m.questions; i++) {
        var v = App.quiz[m.id + '.' + i];
        if (v) { qAns++; if (v === 'ok') qOk++; }
      }
    });
    setText('stat-quiz', qAns ? qOk + ' / ' + qAns : '—');
    setText('stat-quiz-sub', qAns ? 'sur ' + qAns + ' question' + (qAns > 1 ? 's' : '') + ' évaluée' + (qAns > 1 ? 's' : '') + ' (' + qTotal + ' au total)' : 'aucune question évaluée');

    var chDone = 0;
    META.forEach(function (m) {
      if (m.kind !== 'chapter' || !m.exos) return;
      if (App.countDone(exoIds(m.id)) === m.exos) chDone++;
    });
    setText('stat-chap', chDone + ' / 11');

    META.forEach(function (m) {
      if (m.kind !== 'chapter') return;
      var n = App.countDone(exoIds(m.id));
      var c = document.querySelector('[data-cardcount="' + m.id + '"]');
      var f = document.querySelector('[data-cardfill="' + m.id + '"]');
      if (c) c.textContent = n + '/' + m.exos;
      if (f) f.style.width = (m.exos ? (n / m.exos * 100) : 0) + '%';
    });

    // carte reprendre
    var last = App.getLast();
    var card = document.getElementById('resume');
    if (last && last.id && last.id !== 'accueil' && meta(last.id)) {
      card.style.display = '';
      card.querySelector('.rt').textContent = meta(last.id).title;
      card.querySelector('.rs').textContent = meta(last.id).kicker;
      card.onclick = function () { show(last.id); };
    } else if (card) {
      card.style.display = 'none';
    }
  }

  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }

  /* ---------------- progression globale ---------------- */

  function refreshProgress() {
    var ids = allExoIds();
    var n = App.countDone(ids);
    var pct = ids.length ? Math.round(n / ids.length * 100) : 0;
    document.querySelectorAll('[data-progfill]').forEach(function (e) { e.style.width = pct + '%'; });
    setText('prog-count', n + ' / ' + ids.length + ' exercices');
    setText('prog-pct', pct + ' %');

    META.forEach(function (m) {
      var link = document.querySelector('.navlink[data-go="' + m.id + '"]');
      if (!link) return;
      var ok = m.exos > 0 && App.countDone(exoIds(m.id)) === m.exos;
      link.classList.toggle('complete', ok);
    });
  }

  function refreshAll() { refreshProgress(); refreshHome(); }


  /* remonte en haut, y compris après le saut d'ancre natif du navigateur */
  function toTop() {
    window.scrollTo(0, 0);
    requestAnimationFrame(function () { window.scrollTo(0, 0); });
    setTimeout(function () { window.scrollTo(0, 0); }, 0);
  }

  /* ---------------- affichage d'une section ---------------- */

  function show(id, skipHash) {
    if (ORDER.indexOf(id) === -1) id = 'accueil';

    document.querySelectorAll('.chapter').forEach(function (s) {
      s.classList.toggle('active', s.id === id);
    });
    document.querySelectorAll('.navlink[data-go]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.go === id);
    });

    var m = meta(id);
    var title = m ? m.title : 'Accueil';
    var kick = m ? m.kicker : 'Manuel théorique';
    setText('topbar-title', m && m.kind === 'chapter' ? 'Ch. ' + m.num + ' · ' + title : title);
    document.title = (m ? title + ' — ' : '') + 'Manuel de photographie';

    // barre basse
    var i = ORDER.indexOf(id);
    var prevBtn = document.getElementById('bb-prev');
    var nextBtn = document.getElementById('bb-next');
    if (prevBtn) { prevBtn.disabled = i <= 0; prevBtn.onclick = function () { show(ORDER[i - 1]); }; }
    if (nextBtn) { nextBtn.disabled = i >= ORDER.length - 1; nextBtn.onclick = function () { show(ORDER[i + 1]); }; }

    if (!skipHash) {
      try { history.replaceState(null, '', '#' + id); } catch (e) { location.hash = id; }
    }
    App.setLast({ id: id, title: title, kicker: kick });

    toTop();
    var sb = document.querySelector('.sidebar .navlink.active');
    if (sb && window.innerWidth > 900) sb.scrollIntoView({ block: 'nearest' });

    if (id === 'accueil') refreshHome();
  }

  /* ---------------- démarrage ---------------- */

  function init() {
    App.initTheme();
    App.initDrawer();
    buildSidebar();
    buildChapNavs();
    buildHome();

    App.bindCheckboxes(document, refreshAll);
    App.bindQuiz(document, refreshAll);

    document.getElementById('bb-menu').innerHTML = App.ICON.menu + '<span>Sommaire</span>';
    document.getElementById('bb-prev').innerHTML = App.ICON.left + '<span>Précédent</span>';
    document.getElementById('bb-next').innerHTML = App.ICON.right + '<span>Suivant</span>';
    document.getElementById('bb-home').innerHTML = App.ICON.prog + '<span>Progression</span>';
    document.getElementById('bb-home').onclick = function () { show('accueil'); };
    document.querySelectorAll('[data-theme-cycle]').forEach(function (b) { b.innerHTML = App.ICON.theme; });

    document.querySelectorAll('[data-go]').forEach(function (b) {
      if (b.dataset.bound) return;
      b.dataset.bound = '1';
      b.addEventListener('click', function () { show(b.dataset.go); });
    });

    var start = (location.hash || '').replace('#', '');
    show(ORDER.indexOf(start) !== -1 ? start : 'accueil', true);
    refreshAll();

    window.addEventListener('hashchange', function () {
      var h = (location.hash || '').replace('#', '');
      if (h && ORDER.indexOf(h) !== -1) show(h, true);
    });

    // navigation clavier sur desktop
    document.addEventListener('keydown', function (e) {
      if (e.target.matches('input, textarea, button')) return;
      var i = ORDER.indexOf((location.hash || '#accueil').replace('#', ''));
      if (e.key === 'ArrowRight' && i < ORDER.length - 1) show(ORDER[i + 1]);
      if (e.key === 'ArrowLeft' && i > 0) show(ORDER[i - 1]);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
