/**
 * outils/lib/editorial.mjs — bibliothèque éditoriale du territoire
 *
 * CONTENU HUMAIN UNIQUEMENT ICI. Rien de factuel n'est affirmé sur un lieu :
 * les textes sont des PISTES ÉDITORIALES (statut PROPOSÉ) qui décrivent ce
 * qu'un décor permet d'imaginer, jamais ce qu'un lieu propose réellement.
 * Tout ce qui est réel (sources, notes de vérification) est déclaré plus bas.
 */
import { STATUS, source } from './entity.mjs';

/* ------------------------------------------------------------------ */
/* 1. TYPOLOGIES DE LIEUX                                              */
/* ------------------------------------------------------------------ */

export const TYPOLOGIES = {
  'eaux': {
    locution: 'au bord de l’eau',
    label: 'Bord d’eau',
    promesse: 'l’eau comme premier décor, et le son qu’elle ajoute à une cérémonie',
    matiere: 'reflets, passerelles, brume, péniches',
    aVerifier: ['accès au bord de l’eau', 'règles d’usage du domaine public ou fluvial', 'contraintes sonores en extérieur'],
  },
  'industriel': {
    locution: 'dans un patrimoine industriel',
    label: 'Patrimoine industriel',
    promesse: 'des volumes que la lumière traverse, une brique qui absorbe le son',
    matiere: 'brique, acier, verrières, béton brut',
    aVerifier: ['volumes réellement disponibles', 'chauffage et isolation', 'classement du bâti et contraintes de décor'],
  },
  'jardins': {
    locution: 'en parc et jardin',
    label: 'Parc & jardin',
    promesse: 'un décor qui change d’heure en heure, sans rien ajouter',
    matiere: 'feuillages, allées, pelouses, ombrages',
    aVerifier: ['autorisation d’occupation d’un parc public', 'saisonnalité des floraisons', 'plan B en cas de pluie'],
  },
  'patrimoine': {
    locution: 'dans le patrimoine bâti',
    label: 'Patrimoine bâti',
    promesse: 'une architecture qui fait la moitié du travail d’ambiance',
    matiere: 'pierre, brique, boiseries, parquets',
    aVerifier: ['conditions d’accueil du public', 'modalités de privatisation', 'mobilier autorisé ou non'],
  },
  'culture': {
    locution: 'en équipement culturel',
    label: 'Équipement culturel',
    promesse: 'un lieu déjà scénographié, où le décor est une exposition en soi',
    matiere: 'cloisons mobiles, cimaises, gradins, scène',
    aVerifier: ['programmation et dates réellement libres', 'régie technique et sonorisation', 'règles de privatisation en dehors des spectacles'],
  },
  'culte': {
    locution: 'dans un édifice de culte',
    label: 'Édifice religieux',
    promesse: 'une acoustique et une verticalité qui installent le silence',
    matiere: 'voûtes, vitraux, nef, pierre froide',
    aVerifier: ['conditions d’accueil d’une cérémonie ou d’un concert', 'contact avec la paroisse ou l’affectataire', 'personne référente sur place'],
  },
  'espace-public': {
    locution: 'dans l’espace public',
    label: 'Espace public',
    promesse: 'la ville comme plateau, avec ses passants comme figurants',
    matiere: 'pavés, façades, étals, enseignes',
    aVerifier: ['autorisation d’occupation temporaire', 'réglementation municipale', 'coordination avec les services techniques'],
  },
  'contemporain': {
    locution: 'en architecture contemporaine',
    label: 'Écriture contemporaine',
    promesse: 'des lignes nettes, du verre, et une ville qui sert de toile de fond',
    matiere: 'verre, acier, béton ciré, lignes longues',
    aVerifier: ['accès et circulation dans un bâtiment en activité', 'visibilité et signalétique', 'contraintes de sécurité'],
  },
  'passage': {
    locution: 'dans un lieu de passage',
    label: 'Lieu de passage',
    promesse: 'le mouvement comme décor — départs, retrouvailles, quai qui s’efface',
    matiere: 'verrières, quais, horloges, lumière zénithale',
    aVerifier: ['usage d’un lieu en exploitation', 'créneaux réellement disponibles', 'autorisations de tournage ou d’accueil'],
  },
  'sport': {
    locution: 'en équipement sportif',
    label: 'Équipement sportif',
    promesse: 'une géométrie forte et des gradins qui deviennent tribune',
    matiere: 'pistes, tribunes, carrelages, gradins',
    aVerifier: ['conditions d’accueil du public', 'réutilisation sportive du site', 'évacuation et sécurité'],
  },
  'ferme': {
    locution: 'dans un patrimoine rural',
    label: 'Patrimoine rural',
    promesse: 'une échelle humaine, du bois, et la campagne qui touche la ville',
    matiere: 'charpentes, torchis, meules, cours',
    aVerifier: ['site en activité ou non', 'accueil du public', 'état du bâti et sécurité'],
  },
  'convivial': {
    locution: 'dans une adresse conviviale',
    label: 'Lieu convivial',
    promesse: 'un décor déjà vécu, une adresse qui a sa clientèle',
    matiere: 'zinc, banquettes, comptoir, lumière chaude',
    aVerifier: ['activité commerciale en cours', 'conditions de privatisation', 'capacité réelle'],
  },
};

