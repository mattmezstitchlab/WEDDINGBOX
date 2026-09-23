#!/usr/bin/env node
/**
 * tools/build-data.mjs — chaîne de données de WEDDING BOX
 *
 *   node tools/build-data.mjs --init      crée data/** à partir du générateur
 *                                         d'origine (une seule fois : fige les
 *                                         365 coffrets, identifiants stables)
 *   node tools/build-data.mjs             lit data/**, vérifie, puis réinjecte
 *                                         le noyau dans index.html
 *   node tools/build-data.mjs --check      vérifie sans écrire
 *
 * Règle d'identité : les champs hérités du prototype (titre, commune, lieu,
 * univers, teinte/saturation/lumière, tags, repères de démonstration, texte)
 * proviennent à l'octet près de l'algorithme d'origine — voir
 * tools/lib/legacy-generator.js. L'enrichissement utilise un flux pseudo-aléatoire
 * SÉPARÉ (SEED_ENRICH) : ajouter un champ ne déplace donc jamais un coffret.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

import { generateLegacyItems } from './lib/legacy-generator.js';
import { lightSheet } from './lib/solar.mjs';
import { STATUS, STATUS_LABEL, slugify, id as makeId, source, countBy } from './lib/entity.mjs';
import * as E from './lib/editorial.mjs';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT, 'data');
const TERRITORY_DIR = path.join(DATA_DIR, 'territories', 'lille-metropole');
const INDEX = path.join(ROOT, 'index.html');

export const SEED_ENRICH = 20250414;
const EDITION = { id: 'E-2026', year: 2026, label: 'Édition 2026', decalageJours: 0 };
const BUILD_DATE = '2026-09-23';

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(SEED_ENRICH);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

const flag = (name) => process.argv.includes(name);
const write = (file, data, compact = false) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, compact ? 0 : 1) + '\n', 'utf8');
  const ko = (fs.statSync(file).size / 1024).toFixed(1);
  console.log(`  ${path.relative(ROOT, file).padEnd(58)} ${String(ko).padStart(7)} Ko`);
};
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

/** Date civile d'un coffret : calendrier éditorial de 365 jours (1er janvier → 31 décembre). */
const MOIS_LABEL = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const MOIS_COURT = ['Janv','Févr','Mars','Avr','Mai','Juin','Juil','Août','Sept','Oct','Nov','Déc'];
function dateDuJourEdito(jour, year) {
  const ref = new Date(Date.UTC(2025, 0, jour)); // 2025 : année non bissextile = mapping de référence
  return { mois: ref.getUTCMonth(), jourDuMois: ref.getUTCDate(), year, moisLabel: MOIS_LABEL[ref.getUTCMonth()], moisCourt: MOIS_COURT[ref.getUTCMonth()] };
}

/* ================================================================== */
/* CONSTRUCTION                                                        */
/* ================================================================== */

