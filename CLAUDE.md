# Notre Route de la Soie — Carte Interactive

> **RÈGLES CRITIQUES — LIRE EN PREMIER**
> 1. La carte utilise un **hillshade en nuances de gris** (style Stamen Terrain). PAS de Mapbox basique, PAS de faux vintage/craft/papier.
> 2. **Light mode par défaut**. Dark mode en toggle.
> 3. Toujours lire depuis `public/data/data_model.json`. Ne JAMAIS hardcoder les étapes.
> 4. Les données structurelles (coordonnées, tracé, dates) sont **non modifiables**. Seul le contenu éditorial est modifiable via admin.
> 5. Vocabulaire : coupe, axonométrie, élévation, relevé — PAS "dessin" ou "plan". Les auteurs sont architectes.
> 6. Chaque fenêtre flottante est **déplaçable, minimisable, fermable** — style fenêtre d'OS. Multiples simultanées.
> 7. Données extérieures = **sources open source ou académiques uniquement**.
> 8. Ce n'est PAS une app de cartographie classique ni un dashboard. C'est un **objet éditorial interactif** — un atlas augmenté.
> 9. **TOUT en français** dans l'interface : noms de pays, labels, boutons, tooltips, dates (mai, juin... pas May, June).

---

## Stack

- **React** (Vite) + **Tailwind CSS**
- **Mapbox GL JS** — style custom hillshade gris
- **Three.js** ou **\<model-viewer\>** — viewer 3D (.glb)
- **Vercel** — hébergement (déploiement auto GitHub)
- **Supabase/Firebase** — phase 4 uniquement (admin)

---

## Architecture

```
route-de-la-soie/
├── public/data/
│   ├── data_model.json          # 156 étapes + 14 habitats relevés
│   ├── locations.json           # Tracé GPS (10 742 points)
│   ├── trip.json                # Export Polarsteps brut (descriptions)
│   └── layers/                  # Données GeoJSON calques thématiques
│       ├── capitals.json
│       ├── climate_zones.json
│       ├── cultural_regions.json
│       └── geopolitics.json
├── src/
│   ├── components/
│   │   ├── Map/                 # Carte Mapbox + calques
│   │   ├── Sidebar/             # Panneau latéral (onglets Voyage + Calques + Atlas)
│   │   ├── Timeline/            # Frise chronologique
│   │   ├── FloatingWindow/      # Système fenêtres flottantes (drag, minimize, close)
│   │   ├── StopHub/             # Hub arrêt (simple ou relevé)
│   │   ├── TextViewer/          # Fenêtre description complète
│   │   ├── PhotoViewer/         # Viewer photo (image + miniatures)
│   │   ├── ModelViewer/         # Viewer 3D (.glb)
│   │   ├── Atlas/               # Atlas des 14 habitats vernaculaires
│   │   └── Admin/               # Console admin (phase 4)
│   ├── hooks/
│   │   └── useStepsData.js      # Fusion data_model.json + trip.json
│   ├── utils/
│   ├── App.jsx
│   └── main.jsx
├── CLAUDE.md
└── package.json
```

---

## Design carte

La carte est l'élément central, elle occupe tout l'espace à droite de la sidebar. Ce n'est pas un fond de carte utilitaire — c'est l'identité visuelle du projet.

### Deux modes de carte : Low / High

Bouton de switch en haut à droite (à côté du toggle light/dark).

**Mode LOW (défaut)** — Atlas sobre
- Hillshade en **nuances de gris** (SRTM / Mapbox Terrain)
- Fond neutre, océans gris foncé mat
- Le tracé coloré = seul élément chromatique
- Light : fond gris clair, labels sombres
- Dark : fond gris foncé, labels clairs, océans plus sombres — carte ET UI changent

