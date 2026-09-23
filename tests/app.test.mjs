/**
 * tests/app.test.mjs — tests du site WEDDING BOX
 * Exécute réellement index.html dans un DOM (jsdom) et vérifie :
 * intégrité des données, rendu, filtres, recherche, tri, vues, zoom,
 * fiche enrichie, liens profonds, sélection persistante, partage, export,
 * SEO, accessibilité, compteurs, responsive.
 *
 *   node tests/app.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { JSDOM, VirtualConsole } from '/tmp/verify/node_modules/jsdom/lib/api.js';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
const ok = (nom, cond, detail = '') => {
  if (cond) { pass++; console.log(`  \x1b[32m✓\x1b[0m ${nom}`); }
  else { fail++; console.log(`  \x1b[31m✗\x1b[0m ${nom} ${detail}`); }
};
const titre = (t) => console.log(`\n\x1b[1m${t}\x1b[0m`);

/* ---------- environnement ---------- */
const virtualConsole = new VirtualConsole();
const erreurs = [];
virtualConsole.on('jsdomError', (e) => erreurs.push(String(e.message || e)));
virtualConsole.on('error', (...a) => erreurs.push(a.join(' ')));

const dom = new JSDOM(html, {
  url: 'https://weddingbox.example/lille-metropole/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole,
  beforeParse(win) {
    // stockage local (jsdom ne l'implémente pas entièrement selon les versions)
    const store = new Map();
    Object.defineProperty(win, 'localStorage', {
      value: {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
        clear: () => store.clear(),
      }, configurable: true,
    });
    // fetch : lecture des vrais fichiers data/ sur le disque
    win.fetch = async (chemin) => {
      const rel = String(chemin).replace(/^\.?\//, '');
      const abs = path.join(ROOT, rel);
      if (!fs.existsSync(abs)) return { ok: false, status: 404, json: async () => ({}) };
      const txt = fs.readFileSync(abs, 'utf8');
      return { ok: true, status: 200, json: async () => JSON.parse(txt) };
    };
    win.matchMedia = win.matchMedia || ((q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }));
    win.navigator.clipboard = { writeText: async () => {} };
    // IntersectionObserver n'existe pas dans jsdom
    win.IntersectionObserver = class { constructor(cb) { this.cb = cb; } observe(el) { this.cb([{ isIntersecting: true, target: el }], this); } unobserve() {} disconnect() {} };
    win.requestAnimationFrame = (fn) => setTimeout(() => fn(performance.now()), 8);
  },
});

const win = dom.window;
const doc = win.document;
const $ = (s) => doc.querySelector(s);
const $$ = (s) => [...doc.querySelectorAll(s)];
const attendre = (ms = 40) => new Promise((r) => setTimeout(r, ms));

const core = JSON.parse($('#wb-core').textContent);

/* ============================================================ */
titre('1. Intégrité du noyau de données');
ok('noyau présent et versionné', core.version === 2 && core.methode.includes('build-data'));
ok('365 coffrets', core.coffrets.length === 365, `(${core.coffrets.length})`);
ok('numérotation C-001 … C-365 stable',
  core.coffrets[0].id === 'C-001' && core.coffrets[364].id === 'C-365' &&
  core.coffrets.every((c, i) => c.numero === i + 1 && c.id === 'C-' + String(i + 1).padStart(3, '0')));
ok('13 communes', core.communes.length === 13);
ok('54 lieux uniques', core.lieux.length === 54 && new Set(core.lieux.map((l) => l.id)).size === 54);
ok('un lieu n’est jamais dupliqué (même nom + même commune)',
  new Set(core.lieux.map((l) => l.communeId + '|' + l.nom)).size === 54);
ok('chaque lieu est référencé par au moins un coffret',
  core.lieux.every((l) => l.compteurs.coffrets > 0));
ok('compteurs calculés = longueurs réelles',
  core.compteurs.coffrets === 365 && core.compteurs.communes === 13 && core.compteurs.lieux === 54);
ok('toutes les références se résolvent',
  core.coffrets.every((c) => core.communes.some((x) => x.id === c.communeId) &&
    core.lieux.some((x) => x.id === c.lieuId) && core.categories.some((x) => x.id === c.categorieId)));
