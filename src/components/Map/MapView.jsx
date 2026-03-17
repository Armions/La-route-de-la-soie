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
      map.addSource('mapbox-terrain-v2', {
        type: 'vector',
        url: 'mapbox://mapbox.mapbox-terrain-v2',
      })

      // Contour lines — thin gray, hidden by default
      // index field: 1 = minor contour, 5 = medium (500m intervals), 10 = major (1000m)
      map.addLayer(
        {
          id: 'contour-lines',
          type: 'line',
          source: 'mapbox-terrain-v2',
          'source-layer': 'contour',
          minzoom: 4,
          paint: {
            'line-color': '#666666',
            'line-width': [
              'interpolate', ['linear'], ['zoom'],
              4, ['case', ['>=', ['get', 'index'], 10], 0.8, 0],
              7, ['case', ['>=', ['get', 'index'], 10], 1.2, ['>=', ['get', 'index'], 5], 0.7, 0],
              9, ['case', ['>=', ['get', 'index'], 10], 1.6, ['>=', ['get', 'index'], 5], 1.0, 0.5],
              13, ['case', ['>=', ['get', 'index'], 10], 2.2, ['>=', ['get', 'index'], 5], 1.4, 0.7],
            ],
            'line-opacity': [
              'interpolate', ['linear'], ['zoom'],
              4, ['case', ['>=', ['get', 'index'], 10], 0.7, 0],
              7, ['case', ['>=', ['get', 'index'], 10], 0.8, ['>=', ['get', 'index'], 5], 0.5, 0],
              9, ['case', ['>=', ['get', 'index'], 10], 0.85, ['>=', ['get', 'index'], 5], 0.65, 0.35],
            ],
          },
          layout: {
            'visibility': 'none',
          },
        },
        firstSymbolId
      )

      // Altitude labels — on major contours (index >= 5), hidden by default
      map.addLayer({
        id: 'contour-labels',
        type: 'symbol',
        source: 'mapbox-terrain-v2',
        'source-layer': 'contour',
        minzoom: 7,
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

      // Tooltip
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
          popup
            .setLngLat(coords)
            .setHTML(`<span style="font-size:13px;font-weight:500">${props.name}</span>`)
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

      // Apply initial theme
      readyRef.current = true
      applyTheme(map, darkMode ? 'dark' : 'light')
    })

    return () => map.remove()
  }, [steps, meta, locations]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%' }}
    />
  )
})
