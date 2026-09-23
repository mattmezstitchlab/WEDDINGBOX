# WEDDING BOX — Lille Métropole

Collection éditoriale de 365 coffrets de mariage ancrés dans 13 communes de la métropole lilloise.
Un seul fichier d'interface (`index.html`), une couche de données séparée (`data/`), aucun serveur requis pour la lecture.

**Territoire pilote :** Lille Métropole. L'architecture prévoit d'autres territoires, mais ils ne sont **pas** créés.

---

## Démarrer

```bash
# servir le dossier (les fiches détaillées sont chargées à la demande)
python3 -m http.server 8080
# → http://localhost:8080/
```

Ouvrir `index.html` directement fonctionne aussi : la collection et les fiches restent lisibles
(un message signale alors que les fiches détaillées ne peuvent pas être chargées).

## Chaîne de données

```bash
node tools/build-data.mjs --init   # (re)génère data/ depuis l'algorithme d'origine — une seule fois
node tools/build-data.mjs          # vérifie data/, puis réinjecte le noyau dans index.html
node tools/build-data.mjs --check  # vérifie sans écrire
node tests/app.test.mjs            # 90 tests : données, rendu, liens, sélection, SEO, a11y, mobile
```

`data/` est la **source de vérité**. `index.html` embarque un noyau généré (bloc balisé
`DONNÉES GÉNÉRÉES`) : ne jamais l'éditer à la main, il est réécrit à chaque exécution du build.

## Structure

```
index.html                          interface unique (identité visuelle, rendu, interactions)
assets/                             favicon, icône Apple, carte de partage Open Graph
data/
  schema/                           JSON Schema : coffret, lieu, commune
  territories/lille-metropole/
    territoire.json                 identité, édition, rattachement, compteurs, mentions
    communes.json                  13 entités
    lieux.json                     54 entités uniques (référencées, jamais dupliquées)
    coffrets/                      365 fichiers : C-001.json … C-365.json (fiche complète)
    coffrets.json                  365 coffrets en un fichier (import en masse)
    categories.json                6 univers éditoriaux
    typologies.json                12 typologies de lieux
    moments.json                   10 moments de mariage
    saisons.json                   4 saisons
    media.json                     médiathèque : actifs réels + gabarit des visuels générés
    professionnels.json            modèle prêt, annuaire volontairement vide
    relations.json                 index calculé : commune ⇄ lieu ⇄ coffret ⇄ univers ⇄ moment
tools/
  build-data.mjs                    génération, contrôle d'intégrité, injection du noyau
  lib/legacy-generator.js           recopie conforme de la génération d'origine (garantie d'identité)
  lib/editorial.mjs                 contenu humain : textes, typologies, notes, sources réelles
  lib/entity.mjs                    statuts, identifiants, provenance
  lib/solar.mjs                     calcul solaire (lever, coucher, golden hour, courbe 24 h)
tests/app.test.mjs                  suite de tests fonctionnels (jsdom)
docs/RAPPORT.md                     rapport d'enrichissement détaillé
```

## Règles du projet

1. **Rien n'est inventé.** Ni prix, ni horaires, ni disponibilité, ni prestataire, ni avis.
2. **Toute donnée externe porte sa provenance** (`source`, `sourceUrl`, `retrievedAt`, `status`).
3. **Un compteur affiché est toujours calculé** depuis les données, jamais saisi.
4. **Un lieu existe une fois**, il est référencé par les coffrets.
5. **Un coffret a une adresse stable** : `?c=C-042` (le fragment `#c-042` reste reconnu).
6. **Statuts explicites** : `PROPOSÉ`, `TROUVÉ`, `SOURCE OFFICIELLE`, `À VÉRIFIER`, `VÉRIFIÉ`, `CALCULÉ`.
7. **Les visuels de coffret sont générés** (aucune image) et ne sont jamais présentés comme des photographies.
8. **La direction artistique ne change pas** : Archivo variable (XL 900/62 %, M 800/72 %, S 750/68 %, accents italiques 500/100 %).

## Déploiement

Site statique : déposer le dossier tel quel. Le noyau embarqué (~365 Ko) tombe à ~38 Ko compressé
par un serveur web classique. Les fiches détaillées sont chargées coffret par coffret, à l'ouverture.