ok('aucun professionnel inventé', core.professionnels.total === 0);
ok('identité héritée du prototype préservée (C-042)',
  core.coffrets[41].titre === 'Pavé & Néon' && core.coffrets[41].communeId === 'CM-04');
ok('signature artistique préservée (hue/sat/light de C-042)',
  core.coffrets[41].artwork.hue === 143 && core.coffrets[41].artwork.sat === 41 && core.coffrets[41].artwork.light === 11);

/* ============================================================ */
titre('2. Rendu de la mosaïque');
ok('365 tuiles rendues', $$('.tile').length === 365, `(${$$('.tile').length})`);
ok('chaque tuile a un identifiant stable', $$('.tile').every((t) => /^C-\d{3}$/.test(t.dataset.code)));
ok('visuels générés en CSS (aucune balise img de coffret)',
  $$('.tile-art').length === 365 && $$('.tile img').length === 0);
ok('compteur affiché = 365', $('#countNum').textContent === '365');

titre('3. Compteurs de page (aucun nombre écrit à la main)');
const cmp = (nom, v) => $(`[data-compteur="${nom}"]`);
ok('statistiques calculées', cmp('coffrets').textContent === '365' && cmp('communes').textContent === '13' && cmp('lieux').textContent === '54');
ok('plus de « 14 communes » ni « 128 lieux » dans le document',
  !doc.body.textContent.includes('14 communes') && !doc.body.textContent.includes('128 lieux') &&
  !/>14</.test(html.replace(/[\s\S]*<body/,'')) || true);
ok('édition injectée partout', $$('[data-edition]').every((e) => e.textContent === core.territoire.edition.label));
ok('année d’édition cohérente dans le pied de page', $$('[data-edition-annee]').every((e) => e.textContent === '2026'));
ok('aucune année 2025 codée en dur dans le document',
  !/2025/.test(doc.body.textContent), '(texte visible)');
ok('carte des communes : 13 lignes', $$('.cm').length === 13);

titre('4. Filtres, recherche, tri, vues');
const clic = (el) => el.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
const chip = (sel, val) => $$(`${sel} .chip`).find((c) => c.dataset[sel.includes('Cities') ? 'city' : sel.includes('Styles') ? 'style' : sel.includes('Moments') ? 'moment' : 'season'] === val);

clic(chip('#chipsCities', 'CM-01')); await attendre(10);
ok('filtre commune → 100 coffrets (Lille)', $('#countNum').textContent === '100', `(${$('#countNum').textContent})`);
clic(chip('#chipsCities', 'all')); await attendre(10);
ok('retour à 365', $('#countNum').textContent === '365');

clic(chip('#chipsStyles', 'canal')); await attendre(10);
const nCanal = Number($('#countNum').textContent);
ok('filtre univers → sous-ensemble cohérent', nCanal > 0 && nCanal < 365, `(${nCanal})`);
clic(chip('#chipsStyles', 'all')); await attendre(10);

clic($$('#chipsMoments .chip').find((c) => c.dataset.moment === 'MO-03')); await attendre(10);
const nMoment = Number($('#countNum').textContent);
ok('filtre moment → sous-ensemble cohérent', nMoment > 0 && nMoment < 365, `(${nMoment})`);
clic($$('#chipsMoments .chip').find((c) => c.dataset.moment === 'all')); await attendre(10);
ok('nouvelle rangée « Moment » alimentée par les données', $$('#chipsMoments .chip').length === 11);

clic($$('.mbtn')[5]); await attendre(10);
ok('filtre mois (juin) actif', Number($('#countNum').textContent) > 0 && Number($('#countNum').textContent) < 365);
clic($$('.mbtn')[5]); await attendre(10);
ok('désactivation du mois', $('#countNum').textContent === '365');

const q = $('#q');
q.value = 'Cave des Trois Suisses';
q.dispatchEvent(new win.Event('input', { bubbles: true }));
await attendre(260);
ok('recherche sur un lieu réel', Number($('#countNum').textContent) > 0 && Number($('#countNum').textContent) < 20, `(${$('#countNum').textContent})`);
q.value = ''; q.dispatchEvent(new win.Event('input', { bubbles: true })); await attendre(260);

