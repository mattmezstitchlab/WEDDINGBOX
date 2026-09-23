/**
 * tools/lib/entity.mjs — vocabulaire commun du territoire
 *
 * Statuts de vérification (un seul vocabulaire pour tout le projet) :
 *   PROPOSÉ          — proposition éditoriale de WEDDING BOX. Aucune valeur factuelle.
 *   TROUVÉ           — information générale connue, sans source officielle rattachée.
 *   SOURCE OFFICIELLE— rattachée à une source officielle (voir sources[]).
 *   À VÉRIFIER       — à contrôler avant publication (statut par défaut du réel).
 *   VÉRIFIÉ          — contrôlé par nous (calculs internes, cohérence des données).
 *   CALCULÉ          — produit par un algorithme (ex. lumière), reproductible.
 */
export const STATUS = {
  PROPOSE: 'PROPOSÉ',
  TROUVE: 'TROUVÉ',
  OFFICIEL: 'SOURCE OFFICIELLE',
  A_VERIFIER: 'À VÉRIFIER',
  VERIFIE: 'VÉRIFIÉ',
  CALCULE: 'CALCULÉ',
  SCHEMATIQUE: 'SCHÉMATIQUE',
};

export const STATUS_LABEL = {
  'PROPOSÉ': 'piste éditoriale — aucune valeur factuelle',
  'TROUVÉ': 'information générale, source officielle non rattachée',
  'SOURCE OFFICIELLE': 'appuyé par une source officielle',
  'À VÉRIFIER': 'à confirmer avant publication',
  'VÉRIFIÉ': 'contrôlé en interne',
  'CALCULÉ': 'calculé, reproductible',
  'SCHÉMATIQUE': 'dessin relatif — aucune mesure, aucune coordonnée',
};

export const slugify = (s) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’'"]/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const pad = (n, len = 3) => String(n).padStart(len, '0');
export const id = (prefix, n, len = 3) => `${prefix}-${pad(n, len)}`;

/** Source externe avec provenance complète (jamais de fait sans provenance). */
export function source({ label, sourceType, url = null, status = STATUS.A_VERIFIER, portee = null, retrievedAt = null }) {
  return {
    source: label,
    sourceType,
    sourceUrl: url,
    portee,
    retrievedAt,
    updatedAt: null,
    externalId: null,
    status,
  };
}

/** Compte les occurrences d'une clé dans une liste de records. */
export function countBy(rows, keyFn) {
  const out = {};
  for (const row of rows) {
    const keys = [].concat(keyFn(row));
    for (const k of keys) if (k != null) out[k] = (out[k] || 0) + 1;
  }
  return out;
}

/** Arrondi à n décimales, sans bruit flottant. */
export const round = (x, n = 0) => Math.round(x * 10 ** n) / 10 ** n;

/** Tri stable par clé (pour des sorties déterministes). */
export const byKey = (arr, keyFn) => [...arr].sort((a, b) => {
  const ka = keyFn(a), kb = keyFn(b);
  return ka < kb ? -1 : ka > kb ? 1 : 0;
});
