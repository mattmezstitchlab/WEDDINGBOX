/**
 * outils/lib/solar.mjs — calcul solaire (algorithme NOAA simplifié)
 *
 * Sert à alimenter la promesse éditoriale du prototype : « la carte des lumières
 * heure par heure ». Ces valeurs sont CALCULÉES, jamais inventées : lever,
 * coucher, durée du jour, golden hour, heure bleue et courbe de lumière sur 24 h.
 *
 * Point de référence : centre de Lille (50,633 N / 3,067 E), utilisé comme
 * référence unique pour tout le territoire — ce n'est PAS la position exacte de
 * chaque lieu (à renseigner depuis une source officielle : IGN / INSEE).
 *
 * Précision : ~1 à 3 minutes selon la date. Suffisant pour un repère éditorial,
 * insuffisant pour un calcul astronomique. Le champ `methode` le dit explicitement.
 */

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/** Jour julien à 0 h UTC pour une date civile. */
function julianDay(y, m, d) {
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
}

/** Déclinaison solaire + équation du temps pour un jour julien. */
function solarTerms(jd) {
  const T = (jd - 2451545.0) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M * RAD)
          + (0.019993 - 0.000101 * T) * Math.sin(2 * M * RAD)
          + 0.000289 * Math.sin(3 * M * RAD);
  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(omega * RAD);
  const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(omega * RAD);
  const decl = Math.asin(Math.sin(eps * RAD) * Math.sin(lambda * RAD)) * DEG;
  const y = Math.tan((eps * RAD) / 2) ** 2;
  const eqTime = 4 * DEG * (
      y * Math.sin(2 * L0 * RAD)
    - 2 * e * Math.sin(M * RAD)
    + 4 * e * y * Math.sin(M * RAD) * Math.cos(2 * L0 * RAD)
    - 0.5 * y * y * Math.sin(4 * L0 * RAD)
    - 1.25 * e * e * Math.sin(2 * M * RAD)
  );
  return { decl, eqTime };
}

/**
 * Heure (en minutes locales depuis minuit) où le soleil atteint une dépression
 * donnée, ou null si le soleil ne l'atteint pas ce jour (nuit polaire / soleil de minuit).
 * @param {number} depression degrés sous l'horizon (0,833 = lever/coucher apparent)
 * @param {boolean} matin true = matin, false = soir
 */
function crossing(decl, eqTime, lat, lon, tzHours, depression, matin) {
  const cosH = (Math.cos((90 + depression) * RAD) - Math.sin(lat * RAD) * Math.sin(decl * RAD))
             / (Math.cos(lat * RAD) * Math.cos(decl * RAD));
  if (cosH > 1 || cosH < -1) return null;
  const H = Math.acos(cosH) * DEG;
  const noon = 720 - 4 * lon - eqTime + tzHours * 60;
  return noon + (matin ? -1 : 1) * 4 * H;
}

/** Décalage horaire français : +1 (CET) ou +2 (CEST, dernier dimanche de mars → dernier dimanche d'octobre). */
export function frenchUtcOffset(y, m, d) {
  const lastSunday = (year, month) => {
    const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const day = new Date(Date.UTC(year, month, last)).getUTCDay();
    return last - day;
  };
  if (m > 2 && m < 9) return 2;                            // avril → septembre
  if (m === 2) return d >= lastSunday(y, 2) ? 2 : 1;       // mars
  if (m === 9) return d < lastSunday(y, 9) ? 2 : 1;        // octobre
  return 1;
}

/** Hauteur du soleil (degrés) à une heure locale décimale. */
export function solarAltitude(hourDecimal, decl, eqTime, lat, lon, tzHours) {
  const noon = 720 - 4 * lon - eqTime + tzHours * 60;
  const H = (hourDecimal * 60 - noon) / 4;
  const sinAlt = Math.sin(lat * RAD) * Math.sin(decl * RAD)
               + Math.cos(lat * RAD) * Math.cos(decl * RAD) * Math.cos(H * RAD);
  return Math.asin(Math.max(-1, Math.min(1, sinAlt))) * DEG;
}

const hhmm = (minutes) => {
  if (minutes == null) return null;
  const total = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0');
};
const hLabel = (minutes) => (minutes == null ? null : hhmm(minutes).replace(':', ' h '));
const duration = (minutes) => {
  if (minutes == null) return null;
  const h = Math.floor(minutes / 60), m = Math.round(minutes % 60);
  return h + ' h ' + String(m).padStart(2, '0');
};

/**
 * Fiche lumière complète pour une date civile.
 * @param {{year:number, month:number, day:number}} date (month 1-12)
 */
export function lightSheet({ year, month, day }, lat = 50.6333, lon = 3.0667) {
  const m0 = month - 1;
  const tz = frenchUtcOffset(year, m0, day);
  const jd = julianDay(year, month, day) + 0.5;
  const { decl, eqTime } = solarTerms(jd);

  const sunrise = crossing(decl, eqTime, lat, lon, tz, 0.833, true);
  const sunset  = crossing(decl, eqTime, lat, lon, tz, 0.833, false);
  const golden  = sunset == null ? null : sunset - 60;                 // ≈ 1 h avant le coucher
  const civilEnd = crossing(decl, eqTime, lat, lon, tz, 6, false);     // fin du crépuscule civil
  const civilStart = crossing(decl, eqTime, lat, lon, tz, 6, true);

  const courbe = [];
  for (let h = 0; h < 24; h++) {
    const alt = solarAltitude(h, decl, eqTime, lat, lon, tz);
    courbe.push(Math.max(0, Math.round((alt / 62) * 100)));            // 62° ≈ hauteur maxi sous nos latitudes
  }

  return {
    date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    lever: hhmm(sunrise),
    coucher: hhmm(sunset),
    dureeJour: duration(sunset == null || sunrise == null ? null : sunset - sunrise),
    goldenHourDebut: hhmm(golden),
    heureBleueDebut: hhmm(civilEnd),
    heureBleueFin: hhmm(civilStart),
    midiSolaire: hhmm(720 - 4 * lon - eqTime + tz * 60),
    declinaison: Math.round(decl * 10) / 10,
    courbe,
    phrase: sunset == null ? null :
      `Le ${day === 1 ? '1er' : day} ${['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'][m0]}, ` +
      `le soleil se lève à ${hLabel(sunrise)} et se couche à ${hLabel(sunset)} : ` +
      `${duration(sunset - sunrise)} de jour, golden hour à partir de ${hLabel(golden)}.`,
    methode: 'calcul solaire NOAA simplifié',
    reference: 'point de référence Lille 50.633 N / 3.067 E',
    precision: '± 1 à 3 minutes',
    status: 'CALCULÉ',
  };
}