/**
 * Affectation explicite des 54 lieux (plus fiable qu’une heuristique).
 * Clé : « Commune|Lieu » — une entrée par lieu unique (commune + nom).
 */
export const TYPOLOGIE_BY_PLACE = {
  'Lille|Gare Saint-Sauveur': ['culture', 'ancienne gare de marchandises réhabilitée'],
  'Lille|Palais Rameau': ['patrimoine', 'ancienne halle horticole du XIXe siècle'],
  'Lille|Hospice Comtesse': ['patrimoine', 'ancien hospice, aujourd’hui musée'],
  'Lille|Vieux-Lille, rue de la Monnaie': ['espace-public', 'rue du Vieux-Lille'],
  'Lille|Euralille, tour Lilleurope': ['contemporain', 'quartier d’affaires et tour'],
  'Lille|Citadelle, bois de Boulogne': ['jardins', 'citadelle de Vauban et bois municipal'],
  'Lille|Gare Lille-Flandres': ['passage', 'gare ferroviaire en exploitation'],
  'Lille|Jardin des Plantes': ['jardins', 'jardin botanique municipal'],
  'Lille|Wazemmes, marché de nuit': ['espace-public', 'marché de quartier'],
  'Lille|Maison de l’Habitat': ['culture', 'centre de ressources sur l’habitat'],
  'Roubaix|La Condition Publique': ['industriel', 'ex-conditionnement textile devenu manufacture culturelle'],
  'Roubaix|Le Colisée': ['culture', 'salle de spectacle'],
  'Roubaix|Piscine Art déco': ['sport', 'piscine Art déco'],
  'Roubaix|Cave des Trois Suisses': ['patrimoine', 'cave'],
  'Roubaix|Parc de Barbieux': ['jardins', 'parc urbain du XIXe siècle'],
  'Roubaix|La Manufacture, ancienne filature': ['industriel', 'ancienne filature'],
  'Tourcoing|Le Fresnoy': ['culture', 'studio national des arts contemporains, ex-filature'],
  'Tourcoing|Hôtel de ville de Tourcoing': ['patrimoine', 'hôtel de ville'],
  'Tourcoing|Église Saint-Christophe': ['culte', 'église'],
  'Tourcoing|La Chaufferie, ex-filature': ['industriel', 'chaufferie d’ancienne filature'],
  'Tourcoing|Béguinage de Tourcoing': ['patrimoine', 'béguinage'],
  'Tourcoing|Parc du Lion d’Or': ['jardins', 'parc urbain'],
  'Villeneuve-d’Ascq|Château de Flers': ['patrimoine', 'château, aujourd’hui lieu d’exposition'],
  'Villeneuve-d’Ascq|LaM, parc de sculptures': ['culture', 'musée et parc de sculptures'],
  'Villeneuve-d’Ascq|Grand-Place de l’Ascq': ['espace-public', 'place de village'],
  'Villeneuve-d’Ascq|Triolo, cité-jardin': ['patrimoine', 'cité-jardin'],
  'Villeneuve-d’Ascq|Lac du Héron': ['eaux', 'lac et parc départemental'],
  'Marcq-en-Barœul|Hippodrome des Flandres': ['sport', 'hippodrome'],
  'Marcq-en-Barœul|Parc du Lion': ['jardins', 'parc urbain'],
  'Marcq-en-Barœul|Quai des Flandres': ['eaux', 'quai'],
  'Marcq-en-Barœul|Clos du Prieuré': ['ferme', 'clos, ancien domaine'],
  'Lambersart|Villa Saint-Charles': ['patrimoine', 'villa'],
  'Lambersart|Bords de Deûle': ['eaux', 'berges de la Deûle'],
  'Lambersart|Château de la Hallotière': ['patrimoine', 'château'],
  'Mons-en-Barœul|Fort de Mons': ['patrimoine', 'fort détaché'],
  'Mons-en-Barœul|Parc du Fort': ['jardins', 'parc autour du fort'],
  'Mons-en-Barœul|Cité du Nouveau Monde': ['patrimoine', 'cité de logements'],
  'Wasquehal|Le Triporteur': ['convivial', 'adresse conviviale'],
  'Wasquehal|Bois de la Houssière': ['jardins', 'bois'],
  'Wasquehal|Rives de la Marque': ['eaux', 'berges de la Marque'],
  'Croix|Villa Cavrois': ['patrimoine', 'villa moderniste de Robert Mallet-Stevens'],
  'Croix|Parc de la Villa Cavrois': ['jardins', 'parc de la villa'],
  'Croix|Église Saint-Martin': ['culte', 'église'],
  'Hem|Le Grand-Bar': ['convivial', 'adresse conviviale'],
  'Hem|Moulin de Hem': ['ferme', 'moulin'],
  'Hem|Ferme du Château': ['ferme', 'ferme'],
  'Loos|Fort de Loos': ['patrimoine', 'fort détaché'],
  'Loos|Bords de la Deûle': ['eaux', 'berges de la Deûle'],
  'Loos|Parc de Loos': ['jardins', 'parc urbain'],
  'Faches-Thumesnil|Château de Faches': ['patrimoine', 'château'],
  'Faches-Thumesnil|Parc des Hautes Rives': ['jardins', 'parc'],
  'Saint-André-lez-Lille|Bords de Deûle': ['eaux', 'berges de la Deûle'],
  'Saint-André-lez-Lille|Écluse de Saint-André': ['eaux', 'écluse'],
  'Saint-André-lez-Lille|Cité des Peupliers': ['patrimoine', 'cité de logements'],
};

