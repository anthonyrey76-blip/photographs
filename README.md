# Manuel de photographie

Site statique en deux parties, sans aucune dépendance externe ni build :

- **`index.html`** — le manuel théorique complet : 11 chapitres en onglets, 44 exercices à cocher, 89 questions de quiz interactives.
- **`exercices.html`** — les exercices quotidiens, chargés depuis `contenu/` semaine par semaine.

Pensé pour un Sony α6500 (Tamron 17-70 mm f/2.8 et 70-300 mm f/4.5-6.3) et un smartphone, en milieu urbain.

---

## Mise en ligne

### GitHub Pages

1. Pousser ce dossier à la racine d'un dépôt.
2. `Settings` → `Pages` → Source : `Deploy from a branch`, branche `main`, dossier `/ (root)`.
3. Le site est disponible sous quelques minutes à `https://<utilisateur>.github.io/<dépôt>/`.

Rien d'autre à configurer : pas de Jekyll, pas d'étape de compilation.

### En local

`index.html` fonctionne en double-cliquant dessus.

`exercices.html` charge son contenu depuis des fichiers séparés, ce que les navigateurs bloquent en `file://`. Il faut donc un petit serveur :

```bash
cd <ce-dossier>
python3 -m http.server 8000
```

puis ouvrir <http://localhost:8000/>.

---

## Structure

```
.
├── index.html              manuel théorique (contenu inclus dans le fichier)
├── exercices.html          coquille des exercices quotidiens
├── assets/
│   ├── style.css           design system, thèmes clair et sombre, responsive
│   ├── app.js              socle commun : thème, tiroir, cases à cocher, quiz
│   ├── theorie.js          navigation par onglets et progression du manuel
│   └── exercices.js        chargement des semaines et rendu des séances
├── contenu/
│   ├── semaines.json       index des semaines (disponibles et à venir)
│   └── semaine-01.json     semaine 1 — 7 jours + mode d'emploi + carnet de bord
└── README.md
```

---

## Ajouter une semaine d'exercices

Tout se passe dans `contenu/`, sans toucher au HTML ni au JavaScript.

**1. Créer `contenu/semaine-02.json`** sur le modèle du premier fichier :

```json
{
  "numero": 2,
  "slug": "semaine-02",
  "titre": "Semaine 2",
  "sousTitre": "Vitesse, ISO et triangle d'exposition",
  "description": "…",
  "intro":  { "id": "s02-intro", "num": 0,  "kicker": "Mode d'emploi", "titre": "…", "techniques": [], "meta": "", "checks": [], "html": "…" },
  "annexe": { "id": "s02-annexe","num": 99, "kicker": "Annexe", "titre": "Carnet de bord", "techniques": [], "meta": "", "checks": [], "html": "…" },
  "jours": [
    {
      "id": "s02-j1",
      "num": 1,
      "kicker": "Jour 1 · Lundi",
      "titre": "Figer le mouvement",
      "techniques": ["Vitesse d'obturation", "Mode S", "Manuel I — ch. 8"],
      "meta": "<strong>Durée :</strong> 18 min · <strong>Outil :</strong> α6500",
      "checks": ["s02-j1-c1", "s02-j1-c2"],
      "html": "<h2>Pourquoi cet exercice</h2><p>…</p>"
    }
  ]
}
```

**2. Déclarer la semaine** dans `contenu/semaines.json`, dans le tableau `semaines` :

```json
{ "slug": "semaine-02", "numero": 2, "titre": "Semaine 2",
  "sousTitre": "Vitesse, ISO et triangle d'exposition",
  "description": "…", "jours": 7, "checks": 42, "disponible": true }
```

### Conventions à respecter