function build() {
  const legacy = generateLegacyItems(mulberry32);

  /* ---- communes (13) ---- */
  const communes = legacy.CITIES.map((c, i) => {
    const copy = E.COMMUNE_COPY[c.name] || {};
    return {
      id: makeId('CM', i + 1, 2),
      slug: slugify(c.name),
      nom: c.name,
      niveauRang: 4,
      parentId: E.TERRITORY.id,
      codeInsee: E.COMMUNE_INSEE[c.name] || null,
      territoireId: E.TERRITORY.id,
      roleEditorial: copy.role || null,
      identite: copy.identite || null,
      description: copy.description || null,
      rattachement: {
        epci: E.TERRITORY.rattachement.epci,
        departement: E.TERRITORY.rattachement.departement,
        region: E.TERRITORY.rattachement.region,
        status: STATUS.TROUVE,
      },
      position: { lat: null, lon: null, status: STATUS.A_VERIFIER,
        note: 'coordonnées à renseigner depuis une source officielle (IGN / INSEE) — non inventées ici' },
      /* Place de la commune dans le plan schématique de la mosaïque : relative,
         jamais géographique (voir E.PLAN_SOURCE). */
      plan: (() => {
        const pl = E.COMMUNE_PLAN[c.name];
        if (!pl) return null;
        return { col: pl.col, row: pl.row, planColonnes: 24, statut: E.PLAN_SOURCE.statut,
                 place: pl.note, avertissement: E.PLAN_SOURCE.note };
      })(),
      sources: [
        E.INSEE_SOURCE,
        source({ label: 'INSEE — Code officiel géographique', sourceType: 'base officielle',
          url: 'https://www.insee.fr/fr/metadonnees/geographie/commune/' + (E.COMMUNE_INSEE[c.name] || '') + '-' + slugify(c.name),
          status: E.COMMUNE_INSEE[c.name] ? STATUS.OFFICIEL : STATUS.A_VERIFIER,
          portee: 'code officiel géographique de la commune', retrievedAt: '2026-09-23' }),
        ...E.TERRITORY.rattachement.sources,
      ],
      statut: E.COMMUNE_INSEE[c.name] ? STATUS.OFFICIEL : STATUS.TROUVE,
    };
  });
  const communeByName = new Map(communes.map((c) => [c.nom, c]));

  /* ---- lieux (54) : entités uniques, référencées par les coffrets ---- */
  const lieux = [];
  let lieuIndex = 0;
  for (const c of legacy.CITIES) {
    const commune = communeByName.get(c.name);
    for (const nom of c.venues) {
      lieuIndex += 1;
      const key = `${c.name}|${nom}`;
      const assignment = E.TYPOLOGIE_BY_PLACE[key] || E.typologyFromName(nom);
      const [code, sousType] = assignment;
      const typo = { code, ...E.TYPOLOGIES[code] };
      const sourcesLieu = E.PLACE_SOURCES[key] || [];
      const noteLieu = E.PLACE_NOTES[key] || null;
      lieux.push({
        id: makeId('L', lieuIndex),
        slug: `${slugify(nom)}-${slugify(c.name)}`,
        nom,
        niveauRang: 5,
        parentId: commune.id,
        communeId: commune.id,
        typologie: {
          code,
          label: typo.label,
          sousType,
          methode: E.TYPOLOGIE_BY_PLACE[key] ? 'affectation explicite' : 'heuristique sur le nom',
          status: STATUS.A_VERIFIER,
        },
        description: `${typo.label}${sousType ? ` (${sousType})` : ''} à ${c.name}. Piste éditoriale : ${typo.promesse}.`,
        note: noteLieu,
        sources: sourcesLieu,
        statut: sourcesLieu.length ? STATUS.OFFICIEL : STATUS.A_VERIFIER,
      });
    }
  }
  const lieuByKey = new Map(lieux.map((l) => [`${communes.find((c) => c.id === l.communeId).nom}|${l.nom}`, l]));

  /* ---- univers, moments, saisons ---- */
  const categories = E.CATEGORIES.map((cat, i) => ({
    id: makeId('CAT', i + 1, 2),
    code: cat.code,
    nom: cat.nom,
    ligne: cat.ligne,
    tags: cat.tags,
    palette: [0, 1, 2, 3].map((k) => ({ hsl: `hsl(${(cat.hue + [0, 0, 38, 0][k]) % 360} ${cat.sat}% ${[72, 56, 34, 10][k]}%)` })),
    art: { hue: cat.hue, sat: cat.sat },
    momentsAffinite: E.MOMENT_AFFINITY[cat.code],
    statut: STATUS.PROPOSE,
  }));
  const categorieByCode = new Map(categories.map((c) => [c.code, c]));

  const typologies = Object.entries(E.TYPOLOGIES).map(([code, t]) => ({
    code, label: t.label, promesse: t.promesse, matiere: t.matiere, aVerifier: t.aVerifier,
    statut: STATUS.PROPOSE,
  }));

  const moments = E.MOMENTS.map((m, i) => ({ ...m, niveauRang: 7, rang: i + 1, statut: STATUS.PROPOSE }));
  const momentById = new Map(moments.map((m) => [m.id, m]));
  const saisons = E.SAISONS.map((s) => ({ ...s, statut: STATUS.VERIFIE }));
  const saisonByCode = new Map(saisons.map((s) => [s.code, s]));

  /* ---- coffrets (365) ---- */
  const coffrets = legacy.ITEMS.map((it, i) => {
    const commune = communeByName.get(it.city);
    const lieu = lieuByKey.get(`${it.city}|${it.venue}`);
    const cat = categorieByCode.get(it.styleId);
    const saison = saisonByCode.get(it.season);
    const cal = dateDuJourEdito(it.id, EDITION.year);
    const lumiere = lightSheet({ year: cal.year, month: cal.mois + 1, day: cal.jourDuMois });
    const typo = { code: lieu.typologie.code, ...E.TYPOLOGIES[lieu.typologie.code] };

    // moments : affinité d'univers + un second moment, flux aléatoire séparé
    const affinite = E.MOMENT_AFFINITY[it.styleId];
    const premier = affinite[i % affinite.length];
    const pool = moments.map((m) => m.id).filter((mid) => mid !== premier);
    const second = pool[Math.floor(rnd() * pool.length)];
    const momentIds = [premier, second];

    const ctx = {
      coffret: { numero: it.id, code: it.code, titre: it.title },
      nom: it.city,
      coffrets: [],
    };
    const place = { lieuNom: lieu.nom, index: i };
    const momentObjs = momentIds.map((mid) => momentById.get(mid));

    const paragraphes = [
      { titre: 'Le lieu', texte: E.paragrapheLieu(ctx, place, typo) },
      { titre: 'Le moment', texte: E.paragrapheMoment(ctx, place, momentObjs) },
    ];
    const paraLumiere = E.paragrapheLumiere(ctx, lumiere);
    if (paraLumiere) paragraphes.push({ titre: 'La lumière', texte: paraLumiere });

    return {
      id: it.code,
      numero: it.id,
      niveauRang: 6,
      parentId: lieu.id,
      titre: it.title,
      communeId: commune.id,
      lieuId: lieu.id,
      categorieId: cat.id,
      saisonId: saison.id,
      moments: momentIds,
      calendrier: {
        jour: it.id, jourDuMois: cal.jourDuMois, mois: cal.mois, annee: cal.year,
        statut: STATUS.VERIFIE,
      },
      tags: it.tags,
      accroche: E.chapeau(ctx, place, cat, typo),
      texte: it.text,
      editorial: { paragraphes, statut: STATUS.PROPOSE },
      lumiere,
      pratique: { statut: STATUS.A_VERIFIER, aVerifierRef: 'typologie + standard du territoire' },
      reperesDemo: {
        budgetMontant: Number(it.budget.replace(/[^0-9]/g, '')),
        prestataires: it.presta,
        invites: it.guests,
        pages: it.pages,
        statut: STATUS.PROPOSE,
      },
      lieuxAssocies: [],
      coffretsLies: [],
      art: { hue: it.hue, sat: it.sat, light: it.light, motif: `p${it.id % 6}`,
        methode: 'génération déterministe (aucune image)', statut: STATUS.VERIFIE },
      mediaIds: [`M-${it.code}-01`],
      sources: [],
      statut: STATUS.PROPOSE,
    };
  });

  /* ---- relations : un lieu n'existe qu'une fois, il est référencé ---- */
  const coffretsParLieu = countBy(coffrets, (c) => c.lieuId);
  const coffretsParCommune = countBy(coffrets, (c) => c.communeId);
  const coffretsParCategorie = countBy(coffrets, (c) => c.categorieId);
  const coffretsParMoment = countBy(coffrets, (c) => c.moments);
  const coffretsParSaison = countBy(coffrets, (c) => c.saisonId);
  const coffretsParMois = countBy(coffrets, (c) => c.calendrier.mois);

  for (const l of lieux) {
    l.coffrets = coffrets.filter((c) => c.lieuId === l.id).map((c) => c.id);
    l.compteurs = { coffrets: l.coffrets.length };
  }
  for (const c of communes) {
    c.lieux = lieux.filter((l) => l.communeId === c.id).map((l) => l.id);
    c.compteurs = {
      coffrets: coffretsParCommune[c.id] || 0,
      lieux: c.lieux.length,
      part: Math.round(((coffretsParCommune[c.id] || 0) / coffrets.length) * 1000) / 10,
    };
  }

  // lieux associés : deux autres lieux de la même commune, choisis de façon stable
  const lieuxParCommune = new Map();
  for (const l of lieux) {
    if (!lieuxParCommune.has(l.communeId)) lieuxParCommune.set(l.communeId, []);
    lieuxParCommune.get(l.communeId).push(l.id);
  }
  for (const c of coffrets) {
    const pool = (lieuxParCommune.get(c.communeId) || []).filter((x) => x !== c.lieuId);
    const associes = [];
    for (let k = 0; k < Math.min(2, pool.length); k++) associes.push(pool[(c.numero + k) % pool.length]);
    c.lieuxAssocies = [...new Set(associes)];
  }

  // coffrets liés : score de proximité éditoriale (calculé, explicable)
  const score = (a, b) => {
    let s = 0;
    if (a.lieuId === b.lieuId) s += 4;
    if (a.communeId === b.communeId) s += 3;
    if (a.categorieId === b.categorieId) s += 2;
    s += a.moments.filter((m) => b.moments.includes(m)).length;
    if (a.saisonId === b.saisonId) s += 1;
    if (a.calendrier.mois === b.calendrier.mois) s += 1;
    return s;
  };
  for (const c of coffrets) {
    c.coffretsLies = coffrets
      .filter((x) => x.id !== c.id)
      .map((x) => ({ id: x.id, score: score(c, x) }))
      .sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1))
      .slice(0, 4)
      .map((x) => x.id);
  }

  /* ---- médias : 365 visuels génératifs + emplacements réels vides ---- */
  const media = {
    note: 'Les visuels de coffret sont GÉNÉRÉS (aucune image, aucun téléchargement) : ils ne sont donc pas listés un par un. Leur identifiant se dérive de la règle « gabarits.coffret-art » et des paramètres artistiques portés par le coffret.',
    modele: {
      mediaId: 'M-<coffret>-01', type: 'coffret-art | identite | lieu | portrait | plan',
      mediaType: 'visuel-génératif | image | video | audio', url: null,
      source: null, sourceUrl: null, sourceType: null,
      caption: null, alt: null, credit: null,
      lieuId: null, coffretId: null, droits: null,
      retrievedAt: null, updatedAt: null, externalId: null, statut: STATUS.A_VERIFIER,
    },
    gabarits: {
      'coffret-art': {
        idRegle: 'M-<identifiant de coffret>-01',
        type: 'coffret-art', mediaType: 'visuel-génératif', url: null,
        source: 'WEDDING BOX — génération déterministe', sourceUrl: null, sourceType: 'éditorial',
        caption: 'Motif génératif du coffret <id> — <titre>',
        alt: 'Composition graphique abstraite (visuel généré, non photographique) — coffret <id>',
        credit: 'WEDDING BOX', statut: STATUS.VERIFIE,
        note: 'Ne jamais présenter ce visuel comme une photographie du lieu : c’est un motif graphique.',
      },
    },
    assets: [
      { mediaId: 'M-SITE-01', type: 'identite', mediaType: 'image', url: 'assets/og-wedding-box.png',
        source: 'WEDDING BOX', sourceUrl: null, sourceType: 'production interne',
        caption: 'Carte de partage WEDDING BOX — Lille Métropole',
        alt: 'Composition graphique WEDDING BOX : titre de la collection sur fond sombre',
        credit: 'WEDDING BOX', droits: 'production interne', statut: STATUS.VERIFIE },
      { mediaId: 'M-SITE-02', type: 'identite', mediaType: 'image', url: 'assets/favicon.svg',
        source: 'WEDDING BOX', sourceUrl: null, sourceType: 'production interne',
        caption: 'Monogramme WB', alt: 'Monogramme WEDDING BOX', credit: 'WEDDING BOX',
        droits: 'production interne', statut: STATUS.VERIFIE },
    ],
    medias: [],
    aFaire: 'Chaque photo réelle (lieu, prestation) devra être ajoutée ici avec source, sourceUrl, crédit, droits et statut — jamais une image générique présentée comme une photo du lieu.',
  };

  /* ---- professionnels : modèle prêt, annuaire volontairement vide ---- */
  const professionnels = {
    note: "L'annuaire est PRÉPARÉ mais VOLONTAIREMENT VIDE : aucun professionnel n'a été inventé. Chaque fiche devra porter sa provenance et son statut de vérification.",
    categories: [
      { code: 'wedding-planner', label: 'Wedding planner' },
      { code: 'photographe', label: 'Photographe' },
      { code: 'videaste', label: 'Vidéaste' },
      { code: 'dj', label: 'DJ' },
      { code: 'musicien', label: 'Musicien / saxophoniste' },
      { code: 'traiteur', label: 'Traiteur' },
      { code: 'fleuriste', label: 'Fleuriste' },
      { code: 'decorateur', label: 'Décorateur' },
      { code: 'lieu', label: 'Lieu de réception' },
      { code: 'hebergement', label: 'Hébergement' },
      { code: 'autre', label: 'Autre' },
    ],
    modele: {
      id: 'PR-000', raisonSociale: null, categorieCode: null, communeIds: [], lieuIds: [], coffretIds: [],
      contact: { site: null, email: null, telephone: null, adresse: null },
      source: null, sourceType: null, sourceUrl: null, retrievedAt: null, updatedAt: null,
      externalId: null, statut: STATUS.A_VERIFIER,
    },
    professionnels: [],
  };

  /* ---- territoire + compteurs calculés ---- */
  const monde = { ...E.MONDE, enfant: { niveau: 'N-02', id: 'france', nom: E.FRANCE.nom } };
  /* le plan schématique dit ce qu'il est : un dessin relatif, jamais une géographie
     (le modèle n'affirme aucune latitude, aucune distance, aucune surface) */
  monde.plan = { statut: E.PLAN_SOURCE.statut, note: E.PLAN_SOURCE.note,
                 colonnes: 24, communes: E.COMMUNE_PLAN ? Object.keys(E.COMMUNE_PLAN).length : 0 };
  const france = {
    ...E.FRANCE,
    enfant: { niveau: 'N-03', id: E.TERRITORY.id, nom: E.TERRITORY.nom },
    communesDocumentees: communes.length,
    noteCommunes: `${communes.length} communes documentées sur les 95 que compte la métropole et les 124 de l'arrondissement de Lille.`,
  };

  /* ---- niveau 8 : lumière agrégée (entièrement calculée) ---- */
  /** "16 h 24" → 984 minutes. Indispensable : comparer ces durées comme des chaînes
      classerait « 9 h 58 » après « 16 h 24 ». */
  const dureeEnMinutes = (h) => (h ? Number(h.split(' h ')[0]) * 60 + Number(h.split(' h ')[1]) : 0);
  const parMois = Array.from({ length: 12 }, (_, m) => {
    const jours = coffrets.filter((c) => c.calendrier.mois === m);
    const moy = (f) => Math.round(jours.reduce((a, c) => a + f(c), 0) / (jours.length || 1));
    const minutes = (h) => (h ? Number(h.slice(0, 2)) * 60 + Number(h.slice(3)) : null);
    const duree = dureeEnMinutes;
    const plusLong = jours.reduce((a, c) => (duree(c.lumiere.dureeJour) > duree(a.lumiere.dureeJour) ? c : a), jours[0]);
    return {
      mois: m, moisLabel: MOIS_LABEL[m], saison: jours[0].saisonId,
      coffrets: jours.length,
      leverMoyen: (() => { const v = moy((c) => minutes(c.lumiere.lever)); return String(Math.floor(v / 60)).padStart(2, '0') + ':' + String(v % 60).padStart(2, '0'); })(),
      coucherMoyen: (() => { const v = moy((c) => minutes(c.lumiere.coucher)); return String(Math.floor(v / 60)).padStart(2, '0') + ':' + String(v % 60).padStart(2, '0'); })(),
      dureeMoyenne: (() => { const v = moy((c) => duree(c.lumiere.dureeJour)); return Math.floor(v / 60) + ' h ' + String(v % 60).padStart(2, '0'); })(),
      goldenMoyenne: (() => { const v = moy((c) => minutes(c.lumiere.goldenHourDebut)); return String(Math.floor(v / 60)).padStart(2, '0') + ':' + String(v % 60).padStart(2, '0'); })(),
      jourLePlusLong: { coffret: plusLong.id, duree: plusLong.lumiere.dureeJour, minutes: dureeEnMinutes(plusLong.lumiere.dureeJour) },
    };
  });
  const lumiere = {
    niveauRang: 8,
    parent: { niveau: 'N-07', id: 'moment', nom: 'MOMENT' },
    soit: coffrets.length,
    methode: E.LUMIERE_METHOD,
    reference: E.TERRITORY.pointDeReference,
    parMois,
    extremes: {
      jourLePlusLong: (() => {
        const c = coffrets.reduce((a, x) => (dureeEnMinutes(x.lumiere.dureeJour) > dureeEnMinutes(a.lumiere.dureeJour) ? x : a));
        return { coffret: c.id, date: c.lumiere.date, duree: c.lumiere.dureeJour, minutes: dureeEnMinutes(c.lumiere.dureeJour), lever: c.lumiere.lever, coucher: c.lumiere.coucher };
      })(),
      jourLePlusCourt: (() => {
        const c = coffrets.reduce((a, x) => (dureeEnMinutes(x.lumiere.dureeJour) < dureeEnMinutes(a.lumiere.dureeJour) ? x : a));
        return { coffret: c.id, date: c.lumiere.date, duree: c.lumiere.dureeJour, minutes: dureeEnMinutes(c.lumiere.dureeJour), lever: c.lumiere.lever, coucher: c.lumiere.coucher };
      })(),
    },
    statut: STATUS.CALCULE,
  };

  /* ---- niveau 10 : récits à toutes les échelles ---- */
  const recits = {
    niveauRang: 10,
    parent: { niveau: 'N-09', id: 'media', nom: 'MÉDIA' },
    note: "Le récit existe à chaque échelle. Il ne dit jamais autre chose que ce que les niveaux inférieurs autorisent : un récit de lieu ne peut pas promettre une privatisation, un récit de coffret ne peut pas inventer un tarif.",
    echelles: [
      { echelle: 'monde', cibleId: 'monde', soit: 1, source: 'data/monde.json#recit' },
      { echelle: 'france', cibleId: 'france', soit: 1, source: 'data/france.json#recit' },
      { echelle: 'territoire', cibleId: E.TERRITORY.id, soit: 1, source: 'territoire.json#recit (manifeste)' },
      { echelle: 'commune', source: 'communes.json#description', soit: communes.length },
      { echelle: 'lieu', source: 'lieux.json#description + #promesse', soit: lieux.length },
      { echelle: 'coffret', source: 'coffrets/C-xxx.json#accroche + #texte + #editorial.paragraphes', soit: coffrets.length },
    ],
    recits: [
      { id: 'R-monde', niveau: 'N-01', echelle: 'monde', cibleId: 'monde', rang: 1,
        titre: 'Le monde, à peine effleuré',
        chapeau: "WEDDING BOX ne prétend pas raconter le mariage dans le monde. Il en documente une pratique, sur un territoire à la fois.",
        corps: [
          "Le mariage est une institution attestée dans la quasi-totalité des sociétés humaines, sous des formes juridiques et rituelles très diverses. De ce constat, on pourrait tirer une encyclopédie : ce n'est pas le sujet de cette collection.",
          "Le niveau MONDE sert à autre chose : il borne le produit. Aujourd'hui, WEDDING BOX couvre la France et un seul territoire, Lille Métropole. Aucun autre pays n'est documenté, aucune comparaison internationale n'est produite. C'est une limite, et elle est affichée plutôt que masquée.",
        ],
        statut: STATUS.PROPOSE },
      { id: 'R-france', niveau: 'N-02', echelle: 'france', cibleId: 'france', rang: 2,
        titre: 'Ce que la loi française impose à un mariage — et pourquoi la collection parle par communes',
        chapeau: "En France, le mariage civil est communal. Ce n'est pas un détail administratif : c'est la première contrainte réelle, avant même le choix du décor.",
        corps: [
          "Le mariage civil se célèbre dans une commune où l'un des époux, ou l'un de leurs parents, a son domicile ou sa résidence, établie par au moins un mois d'habitation continue à la date de la publication des bans (Code civil, art. 74). Autrement dit : on ne choisit pas une commune au hasard, on en a une. C'est exactement pour cette raison que WEDDING BOX classe coffrets et lieux par commune, et non par « style de mariage ».",
          "L'annonce du mariage passe par la publication des bans, affichés à la porte de la mairie par l'officier d'état civil (art. 63). L'affichage dure dix jours consécutifs, et la célébration n'est possible qu'à partir du dixième jour ; la publication devient caduque si le mariage n'est pas célébré dans l'année (art. 64). Ces délais façonnent le calendrier : c'est la matière du niveau MOMENT.",
          "Conditions : être majeur, être libre de tout lien matrimonial, absence de lien de parenté ou d'alliance prohibé, consentement libre et éclairé ; les couples de même sexe peuvent se marier. Peuvent s'opposer à un mariage l'époux ou l'épouse actuelle, un ascendant, un tuteur ou curateur, et le procureur de la République (Service Public, fiche F930).",
        ],
        statut: STATUS.OFFICIEL,
        sources: E.FRANCE.cadreLegal.sources },
    ],
    statut: STATUS.PROPOSE,
  };

  /* ---- niveaux : cardinalités réelles + fichier + parent ---- */
  const cardinalite = {
    monde: 1, france: 1, territoire: 1, commune: communes.length, lieu: lieux.length,
    coffret: coffrets.length, moment: moments.length, lumiere: coffrets.length + 1,
    media: media.assets.length + coffrets.length,
    recit: recits.recits.length + 1 + communes.length + lieux.length + coffrets.length,
  };
  const niveaux = E.NIVEAUX.map((n) => ({
    id: 'N-' + String(n.rang).padStart(2, '0'),
    ...n,
    cardinalite: cardinalite[n.code],
    cardinaliteMethode: 'calculée sur les données',
    fichier: n.fichier.replace('<territoire>', E.TERRITORY.id),
    statut: n.rang <= 2 ? STATUS.OFFICIEL : STATUS.CALCULE,
  }));

  const compteurs = {
    niveaux: E.NIVEAUX.length,
    pays: 1,
    monde: 1,
    recits: cardinalite.recit,
    lumiere: coffrets.length + 1,
    coffrets: coffrets.length,
    communes: communes.length,
    lieux: lieux.length,
    lieuxPartages: lieux.filter((l) => l.coffrets.length > 1).length,
    categories: categories.length,
    moments: moments.length,
    saisons: saisons.length,
    mois: 12,
    medias: media.assets.length + coffrets.length,
    professionnels: professionnels.professionnels.length,
    sources: new Set([
      ...communes.flatMap((c) => c.sources),
      ...lieux.flatMap((l) => l.sources),
      ...coffrets.flatMap((c) => c.sources),
    ].map((s) => s.sourceUrl || s.source)).size,
    statut: STATUS.CALCULE,
    methode: 'comptage sur data/territories/lille-metropole — aucune valeur saisie à la main',
  };

  /* ---- hiérarchie : MONDE → FRANCE → TERRITOIRE → … → RÉCIT ---- */
  const mentions = {
    editorial: 'Texte éditorial de WEDDING BOX (statut PROPOSÉ). Il décrit ce que le décor permet d’imaginer — il n’affirme rien sur l’accueil du public, les tarifs, la capacité ou les disponibilités du lieu.',
    reperesDemo: 'Repères de DÉMONSTRATION hérités du prototype (invités, pages, prestataires, budget indicatif) : aucune source, aucune valeur contractuelle. À remplacer par des données de source ou à retirer avant mise en ligne.',
    verification: 'Coffrets de démonstration éditoriale : aucune donnée terrain n’a été vérifiée. Le statut PROPOSÉ est le statut par défaut de toute la collection.',
    lumiere: E.LUMIERE_METHOD,
    sourcesParDefaut: [source({ label: 'WEDDING BOX — génération éditoriale déterministe', sourceType: 'éditorial',
      status: STATUS.PROPOSE, portee: 'titre, univers, accroche, texte des coffrets' })],
    reserveEditoriale: E.RESERVE_EDITORIALE,
    genereLe: BUILD_DATE,
    aVerifierStandard: [
      'coordonnées et accès exacts à confirmer depuis une source officielle',
      'conditions d’accueil, capacité et privatisation : non renseignées',
      'conditions tarifaires : aucune estimation dans cette collection',
      'accessibilité et stationnement : à documenter',
    ],
  };

  const territoire = {
    ...E.TERRITORY,
    niveauRang: 3,
    parentId: 'france',
    recit: E.TERRITORY_RECIT,
    mentions,
    edition: { ...EDITION, statut: STATUS.PROPOSE,
      note: 'Année éditoriale unique, utilisée par le titre, le pied de page, les dates de coffret et les données structurées.' },
    calendrier: {
      jours: 365,
      statut: STATUS.VERIFIE,
      note: "La collection suit un calendrier éditorial de 365 jours (1er janvier → 31 décembre). Le 29 février n'est pas couvert.",
    },
    arborescence: {
      statut: 'préparée, non peuplée',
      note: 'WEDDING BOX > territoires. Lille Métropole est le territoire pilote ; les autres territoires ne sont pas créés volontairement.',
      territoires: [{ id: E.TERRITORY.id, nom: E.TERRITORY.nom, statut: 'pilote' }],
    },
    compteurs,
  };

  /* ---- index de relations ---- */
  const parCle = (rows, keyFn) => {
    const out = {};
    for (const row of rows) for (const k of [].concat(keyFn(row))) (out[k] = out[k] || []).push(row.id);
    return out;
  };
  const relations = {
    territoireId: E.TERRITORY.id,
    mondeId: 'monde',
    franceId: 'france',
    chaine: ['monde', 'france', E.TERRITORY.id, 'commune', 'lieu', 'coffret', 'moment', 'lumiere', 'media', 'recit'],
    genereLe: BUILD_DATE,
    note: 'Index calculé : chaque relation est dérivée des identifiants des coffrets. Aucune relation saisie à la main.',
    parCommune: Object.fromEntries(communes.map((c) => [c.id, { lieux: c.lieux, coffrets: coffrets.filter((x) => x.communeId === c.id).map((x) => x.id) }])),
    parLieu: Object.fromEntries(lieux.map((l) => [l.id, { communeId: l.communeId, coffrets: l.coffrets }])),
    parCategorie: parCle(coffrets, (c) => c.categorieId),
    parMoment: parCle(coffrets, (c) => c.moments),
    parSaison: parCle(coffrets, (c) => c.saisonId),
    parMois: coffretsParMois,
    compteurs: {
      lieuxParCommune: Object.fromEntries(communes.map((c) => [c.id, c.lieux.length])),
      coffretsParCommune,
      coffretsParCategorie,
      coffretsParMoment,
      coffretsParSaison,
      coffretsParMois,
      lieuxPartages: compteurs.lieuxPartages,
    },
    integrite: { refsNonResolues: 0, coffretsSansLieu: 0, lieuxSansCommune: 0, lieuxSansCoffret: 0 },
  };

  return { monde, france, niveaux, lumiere, recits, territoire, communes, lieux, coffrets,
           categories, typologies, moments, saisons, media, professionnels, relations };
}