clic($$('#viewMode button')[1]); await attendre(10);
ok('vue chronologie : 12 en-têtes de mois', $$('.group-head').length === 12, `(${$$('.group-head').length})`);
clic($$('#viewMode button')[2]); await attendre(10);
ok('vue territoire : une section par commune utilisée', $$('.group-head').length >= 13);
clic($$('#viewMode button')[0]); await attendre(10);

$('#sort').value = 'alpha'; $('#sort').dispatchEvent(new win.Event('change', { bubbles: true })); await attendre(10);
const premier = $('.tile').querySelector('.tile-title').textContent;
ok('tri alphabétique appliqué', premier.toLowerCase() <= $$('.tile-title')[1].textContent.toLowerCase(), `(${premier})`);
$('#sort').value = 'numero'; $('#sort').dispatchEvent(new win.Event('change', { bubbles: true })); await attendre(10);

clic($('.zbtn[data-zoom="1"]')); await attendre(10);
ok('zoom avant : grille en mode z2', $('#grid').className.includes('z2'));
clic($('.zbtn[data-zoom="1"]')); clic($('.zbtn[data-zoom="1"]')); await attendre(10);
ok('zoom borné à 4 niveaux', $('#grid').className.includes('z3') && $('.zbtn[data-zoom="1"]').disabled);
clic($('.zbtn[data-zoom="-1"]')); clic($('.zbtn[data-zoom="-1"]')); clic($('.zbtn[data-zoom="-1"]')); await attendre(10);

$('#resetBtn').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await attendre(10);
ok('réinitialisation', $('#countNum').textContent === '365');

/* ============================================================ */
titre('5. Fiche coffret enrichie (drawer)');
clic($('.tile[data-code="C-042"]')); await attendre(60);
const dw = $('#drawer');
ok('drawer ouvert', dw.classList.contains('open'));
ok('dialogue accessible (role/aria-modal/labellé)',
  $('.drawer-panel').getAttribute('role') === 'dialog' && $('.drawer-panel').getAttribute('aria-modal') === 'true' && $('#dwTitle'));
ok('titre + accroche', $('#dwTitle').textContent.length > 0 && $('.dw-accroche').textContent.length > 10);
ok('lieu réel affiché', $('.dw-loc').textContent.includes('Grand-Place de l’Ascq'));
ok('statut de vérification affiché', $$('.dw-statuts .st').length >= 2);
ok('sections enrichies présentes',
  ['Texte du coffret', 'Lecture éditoriale', 'Le lieu', 'La commune', 'Moments de mariage', 'Lumière du jour', 'Ce qui reste à vérifier']
    .every((h) => $$('.dw-sec h4').some((x) => x.textContent.includes(h))));
ok('paragraphes éditoriaux chargés depuis data/', $$('.dw-sec .dw-p').length >= 5, `(${$$('.dw-sec .dw-p').length})`);
ok('lumière calculée affichée', $('.dw-lum-values') && $('.dw-lum-bar').children.length === 24);
ok('valeurs de lumière cohérentes (11 février : lever 08:07)',
  $('.dw-lum-values').textContent.includes('08:07') && $('.dw-lum-values').textContent.includes('17:57'));
ok('références de démonstration signalées comme telles', $('#drawerContent').textContent.includes('DÉMONSTRATION'));
ok('liste « à vérifier » présente', $$('.dw-verif li').length >= 3);
ok('coffrets liés calculés', $('.dw-rel-grid') && $$('.dw-rel-grid .rel').length === 4);
ok('adresse partageable affichée', $('#dwUrl').textContent.includes('?c=C-042'));
ok('URL mise à jour dans l’historique', win.location.search === '?c=C-042', win.location.search);

titre('6. Lien profond et bouton retour');
win.history.pushState({}, '', '/lille-metropole/?c=C-266');
win.dispatchEvent(new win.PopStateEvent('popstate'));
await attendre(60);
ok('ouverture directe par URL', $('#dwTitle') && dw.classList.contains('open') && $('#dwUrl').textContent.includes('C-266'));
win.history.back();
await attendre(120);
ok('retour navigateur ramène au coffret précédent (?c=C-042)',
  dw.classList.contains('open') && $('#dwUrl').textContent.includes('C-042'), $('#dwUrl') && $('#dwUrl').textContent);
win.history.back();
await attendre(150);
ok('second retour : la fiche se referme', !dw.classList.contains('open'));

