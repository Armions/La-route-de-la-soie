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
