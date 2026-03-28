/**
 * Map theme — atlas contemporain lumineux.
 * Pays traversés clairs, pays hors-itinéraire plus gris.
 * Le tracé coloré = SEUL élément chromatique.
 */

// ISO 3166-1 alpha-2 codes of traversed countries
export const TRAVERSED_COUNTRIES = [
  'FR', 'IT', 'GR', 'TR', 'GE', 'AM', 'RU', 'KZ', 'UZ', 'KG', 'CN', 'HK', 'JP',
]

export const THEMES = {
  light: {
    // Country fills
    background: '#dcdcdc',
    countryTraversed: '#e8e8e8',
    countryOther: '#d0d0d0',
    ocean: '#b8b8b8',
    waterway: '#a0a0a5',
    // Admin boundaries
    adminBorder: '#aaaaaa',
    adminOpacity: 0.5,
    // Roads
    road: '#cccccc',
    roadOpacity: 0.1,
    // Labels — all in grays
    countryTextColor: '#555555',
    countryTextHalo: '#e0e0e0',
    stateTextColor: '#777777',
    stateTextHalo: '#e0e0e0',
    settlementTextColor: '#666666',
    settlementTextHalo: '#e8e8e8',
    waterTextColor: '#666666',
    waterTextHalo: '#b0b0b0',
    naturalTextColor: '#888888',
    naturalTextHalo: '#dcdcdc',
    // Hillshade
    hillshadeShadow: '#444444',
    hillshadeHighlight: '#fafafa',
    hillshadeAccent: '#888888',
    hillshadeExaggeration: 0.75,
    // Country outlines
    countryOutline: '#000000',
    countryOutlineOpacity: 0.5,
    // Route / markers
    haloLine: 'rgba(0,0,0,0.3)',
    markerStroke: '#ffffff',
  },
  dark: {
    background: '#1a1a1e',
    countryTraversed: '#262628',
    countryOther: '#1e1e22',
    ocean: '#111114',
    waterway: '#2a2a30',
    adminBorder: '#3a3a3e',
    adminOpacity: 0.4,
    road: '#282828',
    roadOpacity: 0.1,
    countryTextColor: '#aaaaaa',
    countryTextHalo: '#1e1e22',
    stateTextColor: '#888888',
    stateTextHalo: '#1e1e22',
    settlementTextColor: '#808080',
    settlementTextHalo: '#1e1e22',
    waterTextColor: '#555560',
    waterTextHalo: '#151518',
    naturalTextColor: '#666666',
    naturalTextHalo: '#1e1e22',
    hillshadeShadow: '#000000',
    hillshadeHighlight: '#3a3a40',
    hillshadeAccent: '#1a1a1e',
    hillshadeExaggeration: 0.7,
    countryOutline: '#666666',
    countryOutlineOpacity: 0.3,
    haloLine: 'rgba(0,0,0,0.5)',
    markerStroke: '#1e1e22',
  },
}

// Layers to hide entirely
const LAYERS_TO_HIDE = [
  'national-park', 'landuse', 'land-structure-polygon', 'land-structure-line',
  'aeroway-polygon', 'aeroway-line', 'building',
  'poi-label', 'airport-label', 'road-label-simple',
  'settlement-subdivision-label',
]

// Road layers to dim
const ROAD_LAYERS = [
  'tunnel-path-trail', 'tunnel-path-cycleway-piste', 'tunnel-path',
  'tunnel-steps', 'tunnel-pedestrian', 'tunnel-simple',
  'road-path-trail', 'road-path-cycleway-piste', 'road-path',
  'road-steps', 'road-pedestrian', 'road-simple',
  'bridge-path-trail', 'bridge-path-cycleway-piste', 'bridge-path',
  'bridge-steps', 'bridge-pedestrian', 'bridge-case-simple', 'bridge-simple',
]

/**
 * Apply theme to map. Safe to call repeatedly.
 */