/** Heuristique de secours pour tout lieu ajouté plus tard (jamais pour les 54). */
export function typologyFromName(nom) {
  const n = nom.toLowerCase();
  const rules = [
    [/canal|deûle|marque|rives|bords|quai|lac|péniche|écluse|eau/, 'eaux'],
    [/filature|manufacture|usine|chaufferie|condition|atelier|friche|halle/, 'industriel'],
    [/parc|jardin|bois|square|verger/, 'jardins'],
    [/château|villa|palais|hospice|béguinage|fort|cité|hôtel de ville|moulin|ferme|clos/, 'patrimoine'],
    [/musée|lam|fresnoy|colisée|théâtre|gare saint-sauveur|galerie/, 'culture'],
    [/église|cathédrale|chapelle|temple/, 'culte'],
    [/place|marché|rue|avenue|boulevard/, 'espace-public'],
    [/hippodrome|piscine|stade|gymnase|tribune/, 'sport'],
  ];
  for (const [re, code] of rules) if (re.test(n)) return [code, null];
  return ['culture', null]; // typologie neutre par défaut, à requalifier
}

/* ------------------------------------------------------------------ */
/* 2. NOTES DE VÉRIFICATION ET SOURCES RÉELLES                         */
/* ------------------------------------------------------------------ */

/**
 * Doutes à lever, écrits comme des doutes — jamais comme des faits.
 * Seules les entrées où un signal réel existe sont listées.
 */
export const PLACE_NOTES = {
  'Roubaix|Piscine Art déco': 'Désignation descriptive. Vraisemblablement le musée « La Piscine » (Roubaix) : à confirmer avant publication du coffret.',
  'Marcq-en-Barœul|Hippodrome des Flandres': 'Nom à confirmer : l’hippodrome de Marcq-en-Barœul est situé au Croisé-Laroche. Vérifier la dénomination retenue par le site.',
  'Roubaix|Cave des Trois Suisses': 'Désignation à préciser : nature exacte du lieu et orthographe à confirmer.',
  'Roubaix|La Manufacture, ancienne filature': 'Désignation descriptive : identifier la filature et le nom d’exploitation actuel.',
  'Lille|Maison de l’Habitat': 'Intitulé à vérifier (organisme, adresse, ouverture au public).',
  'Hem|Le Grand-Bar': 'Nature du lieu à confirmer (activité, capacité).',
  'Wasquehal|Le Triporteur': 'Nature du lieu à confirmer (activité, capacité).',
  'Lambersart|Château de la Hallotière': 'Existence, nom et accès à confirmer depuis une source officielle.',
  'Lambersart|Villa Saint-Charles': 'Existence, nom et accès à confirmer depuis une source officielle.',
  'Faches-Thumesnil|Château de Faches': 'Statut (public / privé) et dénomination à confirmer.',
  'Mons-en-Barœul|Cité du Nouveau Monde': 'Périmètre et intérêt patrimonial à confirmer.',
  'Saint-André-lez-Lille|Cité des Peupliers': 'Périmètre et intérêt patrimonial à confirmer.',
  'Villeneuve-d’Ascq|Triolo, cité-jardin': 'Nom exact du secteur à confirmer.',
};

/**
 * SOURCES RÉELLEMENT CONSULTÉES pour l’identité des lieux.
 * Chaque entrée a été relevée dans une recherche : on ne devine aucune URL.
 * Portée : l’identité du lieu — pas son usage mariage.
 */
