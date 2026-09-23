# WEDDING BOX — rapport d'enrichissement

Territoire pilote : **Lille Métropole** · Édition 2026 · Build du 2026-09-23

Principe appliqué : **maximum de richesse, minimum de suppression**. Aucune fonctionnalité de l'audit
n'a été retirée. Ce qui était démonstratif a été rendu réel ou explicitement signalé comme tel.

---

## 1. Ce qui a été conservé

| Élément | État |
|---|---|
| Direction artistique (fond sombre, brique, acidulé, grain, grille de fond) | inchangée |
| Typographie Archivo variable (XL 900/62 %, M 800/72 %, S 750/68 %, italiques 500/100 %) | inchangée |
| 365 coffrets numérotés, titres, univers, tags, texte éditorial | identiques à l'octet près |
| Signature visuelle déterministe (hue / sat / light de chaque coffret) | identique |
| Mosaïque, zoom 4 niveaux, 3 vues (mosaïque / chronologie / territoire) | conservés et enrichis |
| Recherche, filtres commune / univers / saison / mois, tris, réinitialisation | conservés |
| Drawer, navigation précédent / suivant, coffrets de la même commune | conservés et enrichis |
| Sélection, toast, parallaxe du hero, animations d'apparition | conservés |
| `prefers-reduced-motion`, responsive, zéro image obligatoire | conservés |
| Textes : manifeste, citation, marquee des communes, pied de page | conservés mot pour mot |

Vérifié par tests : 365 tuiles, 12 en-têtes de chronologie, 4 niveaux de zoom, 3 vues, 0 balise `<img>`.

## 2. Ce qui a été corrigé

| Incohérence | Correction | Preuve |
|---|---|---|
| « 14 communes » annoncées, 13 existantes | compteur calculé sur les données | bande de statistiques, carte des communes |
| « 128 lieux » annoncés, 54 existants | compteur calculé | idem |
| Année 2025 codée en dur (6 endroits) | année unique dans `territoire.json` → `edition.year` | aucun « 2025 » dans le texte rendu |
| Statistiques saisies à la main | **aucun nombre écrit à la main** : tout vient de `compteurs` | test automatique |
| Compteur « 365 / 365 coffrets » figé | dérivé du nombre réel de coffrets | pied de page |
| Favicon absent (404) | `assets/favicon.svg` + icône Apple + carte Open Graph | 3 fichiers servis en 200 |
| Newsletter qui simulait une inscription | mention explicite + stockage local, aucun faux envoi | texte sous le formulaire |
| Identités des coffrets déplacées dès qu'on touchait aux données | coffrets figés dans `data/`, identifiants stables | test C-001…C-365 |
| Prestataires / budget / invités présentés comme des faits | statut `PROPOSÉ`, signalés « références de démonstration » dans la fiche | fiche coffret |

## 3. Ce qui a été enrichi

### Couche de données (nouvelle)
- **13 communes** : rôle éditorial, identité, description, rattachement (MEL / Nord / Hauts-de-France), compteurs, lieux associés, sources.
- **54 lieux** : entités uniques — nom, commune, typologie (12 familles), description, note de doute éventuelle, sources, statut, liste des coffrets qui les référence.
- **365 coffrets** : accroche, texte, calendrier, univers, saison, **moments de mariage**, tags, paramètres artistiques, repères de démonstration, statut, relations.
- **6 univers**, **10 moments**, **4 saisons**, **12 typologies** : ressources partagées, jamais recopiées.
- **relations.json** : index calculé commune ⇄ lieu ⇄ coffret ⇄ univers ⇄ moment ⇄ saison ⇄ mois.
- **media.json** : médiathèque (actifs réels + gabarit `M-<coffret>-01` des visuels générés + modèle de provenance).
- **professionnels.json** : 11 catégories et le modèle complet — **annuaire volontairement vide**, aucun professionnel inventé.
- **JSON Schema** pour coffret, lieu, commune.

### Fiche coffret (drawer) — de 1 bloc à 12 sections (dont le fil d'Ariane des dix niveaux)
Numéro, titre, accroche, statuts · métadonnées (jour de collection, date éditoriale, saison, lieu, commune, univers) ·
texte du coffret · **lecture éditoriale** (lieu / moment / lumière) · le lieu (typologie, description, ce qui reste à vérifier) ·
la commune (identité, description, densité) · moments de mariage · **lumière du jour calculée** (lever, coucher, durée,
golden hour, heure bleue, déclinaison + courbe horaire sur 24 h) · références de démonstration · **ce qui reste à vérifier** ·
**sources avec provenance** · autres lieux de la commune · 4 coffrets liés (score explicable) · partage.