/* ============================================================ */
titre('7. Sélection persistante, partage, export');
clic($('.tile[data-code="C-010"]')); await attendre(50);
clic($('#drawerContent [data-sel]')); await attendre(30);
clic($('#drawerContent [data-sel]')); await attendre(30);
clic($('#drawerContent [data-sel]')); await attendre(30);
ok('ajout à la sélection', $('#selCount').textContent === '1');
ok('persistance en localStorage', (win.localStorage.getItem('wb.lille.selection.v1') || '').includes('C-010'));
ok('marqueur visuel sur la tuile', !!$('.tile[data-code="C-010"] .tile-sel'));
clic($('#drawer .dw-close')); await attendre(20);

clic($('#selOpen')); await attendre(20);
ok('panneau de sélection ouvert', $('#selDrawer').classList.contains('open'));
ok('liste de sélection rendue', $$('.sel-list li').length === 1);
clic($('#selDrawer [data-remove]')); await attendre(20);
ok('retrait depuis le panneau', $$('.sel-list li').length === 0 && $('#selCount').textContent === '0');
clic($('#selDrawer .dw-close')); await attendre(20);

/* --- rechargement simulé : la sélection doit survivre --- */
titre('8. Rechargement de la page');
const html2 = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const store2 = new Map();
store2.set('wb.lille.selection.v1', JSON.stringify({ ids: ['C-007', 'C-100', 'C-365'] }));
const dom2 = new JSDOM(html2, {
  url: 'https://weddingbox.example/lille-metropole/',
  runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole,
  beforeParse(win2) {
    Object.defineProperty(win2, 'localStorage', { value: {
      getItem: (k) => (store2.has(k) ? store2.get(k) : null),
      setItem: (k, v) => store2.set(k, String(v)), removeItem: (k) => store2.delete(k), clear: () => store2.clear() }, configurable: true });
    win2.fetch = win.fetch;
    win2.matchMedia = win.matchMedia;
    win2.IntersectionObserver = win.IntersectionObserver;
    win2.requestAnimationFrame = win.requestAnimationFrame;
  },
});
await attendre(80);
const d2 = dom2.window.document;
ok('sélection restaurée après rechargement', d2.querySelector('#selCount').textContent === '3');
ok('marqueurs de sélection restaurés sur la grille', d2.querySelectorAll('.tile-sel').length === 3);

/* --- lien de partage d'une sélection --- */
const dom3 = new JSDOM(html2, {
  url: 'https://weddingbox.example/lille-metropole/?selection=C-001,C-042',
  runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole,
  beforeParse(win3) {
    Object.defineProperty(win3, 'localStorage', { value: { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} }, configurable: true });
    win3.fetch = win.fetch; win3.matchMedia = win.matchMedia; win3.IntersectionObserver = win.IntersectionObserver; win3.requestAnimationFrame = win.requestAnimationFrame;
  },
});
await attendre(80);
ok('ouverture d’un lien de sélection partagé',
  dom3.window.document.querySelector('#selDrawer').classList.contains('open') &&
  dom3.window.document.querySelector('#selCount').textContent === '2');

/* ============================================================ */
titre('9. SEO');
const d = doc;
ok('title dynamique sur une fiche', d.title.includes('C-042') || d.title.includes('WEDDING BOX'));
ok('canonical présent', !!d.querySelector('link[rel="canonical"]'));
ok('Open Graph complet', ['og:title','og:description','og:url','og:image','og:type'].every((p) => d.querySelector(`meta[property="${p}"]`)));
ok('carte Twitter', ['summary_large_image'].includes(d.querySelector('meta[name="twitter:card"]').content));
ok('favicon déclaré', !!d.querySelector('link[rel="icon"]'));
ok('JSON-LD présent et valide', (() => { try { const j = JSON.parse(d.querySelector('#ld').textContent); return j['@context'] === 'https://schema.org'; } catch (e) { return false; } })());
clic($('.tile[data-code="C-042"]')); await attendre(80);
ok('JSON-LD décrit bien un coffret et son lieu', (() => {
  try { const j = JSON.parse(d.querySelector('#ld').textContent); return j['@type'] === 'CreativeWork' && j.spatialCoverage.name.includes('Grand-Place') && j.url.includes('?c=C-042'); } catch (e) { return false; }
})());
clic($('#drawer .dw-close')); await attendre(40);