**Mode HIGH** — Terrain texturé (style VeryGoodMaps)
- Base **satellite Mapbox désaturée** (couleurs naturelles atténuées : vert kaki forêts, ocre déserts, blanc neige)
- **Hillshade** par-dessus avec forte exagération pour relief sculptural
- **Blend mode** (multiply ou soft-light) pour fusionner satellite + hillshade
- **Grain/texture papier** en overlay CSS (PNG transparent)
- Océans en gris clair texturé (pas bleu)
- Light : la carte texturée telle quelle + UI claire
- Dark : la carte RESTE IDENTIQUE (pas de changement), seule l'UI (sidebar, frise, fenêtres) passe en sombre

**Éléments communs aux deux modes :**
- Typographie fine : serif léger pour pays, sans-serif pour villes
- Affichage sélectif : pays traversés plus détaillés, hors itinéraire grisés
- Contour noir fin autour des 13 pays traversés
- Coordonnées GPS en haut à droite (fixe, se met à jour au mouvement souris)
- Légende dynamique en bas à droite (au-dessus de la frise)
- renderWorldCopies: false, center [60, 40], zoom 3, minZoom 2

---

## Sidebar (panneau latéral)

Panneau fixe à gauche (~320px), rétractable via bouton chevron. Trois onglets en haut.

### Onglet VOYAGE (actif par défaut)
- **Titre** : "Notre Route de la Soie" (serif élégant) + sous-titre
- **Compteurs** : 34 869 km | 13 pays | 7 mois | 156 étapes (depuis data_model.json > meta)
- **Chapitres** (= zones) : pastille couleur + nom + nombre d'étapes → clic = flyTo sur la zone + colore la zone sur la carte en semi-transparent + frise zoom sur le segment. Re-clic = déselectionne, retour vue complète.
- **Liste des 156 étapes** : scrollable, groupée par zone, pastille + nom + ville + date. Clic = centre carte + ouvre hub. Étape active surlignée. Relevés avec indicateur visuel.

### Onglet CALQUES
Sections repliables :
- **Voyage** : Tracé, Étapes, Relevés architecturaux
- **Géographie** : Pays traversés, Capitales, Fleuves & mers, Courbes topographiques, Reliefs & déserts (labels montagnes/déserts)
- **Thématique** : Climat (Köppen-Geiger), Routes de la Soie historiques
- **Contexte** : Contexte géopolitique (conflits + frontières + pays déconseillés), Réseau ferré

> Note : les Régions culturelles ont été fusionnées avec les Chapitres de l'onglet Voyage (clic chapitre = colore la zone sur la carte + zoom frise).

### Onglet ATLAS
Grille des 14 habitats vernaculaires relevés. Clic → centre carte + ouvre hub relevé.

---

## Calques thématiques