/* ================================================================== */
/* VALIDATION INTERNE                                                  */
/* ================================================================== */

function verify(d) {
  const err = [];
  const ids = new Set();
  for (const c of d.coffrets) {
    if (ids.has(c.id)) err.push(`identifiant de coffret dupliqué : ${c.id}`);
    ids.add(c.id);
  }
  if (d.coffrets.length !== 365) err.push(`365 coffrets attendus, ${d.coffrets.length} trouvés`);
  if (d.coffrets[0].id !== 'C-001' || d.coffrets[364].id !== 'C-365') err.push('la numérotation C-001…C-365 n’est pas respectée');
  const lieuIds = new Set(d.lieux.map((l) => l.id));
  const communeIds = new Set(d.communes.map((c) => c.id));
  const catIds = new Set(d.categories.map((c) => c.id));
  const momentIds = new Set(d.moments.map((m) => m.id));
  const saisonIds = new Set(d.saisons.map((s) => s.id));
  for (const c of d.coffrets) {
    if (!lieuIds.has(c.lieuId)) err.push(`${c.id} : lieu ${c.lieuId} introuvable`);
    if (!communeIds.has(c.communeId)) err.push(`${c.id} : commune ${c.communeId} introuvable`);
    if (!catIds.has(c.categorieId)) err.push(`${c.id} : catégorie ${c.categorieId} introuvable`);
    if (!saisonIds.has(c.saisonId)) err.push(`${c.id} : saison ${c.saisonId} introuvable`);
    for (const m of c.moments) if (!momentIds.has(m)) err.push(`${c.id} : moment ${m} introuvable`);
    for (const l of c.coffretsLies) if (!ids.has(l)) err.push(`${c.id} : coffret lié ${l} introuvable`);
    for (const l of c.lieuxAssocies) if (!lieuIds.has(l)) err.push(`${c.id} : lieu associé ${l} introuvable`);
  }
  if (d.niveaux.length !== 10) err.push(`10 niveaux attendus, ${d.niveaux.length} trouvés`);
  for (const n of d.niveaux) {
    if (n.cardinalite == null) err.push(`niveau ${n.code} : cardinalité non calculée`);
    if (n.rang > 1 && !n.parent) err.push(`niveau ${n.code} : parent manquant`);
  }
  if (d.niveaux[0].code !== 'monde' || d.niveaux[9].code !== 'recit') err.push('la chaîne doit aller de MONDE à RÉCIT');
  /* plan schématique : chaque commune a une place unique, et aucune coordonnée n'est inventée */
  if (d.communes.some((c) => !c.plan)) err.push('plan : une commune sans position dans le plan schématique');
  const places = d.communes.map((c) => (c.plan ? c.plan.col + ':' + c.plan.row : null));
  if (new Set(places).size !== places.length) err.push('plan : deux communes au même endroit du plan');
  if (d.communes.some((c) => c.plan && (c.plan.col < 1 || c.plan.col > 24 || c.plan.row < 1))) err.push('plan : position hors de la grille du plan');
  if (d.communes.some((c) => c.position.lat !== null || c.position.lon !== null)) err.push('plan : aucune coordonnée ne doit être inventée');
  if (d.france.decoupage.region.codeInsee !== '32') err.push('découpage France : région inattendue');
  for (const c of d.communes) {
    if (!/^[0-9]{5}$/.test(String(c.codeInsee))) err.push(`${c.id} : code INSEE manquant ou invalide (${c.codeInsee})`);
    if (c.codeInsee.slice(0, 2) !== '59') err.push(`${c.nom} : code INSEE hors département 59 (${c.codeInsee})`);
  }
  if (d.lumiere.parMois.length !== 12) err.push('lumière : 12 mois attendus');
  const longMois = d.lumiere.extremes.jourLePlusLong.date.slice(5, 7);
  const courtMois = d.lumiere.extremes.jourLePlusCourt.date.slice(5, 7);
  if (!['06', '07'].includes(longMois)) err.push(`lumière : le jour le plus long devrait être en juin/juillet, trouvé ${longMois}`);
  if (!['12', '01'].includes(courtMois)) err.push(`lumière : le jour le plus court devrait être en décembre/janvier, trouvé ${courtMois}`);
  if (d.lumiere.extremes.jourLePlusLong.minutes <= d.lumiere.extremes.jourLePlusCourt.minutes) err.push('lumière : durées extrêmes incohérentes');
  for (const l of d.lieux) {
    if (!communeIds.has(l.communeId)) err.push(`${l.id} : commune ${l.communeId} introuvable`);
    if (!l.coffrets.length) err.push(`${l.id} : aucun coffret ne référence ce lieu`);
  }
  // un lieu ne doit pas être dupliqué (même nom dans la même commune)
  const clefs = new Set();
  for (const l of d.lieux) {
    const k = `${l.communeId}|${l.nom}`;
    if (clefs.has(k)) err.push(`lieu dupliqué : ${k}`);
    clefs.add(k);
  }
  d.relations.integrite = {
    refsNonResolues: err.length,
    coffretsSansLieu: d.coffrets.filter((c) => !lieuIds.has(c.lieuId)).length,
    lieuxSansCommune: d.lieux.filter((l) => !communeIds.has(l.communeId)).length,
    lieuxSansCoffret: d.lieux.filter((l) => !l.coffrets.length).length,
  };
  return err;
}

