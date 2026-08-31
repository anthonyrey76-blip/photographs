/* ==========================================================================
   Exercices quotidiens — chargement du contenu séparé (contenu/*.json)
   ========================================================================== */

(function () {
  'use strict';

  var App = window.PhotoApp;
  var INDEX = null;      // semaines.json
  var WEEKS = {};        // slug -> données de semaine
  var VIEWS = [];        // ordre de navigation : ['accueil', 's01-intro', 's01-j1', ...]
  var CURRENT = null;

  var elMain = document.getElementById('view');

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* ---------------- chargement ---------------- */

  function loadJSON(path) {
    return fetch(path, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(r.status + ' ' + r.statusText + ' sur ' + path);
      return r.json();
    });
  }

  function fatal(err) {
    var isFile = location.protocol === 'file:';
    elMain.innerHTML =
      '<div class="errorbox"><div class="boxtitle">Le contenu n\'a pas pu être chargé</div>' +
      (isFile
        ? '<p>Cette page charge ses semaines d\'exercices depuis des fichiers séparés, ce que le navigateur bloque quand on ouvre le fichier directement (protocole <code>file://</code>).</p>' +
          '<p><strong>Deux solutions :</strong> publier le dépôt sur GitHub Pages, ou lancer un petit serveur local depuis le dossier du site&nbsp;:</p>' +
          '<pre>python3 -m http.server 8000</pre>' +
          '<p class="small" style="margin-top:10px">Puis ouvrir <code>http://localhost:8000/exercices.html</code>. Le manuel théorique (<a href="index.html">index.html</a>), lui, fonctionne même en double-clic.</p>'
        : '<p>Vérifie que le dossier <code>contenu/</code> est bien présent à côté de cette page.</p>') +
      '<pre>' + esc(String(err && err.message || err)) + '</pre></div>';
  }

  /* ---------------- construction des vues ---------------- */

  function weekViews(w) {
    var v = [];
    if (w.intro) v.push({ key: w.slug + ':intro', week: w.slug, kind: 'intro', data: w.intro });
    w.jours.forEach(function (d) {
      v.push({ key: w.slug + ':j' + d.num, week: w.slug, kind: 'jour', data: d });
    });
    if (w.annexe) v.push({ key: w.slug + ':annexe', week: w.slug, kind: 'annexe', data: w.annexe });
    return v;
  }

  function rebuildViews() {
    VIEWS = [{ key: 'accueil', kind: 'accueil' }];
    INDEX.semaines.forEach(function (s) {
      if (WEEKS[s.slug]) VIEWS = VIEWS.concat(weekViews(WEEKS[s.slug]));
    });
  }

  function findView(key) {
    for (var i = 0; i < VIEWS.length; i++) if (VIEWS[i].key === key) return VIEWS[i];
    return null;
  }

  /* ---------------- barre latérale ---------------- */

  function buildSidebar() {
    var ul = document.getElementById('navlist');
    var h = '<li><button class="navlink" data-view="accueil"><span class="num">·</span><span>Accueil</span></button></li>';

    INDEX.semaines.forEach(function (s) {
      var w = WEEKS[s.slug];
      h += '<li><div class="nav-sep">' + esc(s.titre) + ' — ' + esc(s.sousTitre) + '</div></li>';
      if (!w) return;
      if (w.intro) {
        h += '<li><button class="navlink" data-view="' + s.slug + ':intro">' +
             '<span class="num">·</span><span>Mode d\'emploi</span></button></li>';
      }
      w.jours.forEach(function (d) {
        h += '<li><button class="navlink" data-view="' + s.slug + ':j' + d.num + '">' +
             '<span class="num">' + d.num + '</span><span>' + esc(d.titre) + '</span>' +
             '<span class="dot" aria-hidden="true"></span></button></li>';
      });
      if (w.annexe) {
        h += '<li><button class="navlink" data-view="' + s.slug + ':annexe">' +
             '<span class="num">·</span><span>Carnet de bord</span></button></li>';
      }
    });

    h += '<li><div class="nav-sep">À côté</div></li>';
    h += '<li><a class="navlink" href="index.html"><span class="num">·</span><span>Manuel théorique</span></a></li>';

    ul.innerHTML = h;
    ul.querySelectorAll('[data-view]').forEach(function (b) {
      b.addEventListener('click', function () {
        show(b.dataset.view);
        if (window.__drawer) window.__drawer.close();
      });
    });
  }

  /* ---------------- rendu ---------------- */

  function dayProgress(d) {
    var n = App.countDone(d.checks || []);
    return { done: n, total: (d.checks || []).length };
  }

  function renderAccueil() {
    var h = '<div class="hero"><h1>Exercices quotidiens</h1>' +
            '<p>Une séance de 15 à 20 minutes par jour, à l\'appareil photo et au smartphone. ' +
            'Chaque semaine ajoute son propre fichier — le site se met à jour tout seul.</p></div>';

    var last = App.store.get('photo.lastExo', null);
    if (last && findView(last.key)) {
      h += '<button class="resume-card" id="resume-exo">' +
           '<div class="rk">Reprendre</div>' +
           '<div class="rt">' + esc(last.title) + '</div>' +
           '<div class="rs">' + esc(last.sub || '') + '</div></button>';
    }

    INDEX.semaines.forEach(function (s) {
      var w = WEEKS[s.slug];
      if (!w) return;
      var tot = 0, dn = 0;
      w.jours.forEach(function (d) { var p = dayProgress(d); tot += p.total; dn += p.done; });
      var pct = tot ? Math.round(dn / tot * 100) : 0;

      h += '<div class="weekcard">' +
           '<div class="wbadge">Semaine ' + s.numero + ' · ' + w.jours.length + ' jours</div>' +
           '<h3>' + esc(s.sousTitre) + '</h3>' +
           '<p class="wsub">' + esc(s.description) + '</p>' +
           '<div class="progress-label"><span>' + dn + ' / ' + tot + ' points validés</span><span>' + pct + ' %</span></div>' +
           '<div class="progress-track" style="margin-bottom:14px"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
           '<div class="daylist">';

      if (w.intro) {
        h += '<button class="daybtn" data-view="' + s.slug + ':intro">' +
             '<span class="dnum">?</span><span class="dttl">Mode d\'emploi' +
             '<span class="dsub">à lire avant le jour 1</span></span></button>';
      }
      w.jours.forEach(function (d) {
        var p = dayProgress(d);
        var complete = p.total > 0 && p.done === p.total;
        var jour = (d.kicker.split('·')[1] || '').trim();
        h += '<button class="daybtn' + (complete ? ' complete' : '') + '" data-view="' + s.slug + ':j' + d.num + '">' +
             '<span class="dnum">' + d.num + '</span>' +
             '<span class="dttl">' + esc(d.titre) +
             '<span class="dsub">' + esc(jour || ('Jour ' + d.num)) + ' · ' + p.done + '/' + p.total + '</span>' +
             '</span></button>';
      });
      if (w.annexe) {
        h += '<button class="daybtn" data-view="' + s.slug + ':annexe">' +
             '<span class="dnum">✎</span><span class="dttl">Carnet de bord' +
             '<span class="dsub">à remplir chaque soir</span></span></button>';
      }
      h += '</div></div>';
    });

    (INDEX.aVenir || []).forEach(function (s) {
      h += '<div class="weekcard soon">' +
           '<div class="wbadge">Semaine ' + s.numero + ' · à venir</div>' +
           '<h3>' + esc(s.sousTitre) + '</h3>' +
           '<p class="wsub" style="margin-bottom:0">' + esc(s.description) + '</p></div>';
    });

    h += '<div class="box" style="margin-top:28px"><div class="boxtitle">Ajouter une semaine</div>' +
         '<p>Dépose un fichier <code>contenu/semaine-02.json</code> sur le même modèle que le premier, ' +
         'puis ajoute son entrée dans <code>contenu/semaines.json</code>. Aucune autre modification n\'est nécessaire.</p></div>';

    elMain.innerHTML = h;

    elMain.querySelectorAll('[data-view]').forEach(function (b) {
      b.addEventListener('click', function () { show(b.dataset.view); });
    });
    var r = document.getElementById('resume-exo');
    if (r) r.addEventListener('click', function () { show(last.key); });
  }

  function renderEntry(v) {
    var d = v.data;
    var techs = (d.techniques || []).map(function (t, i) {
      var alt = /Manuel I/i.test(t);
      return '<span class="tech' + (alt ? ' alt' : '') + '">' + esc(t) + '</span>';
    }).join('');

    var h = '<div class="kicker">' + esc(d.kicker) + '</div>' +
            '<h1>' + esc(d.titre) + '</h1>' +
            (techs ? '<div class="techs">' + techs + '</div>' : '') +
            (d.meta ? '<div class="meta-day">' + d.meta + '</div>' : '') +
            d.html;

    // pied de navigation
    var i = VIEWS.indexOf(v);
    var prev = VIEWS[i - 1], next = VIEWS[i + 1];
    h += '<nav class="chapnav">';
    if (prev) {
      h += '<button data-view="' + prev.key + '"><span class="dir">← Précédent</span>' +
           '<span class="ttl">' + esc(prev.kind === 'accueil' ? 'Accueil' : prev.data.titre) + '</span></button>';
    } else { h += '<div class="spacer"></div>'; }
    if (next) {
      h += '<button class="next" data-view="' + next.key + '"><span class="dir">Suivant →</span>' +
           '<span class="ttl">' + esc(next.data.titre) + '</span></button>';
    } else {
      h += '<a class="next" href="index.html"><span class="dir">Approfondir →</span>' +
           '<span class="ttl">Manuel théorique</span></a>';
    }
    h += '</nav>';

    elMain.innerHTML = h;

    elMain.querySelectorAll('[data-view]').forEach(function (b) {
      b.addEventListener('click', function () { show(b.dataset.view); });
    });

    bindChecks(elMain);
  }

  /* ---------------- cases à cocher des séances ---------------- */

  function bindChecks(root) {
    root.querySelectorAll('li.checkitem[data-check]').forEach(function (li) {
      var id = li.dataset.check;
      var btn = li.querySelector('.chk');
      if (!btn) return;
      btn.innerHTML = App.ICON.check;

      function paint() {
        var on = !!App.done[id];
        btn.setAttribute('aria-pressed', String(on));
        li.classList.toggle('done', on);
        btn.setAttribute('aria-label', on ? 'Fait — décocher' : 'Marquer comme fait');
      }
      paint();
      btn.addEventListener('click', function () {
        if (App.done[id]) delete App.done[id]; else App.done[id] = true;
        App.saveDone();
        paint();
        refreshProgress();
      });
    });
  }

  /* ---------------- progression ---------------- */

  function allChecks() {
    var out = [];
    Object.keys(WEEKS).forEach(function (slug) {
      WEEKS[slug].jours.forEach(function (d) { out = out.concat(d.checks || []); });
    });
    return out;
  }

  function refreshProgress() {
    var ids = allChecks();
    var n = App.countDone(ids);
    var pct = ids.length ? Math.round(n / ids.length * 100) : 0;
    document.querySelectorAll('[data-progfill]').forEach(function (e) { e.style.width = pct + '%'; });
    var c = document.getElementById('prog-count');
    var p = document.getElementById('prog-pct');
    if (c) c.textContent = n + ' / ' + ids.length + ' points';
    if (p) p.textContent = pct + ' %';

    VIEWS.forEach(function (v) {
      if (v.kind !== 'jour') return;
      var link = document.querySelector('.navlink[data-view="' + v.key + '"]');
      if (!link) return;
      var pr = dayProgress(v.data);
      link.classList.toggle('complete', pr.total > 0 && pr.done === pr.total);
    });

    if (CURRENT === 'accueil') renderAccueil();
  }


  /* remonte en haut, y compris après le saut d'ancre natif du navigateur */
  function toTop() {
    window.scrollTo(0, 0);
    requestAnimationFrame(function () { window.scrollTo(0, 0); });
    setTimeout(function () { window.scrollTo(0, 0); }, 0);
  }

  /* ---------------- affichage ---------------- */

  function show(key, skipHash) {
    var v = findView(key);
    if (!v) { key = 'accueil'; v = VIEWS[0]; }
    CURRENT = key;

    if (v.kind === 'accueil') renderAccueil();
    else renderEntry(v);

    document.querySelectorAll('.navlink[data-view]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.view === key);
    });

    var title = v.kind === 'accueil' ? 'Accueil' : v.data.titre;
    var sub = v.kind === 'accueil' ? '' : v.data.kicker;
    var tt = document.getElementById('topbar-title');
    if (tt) tt.textContent = v.kind === 'jour' ? v.data.kicker.split('·')[0].trim() + ' · ' + title : title;
    document.title = (v.kind === 'accueil' ? '' : title + ' — ') + 'Exercices quotidiens';

    var i = VIEWS.indexOf(v);
    var pb = document.getElementById('bb-prev');
    var nb = document.getElementById('bb-next');
    if (pb) { pb.disabled = i <= 0; pb.onclick = function () { show(VIEWS[i - 1].key); }; }
    if (nb) { nb.disabled = i >= VIEWS.length - 1; nb.onclick = function () { show(VIEWS[i + 1].key); }; }

    if (!skipHash) {
      try { history.replaceState(null, '', '#' + key); } catch (e) { location.hash = key; }
    }
    if (v.kind !== 'accueil') App.store.set('photo.lastExo', { key: key, title: title, sub: sub });

    toTop();
    refreshProgress();
  }

  /* ---------------- démarrage ---------------- */

  function init() {
    App.initTheme();
    App.initDrawer();

    document.getElementById('bb-menu').innerHTML = App.ICON.menu + '<span>Sommaire</span>';
    document.getElementById('bb-prev').innerHTML = App.ICON.left + '<span>Précédent</span>';
    document.getElementById('bb-next').innerHTML = App.ICON.right + '<span>Suivant</span>';
    document.getElementById('bb-home').innerHTML = App.ICON.prog + '<span>Semaines</span>';
    document.getElementById('bb-home').onclick = function () { show('accueil'); };
    document.querySelectorAll('[data-theme-cycle]').forEach(function (b) { b.innerHTML = App.ICON.theme; });

    loadJSON('contenu/semaines.json')
      .then(function (idx) {
        INDEX = idx;
        return Promise.all(idx.semaines.filter(function (s) { return s.disponible !== false; })
          .map(function (s) {
            return loadJSON('contenu/' + s.slug + '.json').then(function (w) { WEEKS[s.slug] = w; });
          }));
      })
      .then(function () {
        rebuildViews();
        buildSidebar();
        var start = (location.hash || '').replace('#', '');
        show(findView(start) ? start : 'accueil', true);
        window.addEventListener('hashchange', function () {
          var h = (location.hash || '').replace('#', '');
          if (h && findView(h)) show(h, true);
        });
      })
      .catch(fatal);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