export function applyTheme(map, mode) {
  const t = THEMES[mode]
  if (!t) return

  const style = map.getStyle()
  if (!style) return

  // Background
  try { map.setPaintProperty('land', 'background-color', t.background) } catch (_) {}

  // Country fills (our custom layers)
  try {
    map.setPaintProperty('country-fills-traversed', 'fill-color', t.countryTraversed)
    map.setPaintProperty('country-fills-other', 'fill-color', t.countryOther)
  } catch (_) {}

  for (const layer of style.layers) {
    const { id, type } = layer
    if (id.startsWith('route-') || id.startsWith('steps-') || id === 'hillshade-layer') continue
    if (id.startsWith('country-fills-') || id.startsWith('geopolitics-')) continue

    try {
      if (LAYERS_TO_HIDE.includes(id)) {
        map.setLayoutProperty(id, 'visibility', 'none')
        continue
      }

      // Water fill
      if (type === 'fill' && id === 'water') {
        map.setPaintProperty(id, 'fill-color', t.ocean)
        map.setPaintProperty(id, 'fill-opacity', 1)
        continue
      }

      // Waterway line
      if (type === 'line' && id === 'waterway') {
        map.setPaintProperty(id, 'line-color', t.waterway)
        map.setPaintProperty(id, 'line-opacity', 0.5)
        continue
      }

      // Roads
      if (ROAD_LAYERS.includes(id)) {
        map.setPaintProperty(id, 'line-color', t.road)
        map.setPaintProperty(id, 'line-opacity', t.roadOpacity)
        continue
      }

      // Admin boundaries
      if (id.startsWith('admin-')) {
        map.setPaintProperty(id, 'line-color', t.adminBorder)
        map.setPaintProperty(id, 'line-opacity', t.adminOpacity)
        continue
      }

      // Other fills (landcover etc) — hide, we use country-fills now
      if (type === 'fill') {
        map.setPaintProperty(id, 'fill-opacity', 0)
        continue
      }

      // Labels — ALL in grays
      if (type === 'symbol') {
        if (id === 'country-label' || id === 'continent-label') {
          map.setPaintProperty(id, 'text-color', t.countryTextColor)
          map.setPaintProperty(id, 'text-halo-color', t.countryTextHalo)
          map.setPaintProperty(id, 'text-halo-width', 1.5)
          try { map.setPaintProperty(id, 'icon-opacity', 0) } catch (_) {}
          continue
        }
        if (id === 'state-label') {
          map.setPaintProperty(id, 'text-color', t.stateTextColor)
          map.setPaintProperty(id, 'text-halo-color', t.stateTextHalo)
          map.setPaintProperty(id, 'text-halo-width', 1.2)
          continue
        }
        if (id.startsWith('water-') || id === 'waterway-label' || id === 'natural-line-label') {
          map.setPaintProperty(id, 'text-color', t.waterTextColor)
          map.setPaintProperty(id, 'text-halo-color', t.waterTextHalo)
          map.setPaintProperty(id, 'text-halo-width', 0.8)
          continue
        }
        if (id.startsWith('settlement-')) {
          map.setPaintProperty(id, 'text-color', t.settlementTextColor)
          map.setPaintProperty(id, 'text-halo-color', t.settlementTextHalo)
          map.setPaintProperty(id, 'text-halo-width', 1.2)
          continue
        }
        map.setPaintProperty(id, 'text-color', t.naturalTextColor)
        map.setPaintProperty(id, 'text-halo-color', t.naturalTextHalo)
        map.setPaintProperty(id, 'text-halo-width', 1)
      }
    } catch (_) {}
  }

  // Hillshade
  try {
    map.setPaintProperty('hillshade-layer', 'hillshade-shadow-color', t.hillshadeShadow)
    map.setPaintProperty('hillshade-layer', 'hillshade-highlight-color', t.hillshadeHighlight)
    map.setPaintProperty('hillshade-layer', 'hillshade-accent-color', t.hillshadeAccent)
    map.setPaintProperty('hillshade-layer', 'hillshade-exaggeration', t.hillshadeExaggeration)
  } catch (_) {}

  // Route halos
  for (const layer of style.layers) {
    if (layer.id.startsWith('route-halo-')) {
      try { map.setPaintProperty(layer.id, 'line-color', t.haloLine) } catch (_) {}
    }
  }

  // Country outlines (traversed)
  try {
    map.setPaintProperty('country-outlines-traversed', 'line-color', t.countryOutline)
    map.setPaintProperty('country-outlines-traversed', 'line-opacity', t.countryOutlineOpacity)
  } catch (_) {}

  // Marker strokes
  try {
    map.setPaintProperty('steps-simple', 'circle-stroke-color', t.markerStroke)
    map.setPaintProperty('steps-releve', 'circle-stroke-color', t.markerStroke)
  } catch (_) {}

  // Capitals layer theme
  try {
    const capColor = mode === 'dark' ? '#c0c0c0' : '#3a3a3a'
    const capHalo = mode === 'dark' ? '#1e1e22' : '#e8e8e8'
    const capStroke = mode === 'dark' ? '#1e1e22' : '#ffffff'
    map.setPaintProperty('capitals-marker', 'circle-color', capColor)
    map.setPaintProperty('capitals-marker', 'circle-stroke-color', capStroke)
    map.setPaintProperty('capitals-label', 'text-color', capColor)
    map.setPaintProperty('capitals-label', 'text-halo-color', capHalo)
  } catch (_) {}

  // Contour lines theme
  try {
    const contourLine = mode === 'dark' ? '#555555' : '#999999'
    const contourText = mode === 'dark' ? '#666666' : '#888888'
    const contourHalo = mode === 'dark' ? '#1e1e22' : '#e8e8e8'
    map.setPaintProperty('contour-lines', 'line-color', contourLine)
    map.setPaintProperty('contour-labels', 'text-color', contourText)
    map.setPaintProperty('contour-labels', 'text-halo-color', contourHalo)
  } catch (_) {}

  // Waterways labels theme
  try {
    const wwColor = mode === 'dark' ? '#6BA0B8' : '#5B8FA8'
    const wwHalo = mode === 'dark' ? '#1e1e22' : '#e8e8e8'
    map.setPaintProperty('waterways-label-rivers', 'text-color', wwColor)
    map.setPaintProperty('waterways-label-rivers', 'text-halo-color', wwHalo)
    map.setPaintProperty('waterways-label-seas', 'text-color', wwColor)
    map.setPaintProperty('waterways-label-seas', 'text-halo-color', wwHalo)
  } catch (_) {}

  // Climate zones theme
  try {
    const climateHalo = mode === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)'
    map.setPaintProperty('climate-zones-label', 'text-halo-color', climateHalo)
  } catch (_) {}

  // Cultural regions label theme
  try {
    const culturalHalo = mode === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.85)'
    map.setPaintProperty('cultural-regions-label', 'text-halo-color', culturalHalo)
  } catch (_) {}

  // Railway layer theme
  try {
    const railColor = mode === 'dark' ? '#555555' : '#777777'
    map.setPaintProperty('custom-rail-lines', 'line-color', railColor)
  } catch (_) {}

  // Mountain labels theme
  try {
    const mtnColor = mode === 'dark' ? '#888888' : '#777777'
    const mtnHalo = mode === 'dark' ? '#1e1e22' : '#e8e8e8'
    map.setPaintProperty('mountain-labels', 'text-color', mtnColor)
    map.setPaintProperty('mountain-labels', 'text-halo-color', mtnHalo)
  } catch (_) {}

  // Silk road city labels + dots theme
  try {
    const silkHalo = mode === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.85)'
    const silkStroke = mode === 'dark' ? '#1e1e22' : '#ffffff'
    map.setPaintProperty('silk-road-city-labels', 'text-halo-color', silkHalo)
    map.setPaintProperty('silk-road-cities', 'circle-stroke-color', silkStroke)
  } catch (_) {}
}