export const PLACE_SOURCES = {
  'Roubaix|La Condition Publique': [
    source({ label: 'La Condition Publique (site officiel)', sourceType: 'site officiel',
      url: 'https://www.laconditionpublique.com', status: STATUS.OFFICIEL,
      portee: 'identité et activité du lieu', retrievedAt: '2026-09-23' }),
  ],
  'Tourcoing|Le Fresnoy': [
    source({ label: 'Le Fresnoy — Studio national des arts contemporains (site officiel)', sourceType: 'site officiel',
      url: 'https://www.lefresnoy.net/fr', status: STATUS.OFFICIEL,
      portee: 'identité et activité du lieu', retrievedAt: '2026-09-23' }),
  ],
  'Croix|Villa Cavrois': [
    source({ label: 'Villa Cavrois — Centre des monuments nationaux (site officiel)', sourceType: 'site officiel',
      url: 'https://www.villa-cavrois.fr/', status: STATUS.OFFICIEL,
      portee: 'identité du monument', retrievedAt: '2026-09-23' }),
  ],
  'Villeneuve-d’Ascq|LaM, parc de sculptures': [
    source({ label: 'LaM — Lille Métropole Musée d’art moderne (site officiel)', sourceType: 'site officiel',
      url: 'https://www.musee-lam.fr/fr', status: STATUS.OFFICIEL,
      portee: 'identité du musée', retrievedAt: '2026-09-23' }),
    source({ label: 'Répertoire des musées de France (Muséofile), ministère de la Culture — notice M0639', sourceType: 'base officielle',
      url: 'https://pop.culture.gouv.fr/notice/museo/M0639', status: STATUS.OFFICIEL,
      portee: 'dénomination officielle du musée', retrievedAt: '2026-09-23' }),
  ],
  'Lille|Gare Saint-Sauveur': [
    source({ label: 'Gare Saint-Sauveur — lille3000 (site officiel)', sourceType: 'site officiel',
      url: 'https://www.garesaintsauveur.lille3000.eu/', status: STATUS.OFFICIEL,
      portee: 'identité du lieu', retrievedAt: '2026-09-23' }),
  ],
  'Lille|Palais Rameau': [
    source({ label: 'Ville de Lille — Palais Rameau (site officiel)', sourceType: 'site officiel',
      url: 'https://www.lille.fr/Nos-equipements/Palais-Rameau', status: STATUS.OFFICIEL,
      portee: 'identité du monument', retrievedAt: '2026-09-23' }),
  ],
};

/* ------------------------------------------------------------------ */
/* 3. TERRITOIRE                                                       */
/* ------------------------------------------------------------------ */

export const TERRITORY = {
  id: 'lille-metropole',
  slug: 'lille-metropole',
  nom: 'Lille Métropole',
  nomComplet: 'WEDDING BOX — Lille Métropole',
  statut: 'territoire pilote',
  editeur: 'WEDDING BOX',
  rattachement: {
    epci: 'Métropole européenne de Lille (MEL)',
    departement: 'Nord (59)',
    region: 'Hauts-de-France',
    pays: 'FR',
    communesDansLaCollection: 13,
    note: 'La MEL regroupe 95 communes ; la collection en documente 13. Le reste du territoire est un gisement éditorial, pas un oubli.',
    sources: [
      source({ label: 'Métropole européenne de Lille (site officiel)', sourceType: 'site officiel',
        url: 'https://www.lillemetropole.fr', status: STATUS.OFFICIEL,
        portee: 'existence et périmètre de l’intercommunalité', retrievedAt: '2026-09-23' }),
    ],
  },
  pointDeReference: {
    label: 'Centre de Lille',
    lat: 50.6333,
    lon: 3.0667,
    status: STATUS.TROUVE,
    note: 'Point unique servant au calcul du lever, du coucher et de la courbe de lumière. Ce n’est pas la position exacte de chaque lieu : à remplacer par des coordonnées officielles (IGN / INSEE) lieu par lieu.',
  },
};

/* ------------------------------------------------------------------ */
/* 4. COMMUNES — identité et texte éditorial (faits notoires uniquement) */
/* ------------------------------------------------------------------ */

