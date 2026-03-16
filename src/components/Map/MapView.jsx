import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { buildRouteSegments } from '../../utils/buildRouteSegments'
import { applyTheme, TRAVERSED_COUNTRIES } from '../../utils/mapTheme'

const CENTER = [50, 55]
const ZOOM = 3

export default forwardRef(function MapView({ darkMode }, ref) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const readyRef = useRef(false)
  const segmentCountRef = useRef(0)

  useImperativeHandle(ref, () => ({
    getMap: () => mapRef.current,
    getSegmentCount: () => segmentCountRef.current,
  }))

  useEffect(() => {
    if (readyRef.current && mapRef.current) {
      applyTheme(mapRef.current, darkMode ? 'dark' : 'light')
    }
  }, [darkMode])

  useEffect(() => {
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
            'hillshade-exaggeration': 0.55,
            'hillshade-shadow-color': '#666666',
            'hillshade-highlight-color': '#fafafa',
            'hillshade-illumination-direction': 315,
            'hillshade-illumination-anchor': 'map',
            'hillshade-accent-color': '#aaaaaa',
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
        // Regions: only in traversed countries
        map.setPaintProperty('state-label', 'text-opacity', [
          'case',
          ['in', ['get', 'iso_3166_1'], ['literal', TRAVERSED_COUNTRIES]],
          0.8,
          0,
        ])
      } catch (_) {}

      // ============================================================
      // E. ROUTE TRACE + MARKERS
      // ============================================================
      Promise.all([
        fetch('/data/locations.json').then((r) => r.json()),
        fetch('/data/data_model.json').then((r) => r.json()),
      ]).then(([locData, dataModel]) => {
        const zones = dataModel.meta.zones
        const segments = buildRouteSegments(
          locData.locations,
          dataModel.steps,
          zones
        )

        segmentCountRef.current = segments.length
        segments.forEach((seg, i) => {
          const sourceId = `route-segment-${i}`
          map.addSource(sourceId, { type: 'geojson', data: seg.geojson })

          map.addLayer(
            {
              id: `route-halo-${i}`,
              type: 'line',
              source: sourceId,
              layout: { 'line-join': 'round', 'line-cap': 'round' },
              paint: {
                'line-color': '#ffffff',
                'line-width': 5,
                'line-opacity': 0.4,
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
          features: dataModel.steps.map((step) => ({
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
            console.log('Step clicked:', props.id, props.name)
          })
        })

        // Apply initial theme
        readyRef.current = true
        applyTheme(map, darkMode ? 'dark' : 'light')
      })
    })

    return () => map.remove()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      style={{ width: '100vw', height: '100vh' }}
    />
  )
})