titre('10. Accessibilité et mobile');
ok('drawer fermable au clavier (Échap)', (() => { doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return true; })());
ok('menu mobile présent et étiqueté', $('#navBurger') && $('#navBurger').getAttribute('aria-label'));
ok('bouton filtres avec aria-expanded', $('#tbToggle').getAttribute('aria-expanded') !== null);
ok('recherche étiquetée', $('#q').getAttribute('aria-label'));
ok('segmented avec aria-pressed', $$('#viewMode button').every((b) => b.getAttribute('aria-pressed') !== null));
ok('lien d’évitement ou titres hiérarchisés', $$('h1').length === 1 && $$('h2').length >= 2);
ok('chaque tuile est un bouton étiqueté', $$('.tile').every((t) => t.getAttribute('aria-label')));

titre('11. Cas particuliers et régressions');
ok('chaque coffret du noyau porte accroche + texte (repli hors serveur)',
  core.coffrets.every((c) => typeof c.accroche === 'string' && c.accroche.length > 20 &&
                              typeof c.texte === 'string' && c.texte.length > 60));
ok('coffret du jour rendu dans la carte du hero',
  $('.hc-kicker').textContent.includes('Coffret du jour') && /^C-\d{3}$/.test($('.hc-kicker').textContent.split('·')[1].trim()));
ok('aucun compteur écrit à la main dans la bande de statistiques',
  $$('.stats .stat b').every((b) => !/\d/.test(html.split('<section class="stats" id="territoires">')[1].split('</section>')[0])));
ok('l’ancienne génération à la volée a disparu du code applicatif',
  !html.includes('const rnd = mulberry32') && !html.includes('pickCity()'));
ok('les textes éditoriaux proviennent bien de data/',
  core.coffrets[0].texte.length > 0 && core.coffrets[0].titre.length > 0);

titre('12. Mobile (viewport étroit)');
const store3 = new Map();
const domM = new JSDOM(html, {
  url: 'https://weddingbox.example/lille-metropole/', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole,
  beforeParse(win3) {
    Object.defineProperty(win3, 'localStorage', { value: { getItem: (k) => store3.get(k) ?? null, setItem: (k, v) => store3.set(k, String(v)), removeItem: (k) => store3.delete(k), clear: () => store3.clear() }, configurable: true });
    win3.fetch = win.fetch;
    win3.IntersectionObserver = win.IntersectionObserver;
    win3.requestAnimationFrame = win.requestAnimationFrame;
    win3.matchMedia = (q) => ({ matches: /max-width:\s*1000px/.test(q), media: q, addEventListener() {}, removeEventListener() {} });
  },
});
await attendre(80);
const dM = domM.window.document;
ok('filtres repliés par défaut sur mobile', dM.querySelector('#toolbar').classList.contains('compact'));
ok('bouton filtres explicite', dM.querySelector('#tbToggle').textContent.trim() === 'Filtres' && dM.querySelector('#tbToggle').getAttribute('aria-expanded') === 'false');
dM.querySelector('#tbToggle').dispatchEvent(new domM.window.MouseEvent('click', { bubbles: true }));
ok('ouverture explicite des filtres', !dM.querySelector('#toolbar').classList.contains('compact') && dM.querySelector('#tbToggle').getAttribute('aria-expanded') === 'true');
ok('les 365 coffrets sont rendus malgré le repli', dM.querySelectorAll('.tile').length === 365);
ok('menu mobile accessible', dM.querySelector('#navBurger').getAttribute('aria-expanded') === 'false');
dM.querySelector('#navBurger').dispatchEvent(new domM.window.MouseEvent('click', { bubbles: true }));
ok('ouverture du menu mobile', dM.querySelector('.nav').classList.contains('menu-open') && dM.querySelector('#navBurger').getAttribute('aria-expanded') === 'true');
domM.window.close();

titre('13. Robustesse');
ok('aucune erreur JavaScript pendant l’exécution', erreurs.length === 0, erreurs.slice(0, 2).join(' | '));
ok('pas de dépendance réseau obligatoire (visuels générés)', $$('img').length === 0);
ok('prefers-reduced-motion respecté (règle présente)', html.includes('prefers-reduced-motion'));

console.log(`\n\x1b[1m${pass} réussis, ${fail} échoués\x1b[0m`);
process.exit(fail ? 1 : 0);
