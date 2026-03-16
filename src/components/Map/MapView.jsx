import { useEffect, useRef, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { buildRouteSegments } from '../../utils/buildRouteSegments'
import { applyTheme } from '../../utils/mapTheme'

// Center of the journey (Central Asia), zoom 3
const CENTER = [50, 55]
const ZOOM = 3

export default function MapView({ darkMode }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const readyRef = useRef(false)

  // Apply theme whenever darkMode changes (after map is ready)
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
    })

    mapRef.current = map

    map.on('style.load', () => {
      // --- 1. Add Mapbox Terrain DEM source ---
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      })

      // --- 2. Add hillshade layer (below labels) ---
      const firstSymbolId = map
        .getStyle()
        .layers.find((l) => l.type === 'symbol')?.id

      map.addLayer(
        {
          id: 'hillshade-layer',
          type: 'hillshade',
          source: 'mapbox-dem',
          paint: {
            'hillshade-exaggeration': 0.4,
            'hillshade-shadow-color': '#333333',
            'hillshade-highlight-color': '#ffffff',
            'hillshade-illumination-direction': 315,
            'hillshade-illumination-anchor': 'map',
            'hillshade-accent-color': '#aaaaaa',
          },
        },
        firstSymbolId
      )

      // --- 3. Set terrain for 3D relief rendering ---
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 0 })

      // --- 4. Load and display the colored route trace + markers ---
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

        // Route segments
        segments.forEach((seg, i) => {
          const sourceId = `route-segment-${i}`
          const haloId = `route-halo-${i}`
          const lineId = `route-line-${i}`

          map.addSource(sourceId, {
            type: 'geojson',
            data: seg.geojson,
          })

          map.addLayer(
            {
              id: haloId,
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
              id: lineId,
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

        // Step markers (156 stops)
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

        // Simple stops
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

        // Relevé stops
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

        // Tooltip on hover
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

        // Apply initial theme after all layers are added
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
}