export const COMMUNE_COPY = {
  'Lille': {
    role: 'ville-centre',
    identite: 'Préfecture du Nord et ville-centre de la métropole.',
    description:
      'C’est la commune la plus documentée de la collection, et de loin : un tiers des coffrets environ y sont ancrés. ' +
      'Le Vieux-Lille, la Citadelle, les gares, Euralille : la ville propose des échelles très différentes dans un rayon de trois kilomètres. ' +
      'Un même mariage peut y passer de la brique ancienne au verre contemporain en une matinée.',
  },
  'Roubaix': {
    role: 'ville industrielle',
    identite: 'Ancienne capitale textile de la métropole.',
    description:
      'Roubaix est la deuxième source de la collection. Le patrimoine industriel y est partout : filatures, verrières, brique. ' +
      'C’est la commune où les décors « bruts » sont les plus cohérents, et celle où la question du chauffage d’un volume industriel se pose le plus tôt.',
  },
  'Tourcoing': {
    role: 'ville industrielle',
    identite: 'Ville textile, à la frontière belge.',
    description:
      'Tourcoing apporte à la collection trois familles de lieux : la filature réhabilitée, l’édifice public et le parc. ' +
      'Le Fresnoy, l’hôtel de ville, les béguinages et les anciennes chaufferies forment un trio de matières très différent de celui de Lille.',
  },
  'Villeneuve-d’Ascq': {
    role: 'ville nouvelle et universitaire',
    identite: 'Ville nouvelle des années 1970, campus et musée.',
    description:
      'Territoire le plus contrasté de la collection : un château ancien, un musée et son parc de sculptures, un lac, ' +
      'une cité-jardin, une place de village. Peu de lieux « spectaculaires », beaucoup d’air et de lumière rasante.',
  },
  'Marcq-en-Barœul': {
    role: 'commune résidentielle',
    identite: 'Commune du nord-est de la métropole.',
    description:
      'Quatre lieux très différents : l’hippodrome et ses tribunes, un parc, un quai, un clos. ' +
      'La collection y travaille surtout les grandes pelouses et les vues longues.',
  },
  'Lambersart': {
    role: 'commune de bord de Deûle',
    identite: 'Commune au nord-ouest, traversée par la Deûle.',
    description:
      'Trois lieux, dont deux sur l’eau. Lambersart est la commune où la collection pousse le plus loin la piste du « mariage au bord de l’eau » : ' +
      'berges, reflets, et une lumière qui change très vite en fin de journée.',
  },
  'Mons-en-Barœul': {
    role: 'commune de fortification',
    identite: 'Commune limitrophe de Lille, marquée par son fort.',
    description:
      'Le fort et son parc donnent à la collection une géométrie qu’aucun autre lieu ne propose : talus, fossés, murs épais. ' +
      'Un décor qui absorbe le son et cadre les photos.',
  },
  'Wasquehal': {
    role: 'commune de bord de Marque',
    identite: 'Commune de l’est métropolitain, sur la Marque.',
    description:
      'Bois, berges et une adresse conviviale : trois échelles, dont deux sur l’eau. ' +
      'C’est la commune la plus « campagne » de la collection, à dix minutes de Lille.',
  },
  'Croix': {
    role: 'commune au patrimoine remarquable',
    identite: 'Commune de la Villa Cavrois (Robert Mallet-Stevens).',
    description:
      'Croix est la commune où la collection touche à l’architecture moderniste : lignes nettes, blanc, symétrie. ' +
      'Un contrepoint total aux décors de brique, et un point d’équilibre pour les mariages qui cherchent le graphisme.',
  },
  'Hem': {
    role: 'commune à faible couverture',
    identite: 'Commune de l’est de la métropole.',
    description:
      'Cinq coffrets seulement : c’est l’une des couvertures les plus faibles de la collection, avec Faches-Thumesnil. ' +
      'Trois lieux existent pourtant (un moulin, une ferme, une adresse conviviale) : un travail de repérage reste à faire pour équilibrer la mosaïque.',
  },
  'Loos': {
    role: 'commune de fortification et de Deûle',
    identite: 'Commune du sud-ouest, fort détaché et berges.',
    description:
      'Un fort, des berges, un parc : Loos ressemble à une version calme de Mons-en-Barœul. ' +
      'La collection y travaille les lignes d’eau et les murs anciens, souvent dans le même coffret.',
  },
  'Faches-Thumesnil': {
    role: 'commune à faible couverture',
    identite: 'Commune du sud de la métropole.',
    description:
      'Quatre coffrets : la couverture la plus faible de la collection, un signal à traiter plutôt qu’à masquer. ' +
      'Deux lieux seulement sont identifiés (un château, un parc), dont l’un reste à documenter sérieusement.',
  },
  'Saint-André-lez-Lille': {
    role: 'commune de bord de Deûle',
    identite: 'Commune au nord de Lille, sur la Deûle.',
    description:
      'Une écluse, des berges, une cité : trois lieux qui parlent d’eau et de logement ouvrier. ' +
      'La collection y est encore mince (dix coffrets) au regard de ce que le canal promet.',
  },
};

/* ------------------------------------------------------------------ */
/* 5. UNITÉS DE LA COLLECTION                                          */
/* ------------------------------------------------------------------ */