| Champ | Rôle |
|---|---|
| `id` | identifiant unique de la séance, préfixe des cases à cocher |
| `num` | `0` = mode d'emploi, `1`–`7` = jours, `99` = annexe. Détermine l'ordre |
| `kicker` | surtitre, format `Jour N · Nom du jour` (le nom du jour est réaffiché sur les cartes) |
| `techniques` | étiquettes affichées sous le titre ; celle contenant « Manuel I » est mise en avant |
| `meta` | ligne de métadonnées en HTML libre (durée, lieu, outil, nombre d'images) |
| `checks` | **liste exhaustive** des identifiants de cases à cocher présents dans `html` |
| `html` | corps de la séance en HTML |

Les identifiants de `checks` doivent être **uniques dans tout le site** et **stables dans le temps** : ce sont les clés de la progression enregistrée. Renommer un identifiant fait perdre la case correspondante.

### Classes utiles dans le champ `html`

```html
<div class="box key">      <div class="boxtitle">Règle</div>      …</div>
<div class="box sony">     <div class="boxtitle">Réglages α6500</div> …</div>
<div class="box phone">    <div class="boxtitle">Sur smartphone</div> …</div>
<div class="box warn">     <div class="boxtitle">Le piège du jour</div> …</div>
<div class="step">…</div>                          <!-- bloc de procédure -->
<div class="tablewrap"><table>…</table></div>       <!-- tableau défilable -->

<!-- case à cocher : le bouton est injecté automatiquement au chargement -->
<div class="check">
  <div class="boxtitle">Autoévaluation</div>
  <ul>
    <li class="checkitem" data-check="s02-j1-c1">
      <button class="chk sm" type="button" aria-pressed="false"></button>
      <span class="cktext">J'ai bien produit 20 images</span>
    </li>
  </ul>
</div>
```

---

## Modifier le manuel théorique

Le contenu des 11 chapitres est directement dans `index.html`, chaque chapitre étant une `<section class="chapter" id="ch-N">`. Pour en éditer un, il suffit de modifier le HTML de la section correspondante.

Deux points à ne pas casser :

- **Les identifiants d'exercices** : `<div class="exo" data-exo="ch-5-e2">`. Ils portent la progression.
- **Le bloc `window.CHAPTERS`** en bas du fichier : il décrit chaque section (`exos`, `questions`). Si tu ajoutes ou retires un exercice ou une question de quiz, mets à jour le compteur correspondant, sinon les statistiques seront fausses.

Structure d'une question de quiz :

```html
<div class="qitem" data-q="3">
  <div class="qtext"><span class="qn">3</span><span class="qbody">La question…</span></div>
  <button class="btn small ghost" type="button" data-reveal>Voir la réponse</button>
  <div class="qreveal">
    <div class="qanswer">La réponse…</div>
    <div class="qself"><span class="lbl">Mon résultat</span>
      <button class="btn small ok" type="button" data-self="ok" aria-pressed="false">J'avais juste</button>
      <button class="btn small ko" type="button" data-self="ko" aria-pressed="false">J'avais faux</button>
    </div>
  </div>
</div>
```

---

## Fonctionnement

**Navigation** — barre latérale fixe au-dessus de 900 px de large ; en dessous, elle se replie derrière le bouton menu et une barre d'onglets apparaît en bas de l'écran (Sommaire · Précédent · Suivant · Progression). Les flèches ← et → du clavier changent de chapitre sur ordinateur.

**Adresses** — chaque chapitre a son ancre (`index.html#ch-5`), chaque séance aussi (`exercices.html#semaine-01:j4`). Une adresse peut être mise en favori ou partagée.

**Thème** — clair ou sombre selon le réglage du système, avec bascule manuelle dans la barre latérale (ordinateur) ou l'icône en haut à droite (mobile). Le choix est mémorisé.

**Progression** — cases à cocher, résultats de quiz, thème et dernière page lue sont enregistrés dans le `localStorage` du navigateur. Rien n'est envoyé sur un serveur. Conséquence : la progression est propre à un navigateur sur un appareil, et disparaît si les données de navigation sont effacées.

Clés utilisées : `photo.exos`, `photo.quiz`, `photo.theme`, `photo.last`, `photo.lastExo`.

**Impression** — une feuille de style d'impression déplie tous les chapitres et toutes les réponses de quiz, et masque l'interface.

---

## Compatibilité

Navigateurs à moteur récent (Chrome, Edge, Safari, Firefox, versions mobiles comprises). Le JavaScript est en ES5 avec quelques appels modernes (`fetch`, `classList.toggle`, `color-mix` en CSS) ; aucun outil de compilation n'est nécessaire.