/* ================================================================== */
/* NOYAU INJECTÉ DANS index.html                                       */
/* ================================================================== */

function bundle(d) {
  return {
    version: 2,
    genereLe: BUILD_DATE,
    methode: 'node tools/build-data.mjs — noyau généré, ne pas éditer à la main',
    territoire: {
      id: d.territoire.id, nom: d.territoire.nom, nomComplet: d.territoire.nomComplet,
      editeur: d.territoire.editeur, edition: d.territoire.edition,
      rattachement: d.territoire.rattachement, compteurs: d.territoire.compteurs,
      recit: d.territoire.recit, niveauRang: 3, parentId: 'france',
      mentions: d.territoire.mentions, arborescence: d.territoire.arborescence,
      calendrier: d.territoire.calendrier, pointDeReference: d.territoire.pointDeReference,
    },
    statuts: STATUS_LABEL,
    niveaux: d.niveaux,
    monde: { nom: d.monde.nom, role: d.monde.role, description: d.monde.description,
             faits: d.monde.faits, nonCouvert: d.monde.nonCouvert, statut: d.monde.statut,
             pays: d.monde.pays, paysNonDocumentes: d.monde.paysNonDocumentes, note: d.monde.note,
             enfant: d.monde.enfant },
    france: { nom: d.france.nom, role: d.france.role, identite: d.france.identite,
              decoupage: d.france.decoupage, cadreLegal: d.france.cadreLegal,
              noteCommunes: d.france.noteCommunes, nonCouvert: d.france.nonCouvert, statut: d.france.statut },
    lumiere: { parMois: d.lumiere.parMois, extremes: d.lumiere.extremes, methode: d.lumiere.methode,
               reference: d.lumiere.reference, soit: d.lumiere.soit },
    recits: { note: d.recits.note, echelles: d.recits.echelles, recits: d.recits.recits },
    categories: d.categories,
    typologies: d.typologies,
    moments: d.moments,
    saisons: d.saisons,
    communes: d.communes.map((c) => ({ ...c, sources: c.sources.slice(0, 2) })),
    plan: { statut: E.PLAN_SOURCE.statut, note: E.PLAN_SOURCE.note, colonnes: 24 },
    lieux: d.lieux.map((l) => ({
      id: l.id, slug: l.slug, nom: l.nom, communeId: l.communeId,
      niveauRang: l.niveauRang, parentId: l.parentId,
      typologie: l.typologie, description: l.description, note: l.note,
      statut: l.statut, sources: l.sources, compteurs: l.compteurs,
    })),
    /* Le noyau porte le nécessaire pour afficher la collection sans requête :
       la suite éditoriale complète (sources, notes, « à vérifier ») reste dans data/. */
    coffrets: d.coffrets.map((c) => ({
      id: c.id, numero: c.numero, titre: c.titre, accroche: c.accroche, texte: c.texte,
      niveauRang: c.niveauRang, parentId: c.parentId, lieuxAssocies: c.lieuxAssocies,
      communeId: c.communeId, lieuId: c.lieuId, categorieId: c.categorieId, saisonId: c.saisonId,
      moments: c.moments, calendrier: c.calendrier, tags: c.tags,
      artwork: c.art, reperes: c.reperesDemo, statut: c.statut,
    })),
    lieuxIndex: d.relations.parLieu,
    relations: { chaine: d.relations.chaine, niveau: d.relations.niveau, methode: d.relations.methode },
    compteurs: d.territoire.compteurs,
    professionnels: { categories: d.professionnels.categories, total: 0, note: d.professionnels.note },
    media: { assets: d.media.assets, gabarits: d.media.gabarits, note: d.media.note, aFaire: d.media.aFaire },
  };
}

