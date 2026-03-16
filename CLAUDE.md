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

---

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