**Géographie physique** — fleuves, mers, montagnes, steppes, déserts. Les textures visuelles doivent **épouser la géographie réelle** (données d'élévation + land cover).

**Courbes topographiques** — calque dédié, désactivé par défaut.

**Climat** — classification Köppen-Geiger (d'après Beck et al., 2023). Polygones GeoJSON à ~200 km de l'itinéraire :

| Zone traversée | Code Köppen | Nom français | Description |
|---|---|---|---|
| France | Cfb | Océanique | Températures modérées, pluies réparties toute l'année |
| Italie du Sud, Grèce, côte turque | Csa | Méditerranéen chaud | Étés secs et chauds, hivers doux et humides |
| Turquie intérieure | Dsa/Dsb | Continental à été sec | Hivers froids, étés secs, forte amplitude thermique |
| Géorgie, Arménie | Dfa/Dfb | Continental humide | Hivers froids, précipitations toute l'année |
| Kazakhstan, Ouzbékistan | BSk | Semi-aride froid (steppe) | Faibles précipitations, hivers froids, étés chauds |
| Kirghizstan (altitude) | Dwb/Dwc | Continental subarctique | Hivers très froids et secs, étés courts |
| Xinjiang (Chine ouest) | BWk | Aride froid (désert) | Très faibles précipitations, amplitude thermique extrême |
| Chine est (Fujian, Zhejiang) | Cfa | Subtropical humide | Étés chauds et humides, hivers doux |
| Japon (Kii, Tokyo) | Cfa | Subtropical humide | Chaud et humide, mousson estivale |

Sélection d'un climat = mise en valeur de la zone, le reste grisé. Créditer "Classification Köppen-Geiger, d'après Beck et al., 2023, Scientific Data".

**Régions culturelles** — 5 aires : bassin méditerranéen, Caucase, Asie centrale, monde chinois, archipel japonais. Même logique : sélection = mise en valeur + grisage.

**Contexte géopolitique (mai-déc 2025)** — calque unique, désactivé par défaut, avec 3 niveaux visuels. Ce calque montre les contraintes géopolitiques qui ont influencé le choix de l'itinéraire.

*Rouge foncé (polygones pleins)* — Conflits actifs / zones occupées :
- Ukraine : zone occupée par la Russie (Donbass, Crimée, Zaporijjia, Kherson) + zone de front
- Haut-Karabakh : zone du conflit Arménie/Azerbaïdjan
- Ossétie du Sud + Abkhazie : régions sécessionnistes de Géorgie occupées par la Russie depuis 2008

*Traits tiretés rouges* — Frontières terrestres fermées/infranchissables :
- Turquie ↔ Arménie (fermée depuis 1993)
- Arménie ↔ Azerbaïdjan (fermée, conflit Karabakh)

*Rouge clair transparent* — Pays déconseillés par le MEAE / Fil d'Ariane :
- Iran (formellement déconseillé, frontières terrestres non praticables)
- Russie (formellement déconseillé — traversée effectuée malgré tout, Vladikavkaz → Astrakhan)
- Azerbaïdjan (inaccessible depuis l'Arménie, déconseillé)

Tooltip au survol de chaque zone : nom, dates, impact concret sur l'itinéraire (1-2 phrases FR). Note générale "Situation en date du voyage, mai-déc 2025. Source : Fil d'Ariane / MEAE France".

**Routes de la Soie historiques** — 5 routes en GeoJSON LineString tiretées, tracées via les villes-nœuds documentées :
- Route centrale des oasis (or #8B6914) : Chang'an → Dunhuang → Kashgar → Samarcande → Antioche → Constantinople
- Route sud du Tarim (brun #A0522D) : Chang'an → Dunhuang → Khotan → Kashgar → Balkh → Taxila
- Route des Steppes (brun foncé #6B4226) : Pékin → Karakorum → steppes → Crimée → Constantinople
- Route vers l'Inde (brun-rouge #8B4513) : Kashgar → Karakoram → Taxila → Muziris
- Route maritime (bleu-gris #4A708B) : Canton → Malacca → Ceylan → Aden → Alexandrie → Venise
Villes-étapes avec tooltip nom moderne + nom antique. Sources : Williams, T.D. (2014), ICOMOS ; UNESCO (2014), patrimoine mondial n°1442 ; Christian, D. (2000), Journal of World History.

**Réseau ferré** — grandes lignes ferroviaires des 13 pays traversés en GeoJSON statique. Lignes noires (#333) 2px, visibles dès zoom 3. Source OSM.

**Capitales** — 13 capitales des pays traversés, calque dédié.

---

## Fenêtres flottantes & arrêts

Toutes les fenêtres sont style OS (barre de titre, boutons minimiser/fermer), **déplaçables** par drag & drop (transform:translate3d pour performance), **minimisables** en barre en bas (au-dessus de la frise, après la sidebar), **fermables**. On peut en ouvrir **plusieurs simultanément** pour comparer.

### Au clic sur un arrêt — aperçu immédiat dans le hub

**Tous les arrêts affichent :**
- En-tête : titre, ville, région, pays (en français)
- Bande de couleur de la zone en accent
- Météo au passage : icône (☀️⛅☁️🌧❄️) + température °C
- Première phrase de la description Polarsteps (accroche ~150 car)

> Descriptions viennent de trip.json (135/156 étapes), fusionnées via hook useStepsData.

### Arrêt simple (142 étapes)
Aperçu + bouton 📝 "Lire la suite" → ouvre la description complète en FloatingWindow (TextViewer).

### Arrêt-relevé (13 étapes, 14 habitats)
Aperçu + **badge "RELEVÉ ARCHITECTURAL"** avec `habitat_type` + **barre de boutons-icônes** :

| Bouton | Ouvre | Condition |
|--------|-------|-----------|
| 📷 Photos | Viewer photo | `assets.photos.length > 0` |
| 📐 Coupes/Dessins | Relevés architecturaux | `assets.drawings.length > 0` |
| 🧊 3D | Viewer maquette .glb | `assets.model_3d !== null` |
| 📝 Lire la suite | Description complète (TextViewer) | `description` non vide |
| ✏️ Croquis | Croquis de terrain | `assets.sketches.length > 0` |

---

## Frise chronologique

Barre horizontale fixe en bas de la carte (~60px), synchronisée :
- Segments colorés par zone, proportionnels à la durée
- Noms de pays en français aux transitions
- Dates de début (6 mai 2025) et fin (18 déc 2025) aux extrémités
- Petits traits verticaux pour chaque arrêt (relevés plus visibles)
- Curseur de position qui suit la navigation carte
- Survol = trait vertical + point lumineux sur le tracé GPS de la carte
- Clic = flyTo vers la position correspondante

---

## Données

### Données fixes (NE JAMAIS MODIFIER)
`coordinates`, `date_start`, `date_end`, `weather`, `zone`, `polarsteps_uuid`, tracé GPS (locations.json)

### Données éditables (via admin phase 4)
`name`, `description`, `location.*`, relevés (`habitat_type`, `fonction`, `surface`, `climat`, `periode_construction`, `materiaux`), `assets`

### Zones géographiques

| Zone | Couleur | Pays |
|------|---------|------|
| europe | #6B7280 | France |
| mediterranee | #F59E0B | Italie, Grèce, Turquie |
| caucase | #EF4444 | Géorgie, Arménie |
| transit | #9CA3AF | Russie, Kazakhstan |
| asie_centrale | #8B5CF6 | Ouzbékistan, Kirghizstan |
| chine | #EC4899 | Chine, Hong Kong |
| japon | #3B82F6 | Japon |

### Relevés architecturaux

| # | Pays | Village | Habitat | Coupe | Schéma | 3D |
|---|------|---------|---------|:-----:|:------:|:--:|
| 2 | IT | Tivoli | Maison byzantine | ✓ | ✓ | ✓ |
| 7 | IT | Alberobello | Trullo | ✓ | ✓ | |
| 13 | GR | Marathon | Ferme | ✓ | ✓ | ✓ |
| 21 | TR | Cumalıkızık | Maison Ottomane | ✓ | ✓ | |
| 26 | GE | Est Tbilissi | Darbazi | ✓ | | |
| 36 | AM | Lac Sevan | Résidence artiste + Carrière | ✓ | | ✓ |
| 39 | GE | Samegrelo | Maison Oda | ✓ | | |
| 43 | GE | Ushguli | Tour Svan | ✓ | | |
| 55 | UZ | Khiva | Madrasah | ✓ | ✓ | |
| 64 | KG | Sary-Moghol | Yourte | ✓ | | ✓ |
| 96 | CN | Langshi | Maison Qing | ✓ | ✓ | ✓ |
| 100 | CN | Yongding | Tulou | ✓ | | ✓ |
| 118 | JP | Kata (Kii) | Maison traditionnelle | ✓ | ✓ | ✓ |

---

## Sources extérieures

| Donnée | Source | Licence |
|--------|--------|---------|
| Frontières, pays | Natural Earth | Public domain |
| Fleuves, mers | Natural Earth / Mapbox | Public domain |
| Hillshade | SRTM (NASA) / Mapbox Terrain | Open |
| Courbes topo | Mapbox Terrain | Open |
| Climat | Köppen-Geiger (Beck et al. 2023) | CC BY 4.0 |
| Réseau ferré | OpenStreetMap / Mapbox | ODbL |
| Contexte géopolitique | Fil d'Ariane / MEAE + frontières OSM | 9 zones statiques |

---

## Phasage

### Phase 1 — Socle ✅ FAIT
Carte hillshade gris, tracé coloré par zone, 156 marqueurs, dark mode toggle, panneau calques basique

### Phase 2 — Narration ✅ FAIT
Sidebar (Voyage + Calques), fenêtres flottantes, hub arrêt (simple + relevé), TextViewer, frise chrono, curseur interactif

### Phase 3 — Atlas ✅ FAIT
Calques thématiques (capitales, fleuves, topo/labels, climat Köppen-Geiger, routes de la soie historiques, contexte géopolitique, réseau ferré), atlas 14 habitats, fusion chapitres+régions culturelles

### Phase 3.5 — Style Terrain (EN COURS)
Mode carte High (satellite désaturé + hillshade + grain papier), bouton Low/High

### Phase 4 — Outils
Admin, viewer 3D (.glb), viewer photo, export JPEG

---

## Instructions Phase 3 — pour Claude Code

> Après chaque tâche complétée, l'utilisateur fera un commit.

### Tâche 3.0 — Restructurer l'onglet Calques

1. Sections repliables : Voyage / Géographie / Thématique / Contexte
2. Titre cliquable pour replier/déplier chaque section
3. Toggle ON/OFF par calque
4. Calques non implémentés : toggle grisé + "Bientôt"

### Tâche 3.1 — Calque Capitales

1. `public/data/layers/capitals.json` : Paris, Rome, Athènes, Ankara, Tbilissi, Erevan, Moscou, Astana, Tachkent, Bichkek, Pékin, Hong Kong, Tokyo
2. Marqueurs : losange/étoile, gris foncé, label italique
3. Toggle Calques > Géographie. Désactivé par défaut.

### Tâche 3.2 — Calque Fleuves & mers

1. Activer/styliser calques `water` et `waterway` Mapbox
2. Labels : Danube, Koura, Amou-Daria, Syr-Daria, Fleuve Jaune, Yangtsé, Méditerranée, Mer Noire, Mer Caspienne, Mer d'Aral, Mer de Chine orientale, Mer du Japon
3. Lignes bleues fines (#5B8FA8), labels italique gris-bleu
4. Toggle Calques > Géographie. Désactivé par défaut.

### Tâche 3.3 — Calque Courbes topographiques

1. Source `mapbox-terrain` (déjà chargée) ou calques contours Mapbox
2. Lignes fines (#999), labels altitude tous les 500-1000m
3. Toggle Calques > Géographie. Désactivé par défaut.

### Tâche 3.4 — Calque Climat (Köppen-Geiger)

1. `public/data/layers/climate_zones.json` : 9 polygones GeoJSON, bande ~200 km autour de l'itinéraire
   - Cfb Océanique (France) — #5B8FA8
   - Csa Méditerranéen chaud (Italie, Grèce, côte turque) — #F5C542
   - Dsa/Dsb Continental à été sec (Turquie intérieure) — #D4845A
   - Dfa/Dfb Continental humide (Géorgie, Arménie) — #6BAF6B
   - BSk Semi-aride froid / steppe (Kazakhstan, Ouzbékistan) — #C9A84C
   - Dwb/Dwc Continental subarctique (Kirghizstan) — #8B7EC8
   - BWk Aride froid / désert (Xinjiang) — #D4A574
   - Cfa Subtropical humide (Chine est) — #5AAF8F
   - Cfa Subtropical humide (Japon) — #5A8FBF
2. Semi-transparent (opacité 0.3) + bordure colorée
3. Légende : pastille + code Köppen + nom FR + description
4. Mode sélection : clic légende → seule cette zone colorée, reste grisé
5. Crédit "Classification Köppen-Geiger, d'après Beck et al., 2023"
6. Toggle Calques > Thématique. Désactivé par défaut.

### Tâche 3.5 — Calque Régions culturelles

1. `public/data/layers/cultural_regions.json` : 5 polygones
   - Bassin méditerranéen, Caucase, Asie centrale, Monde chinois, Archipel japonais
2. Semi-transparent, couleurs douces, labels au centre
3. Mode sélection : clic → mise en valeur, reste grisé
4. Toggle Calques > Thématique. Désactivé par défaut.

### Tâche 3.6 — Calque Contexte géopolitique

Calque unique avec 3 niveaux visuels. Fichier `public/data/layers/geopolitics.json`.

**Niveau 1 — Conflits actifs / zones occupées (rouge foncé #C0392B, opacité 0.4) :**
1. **Ukraine** — polygone couvrant les zones occupées par la Russie : Crimée, Donbass (Donetsk, Louhansk), Zaporijjia, Kherson. Tooltip : "Invasion russe (2022-). Raison principale du détour par le Caucase au lieu de traverser la Russie depuis l'Europe."
2. **Haut-Karabakh** — polygone de la région. Tooltip : "Conflit Arménie-Azerbaïdjan. Offensive azerbaïdjanaise de sept. 2023, exode de la population arménienne."
3. **Ossétie du Sud** — polygone. Tooltip : "Région sécessionniste de Géorgie, occupée par la Russie depuis 2008."
4. **Abkhazie** — polygone. Tooltip : "Région sécessionniste de Géorgie, occupée par la Russie depuis 2008."

**Niveau 2 — Frontières fermées (traits tiretés rouges #E74C3C, stroke-dasharray) :**
5. **Turquie ↔ Arménie** — ligne tiretée sur la frontière. Tooltip : "Frontière fermée depuis 1993. Passage par la Géorgie obligatoire."
6. **Arménie ↔ Azerbaïdjan** — ligne tiretée sur la frontière. Tooltip : "Frontière fermée. Conflit du Haut-Karabakh."

**Niveau 3 — Pays déconseillés MEAE / Fil d'Ariane (rouge clair #E74C3C, opacité 0.15) :**
7. **Iran** — polygone du pays entier. Tooltip : "Formellement déconseillé par le MEAE. Frontières terrestres non praticables pour le voyage."
8. **Russie** — polygone du pays entier. Tooltip : "Formellement déconseillé par le MEAE depuis 2022. Traversée effectuée (Vladikavkaz → Astrakhan → Atyrau) malgré la recommandation."
9. **Azerbaïdjan** — polygone du pays entier. Tooltip : "Inaccessible depuis l'Arménie. Relations diplomatiques rompues."

**Texte d'introduction** affiché quand le calque est activé : "Contraintes géopolitiques en date du voyage (mai-déc 2025) ayant influencé le choix de l'itinéraire. Source : Fil d'Ariane / MEAE France."

**Légende** dans le panneau calques :
- ■ rouge foncé = Conflit actif / zone occupée
- --- trait tireté = Frontière fermée
- ■ rouge clair = Pays déconseillé (MEAE)

Toggle Calques > Contexte. Désactivé par défaut.

### Tâche 3.7 — Calque Réseau ferré

1. Activer calques rail/transit Mapbox pour les pays traversés
2. Lignes tiretées (#888)
3. Toggle Calques > Contexte. Désactivé par défaut.

### Tâche 3.8 — Atlas des 14 habitats

1. `src/components/Atlas/Atlas.jsx`
2. 3e onglet "ATLAS" dans la sidebar
3. Grille : nom habitat + pays + village + icônes représentations (coupe ✓, schéma ✓, 3D ✓)
4. Clic → centre carte + ouvre hub relevé
5. Style sobre, esthétique atlas

### Vérification Phase 3

- [ ] Onglet Calques restructuré avec sections repliables
- [ ] 7 calques fonctionnels (capitales, fleuves, topo, climat, régions, géopolitique, ferré)
- [ ] Climat : 9 zones, légende Köppen, mode sélection
- [ ] Calque Contexte géopolitique : 3 niveaux (conflits rouge foncé, frontières tiretées, pays déconseillés rouge clair), tooltips FR, légende
- [ ] Atlas : onglet avec grille 14 habitats
- [ ] Tout désactivé par défaut, tout en FR, light + dark mode OK

---

## Conventions

- React fonctionnel uniquement (pas de classes)
- PascalCase composants, camelCase utils
- Tailwind CSS, pas de CSS custom sauf nécessité
- Commentaires FR pour le métier, EN pour le technique
- Toujours lire depuis `data_model.json`, ne jamais hardcoder
- **Tout en français** dans l'interface utilisateur

---

## Contexte métier

- Auteurs = **deux architectes**. Vocabulaire archi obligatoire.
- Voyage **bas-carbone** (terrestre uniquement, pas d'avion) — élément narratif
- Habitats = **techniques vernaculaires** : terre crue, pierre, bois, feutre, bambou
- Zones de conflit ont impacté l'itinéraire (détour Caucase au lieu d'Ukraine/Russie)

---

## Journal de bord

### 2026-03-09 — Session 1 : Cadrage du projet
- Rédaction du product brief v2. Création du data_model_v2.json. Correction relevé japonais (Kata, pas Tokyo). UX fenêtres flottantes.

### 2026-03-09 — Session 2 : Préparation kit Claude Code
- Instructions Phase 1 détaillées dans CLAUDE.md. GUIDE_DEMARRAGE.md créé. Analyse locations.json (tri par timestamp nécessaire).

### 2026-03-16 — Session 3 : Installation + Phase 1 + Phase 2
- Installation complète (Node.js, Git, SSH, Claude Code Opus) sur Windows.
- Phase 1 complète : carte hillshade, tracé 7 couleurs, 156 marqueurs, dark mode, calques. Corrections style carte (désaturation, affichage sélectif pays).
- Phase 2 complète : sidebar Voyage/Calques, hub arrêt simple + relevé, FloatingWindow (drag/minimize/multi), TextViewer, frise chrono synchronisée, curseur interactif frise→carte.
- Corrections : encodage °C, espacement design, traduction FR, fenêtres minimisées (z-index, position).

### 2026-03-22 — Session 4 : Phase 3 + corrections + design
- **Phase 3 complète** : calques capitales, fleuves, courbes topo (labels montagnes/déserts aux zooms faibles), climat Köppen-Geiger (9 zones), contexte géopolitique (3 niveaux : conflits, frontières fermées, pays déconseillés MEAE), réseau ferré, routes de la soie historiques (5 routes sourcées ICOMOS/UNESCO), atlas 14 habitats.
- **Fusion chapitres + régions culturelles** : clic chapitre dans onglet Voyage = colore zone sur carte + zoom frise. Supprimé le calque régions culturelles (redondant).
- **Routes de la soie** : 5 routes historiques ajoutées (centrale, sud Tarim, steppes, Inde, maritime) avec villes-étapes et tooltips. Sources académiques créditées.
- **Corrections récurrentes** : frontières/conflits (polygones OSM précis), réseau ferré (GeoJSON statique visible dès zoom 3), coordonnées GPS fixe en haut à droite, cadrage carte (center [60,40] zoom 3, renderWorldCopies false).
- **Décision design** : 2 modes de carte Low (atlas gris sobre) / High (satellite désaturé + hillshade + grain papier). Chacun avec light/dark. En mode High dark, seule l'UI change, la carte reste identique.
- **Prochaine session** : implémenter le mode High (terrain texturé), corriger derniers bugs (toggles dark mode, frontières précises), préparer Phase 4 (viewer photo/3D/dessins — Nicolas prépare ses assets).