function inject(b) {
  const html = fs.readFileSync(INDEX, 'utf8');
  const START = '<!-- ===== DONNÉES GÉNÉRÉES — WEDDING BOX =====';
  const END = '<!-- ===== FIN DONNÉES GÉNÉRÉES ===== -->';
  const json = JSON.stringify(b).replace(/</g, '\\u003c');
  const block = `${START}\n     Source de vérité : data/territories/lille-metropole/*.json\n     Regénérer : node tools/build-data.mjs   —   ne pas éditer ce bloc à la main.\n-->\n<script type="application/json" id="wb-core">${json}</script>\n${END}`;
  const re = new RegExp(`${START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${END}`);
  if (!re.test(html)) throw new Error('repères de données introuvables dans index.html');
  fs.writeFileSync(INDEX, html.replace(re, block), 'utf8');
  console.log(`\n  noyau injecté dans index.html : ${(json.length / 1024).toFixed(1)} Ko`);
}

/* ================================================================== */
/* SCHEMAS + LISEZ-MOI DE DONNÉES                                      */
/* ================================================================== */

function schemas() {
  const prov = {
    source: { type: ['string', 'null'] }, sourceType: { type: ['string', 'null'] },
    sourceUrl: { type: ['string', 'null'] }, retrievedAt: { type: ['string', 'null'] },
    updatedAt: { type: ['string', 'null'] }, externalId: { type: ['string', 'null'] },
    portee: { type: ['string', 'null'] },
    status: { enum: Object.values(STATUS) },
  };
  const statusField = { status: { enum: Object.values(STATUS) } };
  return {
    'coffret.schema.json': {
      $schema: 'http://json-schema.org/draft-07/schema#',
      title: 'Coffret WEDDING BOX',
      type: 'object',
      required: ['id', 'numero', 'titre', 'communeId', 'lieuId', 'categorieId', 'saisonId', 'moments', 'calendrier', 'statut'],
      properties: {
        id: { type: 'string', pattern: '^C-[0-9]{3}$' },
        numero: { type: 'integer', minimum: 1, maximum: 365 },
        titre: { type: 'string' },
        communeId: { type: 'string', pattern: '^CM-[0-9]{2}$' },
        lieuId: { type: 'string', pattern: '^L-[0-9]{3}$' },
        categorieId: { type: 'string', pattern: '^CAT-[0-9]{2}$' },
        saisonId: { type: 'string', pattern: '^SA-[0-9]{2}$' },
        moments: { type: 'array', items: { type: 'string' }, minItems: 1 },
        calendrier: { type: 'object', required: ['jour', 'jourDuMois', 'mois'] },
        tags: { type: 'array', items: { type: 'string' } },
        accroche: { type: 'string' },
        texte: { type: 'string' },
        editorial: { type: 'object' },
        lumiere: { type: 'object' },
        pratique: { type: 'object' },
        reperesDemo: { type: 'object' },
        lieuxAssocies: { type: 'array', items: { type: 'string' } },
        coffretsLies: { type: 'array', items: { type: 'string' } },
        art: { type: 'object' },
        mediaIds: { type: 'array', items: { type: 'string' } },
        sources: { type: 'array', items: { type: 'object', properties: prov } },
        statut: statusField.status,
      },
    },
    'lieu.schema.json': {
      $schema: 'http://json-schema.org/draft-07/schema#',
      title: 'Lieu (entité unique, référencée par les coffrets)',
      type: 'object',
      required: ['id', 'nom', 'communeId', 'typologie', 'statut'],
      properties: {
        id: { type: 'string', pattern: '^L-[0-9]{3}$' },
        nom: { type: 'string' },
        slug: { type: 'string' },
        communeId: { type: 'string', pattern: '^CM-[0-9]{2}$' },
        typologie: { type: 'object' },
        description: { type: 'string' },
        note: { type: ['string', 'null'] },
        coffrets: { type: 'array', items: { type: 'string' } },
        sources: { type: 'array', items: { type: 'object', properties: prov } },
        statut: statusField.status,
        position: { type: 'object' },
      },
    },
    'commune.schema.json': {
      $schema: 'http://json-schema.org/draft-07/schema#',
      title: 'Commune',
      type: 'object',
      required: ['id', 'nom', 'territoireId', 'statut'],
      properties: {
        id: { type: 'string', pattern: '^CM-[0-9]{2}$' },
        nom: { type: 'string' },
        slug: { type: 'string' },
        territoireId: { type: 'string' },
        identite: { type: ['string', 'null'] },
        description: { type: ['string', 'null'] },
        lieux: { type: 'array', items: { type: 'string' } },
        compteurs: { type: 'object' },
        position: { type: 'object' },
        sources: { type: 'array', items: { type: 'object', properties: prov } },
        statut: statusField.status,
      },
    },
  };
}

