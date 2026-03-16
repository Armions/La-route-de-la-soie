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
│   └── locations.json           # Tracé GPS (10 742 points)
├── src/
│   ├── components/
│   │   ├── Map/                 # Carte Mapbox + calques
│   │   ├── Timeline/            # Frise chronologique
│   │   ├── FloatingWindow/      # Système fenêtres flottantes (drag, minimize, close)
│   │   ├── StopHub/             # Hub arrêt (simple ou relevé)
│   │   ├── PhotoViewer/         # Viewer photo (image + miniatures)
│   │   ├── ModelViewer/         # Viewer 3D (.glb)
│   │   ├── LayerPanel/          # Panneau calques
│   │   └── Admin/               # Console admin (phase 4)
│   ├── hooks/
│   ├── utils/
│   ├── App.jsx
│   └── main.jsx
├── CLAUDE.md
└── package.json
```

---

## Design carte

La carte est l'élément central, elle occupe tout l'écran. Ce n'est pas un fond de carte utilitaire — c'est l'identité visuelle du projet. Le relief du terrain, sculpté par les ombres du hillshade, fait la beauté de la carte. Pense aux cartes relief d'Eduard Imhof ou au style Stamen Terrain.

**Style :**
- Hillshade en **nuances de gris** (SRTM / Mapbox Terrain) comme couche de base permanente
- Fond neutre et sobre. Océans en aplat profond et mat
- Typographie fine et contemporaine : serif léger pour noms de pays, sans-serif pour villes
- Le tracé coloré du voyage = **seul élément chromatique fort** sur le fond gris
- Courbes topographiques activables (calque dédié, désactivé par défaut)

**Affichage sélectif :**
- Seuls les pays traversés sont détaillés (villes, régions)
- Pays hors itinéraire = fond neutre, seuls éléments physiques visibles (montagnes, fleuves, mers)
- Le regard est naturellement guidé le long du tracé

---

## Calques thématiques

Panneau latéral avec toggles activables/désactivables :

**Géographie physique** — fleuves, mers, montagnes, steppes, déserts. Les textures visuelles doivent **épouser la géographie réelle** (données d'élévation + land cover). Petits triangles pour montagnes, pointillés pour déserts, traits ondulés pour steppes — appliqués sur les zones réelles, pas des patates schématiques.

**Courbes topographiques** — calque dédié, désactivé par défaut.

**Climat** — classification Köppen-Geiger. Sélection d'un climat = mise en valeur des zones correspondantes, le reste grisé.

**Régions culturelles** — bassin méditerranéen, Caucase, Asie centrale, monde chinois, archipel japonais. Même logique : sélection = mise en valeur + grisage.

**Conflits** — calque statique, désactivé par défaut. Uniquement ceux ayant impacté le trajet : guerre en Ukraine (détour Caucase), Haut-Karabakh, tensions Géorgie, Xinjiang.

**Réseau ferré** — source OSM, calque activable, désactivé par défaut.

**Capitales** — des pays traversés, calque dédié.

---

## Fenêtres flottantes & arrêts

Toutes les fenêtres sont style OS (barre de titre, boutons minimiser/fermer), **déplaçables** par drag & drop, **minimisables** en barre en bas, **fermables**. On peut en ouvrir **plusieurs simultanément** pour comparer.

### Au clic sur un arrêt — aperçu immédiat dans le hub

**Tous les arrêts affichent :**
- En-tête : titre, ville, région, pays
- Météo au passage : icône (☀️🌤☁️🌧❄️) + température + humidité
- Première phrase de la description Polarsteps (accroche)

> Température + condition viennent de trip.json (152/156 étapes).
> Humidité à récupérer via API Open-Meteo Historical Weather (dates + coordonnées).

### Arrêt simple (142 étapes)
Aperçu + bouton 📝 pour ouvrir la description complète en fenêtre flottante.

### Arrêt-relevé (13 étapes, 14 habitats)
Aperçu + **type d'habitat** dans l'en-tête + **barre de boutons-icônes** (chaque bouton n'apparaît que si le contenu existe) :

| Bouton | Ouvre | Fenêtre |
|--------|-------|---------|
| 📷 Photos | Viewer : grande image + bande miniatures + navigation flèches | Flottante indépendante |
| 📐 Coupes/Dessins | Relevés architecturaux (coupes, élévations, axonométries) | Flottante indépendante |
| 🧊 3D | Viewer maquette .glb (orbite, zoom, rotation) | Flottante indépendante |
| 📝 Texte | Description / récit complet | Flottante indépendante |
| ✏️ Croquis | Croquis réalisés sur place | Flottante indépendante |

On peut donc avoir à l'écran : la carte + le hub arrêt + le viewer photo + le viewer 3D, tout déplaçable.

---

## Frise chronologique

Barre horizontale en bas de la carte, synchronisée avec la vue cartographique :
- Curseur déplaçable = la carte suit
- Codes couleurs identiques carte/frise par zone géographique
- Survol d'un segment = surbrillance du tronçon correspondant sur la carte
- Dates clés et noms de pays affichés

---

## Données

### Données fixes (NE JAMAIS MODIFIER)
`coordinates`, `date_start`, `date_end`, `weather`, `zone`, `polarsteps_uuid`, tracé GPS (locations.json)

### Données éditables (via admin phase 4)
`name`, `description` (pré-rempli Polarsteps), `location.*`, relevés (`habitat_type`, `fonction`, `surface`, `climat`, `periode_construction`, `materiaux`), `assets` (photos, drawings, sketches, model_3d)

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

## Sources extérieures (open source / académiques uniquement)

| Donnée | Source | Format |
|--------|--------|--------|
| Frontières, pays | Natural Earth | GeoJSON |
| Fleuves, mers | Natural Earth | GeoJSON |
| Hillshade | SRTM (NASA) / Mapbox Terrain | Raster |
| Courbes topo | OpenTopography / SRTM | Contours |
| Climat | Köppen-Geiger (Beck 2018) | Raster |
| Land cover | ESA WorldCover | Raster |
| Réseau ferré | OpenStreetMap | GeoJSON |
| Conflits | ACLED / UCDP | GeoJSON |
| Humidité historique | Open-Meteo Historical API | JSON |

---

## Phasage

### Phase 1 — Socle (CRITIQUE)
Carte hillshade gris custom, tracé coloré par zone, 156 marqueurs, calques de base (pays, capitales, fleuves, topo), dark mode toggle

### Phase 2 — Narration (HAUTE)
Frise chrono synchronisée, fenêtres flottantes (hub aperçu + boutons → viewers), calque arrêts/relevés

### Phase 3 — Atlas (MOYENNE)
Calques climat/régions culturelles/textures paysage épousant la géo/ferré/conflits statiques

### Phase 4 — Outils (BASSE)
Admin (contenu éditorial uniquement), viewer 3D (.glb), export JPEG

---

## Instructions Phase 1 — pour Claude Code

> Ces instructions sont destinées à Claude Code. Elles détaillent chaque micro-tâche de la Phase 1.
> Après chaque tâche complétée, l'utilisateur fera un commit. Ne jamais enchaîner plusieurs tâches sans validation.

### Prérequis

Le projet utilise Vite + React + Tailwind CSS + Mapbox GL JS. Le token Mapbox est dans `.env` sous `VITE_MAPBOX_TOKEN`. Ne jamais committer le `.env`.

### Tâche 1.0 — Scaffolding

1. `npm create vite@latest . -- --template react` (dans le repo existant)
2. `npm install mapbox-gl`
3. `npm install -D tailwindcss @tailwindcss/vite` et configurer Tailwind v4 avec le plugin Vite
4. Créer l'arborescence `src/components/{Map,Timeline,FloatingWindow,StopHub,PhotoViewer,ModelViewer,LayerPanel,Admin}/`
5. Créer `src/hooks/` et `src/utils/`
6. S'assurer que `public/data/data_model.json`, `public/data/locations.json` et `public/data/trip.json` existent
7. Ajouter `.env` au `.gitignore`
8. `npm run dev` → doit afficher "Hello" dans le navigateur

### Tâche 1.1 — Carte hillshade gris

La carte est l'identité visuelle du projet. Le style doit être un **hillshade en nuances de gris** (comme les cartes d'Eduard Imhof ou Stamen Terrain). Ce n'est PAS un fond Mapbox standard.

**Approche recommandée :** Utiliser le style Mapbox `mapbox://styles/mapbox/light-v11` comme base, puis :
- Supprimer ou griser tous les calques de couleur (parcs, eau colorée, bâtiments)
- Ajouter `mapbox-terrain` comme source raster-dem
- Ajouter un calque `hillshade` avec les paramètres : exagération 0.3-0.5, ombre couleur `#333`, lumière couleur `#fff`, direction lumière 315°
- Océans / mers : aplat gris foncé mat (#2a2a2e en light mode, #1a1a1e en dark mode)
- Labels : typographie fine. Noms de pays en serif léger (si possible), villes en sans-serif
- Désaturer complètement le fond (saturation des couleurs du style à 0)

**Rendu cible :** fond gris avec relief sculpté par les ombres, pas de couleur sauf le tracé du voyage.

La carte doit être **plein écran** (100vw × 100vh), centrée sur `[50, 55]` (centre approximatif du voyage, Asie centrale), zoom initial 3.

**Token :** `import.meta.env.VITE_MAPBOX_TOKEN`

### Tâche 1.2 — Tracé coloré par zone

1. Charger `public/data/locations.json` (10 742 points avec lat, lon, time)
2. Charger `public/data/data_model.json` pour les zones et couleurs
3. Les points de `locations.json` sont **non ordonnés** — les trier par `time` (timestamp croissant)
4. Segmenter le tracé par zone géographique :
   - Pour chaque point GPS, trouver l'étape la plus proche temporellement dans `data_model.json`
   - Attribuer la zone de cette étape au point
   - Créer un segment GeoJSON `LineString` par zone contiguë
5. Afficher chaque segment avec la couleur de sa zone (voir `meta.zones`)
6. Le tracé doit être l'**unique élément chromatique** sur le fond gris
7. Épaisseur de ligne : 2-3px, avec un léger halo blanc/noir selon le mode pour lisibilité

**Zones et couleurs :**
| Zone | Couleur | Pays |
|------|---------|------|
| europe | #6B7280 | France |
| mediterranee | #F59E0B | Italie, Grèce, Turquie |
| caucase | #EF4444 | Géorgie, Arménie |
| transit | #9CA3AF | Russie, Kazakhstan |
| asie_centrale | #8B5CF6 | Ouzbékistan, Kirghizstan |
| chine | #EC4899 | Chine, Hong Kong |
| japon | #3B82F6 | Japon |

### Tâche 1.3 — Marqueurs des 156 étapes

1. Charger les 156 étapes depuis `data_model.json > steps`
2. Deux types de marqueurs :
   - **Arrêt simple** (`is_releve: false`) : petit cercle (6-8px), bordure blanche, fond = couleur de zone
   - **Arrêt-relevé** (`is_releve: true`) : cercle plus grand (10-12px) + bordure plus épaisse, même couleur de zone — doit être visuellement distinct
3. Au **survol** d'un marqueur : tooltip avec le `name` de l'étape
4. Au **clic** : pour l'instant, `console.log` de l'étape (le hub arrêt viendra en Phase 2)
5. Les marqueurs doivent se superposer au tracé (z-index supérieur)

### Tâche 1.4 — Toggle dark/light mode

1. Bouton discret en haut à droite (icône soleil/lune)
2. **Light mode (défaut)** : fond carte gris clair, hillshade clair, labels sombres, océans #2a2a2e
3. **Dark mode** : fond carte gris foncé, hillshade adapté, labels clairs, océans #0f0f12
4. Le hillshade (relief) doit rester lisible dans les deux modes
5. L'UI autour de la carte (futur panneau calques, etc.) doit aussi basculer
6. Stocker la préférence dans `localStorage`

**Implémentation :** changer dynamiquement les propriétés des calques Mapbox (`setPaintProperty`, `setLayoutProperty`) plutôt que de charger un style différent.

### Tâche 1.5 — Panneau calques basique

1. Icône "couches" (ou hamburger) en haut à gauche, au clic déploie un petit panneau
2. Le panneau se replie au clic en dehors ou sur l'icône
3. Toggles disponibles (Phase 1) :
   - ☑ Tracé du voyage
   - ☑ Étapes (marqueurs)
   - ☑ Noms des pays traversés
4. Chaque toggle masque/affiche le calque Mapbox correspondant
5. Style du panneau : fond semi-transparent, coins arrondis, cohérent avec light/dark mode
6. Les calques "Courbes topo", "Climat", "Réseau ferré" etc. viendront en Phase 3 — **ne pas les ajouter maintenant**, mais prévoir l'extensibilité du composant

### Vérification Phase 1

Quand toutes les tâches sont faites, vérifier :
- [ ] `npm run dev` démarre sans erreur
- [ ] `npm run build` compile sans erreur
- [ ] La carte s'affiche plein écran avec hillshade gris
- [ ] Le tracé est coloré par zone (7 couleurs visibles)
- [ ] Les 156 marqueurs sont affichés (13 visuellement distincts)
- [ ] Le dark mode fonctionne (toggle + persistence)
- [ ] Le panneau calques toggle les 3 calques
- [ ] Aucune donnée n'est hardcodée — tout vient de data_model.json / locations.json
- [ ] Le .env n'est PAS dans le repo git

---

## Conventions

- React fonctionnel uniquement (pas de classes)
- PascalCase composants, camelCase utils
- Tailwind CSS, pas de CSS custom sauf nécessité
- Commentaires FR pour le métier, EN pour le technique
- Toujours lire depuis `data_model.json`, ne jamais hardcoder

```bash
npm run dev       # Dev
npm run build     # Build
npm run preview   # Preview
```

---

## Contexte métier

- Auteurs = **deux architectes**. Vocabulaire archi obligatoire.
- Voyage **bas-carbone** (terrestre uniquement, pas d'avion) — élément narratif
- Habitats = **techniques vernaculaires** : terre crue, pierre, bois, feutre, bambou
- Zones de conflit ont impacté l'itinéraire (détour Caucase au lieu d'Ukraine/Russie)

---

## Tâches techniques futures

- [ ] **Hooks pre-commit** : Husky + lint-staged pour vérifier le code à chaque commit
- [ ] **Base RAG** : indexer les 3 carnets de route PDF pour recherche contextuelle
- [ ] **Humidité** : script Open-Meteo API → injecter dans data_model.json

## Instructions Phase 2 — pour Claude Code

> Phase 2 = Narration. On ajoute l'interaction avec les arrêts et la frise chronologique.
> Même règle : une tâche à la fois, commit après chaque tâche validée visuellement.

### Données disponibles (rappel)

- `data_model.json` : 156 étapes, champs `name`, `location` (city/region/country), `weather` (condition/temperature), `zone`, `is_releve`, `releves[]`, `description` (souvent vide)
- `trip.json` : export Polarsteps brut, 156 étapes dans `all_steps[]`, avec `description` (135/156 remplies), `weather_condition`, `weather_temperature` (152/156). Lien via `uuid` = `polarsteps_uuid`.
- Les descriptions Polarsteps sont dans `trip.json > all_steps[].description`, PAS dans `data_model.json`.

---

### Tâche 2.0 — Enrichir les données côté client

Avant de construire l'UI, il faut fusionner les données de `trip.json` dans `data_model.json` côté client.

1. Créer un hook `useStepsData()` dans `src/hooks/` qui :
   - Charge `data_model.json` et `trip.json`
   - Pour chaque step de `data_model.json`, trouve le step correspondant dans `trip.json` via `polarsteps_uuid === uuid`
   - Fusionne le champ `description` de trip.json dans chaque step
   - Retourne les steps enrichis + les meta (zones)
2. Ce hook remplace tout chargement direct de `data_model.json` dans les composants existants
3. Vérifier que la carte, le tracé et les marqueurs fonctionnent toujours avec ce hook
4. `npm run dev` → tout doit être identique visuellement

---

### Tâche 2.1 — Système de fenêtres flottantes (FloatingWindow)

C'est le composant fondation de toute la Phase 2. Chaque fenêtre est style OS.

1. Créer `src/components/FloatingWindow/FloatingWindow.jsx`
2. La fenêtre a :
   - **Barre de titre** : icône + titre + boutons minimiser (—) et fermer (×)
   - **Corps** : contenu enfant (children)
   - **Déplaçable** par drag & drop sur la barre de titre
   - **Redimensionnable** (optionnel, coin bas-droit)
   - **Position initiale** configurable via props, centrée par défaut
   - **z-index** : la fenêtre cliquée passe au premier plan
3. Créer un **gestionnaire de fenêtres** (`useWindowManager` hook ou contexte) :
   - Gère la liste des fenêtres ouvertes (id, type, position, minimisée, z-index)
   - Permet d'ouvrir, fermer, minimiser, restaurer une fenêtre
   - Gère le z-index (focus = au-dessus)
4. Les fenêtres **minimisées** apparaissent comme des petits onglets dans une barre en bas de l'écran
5. Style : fond blanc, bordure fine grise, ombre légère, coins arrondis. Cohérent light/dark mode.
6. Tester avec une fenêtre de démo (texte "Hello") : ouvrir, déplacer, minimiser, restaurer, fermer.

---

### Tâche 2.2 — Hub arrêt (StopHub) — Arrêt simple

Au clic sur un marqueur d'arrêt simple (`is_releve: false`), afficher un hub compact.

1. Créer `src/components/StopHub/StopHub.jsx`
2. Le hub s'ouvre **comme une FloatingWindow** (déplaçable, minimisable, fermable)
3. Contenu du hub — arrêt simple :
   - **En-tête** : nom de l'étape (gras), ville — région — pays (sous-titre)
   - **Météo** : icône météo + température en °C
     - Mapper `weather.condition` vers des icônes : `clear-day` → ☀️, `partly-cloudy-day` → ⛅, `cloudy` → ☁️, `rain` → 🌧, `snow` → ❄️
   - **Accroche** : première phrase de la `description` (tronquée à ~150 caractères si longue)
   - **Bouton** 📝 "Lire la suite" → ouvre la description complète dans une NOUVELLE FloatingWindow indépendante
4. La couleur de la zone (bande latérale ou accent en haut) identifie visuellement la zone géographique
5. Le hub se ferme au clic sur ×, ou quand on clique sur un autre marqueur (le nouveau hub remplace l'ancien)
6. Tester : cliquer sur un marqueur → le hub s'ouvre avec les bonnes infos

---

### Tâche 2.3 — Hub arrêt (StopHub) — Arrêt-relevé

Au clic sur un marqueur d'arrêt-relevé (`is_releve: true`), le hub a du contenu supplémentaire.

1. Même composant `StopHub.jsx`, mais avec une section en plus quand `is_releve === true` :
   - **Badge habitat** : affiche `releves[0].habitat_type` sous l'en-tête (ex: "Trullo", "Darbazi", "Yourte")
   - **Barre de boutons-icônes** en bas du hub. Chaque bouton n'apparaît QUE si le contenu correspondant existe :
     - 📷 Photos → `assets.photos.length > 0`
     - 📐 Coupes/Dessins → `assets.drawings.length > 0`
     - 🧊 3D → `assets.model_3d !== null`
     - 📝 Texte → `description` non vide
     - ✏️ Croquis → `assets.sketches.length > 0`
2. Pour l'instant, les boutons photos/coupes/3D/croquis affichent un `console.log` (les viewers viendront plus tard). Seul le bouton 📝 ouvre la description en FloatingWindow.
3. Le badge habitat a un style distinct (fond coloré léger, typographie différente) — vocabulaire archi : "Relevé architectural".
4. Tester : cliquer sur un marqueur relevé → hub avec badge habitat + barre de boutons

**Note** : la plupart des `assets` sont vides pour l'instant (les photos et dessins seront ajoutés plus tard via l'admin Phase 4). Les boutons ne s'afficheront donc que quand il y a du contenu. Le bouton 📝 Texte fonctionnera pour les 135 étapes qui ont une description.

---

### Tâche 2.4 — Fenêtre description (TextViewer)

Le bouton 📝 du hub ouvre la description complète dans une FloatingWindow.

1. Créer `src/components/TextViewer/TextViewer.jsx`
2. La fenêtre affiche :
   - Titre : nom de l'étape
   - Sous-titre : ville, pays — date
   - Corps : la description complète de trip.json
   - Scroll si le texte est long
3. C'est une FloatingWindow indépendante — on peut donc avoir le hub ET la fenêtre texte ouverts en même temps, les déplacer séparément
4. Tester : ouvrir un hub → cliquer 📝 → la fenêtre texte s'ouvre à côté

---

### Tâche 2.5 — Frise chronologique (Timeline)

Barre horizontale en bas de l'écran, synchronisée avec la carte.

1. Créer `src/components/Timeline/Timeline.jsx`
2. Barre fixe en bas, hauteur ~60px, largeur 100%
3. La barre est divisée en **segments colorés par zone** (mêmes couleurs que le tracé), proportionnels à la durée dans chaque zone
4. Afficher les **noms de pays** le long de la frise aux transitions de pays
5. Afficher les **dates** de début et fin du voyage aux extrémités
6. Au **survol** d'un segment : tooltip avec le nom de la zone + dates
7. Au **clic** sur un point de la frise : la carte zoom/pan vers la position correspondante sur le tracé
8. **Marqueur de position** : un curseur vertical sur la frise indique où on se trouve quand on navigue sur la carte
9. Pas de lecture automatique pour l'instant (play/pause viendra plus tard si besoin)
10. Style : fond semi-transparent, cohérent light/dark mode, ne doit pas cacher la carte (légère transparence ou retrait)

---

### Tâche 2.6 — Synchronisation carte ↔ frise

Connecter la frise et la carte.

1. Quand on **clique sur la frise** → la carte s'anime (flyTo) vers la position correspondante
2. Quand on **déplace la carte** manuellement → le curseur de la frise suit pour indiquer la zone visible
3. Au **survol d'un segment** de la frise → le tronçon correspondant sur la carte se met en surbrillance (épaisseur ou opacité augmentée)
4. Le tout doit être fluide, pas de saccade

---

### Vérification Phase 2

Quand toutes les tâches sont faites, vérifier :
- [ ] `npm run dev` démarre sans erreur
- [ ] `npm run build` compile sans erreur
- [ ] Clic sur un arrêt simple → hub avec nom, lieu, météo, accroche, bouton texte
- [ ] Clic sur un arrêt-relevé → hub avec badge habitat + barre de boutons
- [ ] Bouton 📝 → ouvre la description en fenêtre flottante indépendante
- [ ] Les fenêtres sont déplaçables, minimisables, fermables
- [ ] Plusieurs fenêtres simultanées possibles
- [ ] La frise chronologique affiche les zones colorées + pays + dates
- [ ] Clic sur la frise → la carte suit
- [ ] Navigation carte → la frise suit
- [ ] Tout fonctionne en light ET dark mode
- [ ] Aucune donnée hardcodée — tout vient de data_model.json / trip.json

## Journal de bord

> À chaque fin de session, résumer en 5 lignes max : ce qui a été fait, les choix, les modifications, les problèmes, et la suite.

### 2026-03-09 — Session 1 : Cadrage du projet
- Rédaction du **product brief v2** (itérations : hillshade gris Stamen Terrain, pas de craft, light mode par défaut).
- Création du **data_model_v2.json** : 156 étapes Polarsteps × matrice Excel 14 habitats (13 étapes). Champs éditables : surface, climat, fonction, matériaux, période.
- Correction relevé japonais : **maison traditionnelle à Kata** (péninsule de Kii, étape 118), pas minka Tokyo.
- UX fenêtres : hub avec aperçu (nom, lieu, météo, accroche) + barre boutons-icônes → chaque bouton = fenêtre flottante indépendante.
- **Prochaine session** : installer outils, créer repo GitHub, lancer prototype Phase 1 via Claude Code.

### 2026-03-09 — Session 2 : Préparation kit Claude Code
- Ajout des **instructions Phase 1 détaillées** dans CLAUDE.md : 6 tâches numérotées (1.0 scaffolding → 1.5 panneau calques) avec specs techniques précises pour chaque composant.
- Création du **GUIDE_DEMARRAGE.md** : procédure pas-à-pas pour non-développeur (installation Node/Git/Claude Code, création repo, première commande, règles d'or, gestion erreurs).
- Analyse de `locations.json` : points GPS non ordonnés (timestamps mélangés), le code devra les trier par `time` avant segmentation par zone.
- Stratégie définie : micro-incréments + commit après chaque tâche validée visuellement.
- **Prochaine session** : lancer Claude Code avec la Tâche 1.0 (scaffolding), puis avancer tâche par tâche jusqu'à Phase 1 complète.
