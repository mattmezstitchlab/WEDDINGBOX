#!/usr/bin/env node
/**
 * outils/build-data.mjs — chaîne de données de WEDDING BOX
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
      sources: [...E.TERRITORY.rattachement.sources],
      statut: STATUS.TROUVE,
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

  const moments = E.MOMENTS.map((m) => ({ ...m, statut: STATUS.PROPOSE }));
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
  const compteurs = {
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

  return { territoire, communes, lieux, coffrets, categories, typologies, moments, saisons, media, professionnels, relations };
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
      mentions: d.territoire.mentions, arborescence: d.territoire.arborescence,
      calendrier: d.territoire.calendrier, pointDeReference: d.territoire.pointDeReference,
    },
    statuts: STATUS_LABEL,
    categories: d.categories,
    typologies: d.typologies,
    moments: d.moments,
    saisons: d.saisons,
    communes: d.communes,
    lieux: d.lieux.map((l) => ({
      id: l.id, slug: l.slug, nom: l.nom, communeId: l.communeId,
      typologie: l.typologie, description: l.description, note: l.note,
      statut: l.statut, sources: l.sources, compteurs: l.compteurs,
    })),
    /* Le noyau porte le nécessaire pour afficher la collection sans requête :
       la suite éditoriale complète (sources, notes, « à vérifier ») reste dans data/. */
    coffrets: d.coffrets.map((c) => ({
      id: c.id, numero: c.numero, titre: c.titre, accroche: c.accroche, texte: c.texte,
      communeId: c.communeId, lieuId: c.lieuId, categorieId: c.categorieId, saisonId: c.saisonId,
      moments: c.moments, calendrier: c.calendrier, tags: c.tags,
      artwork: c.art, reperes: c.reperesDemo, statut: c.statut,
    })),
    lieuxIndex: d.relations.parLieu,
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
    write(path.join(TERRITORY_DIR, 'territoire.json'), d.territoire);
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
