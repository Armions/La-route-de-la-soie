/**
 * Theme definitions and application for the Mapbox map.
 * Switches paint properties dynamically — no style reload needed.
 */

const THEMES = {
  light: {
    ocean: '#b8c0cc',
    land: '#d6d6d6',
    road: '#c8c8c8',
    roadOpacity: 0.3,
    textColor: '#555555',
    textHalo: '#e8e8e8',
    hillshadeShadow: '#333333',
    hillshadeHighlight: '#ffffff',
    hillshadeAccent: '#aaaaaa',
    haloLine: '#ffffff',
    markerStroke: '#ffffff',
  },
  dark: {
    ocean: '#1a1a2e',
    land: '#2a2a2e',
    road: '#3a3a3e',
    roadOpacity: 0.2,
    textColor: '#c0c0c0',
    textHalo: '#1a1a1e',
    hillshadeShadow: '#000000',
    hillshadeHighlight: '#3a3a3a',
    hillshadeAccent: '#222222',
    haloLine: '#000000',
    markerStroke: '#1a1a1e',
  },
}

// Layer IDs to hide entirely
const LAYERS_TO_HIDE = [
  'land-structure-polygon',
  'aeroway-polygon',
  'national-park',
  'landuse',
  'pitch-outline',
  'pitch',
  'golf-hole-line',
  'building-underground',
  'building',
  'building-outline',
  'tunnel-simple',
  'road-simple',
]

/**
 * Apply a theme to the map. Safe to call repeatedly.
 * @param {mapboxgl.Map} map
 * @param {'light'|'dark'} mode
 */
export function applyTheme(map, mode) {
  const t = THEMES[mode]
  if (!t) return

  const style = map.getStyle()
  if (!style) return

  style.layers.forEach((layer) => {
    try {
      // Water / ocean
      if (layer.type === 'fill' && (layer.id.startsWith('water') || layer.id === 'water-shadow')) {
        map.setPaintProperty(layer.id, 'fill-color', t.ocean)
        map.setPaintProperty(layer.id, 'fill-opacity', 1)
        return
      }

      // Land fills
      if (layer.type === 'fill') {
        if (LAYERS_TO_HIDE.includes(layer.id)) {
          map.setLayoutProperty(layer.id, 'visibility', 'none')
          return
        }
        map.setPaintProperty(layer.id, 'fill-color', t.land)
        return
      }

      // Roads / lines
      if (layer.type === 'line' && !layer.id.startsWith('water')) {
        // Skip our route layers
        if (layer.id.startsWith('route-')) return
        map.setPaintProperty(layer.id, 'line-color', t.road)
        map.setPaintProperty(layer.id, 'line-opacity', t.roadOpacity)
        return
      }

      // Labels
      if (layer.type === 'symbol') {
        map.setPaintProperty(layer.id, 'text-color', t.textColor)
        map.setPaintProperty(layer.id, 'text-halo-color', t.textHalo)
        map.setPaintProperty(layer.id, 'text-halo-width', 1)
        return
      }
    } catch (_) {
      // Some layers use expressions — skip gracefully
    }
  })

  // Hillshade
  try {
    map.setPaintProperty('hillshade-layer', 'hillshade-shadow-color', t.hillshadeShadow)
    map.setPaintProperty('hillshade-layer', 'hillshade-highlight-color', t.hillshadeHighlight)
    map.setPaintProperty('hillshade-layer', 'hillshade-accent-color', t.hillshadeAccent)
  } catch (_) {}

  // Route halos
  style.layers.forEach((layer) => {
    if (layer.id.startsWith('route-halo-')) {
      try {
        map.setPaintProperty(layer.id, 'line-color', t.haloLine)
      } catch (_) {}
    }
  })

  // Marker strokes
  try {
    map.setPaintProperty('steps-simple', 'circle-stroke-color', t.markerStroke)
    map.setPaintProperty('steps-releve', 'circle-stroke-color', t.markerStroke)
  } catch (_) {}
}

export { THEMES, LAYERS_TO_HIDE }