### Lumière : calculée, pas inventée
`tools/lib/solar.mjs` (NOAA simplifié) produit pour chaque date de la collection le lever, le coucher, la durée du jour,
la golden hour, l'heure bleue, la déclinaison, le midi solaire et une courbe de hauteur solaire sur 24 h.
Contrôlé contre les valeurs publiées pour Lille : **21/06 → 05:35 / 22:04** (attendu 05:38 / 22:04) ·
**21/12 → 08:47 / 16:45** (attendu 08:47 / 16:47). Écart ≤ 3 minutes, conforme à la précision annoncée.
Cela rend réel ce que le prototype promettait déjà : « la carte des lumières heure par heure ».

### Relations
Un lieu existe une seule fois et est référencé. Les coffrets liés sont calculés (lieu +4, commune +3, univers +2,
moment commun +1 par moment, saison +1, mois +1) : la règle est affichée dans l'interface, donc vérifiable.

## 4. Fonctionnalités nouvelles

| Fonctionnalité | Détail |
|---|---|
| **Un coffret = une adresse** | `?c=C-042` (fragment `#c-042` toujours reconnu) ; `pushState` + `popstate` + bouton retour |
| **Sélection persistante** | `localStorage`, restaurée au rechargement (testé), marqueurs sur la mosaïque |
| **Panneau « Ma sélection »** | liste, retrait, partage par lien `?selection=C-001,C-042`, export `.json`, vidage |
| **Partage natif** | `navigator.share` sinon presse-papiers, avec repli affiché |
| **Filtre « Moment »** | 10 moments de mariage, compteurs calculés |
| **Carte des 13 communes** | densité réelle, clic = filtre + défilement vers la mosaïque |
| **Titres et descriptions dynamiques** | `title`, `description`, `canonical`, Open Graph, Twitter card, **JSON-LD** (CreativeWork par coffret, CollectionPage pour la collection) |
| **Section « Ce que la collection sait vraiment »** | légende des 6 statuts + explication du modèle de données et de la médiathèque |
| **Menu mobile** | bouton accessible (`aria-expanded`), panneau dans la navigation |
| **Filtres mobiles** | repliés par défaut, ouverture/fermeture explicites (au lieu d'occuper un tiers de l'écran) |
| **Drawer accessible** | `role="dialog"`, `aria-modal`, focus entrant, piège de focus, retour du focus, Échap, flèches ← → |
| **Newsletter honnête** | annonce clairement qu'aucun envoi n'a lieu ; l'adresse reste locale |
| **Newsletter / dégradé gracieux** | hors serveur, un message explique que les fiches détaillées ne peuvent pas être chargées, sans rien casser |

## 5. SEO

- `title` et `description` recalculés à l'ouverture d'un coffret (code, titre, commune, lieu, univers, saison).
- `canonical` mis à jour ; URL canonique d'un coffret : `?c=C-042`.
- Open Graph complet (type, site_name, locale, titre, description, url, image 1200×630, texte alternatif) + `summary_large_image`.
- JSON-LD : `CreativeWork` (identifiant, lieu, couverture temporelle, mots-clés, appartenance à la collection, éditeur)
  et `CollectionPage` avec `ItemList` des 12 premiers coffrets.
- Favicon SVG, icône Apple 180×180, `theme-color`, `robots`.
- Aucun contenu SEO inventé : les descriptions sont construites à partir des champs réels du coffret.

## 6. Accessibilité

- Drawer et panneau de sélection en dialogues modaux labellisés ; piège et restitution du focus ; Échap ; navigation ← →.
- Navigation : `aria-expanded` sur le menu et les filtres, `aria-pressed` sur les vues et le filtre de sélection.
- Recherche étiquetée (`aria-label` + explication en texte invisible).
- Chaque tuile est un `<button>` avec `aria-label` complet (code, titre, commune, lieu).
- Focus visible partout (contour acidulé).
- **Contraste vérifié par calcul** : 10 couples de couleurs utilisés dans la feuille de style, tous ≥ 4,5:1
  (texte principal 16,7:1 ; texte secondaire 5,8:1 ; accent brique 5,4:1 ; badge calculé 17,3:1).
- `prefers-reduced-motion` conservé et étendu à la parallaxe.

## 7. Tests

`node tests/app.test.mjs` → **127 tests, 0 échec**, exécutés dans un vrai DOM (jsdom) sur le fichier `index.html` réel,
avec lecture des vrais fichiers `data/`.

