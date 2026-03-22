import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { buildRouteSegments } from '../../utils/buildRouteSegments'
import { applyTheme, TRAVERSED_COUNTRIES } from '../../utils/mapTheme'

const CENTER = [50, 55]
const ZOOM = 3

export default forwardRef(function MapView({ darkMode, steps, meta, locations, onStepClick, onMapMove, highlightedZone, timelineHoverFrac }, ref) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const readyRef = useRef(false)
  const segmentCountRef = useRef(0)
  const segmentZonesRef = useRef([]) // zone per route segment index
  const sortedLocationsRef = useRef(null) // GPS points sorted by time
  const hoverMarkerRef = useRef(null) // Mapbox marker for timeline hover
  const coordsRef = useRef(null)
  const onStepClickRef = useRef(onStepClick)
  const onMapMoveRef = useRef(onMapMove)
  onStepClickRef.current = onStepClick
  onMapMoveRef.current = onMapMove

  useImperativeHandle(ref, () => ({
    getMap: () => mapRef.current,
    getSegmentCount: () => segmentCountRef.current,
  }))

  useEffect(() => {
    if (readyRef.current && mapRef.current) {
      applyTheme(mapRef.current, darkMode ? 'dark' : 'light')
    }
  }, [darkMode])

  // Highlight route segments matching hovered zone on frise
  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current) return
    const count = segmentCountRef.current
    const zones = segmentZonesRef.current

    for (let i = 0; i < count; i++) {
      try {
        if (highlightedZone) {
          const match = zones[i] === highlightedZone
          map.setPaintProperty(`route-line-${i}`, 'line-opacity', match ? 1 : 0.2)
          map.setPaintProperty(`route-halo-${i}`, 'line-opacity', match ? 1 : 0.1)
        } else {
          map.setPaintProperty(`route-line-${i}`, 'line-opacity', 0.9)
          map.setPaintProperty(`route-halo-${i}`, 'line-opacity', 0.9)
        }
      } catch (_) {}
    }
  }, [highlightedZone])

  // Timeline hover → show glowing dot on route at interpolated GPS position
  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current) return

    if (!timelineHoverFrac) {
      // Remove marker
      if (hoverMarkerRef.current) {
        hoverMarkerRef.current.remove()
        hoverMarkerRef.current = null
      }
      return
    }

    const sorted = sortedLocationsRef.current
    if (!sorted || sorted.length === 0) return

    const { frac, zoneColor } = timelineHoverFrac

    // Interpolate position: frac 0→1 maps to sorted GPS array
    const idx = frac * (sorted.length - 1)
    const lo = Math.floor(idx)
    const hi = Math.min(lo + 1, sorted.length - 1)
    const t = idx - lo
    const lon = sorted[lo].lon + t * (sorted[hi].lon - sorted[lo].lon)
    const lat = sorted[lo].lat + t * (sorted[hi].lat - sorted[lo].lat)

    // Create or update marker
    if (!hoverMarkerRef.current) {
      const el = document.createElement('div')
      el.style.width = '12px'
      el.style.height = '12px'
      el.style.borderRadius = '50%'
      el.style.background = '#ffffff'
      el.style.border = `2.5px solid ${zoneColor}`
      el.style.boxShadow = `0 0 8px ${zoneColor}, 0 0 3px rgba(0,0,0,0.3)`
      el.style.pointerEvents = 'none'
      el.style.transition = 'border-color 100ms'
      hoverMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([lon, lat])
        .addTo(map)
    } else {
      hoverMarkerRef.current.setLngLat([lon, lat])
      const el = hoverMarkerRef.current.getElement()
      el.style.border = `2.5px solid ${zoneColor}`
      el.style.boxShadow = `0 0 8px ${zoneColor}, 0 0 3px rgba(0,0,0,0.3)`
    }
  }, [timelineHoverFrac])

  useEffect(() => {
    if (!steps || !meta || !locations) return

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: CENTER,
      zoom: ZOOM,
      projection: 'mercator',
      language: 'fr',
    })

    mapRef.current = map

    map.on('style.load', () => {
      // ============================================================
      // A. COUNTRY BOUNDARIES SOURCE — for differentiated fills
      // ============================================================
      map.addSource('country-boundaries', {
        type: 'vector',
        url: 'mapbox://mapbox.country-boundaries-v1',
      })

      // Find insertion point: above background, below everything else
      const firstNonBgLayer = map
        .getStyle()
        .layers.find((l) => l.id !== 'land')?.id

      // Fill: non-traversed countries — gray #d0d0d0
      map.addLayer(
        {
          id: 'country-fills-other',
          type: 'fill',
          source: 'country-boundaries',
          'source-layer': 'country_boundaries',
          filter: [
            'all',
            ['!', ['in', ['get', 'iso_3166_1'], ['literal', TRAVERSED_COUNTRIES]]],
            ['==', ['get', 'disputed'], 'false'],
            ['any',
              ['==', 'all', ['get', 'worldview']],
              ['in', 'US', ['get', 'worldview']],
            ],
          ],
          paint: {
            'fill-color': '#d0d0d0',
            'fill-opacity': 1,
          },
        },
        firstNonBgLayer
      )

      // Fill: traversed countries — light #e8e8e8
      map.addLayer(
        {
          id: 'country-fills-traversed',
          type: 'fill',
          source: 'country-boundaries',
          'source-layer': 'country_boundaries',
          filter: [
            'all',
            ['in', ['get', 'iso_3166_1'], ['literal', TRAVERSED_COUNTRIES]],
            ['any',
              ['==', 'all', ['get', 'worldview']],
              ['in', 'US', ['get', 'worldview']],
            ],
          ],
          paint: {
            'fill-color': '#e8e8e8',
            'fill-opacity': 1,
          },
        },
        firstNonBgLayer
      )

      // Country outlines — thin black border on traversed countries, always visible
      map.addLayer(
        {
          id: 'country-outlines-traversed',
          type: 'line',
          source: 'country-boundaries',
          'source-layer': 'country_boundaries',
          filter: [
            'all',
            ['in', ['get', 'iso_3166_1'], ['literal', TRAVERSED_COUNTRIES]],
            ['any',
              ['==', 'all', ['get', 'worldview']],
              ['in', 'US', ['get', 'worldview']],
            ],
          ],
          paint: {
            'line-color': '#000000',
            'line-width': 1,
            'line-opacity': 0.5,
          },
        }
      )

      // ============================================================
      // B. TERRAIN DEM + HILLSHADE
      // ============================================================
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      })

      // Insert hillshade ABOVE country fills, BELOW labels
      const firstSymbolId = map
        .getStyle()
        .layers.find((l) => l.type === 'symbol')?.id

      map.addLayer(
        {
          id: 'hillshade-layer',
          type: 'hillshade',
          source: 'mapbox-dem',
          paint: {
            'hillshade-exaggeration': 0.75,
            'hillshade-shadow-color': '#444444',
            'hillshade-highlight-color': '#fafafa',
            'hillshade-illumination-direction': 315,
            'hillshade-illumination-anchor': 'map',
            'hillshade-accent-color': '#888888',
          },
        },
        firstSymbolId
      )

      map.setTerrain({ source: 'mapbox-dem', exaggeration: 0 })

      // ============================================================
      // B2. CONTOUR LINES — mapbox-terrain-v2 vector source
      // ============================================================
      // NOTE: contour vector tiles only available from zoom ~9+
      map.addSource('mapbox-terrain-v2', {
        type: 'vector',
        url: 'mapbox://mapbox.mapbox-terrain-v2',
      })

      // Contour lines — visible from zoom 9 (when tile data exists)
      map.addLayer(
        {
          id: 'contour-lines',
          type: 'line',
          source: 'mapbox-terrain-v2',
          'source-layer': 'contour',
          minzoom: 9,
          paint: {
            'line-color': '#999999',
            'line-width': [
              'interpolate', ['linear'], ['zoom'],
              9, ['case', ['>=', ['get', 'index'], 10], 1.8, ['>=', ['get', 'index'], 5], 0.8, 0.3],
              12, ['case', ['>=', ['get', 'index'], 10], 2.2, ['>=', ['get', 'index'], 5], 1.2, 0.6],
              14, ['case', ['>=', ['get', 'index'], 10], 2.5, ['>=', ['get', 'index'], 5], 1.5, 0.8],
            ],
            'line-opacity': [
              'interpolate', ['linear'], ['zoom'],
              9, ['case', ['>=', ['get', 'index'], 10], 0.7, ['>=', ['get', 'index'], 5], 0.4, 0],
              11, ['case', ['>=', ['get', 'index'], 10], 0.8, ['>=', ['get', 'index'], 5], 0.6, 0.3],
              14, ['case', ['>=', ['get', 'index'], 10], 0.9, ['>=', ['get', 'index'], 5], 0.7, 0.4],
            ],
          },
          layout: {
            'visibility': 'none',
          },
        },
        firstSymbolId
      )

      // Altitude labels — on major contours (index >= 5), from zoom 10
      map.addLayer({
        id: 'contour-labels',
        type: 'symbol',
        source: 'mapbox-terrain-v2',
        'source-layer': 'contour',
        minzoom: 10,
        filter: ['>=', ['get', 'index'], 5],
        layout: {
          'symbol-placement': 'line',
          'text-field': ['concat', ['to-string', ['get', 'ele']], ' m'],
          'text-font': ['DIN Pro Regular', 'Arial Unicode MS Regular'],
          'text-size': 10,
          'text-max-angle': 25,
          'text-padding': 30,
          'visibility': 'none',
        },
        paint: {
          'text-color': '#888888',
          'text-halo-color': '#e8e8e8',
          'text-halo-width': 1,
        },
      })

      // Mountain chain labels — visible at low zoom (3-9) when topo is enabled
      const mountainChains = {
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', properties: { name: 'Alpes' }, geometry: { type: 'Point', coordinates: [10.0, 46.5] } },
          { type: 'Feature', properties: { name: 'Dinarides' }, geometry: { type: 'Point', coordinates: [18.5, 43.5] } },
          { type: 'Feature', properties: { name: 'Caucase' }, geometry: { type: 'Point', coordinates: [43.5, 42.3] } },
          { type: 'Feature', properties: { name: 'Zagros' }, geometry: { type: 'Point', coordinates: [49.0, 33.5] } },
          { type: 'Feature', properties: { name: 'Elbrouz' }, geometry: { type: 'Point', coordinates: [50.5, 36.2] } },
          { type: 'Feature', properties: { name: 'Kopet-Dag' }, geometry: { type: 'Point', coordinates: [57.5, 37.8] } },
          { type: 'Feature', properties: { name: 'Hindu Kush' }, geometry: { type: 'Point', coordinates: [70.5, 36.2] } },
          { type: 'Feature', properties: { name: 'Pamir' }, geometry: { type: 'Point', coordinates: [73.0, 38.8] } },
          { type: 'Feature', properties: { name: 'Tian Shan' }, geometry: { type: 'Point', coordinates: [78.0, 42.0] } },
          { type: 'Feature', properties: { name: 'Kunlun' }, geometry: { type: 'Point', coordinates: [82.0, 36.0] } },
          { type: 'Feature', properties: { name: 'Altaï' }, geometry: { type: 'Point', coordinates: [88.0, 48.5] } },
          { type: 'Feature', properties: { name: 'Himalaya' }, geometry: { type: 'Point', coordinates: [85.0, 28.5] } },
          { type: 'Feature', properties: { name: 'Oural' }, geometry: { type: 'Point', coordinates: [59.0, 55.0] } },
          { type: 'Feature', properties: { name: 'Taklamakan' }, geometry: { type: 'Point', coordinates: [83.5, 39.0] } },
          { type: 'Feature', properties: { name: 'Gobi' }, geometry: { type: 'Point', coordinates: [104.0, 43.0] } },
        ],
      }
      map.addSource('mountain-chains', { type: 'geojson', data: mountainChains })
      map.addLayer({
        id: 'mountain-labels',
        type: 'symbol',
        source: 'mountain-chains',
        maxzoom: 9,
        layout: {
          'text-field': ['concat', '▲ ', ['get', 'name']],
          'text-font': ['DIN Pro Italic', 'Arial Unicode MS Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 3, 11, 7, 14],
          'text-letter-spacing': 0.2,
          'text-allow-overlap': false,
          'visibility': 'none',
        },
        paint: {
          'text-color': '#555555',
          'text-halo-color': '#e8e8e8',
          'text-halo-width': 1.5,
          'text-opacity': ['interpolate', ['linear'], ['zoom'], 3, 0.85, 8, 0.5],
        },
      })

      // ============================================================
      // C. FRENCH LABELS
      // ============================================================
      const style = map.getStyle()
      style.layers.forEach((layer) => {
        if (layer.type === 'symbol' && layer.layout?.['text-field']) {
          try {
            map.setLayoutProperty(layer.id, 'text-field', [
              'coalesce',
              ['get', 'name_fr'],
              ['get', 'name_en'],
              ['get', 'name'],
            ])
          } catch (_) {}
        }
      })

      // ============================================================
      // D. SELECTIVE DISPLAY — dim labels in non-traversed countries
      // ============================================================
      try {
        // Minor settlements: visible only in traversed countries
        map.setPaintProperty('settlement-minor-label', 'text-opacity', [
          'case',
          ['in', ['get', 'iso_3166_1'], ['literal', TRAVERSED_COUNTRIES]],
          1,
          0,
        ])
        // Major settlements: visible in traversed, dim in others
        map.setPaintProperty('settlement-major-label', 'text-opacity', [
          'case',
          ['in', ['get', 'iso_3166_1'], ['literal', TRAVERSED_COUNTRIES]],
          1,
          0.15,
        ])
        // Regions: hide entirely — too noisy (especially Chinese provinces)
        map.setLayoutProperty('state-label', 'visibility', 'none')
      } catch (_) {}

      // ============================================================
      // E. ROUTE TRACE + MARKERS (data from props)
      // ============================================================
      const zones = meta.zones
      const segments = buildRouteSegments(locations, steps, zones)

      // Store sorted GPS points for timeline hover interpolation
      sortedLocationsRef.current = [...locations].sort((a, b) => a.time - b.time)

      segmentCountRef.current = segments.length
      segmentZonesRef.current = segments.map((seg) => seg.zone)
      segments.forEach((seg, i) => {
        const sourceId = `route-segment-${i}`
        map.addSource(sourceId, { type: 'geojson', data: seg.geojson })

        // Halo sombre pour lisibilité sur fond gris (surtout zone transit)
        map.addLayer(
          {
            id: `route-halo-${i}`,
            type: 'line',
            source: sourceId,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': 'rgba(0,0,0,0.3)',
              'line-width': 5,
              'line-opacity': 0.9,
            },
          },
          firstSymbolId
        )

        map.addLayer(
          {
            id: `route-line-${i}`,
            type: 'line',
            source: sourceId,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': seg.color,
              'line-width': 2.5,
              'line-opacity': 0.9,
            },
          },
          firstSymbolId
        )
      })

      // Step markers
      const fallbackColor = '#9CA3AF'
      const stepsGeoJSON = {
        type: 'FeatureCollection',
        features: steps.map((step) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [step.coordinates.lon, step.coordinates.lat],
          },
          properties: {
            id: step.id,
            name: step.name,
            zone: step.zone,
            color: zones[step.zone]?.color || fallbackColor,
            is_releve: step.is_releve,
            city: step.location?.city || '',
            country: step.location?.country || '',
            date: step.date_start || '',
            temp: step.weather?.temp != null ? step.weather.temp : '',
            condition: step.weather?.condition || '',
          },
        })),
      }

      map.addSource('steps', { type: 'geojson', data: stepsGeoJSON })

      map.addLayer({
        id: 'steps-simple',
        type: 'circle',
        source: 'steps',
        filter: ['!', ['get', 'is_releve']],
        paint: {
          'circle-radius': 4,
          'circle-color': ['get', 'color'],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.5,
        },
      })

      map.addLayer({
        id: 'steps-releve',
        type: 'circle',
        source: 'steps',
        filter: ['get', 'is_releve'],
        paint: {
          'circle-radius': 6,
          'circle-color': ['get', 'color'],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2.5,
        },
      })

      // ============================================================
      // F. CAPITALS LAYER — diamond markers + italic labels
      // ============================================================
      fetch('/data/layers/capitals.json')
        .then((r) => r.json())
        .then((capitalsData) => {
          if (!map.getSource('capitals')) {
            map.addSource('capitals', { type: 'geojson', data: capitalsData })
          }

          // Diamond marker: rotated square
          map.addLayer({
            id: 'capitals-marker',
            type: 'circle',
            source: 'capitals',
            paint: {
              'circle-radius': 4.5,
              'circle-color': '#3a3a3a',
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 1.2,
            },
            layout: {
              'visibility': 'none',
            },
          })

          // Italic label offset above
          map.addLayer({
            id: 'capitals-label',
            type: 'symbol',
            source: 'capitals',
            layout: {
              'text-field': ['get', 'name'],
              'text-font': ['DIN Pro Italic', 'Arial Unicode MS Regular'],
              'text-size': 12,
              'text-offset': [0, -1.2],
              'text-anchor': 'bottom',
              'text-allow-overlap': false,
              'visibility': 'none',
            },
            paint: {
              'text-color': '#3a3a3a',
              'text-halo-color': '#e8e8e8',
              'text-halo-width': 1.2,
            },
          })
        })
        .catch(() => {})

      // ============================================================
      // G. WATERWAYS LAYER — rivers & seas labels + enhanced water style
      // ============================================================
      fetch('/data/layers/waterways.json')
        .then((r) => r.json())
        .then((waterwaysData) => {
          if (!map.getSource('waterways-labels')) {
            map.addSource('waterways-labels', { type: 'geojson', data: waterwaysData })
          }

          // River labels — smaller, along the route
          map.addLayer({
            id: 'waterways-label-rivers',
            type: 'symbol',
            source: 'waterways-labels',
            filter: ['==', ['get', 'type'], 'river'],
            layout: {
              'text-field': ['get', 'name'],
              'text-font': ['DIN Pro Italic', 'Arial Unicode MS Regular'],
              'text-size': 11,
              'text-letter-spacing': 0.05,
              'text-allow-overlap': false,
              'visibility': 'none',
            },
            paint: {
              'text-color': '#5B8FA8',
              'text-halo-color': '#e8e8e8',
              'text-halo-width': 1,
            },
          })

          // Sea labels — larger, spaced out
          map.addLayer({
            id: 'waterways-label-seas',
            type: 'symbol',
            source: 'waterways-labels',
            filter: ['==', ['get', 'type'], 'sea'],
            layout: {
              'text-field': ['get', 'name'],
              'text-font': ['DIN Pro Italic', 'Arial Unicode MS Regular'],
              'text-size': 13,
              'text-letter-spacing': 0.15,
              'text-allow-overlap': false,
              'visibility': 'none',
            },
            paint: {
              'text-color': '#5B8FA8',
              'text-halo-color': '#e8e8e8',
              'text-halo-width': 1.2,
            },
          })
        })
        .catch(() => {})

      // ============================================================
      // H. CLIMATE ZONES — Köppen-Geiger polygons
      // ============================================================
      fetch('/data/layers/climate_zones.json')
        .then((r) => r.json())
        .then((climateData) => {
          if (!map.getSource('climate-zones')) {
            map.addSource('climate-zones', { type: 'geojson', data: climateData })
          }

          // Filled polygons — semi-transparent, color from feature property
          map.addLayer(
            {
              id: 'climate-zones-fill',
              type: 'fill',
              source: 'climate-zones',
              paint: {
                'fill-color': ['get', 'color'],
                'fill-opacity': 0.3,
              },
              layout: { 'visibility': 'none' },
            },
            firstSymbolId
          )

          // Borders
          map.addLayer(
            {
              id: 'climate-zones-border',
              type: 'line',
              source: 'climate-zones',
              paint: {
                'line-color': ['get', 'color'],
                'line-width': 1.5,
                'line-opacity': 0.8,
              },
              layout: { 'visibility': 'none' },
            },
            firstSymbolId
          )

          // Zone labels — code + name at centroid
          map.addLayer({
            id: 'climate-zones-label',
            type: 'symbol',
            source: 'climate-zones',
            layout: {
              'text-field': ['concat', ['get', 'code'], '\n', ['get', 'name']],
              'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
              'text-size': 11,
              'text-allow-overlap': false,
              'visibility': 'none',
            },
            paint: {
              'text-color': ['get', 'color'],
              'text-halo-color': 'rgba(255,255,255,0.8)',
              'text-halo-width': 1.5,
            },
          })
        })
        .catch(() => {})

      // ============================================================
      // I. CULTURAL REGIONS — using real country boundaries
      // ============================================================
      const CULTURAL_COUNTRIES = {
        'mediterranee': { codes: ['IT', 'GR', 'TR'], color: '#E8A87C' },
        'caucase': { codes: ['GE', 'AM'], color: '#85C1A3' },
        'asie-centrale': { codes: ['KZ', 'UZ', 'KG'], color: '#B8A9D4' },
        'monde-chinois': { codes: ['CN', 'HK'], color: '#E8B4B8' },
        'japon': { codes: ['JP'], color: '#7EB5D6' },
      }

      Object.entries(CULTURAL_COUNTRIES).forEach(([id, { codes, color }]) => {
        map.addLayer(
          {
            id: `cultural-region-fill-${id}`,
            type: 'fill',
            source: 'country-boundaries',
            'source-layer': 'country_boundaries',
            filter: [
              'all',
              ['in', ['get', 'iso_3166_1'], ['literal', codes]],
              ['any',
                ['==', 'all', ['get', 'worldview']],
                ['in', 'US', ['get', 'worldview']],
              ],
            ],
            paint: {
              'fill-color': color,
              'fill-opacity': 0.25,
            },
            layout: { 'visibility': 'none' },
          },
          firstSymbolId
        )
      })

      // Label points for cultural regions (centroids)
      const culturalLabels = {
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', properties: { id: 'mediterranee', name: 'Bassin méditerranéen', color: '#E8A87C' }, geometry: { type: 'Point', coordinates: [15.0, 40.0] } },
          { type: 'Feature', properties: { id: 'caucase', name: 'Caucase', color: '#85C1A3' }, geometry: { type: 'Point', coordinates: [43.5, 42.0] } },
          { type: 'Feature', properties: { id: 'asie-centrale', name: 'Asie centrale', color: '#B8A9D4' }, geometry: { type: 'Point', coordinates: [65.0, 44.0] } },
          { type: 'Feature', properties: { id: 'monde-chinois', name: 'Monde chinois', color: '#E8B4B8' }, geometry: { type: 'Point', coordinates: [105.0, 35.0] } },
          { type: 'Feature', properties: { id: 'japon', name: 'Archipel japonais', color: '#7EB5D6' }, geometry: { type: 'Point', coordinates: [137.0, 37.0] } },
        ],
      }
      map.addSource('cultural-regions-labels', { type: 'geojson', data: culturalLabels })
      map.addLayer({
        id: 'cultural-regions-label',
        type: 'symbol',
        source: 'cultural-regions-labels',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
          'text-size': 13,
          'text-allow-overlap': false,
          'visibility': 'none',
        },
        paint: {
          'text-color': ['get', 'color'],
          'text-halo-color': 'rgba(255,255,255,0.85)',
          'text-halo-width': 1.8,
        },
      })

      // ============================================================
      // I2. SILK ROADS — routes historiques de la soie
      // ============================================================
      fetch('/data/layers/silk_roads.json')
        .then((r) => r.json())
        .then((silkData) => {
          if (!map.getSource('silk-roads')) {
            map.addSource('silk-roads', { type: 'geojson', data: silkData })
          }

          // Route terrestre du Nord — or ancien, tireté long
          map.addLayer(
            {
              id: 'silk-road-terrestre-nord',
              type: 'line',
              source: 'silk-roads',
              filter: ['==', ['get', 'id'], 'terrestre-nord'],
              paint: {
                'line-color': '#8B6914',
                'line-width': 2,
                'line-opacity': 0.8,
                'line-dasharray': [8, 4],
              },
              layout: { 'visibility': 'none', 'line-join': 'round', 'line-cap': 'round' },
            },
            firstSymbolId
          )

          // Route terrestre du Sud — brun, tireté court
          map.addLayer(
            {
              id: 'silk-road-terrestre-sud',
              type: 'line',
              source: 'silk-roads',
              filter: ['==', ['get', 'id'], 'terrestre-sud'],
              paint: {
                'line-color': '#A0522D',
                'line-width': 2,
                'line-opacity': 0.8,
                'line-dasharray': [4, 3],
              },
              layout: { 'visibility': 'none', 'line-join': 'round', 'line-cap': 'round' },
            },
            firstSymbolId
          )

          // Route maritime — bleu-gris, tireté
          map.addLayer(
            {
              id: 'silk-road-maritime',
              type: 'line',
              source: 'silk-roads',
              filter: ['==', ['get', 'id'], 'maritime'],
              paint: {
                'line-color': '#4A708B',
                'line-width': 2,
                'line-opacity': 0.8,
                'line-dasharray': [6, 4],
              },
              layout: { 'visibility': 'none', 'line-join': 'round', 'line-cap': 'round' },
            },
            firstSymbolId
          )

          // Route des Steppes — brun foncé, tireté court
          map.addLayer(
            {
              id: 'silk-road-steppes',
              type: 'line',
              source: 'silk-roads',
              filter: ['==', ['get', 'id'], 'steppes'],
              paint: {
                'line-color': '#6B4226',
                'line-width': 2,
                'line-opacity': 0.8,
                'line-dasharray': [3, 3],
              },
              layout: { 'visibility': 'none', 'line-join': 'round', 'line-cap': 'round' },
            },
            firstSymbolId
          )

          // Route vers l'Inde — brun-rouge, tireté
          map.addLayer(
            {
              id: 'silk-road-inde',
              type: 'line',
              source: 'silk-roads',
              filter: ['==', ['get', 'id'], 'inde'],
              paint: {
                'line-color': '#8B4513',
                'line-width': 2,
                'line-opacity': 0.8,
                'line-dasharray': [5, 3],
              },
              layout: { 'visibility': 'none', 'line-join': 'round', 'line-cap': 'round' },
            },
            firstSymbolId
          )

          // Villes-étapes historiques — petits points colorés par route
          map.addLayer({
            id: 'silk-road-cities',
            type: 'circle',
            source: 'silk-roads',
            filter: ['==', ['get', 'type'], 'city'],
            paint: {
              'circle-radius': 3.5,
              'circle-color': ['get', 'color'],
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 1,
              'circle-opacity': 0.9,
            },
            layout: { 'visibility': 'none' },
          })

          // Labels pour les villes principales (zoom > 5)
          map.addLayer({
            id: 'silk-road-city-labels',
            type: 'symbol',
            source: 'silk-roads',
            filter: ['==', ['get', 'type'], 'city'],
            minzoom: 5,
            layout: {
              'text-field': [
                'case',
                ['!=', ['get', 'name_ancien'], null],
                ['concat', ['get', 'name'], ' (', ['get', 'name_ancien'], ')'],
                ['get', 'name'],
              ],
              'text-font': ['DIN Pro Italic', 'Arial Unicode MS Regular'],
              'text-size': 10,
              'text-offset': [0, 1.2],
              'text-anchor': 'top',
              'text-allow-overlap': false,
              'visibility': 'none',
            },
            paint: {
              'text-color': ['get', 'color'],
              'text-halo-color': 'rgba(255,255,255,0.85)',
              'text-halo-width': 1.2,
            },
          })
        })
        .catch(() => {})

      // Tooltip — silk road cities
      const silkPopup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 8,
        maxWidth: '220px',
        className: 'silk-tooltip',
      })
      map.on('mouseenter', 'silk-road-cities', (e) => {
        map.getCanvas().style.cursor = 'pointer'
        const props = e.features[0].properties
        const ancien = props.name_ancien
        const label = ancien && ancien !== 'null'
          ? `<strong>${props.name}</strong> (${ancien})`
          : `<strong>${props.name}</strong>`
        silkPopup
          .setLngLat(e.features[0].geometry.coordinates.slice())
          .setHTML(`<div style="font-size:12px;line-height:1.3;color:#555">${label}</div>`)
          .addTo(map)
      })
      map.on('mouseleave', 'silk-road-cities', () => {
        map.getCanvas().style.cursor = ''
        silkPopup.remove()
      })

      // ============================================================
      // J. GEOPOLITICS — conflits, frontières fermées, pays déconseillés
      // ============================================================
      // DIAGNOSTIC — log available Mapbox sources & boundary layers
      console.group('🗺️ Geopolitics — diagnostic Mapbox')
      const allLayers = map.getStyle().layers
      const boundaryLayers = allLayers.filter((l) =>
        /(admin|boundary|border|country|disputed)/i.test(l.id)
      )
      console.log('Boundary-related layers:', boundaryLayers.map((l) => ({
        id: l.id, type: l.type, source: l.source, sourceLayer: l['source-layer'],
      })))
      // Query country-boundaries source properties
      console.log('country-boundaries source:', map.getSource('country-boundaries'))
      // Check if enterprise boundaries are available
      const sources = map.getStyle().sources
      console.log('Available sources:', Object.keys(sources))
      console.groupEnd()

      // ---- NIVEAU 3 — Pays déconseillés (rouge clair) ----
      // Uses Mapbox country-boundaries-v1 vector tiles = REAL country polygons
      map.addLayer(
        {
          id: 'geopolitics-deconseille-fill',
          type: 'fill',
          source: 'country-boundaries',
          'source-layer': 'country_boundaries',
          filter: [
            'all',
            ['in', ['get', 'iso_3166_1'], ['literal', ['IR', 'RU', 'AZ']]],
            ['any',
              ['==', 'all', ['get', 'worldview']],
              ['in', 'US', ['get', 'worldview']],
            ],
          ],
          paint: {
            'fill-color': '#E74C3C',
            'fill-opacity': 0.15,
          },
          layout: { 'visibility': 'none' },
        },
        firstSymbolId
      )

      // Outline for déconseillé countries
      map.addLayer(
        {
          id: 'geopolitics-deconseille-border',
          type: 'line',
          source: 'country-boundaries',
          'source-layer': 'country_boundaries',
          filter: [
            'all',
            ['in', ['get', 'iso_3166_1'], ['literal', ['IR', 'RU', 'AZ']]],
            ['any',
              ['==', 'all', ['get', 'worldview']],
              ['in', 'US', ['get', 'worldview']],
            ],
          ],
          paint: {
            'line-color': '#E74C3C',
            'line-width': 1,
            'line-opacity': 0.4,
          },
          layout: { 'visibility': 'none' },
        },
        firstSymbolId
      )

      // ---- NIVEAU 1 & 2 — Conflict zones + closed borders from precise GeoJSON ----
      fetch('/data/layers/geopolitics.json')
        .then((r) => r.json())
        .then((geoData) => {
          if (!map.getSource('geopolitics')) {
            map.addSource('geopolitics', { type: 'geojson', data: geoData })
          }

          // Conflict zones — fill (rouge foncé)
          map.addLayer(
            {
              id: 'geopolitics-conflict-fill',
              type: 'fill',
              source: 'geopolitics',
              filter: ['==', ['get', 'level'], 'conflict'],
              paint: {
                'fill-color': '#C0392B',
                'fill-opacity': 0.4,
              },
              layout: { 'visibility': 'none' },
            },
            firstSymbolId
          )

          // Conflict zones — border outline
          map.addLayer(
            {
              id: 'geopolitics-conflict-border',
              type: 'line',
              source: 'geopolitics',
              filter: ['==', ['get', 'level'], 'conflict'],
              paint: {
                'line-color': '#C0392B',
                'line-width': 1.5,
                'line-opacity': 0.7,
              },
              layout: { 'visibility': 'none' },
            },
            firstSymbolId
          )

          // Closed borders — dashed red lines (4px), placed ABOVE all other layers
          map.addLayer(
            {
              id: 'geopolitics-border-line',
              type: 'line',
              source: 'geopolitics',
              filter: ['==', ['get', 'level'], 'border'],
              paint: {
                'line-color': '#E74C3C',
                'line-width': 4,
                'line-opacity': 0.9,
                'line-dasharray': [4, 3],
              },
              layout: { 'visibility': 'none' },
            }
            // No beforeId → placed on top of all layers
          )
        })
        .catch((err) => console.warn('Geopolitics GeoJSON load error:', err))

      // ---- TOOLTIPS ----
      const geoPopup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 10,
        maxWidth: '300px',
        className: 'geo-tooltip',
      })

      // Tooltip data for déconseillé countries (vector tiles have no tooltip property)
      const DECONSEILLE_INFO = {
        'IR': { name: 'Iran', tooltip: "Formellement déconseillé par le MEAE. Frontières terrestres non praticables." },
        'RU': { name: 'Russie', tooltip: "Formellement déconseillé par le MEAE depuis 2022. Traversée effectuée (Vladikavkaz → Astrakhan)." },
        'AZ': { name: 'Azerbaïdjan', tooltip: "Inaccessible depuis l'Arménie. Relations diplomatiques rompues." },
      }

      // Deconseille layer tooltip — country-boundaries source, look up by ISO
      map.on('mouseenter', 'geopolitics-deconseille-fill', (e) => {
        map.getCanvas().style.cursor = 'pointer'
        const iso = e.features[0].properties.iso_3166_1
        const info = DECONSEILLE_INFO[iso]
        if (info) {
          geoPopup.setLngLat(e.lngLat)
            .setHTML(
              `<div style="font-size:12px;line-height:1.4">` +
              `<strong style="color:#C0392B">${info.name}</strong><br/>` +
              `<span style="color:#555">${info.tooltip}</span></div>`
            )
            .addTo(map)
        }
      })
      map.on('mousemove', 'geopolitics-deconseille-fill', (e) => {
        geoPopup.setLngLat(e.lngLat)
      })
      map.on('mouseleave', 'geopolitics-deconseille-fill', () => {
        map.getCanvas().style.cursor = ''
        geoPopup.remove()
      })

      // Conflict zones + closed borders — GeoJSON source with tooltip in properties
      const geoTooltipLayers = ['geopolitics-conflict-fill', 'geopolitics-border-line']
      geoTooltipLayers.forEach((layerId) => {
        map.on('mouseenter', layerId, (e) => {
          map.getCanvas().style.cursor = 'pointer'
          const props = e.features[0].properties
          geoPopup
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="font-size:12px;line-height:1.4">` +
              `<strong style="color:#C0392B">${props.name}</strong><br/>` +
              `<span style="color:#555">${props.tooltip}</span></div>`
            )
            .addTo(map)
        })
        map.on('mousemove', layerId, (e) => {
          geoPopup.setLngLat(e.lngLat)
        })
        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = ''
          geoPopup.remove()
        })
      })

      // Tooltip — steps
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 10,
        className: 'step-tooltip',
      })

      const stepLayers = ['steps-simple', 'steps-releve']
      stepLayers.forEach((layerId) => {
        map.on('mouseenter', layerId, (e) => {
          map.getCanvas().style.cursor = 'pointer'
          const props = e.features[0].properties
          const coords = e.features[0].geometry.coordinates.slice()
          // Build rich tooltip: name, ville/pays, date, température
          const lines = [`<strong style="font-size:13px">${props.name}</strong>`]
          const loc = [props.city, props.country].filter(Boolean).join(', ')
          if (loc) lines.push(`<span style="font-size:11px;color:#777">${loc}</span>`)
          if (props.date) {
            const d = new Date(props.date)
            const dateFr = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
            lines.push(`<span style="font-size:11px;color:#888">${dateFr}</span>`)
          }
          if (props.temp !== '' && props.temp !== null) {
            const condIcons = { sunny: '☀️', cloudy: '⛅', overcast: '☁️', rain: '🌧', snow: '❄️' }
            const icon = condIcons[props.condition] || ''
            lines.push(`<span style="font-size:11px;color:#888">${icon} ${props.temp}°C</span>`)
          }
          popup
            .setLngLat(coords)
            .setHTML(`<div style="line-height:1.5;display:flex;flex-direction:column">${lines.join('')}</div>`)
            .addTo(map)
        })
        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = ''
          popup.remove()
        })
        map.on('click', layerId, (e) => {
          const props = e.features[0].properties
          const stepId = typeof props.id === 'string' ? parseInt(props.id, 10) : props.id
          const step = steps.find((s) => s.id === stepId)
          if (step && onStepClickRef.current) {
            onStepClickRef.current(step)
          }
        })
      })

      // Map move → update frise cursor to closest step
      map.on('moveend', () => {
        if (onMapMoveRef.current) {
          onMapMoveRef.current(map.getCenter())
        }
      })

      // Railway layers — static GeoJSON for visibility at ALL zoom levels (3+)
      fetch('/data/layers/railways.json')
        .then((r) => r.json())
        .then((railData) => {
          if (!map.getSource('railways-static')) {
            map.addSource('railways-static', { type: 'geojson', data: railData })
          }
          map.addLayer(
            {
              id: 'custom-rail-lines',
              type: 'line',
              source: 'railways-static',
              minzoom: 3,
              paint: {
                'line-color': '#333333',
                'line-width': [
                  'interpolate', ['linear'], ['zoom'],
                  3, 1.5,
                  6, 2.0,
                  10, 2.5,
                  14, 3.0,
                ],
                'line-opacity': [
                  'interpolate', ['linear'], ['zoom'],
                  3, 0.6,
                  6, 0.75,
                  10, 0.85,
                ],
                'line-dasharray': [4, 3],
              },
              layout: { 'visibility': 'none' },
            },
            firstSymbolId
          )
        })
        .catch((err) => console.warn('Railways GeoJSON load error:', err))
      map._railLayerIds = ['custom-rail-lines']

      // Scale control — bottom-left
      map.addControl(new mapboxgl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left')

      // GPS cursor coordinates — update DOM directly for performance
      map.on('mousemove', (e) => {
        if (coordsRef.current) {
          const { lng, lat } = e.lngLat
          const latDir = lat >= 0 ? 'N' : 'S'
          const lngDir = lng >= 0 ? 'E' : 'W'
          coordsRef.current.textContent = `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`
        }
      })
      map.on('mouseout', () => {
        if (coordsRef.current) coordsRef.current.textContent = ''
      })

      // Apply initial theme
      readyRef.current = true
      applyTheme(map, darkMode ? 'dark' : 'light')
    })

    return () => map.remove()
  }, [steps, meta, locations]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        ref={containerRef}
        style={{ position: 'absolute', inset: 0 }}
      />
      {/* GPS coordinates overlay — bottom-left, above frise */}
      <div
        ref={coordsRef}
        style={{
          position: 'absolute',
          bottom: 108,
          left: 8,
          fontSize: 10.5,
          fontFamily: 'monospace',
          color: darkMode ? '#999' : '#555',
          background: darkMode ? 'rgba(26,26,30,0.75)' : 'rgba(255,255,255,0.75)',
          padding: '3px 8px',
          borderRadius: 4,
          backdropFilter: 'blur(6px)',
          pointerEvents: 'none',
          zIndex: 10,
          whiteSpace: 'nowrap',
        }}
      />
    </div>
  )
})