/* ================================================================== */
/* MAIN                                                                */
/* ================================================================== */

function main() {
  const init = flag('--init');
  const check = flag('--check');
  const force = flag('--force');

  if (init) {
    if (fs.existsSync(path.join(TERRITORY_DIR, 'coffrets.json')) && !force) {
      console.error('data/ existe déjà. Les coffrets sont FIGÉS : utilisez --force pour les régénérer (cela réécrirait les identifiants).');
      process.exit(1);
    }
    console.log('Génération de data/ depuis le générateur d’origine…\n');
    const d = build();
    const err = verify(d);
    if (err.length) { console.error('Validation échouée :\n - ' + err.join('\n - ')); process.exit(1); }
    write(path.join(DATA_DIR, 'monde.json'), d.monde);
    write(path.join(DATA_DIR, 'france.json'), d.france);
    write(path.join(DATA_DIR, 'niveaux.json'), d.niveaux);
    write(path.join(TERRITORY_DIR, 'territoire.json'), d.territoire);
    write(path.join(TERRITORY_DIR, 'lumiere.json'), d.lumiere);
    write(path.join(TERRITORY_DIR, 'recits.json'), d.recits);
    write(path.join(TERRITORY_DIR, 'communes.json'), d.communes);
    write(path.join(TERRITORY_DIR, 'coffrets.json'), d.coffrets, true);
    write(path.join(TERRITORY_DIR, 'lieux.json'), d.lieux, true);
    write(path.join(TERRITORY_DIR, 'typologies.json'), d.typologies);
    write(path.join(TERRITORY_DIR, 'categories.json'), d.categories);
    write(path.join(TERRITORY_DIR, 'moments.json'), d.moments);
    write(path.join(TERRITORY_DIR, 'saisons.json'), d.saisons);
    write(path.join(TERRITORY_DIR, 'media.json'), d.media);
    write(path.join(TERRITORY_DIR, 'professionnels.json'), d.professionnels);
    write(path.join(TERRITORY_DIR, 'relations.json'), d.relations, true);
    for (const [name, schema] of Object.entries(schemas())) write(path.join(DATA_DIR, 'schema', name), schema);
    const dir = path.join(TERRITORY_DIR, 'coffrets');
    fs.rmSync(dir, { recursive: true, force: true });
    for (const c of d.coffrets) fs.writeFileSync(path.join(fs.mkdirSync(dir, { recursive: true }) || dir, `${c.id}.json`), JSON.stringify(c), 'utf8');
    console.log(`  data/territories/lille-metropole/coffrets/                     365 fichiers (chargement à l'unité)`);
    console.log('\nTerminé. data/ devient la source de vérité : index.html lit un noyau généré.');
    return;
  }

  // mode normal : lire data/, vérifier, injecter
  const d = {
    territoire: read(path.join(TERRITORY_DIR, 'territoire.json')),
    communes: read(path.join(TERRITORY_DIR, 'communes.json')),
    lieux: read(path.join(TERRITORY_DIR, 'lieux.json')),
    typologies: read(path.join(TERRITORY_DIR, 'typologies.json')),
    coffrets: read(path.join(TERRITORY_DIR, 'coffrets.json')),
    categories: read(path.join(TERRITORY_DIR, 'categories.json')),
    moments: read(path.join(TERRITORY_DIR, 'moments.json')),
    saisons: read(path.join(TERRITORY_DIR, 'saisons.json')),
    media: read(path.join(TERRITORY_DIR, 'media.json')),
    lumiere: read(path.join(TERRITORY_DIR, 'lumiere.json')),
    recits: read(path.join(TERRITORY_DIR, 'recits.json')),
    monde: read(path.join(DATA_DIR, 'monde.json')),
    france: read(path.join(DATA_DIR, 'france.json')),
    niveaux: read(path.join(DATA_DIR, 'niveaux.json')),
    professionnels: read(path.join(TERRITORY_DIR, 'professionnels.json')),
    relations: read(path.join(TERRITORY_DIR, 'relations.json')),
  };
  const err = verify(d);
  console.log(`\nContrôle des données : ${err.length ? err.length + ' anomalie(s)' : 'aucune anomalie'}`);
  err.forEach((e) => console.log('   ! ' + e));
  const c = d.territoire.compteurs;
  console.log(`   ${c.coffrets} coffrets · ${c.communes} communes · ${c.lieux} lieux · ${c.categories} univers · ${c.moments} moments · ${c.saisons} saisons · ${c.medias} médias · ${c.professionnels} professionnels`);
  if (err.length) process.exit(1);
  if (check) return;
  inject(bundle(d));
}

main();