Couverture : intégrité des données (identifiants stables, unicité, absence de référence cassée) · rendu de la mosaïque ·
compteurs · filtres/recherche/tri/vues/zoom · fiche enrichie (12 sections, dont la chaîne des dix niveaux, lumière, relations, sources) ·
liens profonds et bouton retour · sélection persistante (ajout, retrait, rechargement, lien partagé) ·
SEO (title, canonical, OG, Twitter, JSON-LD) · accessibilité · mobile (filtres repliés, menu, 365 tuiles) ·
absence d'erreur JavaScript · absence de dépendance réseau.
La chaîne des dix niveaux est testée niveau par niveau : ordre imposé, identifiants `N-01`…`N-10`, cardinalités
calculées (1 · 1 · 1 · 13 · 54 · 365 · 10 · 366 · 367 · 435), `parentId` de chaque entité, découpage administratif
et cinq règles légales, 13 codes INSEE, agrégat de lumière sur 12 mois et extrêmes cohérents avec les solstices,
fil d'Ariane à dix segments dans la fiche, filtres par lieu et par commune depuis l'interface.

Contrôles complémentaires : intégrité vérifiée par `build-data.mjs` (références, doublons de lieux, numérotation),
serveur local (page et 5 ressources en 200), contraste WCAG calculé.

## 8. Limites assumées

1. **Statut de la collection** : les 365 coffrets sont une **démonstration éditoriale** (`PROPOSÉ`). Aucune donnée terrain n'est vérifiée.
2. **Repères chiffrés** (budget indicatif, invités, prestataires, pages) : hérités du prototype, sans source.
   Signalés comme tels dans la fiche. À remplacer ou retirer avant mise en ligne.
3. **Poids du noyau** : 365 Ko embarqués (~38 Ko compressés par un serveur web). Acceptable ici ;
   à terme, charger `coffrets.json` depuis le réseau et vider le noyau.
4. **Pas de rendu côté serveur** : les crawlers ne voient que la page de collection, malgré le JSON-LD et le canonical.
   Le SEO par coffret réel demandera des URL dédiées (`/coffrets/C-042`) ou un pré-rendu.
5. **Coordonnées** : aucun lieu n'a de latitude/longitude. La lumière est calculée depuis un point unique (centre de Lille).
6. **Typologies de lieux** : affectation éditoriale explicite, statut `À VÉRIFIER` (elle dit ce qu'un décor permet d'imaginer,
   pas ce que le lieu propose).
7. **Couverture inégale** : Lille 100 coffrets, Faches-Thumesnil 4. C'est un constat du jeu de données, affiché et assumé.
8. **Pas de géolocalisation réelle** sur la carte des communes : c'est un graphique de densité, pas une carte géographique.

## 8 bis. Chaîne des dix niveaux (MONDE → … → RÉCIT)

Demande : faire de MONDE → FRANCE → LILLE MÉTROPOLE → COMMUNE → LIEU → COFFRET → MOMENT → LUMIÈRE →
MÉDIA → RÉCIT la structure explicite du produit. Chaque niveau est devenu une **entité de plein droit**.

| Rang | Niveau | Ce qui a été ajouté | Statut |
|---|---|---|---|
| 1 | MONDE | `data/monde.json` : 2 faits, 3 limites affichées, 1 pays documenté (France) avec ses deux sources | PROPOSÉ / VÉRIFIÉ |
| 2 | FRANCE | `data/france.json` : découpage réel (32 › 59 › 595/124 › MEL 95) et `cadreLegal` FR-L1…FR-L5 | SOURCE OFFICIELLE |
| 3 | LILLE MÉTROPOLE | déjà en place ; porte désormais son `recit` (manifeste, citation, cote servis par les données) | SOURCE OFFICIELLE |
| 4 | COMMUNE | `niveauRang`, `parentId`, `codeInsee` sur les 13 communes (COG INSEE) | SOURCE OFFICIELLE |
| 5 | LIEU | `niveauRang`, `parentId` ; index des 54 lieux dans l'interface, filtrant la mosaïque | À VÉRIFIER / SOURCE OFFICIELLE |
| 6 | COFFRET | `niveauRang`, `parentId` ; fil d'Ariane à dix segments dans chaque fiche | PROPOSÉ |
| 7 | MOMENT | inchangé côté données ; nommé et cliquable dans le fil d'Ariane | PROPOSÉ |
| 8 | LUMIÈRE | `data/.../lumiere.json` : 12 mois agrégés + extrêmes de l'année (jour le plus long/le plus court) | CALCULÉ |
| 9 | MÉDIA | compté (367 : 365 visuels générés + 2 actifs) ; aucune photographie présentée comme un lieu | VÉRIFIÉ |
| 10 | RÉCIT | `data/.../recits.json` : 6 échelles, `R-monde`, `R-france`, et la note « un niveau n'autorise rien de plus que ses niveaux inférieurs » | PROPOSÉ / SOURCE OFFICIELLE |