export const CATEGORIES = [
  { code: 'brique',  nom: 'Brique & Fumée',
    ligne: 'Murs de brique rouge, fumée douce, lumière rasante de fin d’après-midi.',
    hue: 16, sat: 62, tags: ['Industriel', 'Brique', 'Loft', 'Fumée', 'Atelier'] },
  { code: 'canal',   nom: 'Canal',
    ligne: 'Reflets d’eau, passerelles d’acier, brume du matin sur la Deûle.',
    hue: 192, sat: 55, tags: ['Bord d’eau', 'Brume', 'Acier', 'Péniche', 'Reflets'] },
  { code: 'neon',    nom: 'Néon Urbain',
    ligne: 'Néons, béton brut, pluie fine sur l’asphalte et dancefloor jusqu’au dernier tram.',
    hue: 308, sat: 70, tags: ['Néon', 'Nuit', 'Béton', 'Dancefloor', 'Pluie'] },
  { code: 'vegetal', nom: 'Végétal Brut',
    ligne: 'Serres, houblon, fougères et lin brut froissé.',
    hue: 132, sat: 45, tags: ['Serre', 'Houblon', 'Lin', 'Fougère', 'Jardin'] },
  { code: 'beton',   nom: 'Béton Contemporain',
    ligne: 'Lignes nettes, béton ciré, blanc absolu et ombres graphiques.',
    hue: 222, sat: 14, tags: ['Minimal', 'Graphique', 'Blanc', 'Architecture', 'Lignes'] },
  { code: 'or',      nom: 'Or & Velours',
    ligne: 'Velours profond, laiton poli, bougies et or patiné.',
    hue: 44, sat: 70, tags: ['Velours', 'Laiton', 'Bougies', 'Baroque', 'Or patiné'] },
];

/** Affinités : quels moments un univers met naturellement en avant. */
export const MOMENT_AFFINITY = {
  brique:  ['MO-05', 'MO-07', 'MO-09'],
  canal:   ['MO-04', 'MO-09', 'MO-03'],
  neon:    ['MO-07', 'MO-06', 'MO-05'],
  vegetal: ['MO-03', 'MO-08', 'MO-04'],
  beton:   ['MO-03', 'MO-09', 'MO-01'],
  or:      ['MO-05', 'MO-06', 'MO-02'],
};

export const MOMENTS = [
  { id: 'MO-01', article: 'les', nom: 'Préparatifs', court: 'Préparatifs',
    besoin: 'De la place, de la lumière stable et personne dans le cadre.',
    texte: 'Les préparatifs demandent surtout un lieu qui ne bouge pas : même lumière, même fond, deux heures durant. Un décor sobre tient mieux qu’un décor spectaculaire.' },
  { id: 'MO-02', article: 'la', nom: 'Cérémonie civile', court: 'Mairie',
    besoin: 'Un créneau court, une adresse claire, des photos de sortie.',
    texte: 'La cérémonie civile est un moment de ville : l’escalier, la façade et la sortie comptent autant que la salle. C’est le seul moment où le décor municipal est imposé.' },
  { id: 'MO-03', article: 'la', nom: 'Cérémonie laïque ou religieuse', court: 'Cérémonie',
    besoin: 'Un axe, du silence, un fond qui ne concurrence pas.',
    texte: 'Une cérémonie se joue sur un axe et sur le silence. Plus le décor est fort (nef, verrière, mur plein), plus le reste doit être retiré.' },
  { id: 'MO-04', article: 'le', nom: 'Cocktail', court: 'Cocktail',
    besoin: 'De la circulation, des zones debout, un extérieur si possible.',
    texte: 'Le cocktail est le moment le plus dépendant de la météo et de la lumière : c’est là qu’un extérieur, même modeste, change tout.' },
  { id: 'MO-05', article: 'le', nom: 'Dîner', court: 'Dîner',
    besoin: 'Des tables, de l’acoustique, de la hauteur sous plafond.',
    texte: 'Le dîner est le moment le plus technique : acoustique, service, cheminement des assiettes. Un volume industriel absorbe mieux le bruit qu’un beau parquet.' },
  { id: 'MO-06', article: 'les', nom: 'Discours & interventions', court: 'Discours',
    besoin: 'Un point focal, un micro, une lumière qui isole.',
    texte: 'Les discours tiennent à trois choses : un endroit où se mettre, une lumière qui isole et une acoustique qui pardonne.' },
  { id: 'MO-07', article: 'la', nom: 'Soirée & dancefloor', court: 'Soirée',
    besoin: 'De la puissance électrique, des murs épais, un voisinage conciliant.',
    texte: 'La soirée est le moment qui négocie le plus avec le lieu : puissance, horaires, voisinage. À traiter très en amont.' },
  { id: 'MO-08', article: 'le', nom: 'Brunch du lendemain', court: 'Brunch',
    besoin: 'Un extérieur, une lumière douce, un service simple.',
    texte: 'Le brunch profite de ce que personne ne remarque : la lumière de fin de matinée et un extérieur qui n’a pas été rangé pour la soirée.' },
  { id: 'MO-09', article: 'la', nom: 'Séance photo & vidéo', court: 'Séance photo',
    besoin: 'De l’heure dorée, des matières, de la profondeur.',
    texte: 'La séance photo est le seul moment qui se planifie à la minute : la fenêtre de lumière est courte et ne se rattrape pas.' },
  { id: 'MO-10', article: 'le', nom: 'Repérage & essais', court: 'Repérage',
    besoin: 'Du temps, un accès libre, une seconde visite à la bonne heure.',
    texte: 'Le repérage se fait deux fois : une fois le matin pour les volumes, une fois à l’heure de la cérémonie pour la lumière.' },
];