/**
 * Switch map to HIGH mode — satellite + hillshade sculptural.
 * Couche 1 : satellite Mapbox désaturé 25 %, couleurs naturelles visibles.
 * Couche 2 : hillshade prune/beurre à 50 % opacité par-dessus.
 * Couche 3 : eau bleu pastel pour masquer le bleu satellite.
 * Pas de landcover, pas de fond beige.
 */
export function applyHighMode(map) {
  // ── Satellite raster source ──
  if (!map.getSource('satellite-tiles')) {
    map.addSource('satellite-tiles', {
      type: 'raster',
      url: 'mapbox://mapbox.satellite',
      tileSize: 256,
    })
  }

  const beforeId = 'hillshade-layer'

  // ── Couche 1 : satellite — désaturation légère, couleurs naturelles ──
  const satPaint = {
    'raster-saturation': -0.1,
    'raster-brightness-min': 0.08,
    'raster-brightness-max': 1.1,
    'raster-contrast': 0.15,
  }
  if (!map.getLayer('satellite-base')) {
    map.addLayer({ id: 'satellite-base', type: 'raster', source: 'satellite-tiles', paint: satPaint }, beforeId)
  } else {
    map.setLayoutProperty('satellite-base', 'visibility', 'visible')
    for (const [k, v] of Object.entries(satPaint)) map.setPaintProperty('satellite-base', k, v)
  }

  // ── Hide country fills + all other fills (satellite replaces everything) ──
  try { map.setPaintProperty('country-fills-traversed', 'fill-opacity', 0) } catch (_) {}
  try { map.setPaintProperty('country-fills-other', 'fill-opacity', 0) } catch (_) {}

  const style = map.getStyle()
  if (!style) return

  for (const layer of style.layers) {
    if (layer.type !== 'fill') continue
    if (layer.id === 'water' || layer.id.startsWith('country-fills-') ||
        layer.id.startsWith('geopolitics-') || layer.id.startsWith('climate-') ||
        layer.id.startsWith('cultural-')) continue
    try { map.setPaintProperty(layer.id, 'fill-opacity', 0) } catch (_) {}
  }

  // ── Couche 2 : hillshade — sculptural, semi-transparent pour laisser le satellite visible ──
  try {
    map.setPaintProperty('hillshade-layer', 'hillshade-exaggeration', 1.0)
    map.setPaintProperty('hillshade-layer', 'hillshade-shadow-color', '#2a1b3d')
    map.setPaintProperty('hillshade-layer', 'hillshade-highlight-color', '#f5ecd0')
    map.setPaintProperty('hillshade-layer', 'hillshade-accent-color', '#5a4a6a')
    map.setLayoutProperty('hillshade-layer', 'visibility', 'visible')
  } catch (_) {}

  // ── Couche 3 : eau bleu pastel — masque le bleu foncé satellite ──
  try {
    map.setPaintProperty('water', 'fill-color', '#d4e4ed')
    map.setPaintProperty('water', 'fill-opacity', 1)
  } catch (_) {}
  try {
    map.setPaintProperty('waterway', 'line-color', '#b8d0e0')
    map.setPaintProperty('waterway', 'line-opacity', 0.8)
  } catch (_) {}

  // ── Labels Mapbox natifs — gris foncé, halos clairs ──
  for (const layer of style.layers) {
    if (layer.type !== 'symbol') continue
    if (layer.id.startsWith('capitals-') || layer.id.startsWith('waterways-') ||
        layer.id.startsWith('climate-') || layer.id.startsWith('cultural-') ||
        layer.id.startsWith('silk-road') || layer.id === 'mountain-labels' ||
        layer.id === 'contour-labels') continue
    try {
      map.setPaintProperty(layer.id, 'text-color', '#444444')
      map.setPaintProperty(layer.id, 'text-halo-color', 'rgba(255,255,255,0.85)')
      map.setPaintProperty(layer.id, 'text-halo-width', 1.8)
    } catch (_) {}
  }

  // Country labels
  try {
    map.setPaintProperty('country-label', 'text-color', '#333333')
    map.setPaintProperty('country-label', 'text-halo-color', 'rgba(255,255,255,0.9)')
    map.setPaintProperty('country-label', 'text-halo-width', 2.5)
  } catch (_) {}

  // Country outlines
  try {
    map.setPaintProperty('country-outlines-traversed', 'line-color', '#555555')
    map.setPaintProperty('country-outlines-traversed', 'line-opacity', 0.5)
  } catch (_) {}

  // Admin boundaries
  for (const layer of style.layers) {
    if (layer.id.startsWith('admin-')) {
      try {
        map.setPaintProperty(layer.id, 'line-color', '#888888')
        map.setPaintProperty(layer.id, 'line-opacity', 0.3)
      } catch (_) {}
    }
  }

  // Roads — very subtle
  for (const layer of style.layers) {
    if (ROAD_LAYERS.includes(layer.id)) {
      try {
        map.setPaintProperty(layer.id, 'line-color', '#999999')
        map.setPaintProperty(layer.id, 'line-opacity', 0.15)
      } catch (_) {}
    }
  }

  // ── Custom layers theming ──

  // Markers
  try {
    map.setPaintProperty('steps-simple', 'circle-stroke-color', '#ffffff')
    map.setPaintProperty('steps-releve', 'circle-stroke-color', '#ffffff')
  } catch (_) {}

  // Route halos
  for (const layer of style.layers) {
    if (layer.id.startsWith('route-halo-')) {
      try { map.setPaintProperty(layer.id, 'line-color', 'rgba(255,255,255,0.5)') } catch (_) {}
    }
  }

  // Capitals
  try {
    map.setPaintProperty('capitals-marker', 'circle-color', '#3a3a3a')
    map.setPaintProperty('capitals-marker', 'circle-stroke-color', '#ffffff')
    map.setPaintProperty('capitals-label', 'text-color', '#3a3a3a')
    map.setPaintProperty('capitals-label', 'text-halo-color', 'rgba(255,255,255,0.85)')
  } catch (_) {}

  // Contours
  try {
    map.setPaintProperty('contour-lines', 'line-color', '#8a8a7a')
    map.setPaintProperty('contour-labels', 'text-color', '#6a6a60')
    map.setPaintProperty('contour-labels', 'text-halo-color', 'rgba(255,255,255,0.7)')
  } catch (_) {}

  // Waterway labels
  try {
    map.setPaintProperty('waterways-label-rivers', 'text-color', '#5a7080')
    map.setPaintProperty('waterways-label-rivers', 'text-halo-color', 'rgba(255,255,255,0.8)')
    map.setPaintProperty('waterways-label-seas', 'text-color', '#5a7080')
    map.setPaintProperty('waterways-label-seas', 'text-halo-color', 'rgba(255,255,255,0.8)')
  } catch (_) {}

  // Mountain labels
  try {
    map.setPaintProperty('mountain-labels', 'text-color', '#555550')
    map.setPaintProperty('mountain-labels', 'text-halo-color', 'rgba(255,255,255,0.75)')
  } catch (_) {}

  // Railways
  try { map.setPaintProperty('custom-rail-lines', 'line-color', '#666666') } catch (_) {}

  // Silk roads
  try {
    map.setPaintProperty('silk-road-city-labels', 'text-halo-color', 'rgba(255,255,255,0.85)')
    map.setPaintProperty('silk-road-cities', 'circle-stroke-color', '#ffffff')
  } catch (_) {}

  // Climate / cultural labels
  try { map.setPaintProperty('climate-zones-label', 'text-halo-color', 'rgba(255,255,255,0.8)') } catch (_) {}
  try { map.setPaintProperty('cultural-regions-label', 'text-halo-color', 'rgba(255,255,255,0.85)') } catch (_) {}
}

/**
 * Switch map back to LOW mode (atlas gris).
 * Removes satellite layer, restores hillshade defaults,
 * then re-applies the Low theme (light or dark).
 */
export function removeHighMode(map, darkMode) {
  // Hide satellite layer
  try { map.setLayoutProperty('satellite-base', 'visibility', 'none') } catch (_) {}

  // Restore country fills
  try { map.setPaintProperty('country-fills-traversed', 'fill-opacity', 1) } catch (_) {}
  try { map.setPaintProperty('country-fills-other', 'fill-opacity', 1) } catch (_) {}

  // Re-apply the standard Low theme
  applyTheme(map, darkMode ? 'dark' : 'light')
}
