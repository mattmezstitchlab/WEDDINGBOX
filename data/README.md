# data/ — conventions

Ces fichiers sont la **source de vérité** de WEDDING BOX. `index.html` en dérive un noyau généré.
Toute modification doit passer par `node tools/build-data.mjs` (qui contrôle puis réinjecte).

## Identifiants stables

| Entité | Format | Nombre | Remarque |
|---|---|---|---|
| Coffret | `C-001` … `C-365` | 365 | numérotation figée, un coffret par jour de collection |
| Commune | `CM-01` … `CM-13` | 13 | |
| Lieu | `L-001` … `L-054` | 54 | entités uniques, référencées par les coffrets |
| Univers | `CAT-01` … `CAT-06` | 6 | |
| Moment | `MO-01` … `MO-10` | 10 | |
| Saison | `SA-01` … `SA-04` | 4 | |
| Typologie de lieu | code lisible (`eaux`, `industriel`…) | 12 | ressource partagée |
| Média | `M-SITE-01`, `M-<coffret>-01` | — | gabarits + actifs réels |
| Professionnel | `PR-000` | 0 | **modèle prêt, annuaire vide** |

Modifier une donnée ne déplace plus les identités : les coffrets sont figés dans `coffrets.json`,
l'algorithme d'origine (`tools/lib/legacy-generator.js`) n'est qu'une archive reproductible.

## Provenance (obligatoire pour toute donnée externe)

```json
{
  "source": "Villa Cavrois — Centre des monuments nationaux",
  "sourceType": "site officiel",
  "sourceUrl": "https://www.villa-cavrois.fr/",
  "retrievedAt": "2026-09-23",
  "updatedAt": null,
  "externalId": null,
  "portee": "identité du monument",
  "status": "SOURCE OFFICIELLE"
}
```

## Statuts

| Statut | Signification |
|---|---|
| `PROPOSÉ` | piste éditoriale — aucune valeur factuelle |
| `TROUVÉ` | information générale connue, source officielle non rattachée |
| `SOURCE OFFICIELLE` | appuyée par une source citée dans `sources[]` |
| `À VÉRIFIER` | à confirmer avant publication |
| `VÉRIFIÉ` | contrôlé en interne |
| `CALCULÉ` | produit par un algorithme reproductible (lumière) |

## Ce qui n'existe pas (et ne doit pas être inventé)

Prix, horaires, disponibilité, capacité, prestataire, avis, partenariat, événement.
Aucun de ces champs n'est rempli dans la collection : les fiches disent explicitement ce qui reste à vérifier.
Les champs `reperesDemo` (budget indicatif, invités, prestataires, pages) sont **hérités du prototype de
démonstration** : ils sont signalés comme tels dans l'interface et doivent être remplacés ou retirés avant mise en ligne.

## Lumière

`lumiere` est calculé par `tools/lib/solar.mjs` (algorithme solaire NOAA simplifié) :
lever, coucher, durée du jour, golden hour, heure bleue, déclinaison, midi solaire et courbe de hauteur
solaire sur 24 h. Point de référence unique : centre de Lille (50,633 N / 3,067 E), précision ± 1 à 3 minutes.
Ce ne sont **pas** les coordonnées exactes de chaque lieu — à remplacer par des positions officielles (IGN / INSEE).

## Sources réellement consultées (identité des lieux)

| Lieu | Source | Statut |
|---|---|---|
| Roubaix — La Condition Publique | laconditionpublique.com | SOURCE OFFICIELLE |
| Tourcoing — Le Fresnoy | lefresnoy.net | SOURCE OFFICIELLE |
| Croix — Villa Cavrois | villa-cavrois.fr (Centre des monuments nationaux) | SOURCE OFFICIELLE |
| Villeneuve-d'Ascq — LaM | musee-lam.fr + Muséofile (ministère de la Culture, notice M0639) | SOURCE OFFICIELLE |
| Lille — Gare Saint-Sauveur | garesaintsauveur.lille3000.eu | SOURCE OFFICIELLE |
| Lille — Palais Rameau | lille.fr | SOURCE OFFICIELLE |
| Rattachement territorial | lillemetropole.fr (MEL, 95 communes) | SOURCE OFFICIELLE |

Les 47 autres lieux sont `À VÉRIFIER` : leur identité n'est pas affirmée au-delà du nom hérité de la collection.
12 doutes sont documentés explicitement dans `tools/lib/editorial.mjs` (`PLACE_NOTES`).