- `data/niveaux.json` décrit la chaîne elle-même ; `relations.chaine` en porte la version courte.
- **Cardinalités calculées, jamais saisies** : 1 · 1 · 1 · 13 · 54 · 365 · 10 · 366 · 367 · 435.
- **Interface** : arborescence des dix niveaux (chaque carte mène au niveau correspondant), index des
  54 lieux, filtres actifs retirables (commune, lieu, univers, moment, saison, mois, recherche, sélection),
  et fil d'Ariane dans la fiche — la commune, le lieu et le moment y filtrent la mosaïque d'un clic.
- Le manifeste du territoire n'est plus écrit dans le HTML : il vient de `territoire.recit`.
- Sources ajoutées : INSEE — Code officiel géographique, arrondissement de Lille (595), relevé du
  23/09/2026 (13 codes INSEE : Lille 59350, Roubaix 59512, Tourcoing 59599, Villeneuve-d'Ascq 59009,
  Marcq-en-Barœul 59378, Lambersart 59328, Mons-en-Barœul 59410, Wasquehal 59646, Croix 59163,
  Hem 59299, Loos 59360, Faches-Thumesnil 59220, Saint-André-lez-Lille 59527) ; service-public.gouv.fr,
  fiche F930 « Mariage en France », vérifiée le 16/09/2026 (art. 63, 64, 74 du code civil et conditions
  du mariage). Les règles sont des paraphrases, à revérifier sur Légifrance avant publication juridique.
- Bug réel corrigé au passage : la comparaison des durées du jour se faisait sur des chaînes
  (« 9 h 58 » passait pour plus long que « 16 h 24 ») — les extrêmes sont désormais comparés en minutes,
  avec un contrôle qui exige un jour le plus long en juin/juillet et le plus court en décembre/janvier.

## 9. À confirmer (décisions qui ne peuvent venir que de vous)

1. **Année éditoriale** : passée à 2026 pour être cohérente (aujourd'hui 23/09/2026). Confirmez-vous l'édition 2026 ?
2. **12 lieux à requalifier** : « Piscine Art déco » (Roubaix), « Hippodrome des Flandres » (dénomination),
   « Cave des Trois Suisses », « Maison de l'Habitat », « Le Grand-Bar », « Le Triporteur »,
   « Château de la Hallotière », « Villa Saint-Charles », « Château de Faches », « Cité du Nouveau Monde »,
   « Cité des Peupliers », « Triolo ». Doutes documentés dans `tools/lib/editorial.mjs`.
3. **Repères chiffrés** : à remplacer par des données réelles, ou à retirer ?
4. **Newsletter** : quel service brancher (Brevo, Mailerlite, autre) ?
5. **Professionnels** : l'annuaire reste vide tant qu'aucun professionnel réel n'est fourni avec sa provenance.
6. **Autres territoires** : l'arborescence est prête (`data/territories/<slug>/`), rien n'a été créé. Prochain territoire ?
7. **Niveaux 1 et 2** : MONDE ne contient que la France, et FRANCE ne documente que Lille Métropole.
   Ajoute-t-on d'autres pays ou d'autres territoires, ou ces niveaux restent-ils des cadres déclaratifs ?
   Le découpage juridique est-il à garder dans l'interface, ou à réserver à la documentation ?
8. **Médias** : aucun média réel. Toute photo ajoutée devra porter source, crédit, droits et statut — jamais une
   image générique présentée comme une photographie du lieu.

## 10. Repères

| | Avant | Après |
|---|---|---|
| Fichiers de données | 0 | 20 fichiers d'entités (dont `monde`, `france`, `niveaux`, `lumiere`, `recits`) + 365 fiches + 3 schémas |
| Entités typées | — | 13 communes, 54 lieux, 365 coffrets, 6 univers, 10 moments, 4 saisons, 12 typologies |
| Sections dans la fiche coffret | 1 | 12 |
| Compteurs saisis à la main | 4 (dont 2 faux) | 0 |
| Niveaux modélisés | 0 | 10 (MONDE → RÉCIT), avec cardinalités calculées |
| Tests automatisés | 0 | 127 |
| Adresse par coffret | non | oui |
| Sélection persistante | non | oui |
| Sources citées | 0 | 9 sources officielles + provenance structurée (lieux, INSEE, fiche F930) |