export const SAISONS = [
  { id: 'SA-01', code: 'Hiver',     mois: [11, 0, 1], color: '#5B7CFF',
    note: 'Lumière basse, jour court, décors intérieurs valorisés.' },
  { id: 'SA-02', code: 'Printemps', mois: [2, 3, 4],  color: '#5FD08A',
    note: 'Jour qui s’allonge vite : la lumière d’une même heure change d’un mois à l’autre.' },
  { id: 'SA-03', code: 'Été',       mois: [5, 6, 7],  color: '#FFC24B',
    note: 'Journée très longue : la soirée commence avant la nuit.' },
  { id: 'SA-04', code: 'Automne',   mois: [8, 9, 10], color: '#E4572E',
    note: 'Brumes, couleurs, lumière dorée en milieu d’après-midi.' },
];

/* ------------------------------------------------------------------ */
/* 6. GABARITS ÉDITORIAUX                                              */
/* ------------------------------------------------------------------ */

const pickN = (arr, i) => arr[((i % arr.length) + arr.length) % arr.length];

/** Accroche courte (une phrase) — utilisée dans la fiche du coffret. */
export function chapeau(c, p, cat, typo) {
  const formes = [
    `${p.lieuNom}, ${c.nom} : une piste pour un mariage ${typo.locution}.`,
    `Ce que ${p.lieuNom} permet d’imaginer, à ${c.nom}.`,
    `${c.nom} — ${p.lieuNom} : ${typo.promesse}.`,
    `Un coffret ancré à ${p.lieuNom}, ${c.nom}, dans l’univers « ${cat.nom} ».`,
  ];
  return pickN(formes, c.coffret.numero + p.index);
}

/** §1 — Le lieu : ce que le décor permet d’imaginer (jamais ce qu’il propose). */
export function paragrapheLieu(c, p, typo) {
  const bases = {
    'eaux': [
      `L’eau fait deux choses qu’aucun décor ne sait imiter : elle bouge et elle renvoie la lumière. À ${p.lieuNom}, l’intérêt n’est pas le plan large mais le bord : une rive, un garde-corps, un reflet qui tient une photo.`,
      `Un bord d’eau cadre naturellement les groupes : la berge donne une ligne, le reflet donne la profondeur. Reste à savoir à quelle heure le vent tombe — c’est là que l’eau devient un miroir.`,
    ],
    'industriel': [
      `Un volume industriel offre quelque chose de rare : de la hauteur sans décoration. À ${p.lieuNom}, la brique et la charpente font le travail d’ambiance, et la lumière doit venir de haut pour tenir.`,
      `La matière dominante ici, c’est le minéral chaud. Ce type de décor pardonne peu l’improvisation : il faut mesurer la lumière (${typo.matiere}) avant de choisir une heure de cérémonie.`,
    ],
    'jardins': [
      `Un parc change de nature plusieurs fois dans la même journée. À ${p.lieuNom}, le même banc peut être un fond très sombre le matin et un contre-jour liquide à 19 h.`,
      `Le végétal demande une chose : de la patience de repérage. Ce qui rend le décor intéressant, c’est la limite — l’allée, la lisière, le muret — pas le centre du parc.`,
    ],
    'patrimoine': [
      `Le patrimoine bâti installe une ambiance avant le premier invité. À ${p.lieuNom}, la pierre et le bois donnent le ton, et l’enjeu devient de ne pas ajouter de décor par-dessus.`,
      `Ce genre d’architecture fixe déjà la palette (${typo.matiere}). La piste éditoriale est inverse de l’habitude : retirer plutôt qu’ajouter, et laisser les volumes tenir la mise en scène.`,
    ],
    'culture': [
      `Un équipement culturel arrive avec une scénographie. À ${p.lieuNom}, la question n’est pas « quoi ajouter » mais « quoi garder » : cimaises, cloisons, gradins sont des décors utilisables.`,
      `Ce type de lieu a ses propres règles (technique, programmation, sécurité). Ce n’est pas un frein : c’est ce qui garantit une acoustique et une lumière maîtrisées.`,
    ],
    'culte': [
      `Un édifice de culte propose ce que la plupart des salles n’ont pas : de la verticalité et du silence. À ${p.lieuNom}, le volume absorbe le bruit et cadre la lumière par les vitraux.`,
      `La nef est un axe. Tout ce qui est disposé dans cet axe devient lisible — c’est un avantage pour une cérémonie, une contrainte pour un cocktail.`,
    ],
    'espace-public': [
      `L’espace public est un décor gratuit et encombré. À ${p.lieuNom}, la piste éditoriale consiste à travailler par créneaux : une heure, un angle, un flux qui se calme.`,
      `Ce qui fait la force d’un lieu public, c’est la vie qui continue autour. Ce qui fait sa difficulté, c’est qu’elle ne s’interrompt pas.`,
    ],
    'contemporain': [
      `L’écriture contemporaine donne des lignes longues et des reflets. À ${p.lieuNom}, le décor est graphique : peu de matières, beaucoup d’arêtes.`,
      `Le verre et l’acier vieillissent visuellement très vite dans une photo de fin de journée. La lumière rasante est ici le meilleur allié.`,
    ],
    'passage': [
      `Un lieu de passage impose son rythme. À ${p.lieuNom}, le décor est mouvant : quais, verrières, horloges, départs. C’est un fond très fort pour une série de portraits.`,
      `Ce type de lieu n’appartient à personne : il faut donc négocier des créneaux et accepter les passants dans le cadre. Beaucoup de photographes y voient un avantage.`,
    ],
    'sport': [
      `Un équipement sportif, c’est de la géométrie : pistes, gradins, lignes. À ${p.lieuNom}, le décor fait le travail graphique à la place de la décoration.`,
      `Les gradins sont une tribune au sens propre. C’est un décor très efficace pour un dîner en contrebas, et une acoustique à tester avant de promettre quoi que ce soit.`,
    ],
    'ferme': [
      `Le patrimoine rural apporte une échelle humaine : des volumes bas, du bois, une cour. À ${p.lieuNom}, le décor est déjà « habité » par la matière.`,
      `Ce type de lieu tient moins bien la nuit que la journée : ce qui le rend beau, c’est le jour qui passe à travers la charpente.`,
    ],
    'convivial': [
      `Une adresse conviviale apporte un décor qui a déjà une histoire : un comptoir, une lumière chaude, une clientèle. C’est le contraire d’un lieu neutre.`,
      `L’enjeu ici est la privatisation et l’horaire : un lieu vivant se prête au repas tardif, rarement à la cérémonie de 15 h.`,
    ],
  };
  return pickN(bases[typo.code] || bases['culture'], p.index + c.coffret.numero);
}

const minuscule = (s) => s.charAt(0).toLowerCase() + s.slice(1);

/** §2 — Le moment : ce que le moment demande, et comment ce décor peut y répondre. */
export function paragrapheMoment(c, p, moments) {
  const [principal, secondaire] = moments;
  const parties = [`${principal.texte} Ce qu’il faut prévoir : ${minuscule(principal.besoin)}`];
  if (secondaire) {
    parties.push(`Le coffret retient aussi ${secondaire.article} ${secondaire.court.toLowerCase()} : ${minuscule(secondaire.besoin)}`);
  }
  return parties.join(' ');
}

/** §3 — La lumière : uniquement des valeurs calculées, jamais estimées. */
export function paragrapheLumiere(c, lumiere) {
  if (!lumiere || !lumiere.phrase) return null;
  const duree = lumiere.dureeJour;
  const longJour = duree && parseFloat(duree) >= 14;
  const jourCourt = duree && parseFloat(duree) <= 9;
  const consequence = longJour
    ? 'Journée longue : le cocktail peut commencer avant le coucher du soleil et il restera de la lumière pour la séance photo.'
    : jourCourt
      ? 'Journée courte : tout ce qui doit être photographié dehors doit l’être avant la golden hour, sinon il fera nuit.'
      : 'Journée moyenne : la golden hour arrive tôt dans la soirée, c’est la fenêtre à réserver pour les photos.';
  return `${lumiere.phrase} ${consequence}`;
}

/** §4 — Ce qui reste à vérifier (questions, jamais affirmations). */
export function aVerifier(p, typo) {
  return [
    ...typo.aVerifier,
    'coordonnées et accès à confirmer',
    'conditions tarifaires non renseignées (aucune estimation dans ce coffret)',
  ];
}

/** Réserve affichée une seule fois sous le texte (jamais répétée dans les données). */
export const RESERVE_EDITORIALE = [
  'Rien de tout cela n’est acquis : c’est une piste éditoriale, pas une information sur le lieu.',
  'À lire comme une hypothèse de travail : la fiche « à vérifier » liste ce qui reste à confirmer avec le lieu.',
  'Piste éditoriale du coffret : elle ne préjuge ni de l’accueil du public, ni des conditions réelles d’organisation.',
];

export const LUMIERE_METHOD = {
  methode: 'calcul solaire NOAA simplifié',
  reference: 'point de référence Lille 50,633 N / 3,067 E',
  precision: '± 1 à 3 minutes',
  status: STATUS.CALCULE,
  note: 'Aucune valeur inventée : ces heures sont recalculables par tout un chacun à partir de data/ et de tools/lib/solar.mjs.',
};
