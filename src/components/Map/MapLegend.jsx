import { useState, useEffect, useRef } from 'react'

/**
 * Dynamic map legend — shows currently active layers with their symbol.
 * Adapts to zoom level: low zoom shows broad layers, high zoom shows details.
 * Positioned bottom-right of the map.
 */

const LEGEND_ITEMS = [
  // Low zoom layers (always show when active)
  {
    id: 'route',
    label: 'Tracé du voyage',
    check: (map) => map.getLayoutProperty('route-line-0', 'visibility') !== 'none',
    minZoom: 0,
    maxZoom: 22,
    symbol: (dm) => (
      <svg width="18" height="4"><line x1="0" y1="2" x2="18" y2="2" stroke="#F59E0B" strokeWidth="2.5" /></svg>
    ),
  },
  {
    id: 'steps',
    label: 'Étapes',
    check: (map) => map.getLayoutProperty('steps-simple', 'visibility') !== 'none',
    minZoom: 5,
    maxZoom: 22,
    symbol: () => (
      <svg width="10" height="10"><circle cx="5" cy="5" r="4" fill="#9CA3AF" stroke="#fff" strokeWidth="1" /></svg>
    ),
  },
  {
    id: 'releves',
    label: 'Relevés architecturaux',
    check: (map) => map.getLayoutProperty('steps-releve', 'visibility') !== 'none',
    minZoom: 5,
    maxZoom: 22,
    symbol: () => (
      <svg width="12" height="12"><circle cx="6" cy="6" r="5" fill="#EF4444" stroke="#fff" strokeWidth="1.5" /></svg>
    ),
  },
  {
    id: 'capitals',
    label: 'Capitales',
    check: (map) => map.getLayoutProperty('capitals-marker', 'visibility') === 'visible',
    minZoom: 0,
    maxZoom: 22,
    symbol: () => (
      <svg width="10" height="10"><circle cx="5" cy="5" r="3.5" fill="#3a3a3a" stroke="#fff" strokeWidth="1" /></svg>
    ),
  },
  {
    id: 'waterways',
    label: 'Fleuves & mers',
    check: (map) => {
      try { return map.getLayoutProperty('waterways-label-rivers', 'visibility') === 'visible' } catch { return false }
    },
    minZoom: 0,
    maxZoom: 22,
    symbol: () => (
      <svg width="18" height="4"><line x1="0" y1="2" x2="18" y2="2" stroke="#5B8FA8" strokeWidth="1.5" /></svg>
    ),
  },
  {
    id: 'contours',
    label: 'Topographie',
    check: (map) => map.getLayoutProperty('contour-lines', 'visibility') === 'visible',
    minZoom: 0,
    maxZoom: 8,
    label2: 'Courbes topo',
    checkHigh: true,
    minZoom2: 9,
    symbol: () => (
      <svg width="18" height="4"><line x1="0" y1="2" x2="18" y2="2" stroke="#999" strokeWidth="1" /></svg>
    ),
  },
  {
    id: 'climate',
    label: 'Climat Köppen',
    check: (map) => map.getLayoutProperty('climate-zones-fill', 'visibility') === 'visible',
    minZoom: 0,
    maxZoom: 22,
    symbol: () => (
      <svg width="12" height="10"><rect x="1" y="1" width="10" height="8" fill="rgba(91,143,168,0.3)" stroke="#5B8FA8" strokeWidth="1" rx="1" /></svg>
    ),
  },
  {
    id: 'cultural',
    label: 'Régions culturelles',
    check: (map) => {
      try { return map.getLayoutProperty('cultural-region-fill-mediterranee', 'visibility') === 'visible' } catch { return false }
    },
    minZoom: 0,
    maxZoom: 22,
    symbol: () => (
      <svg width="12" height="10"><rect x="1" y="1" width="10" height="8" fill="rgba(232,168,124,0.3)" stroke="#E8A87C" strokeWidth="1" rx="1" /></svg>
    ),
  },
  {
    id: 'silk-roads',
    label: 'Routes de la Soie',
    check: (map) => map.getLayoutProperty('silk-road-terrestre-nord', 'visibility') === 'visible',
    minZoom: 0,
    maxZoom: 22,
    symbol: () => (
      <svg width="18" height="4"><line x1="0" y1="2" x2="18" y2="2" stroke="#8B6914" strokeWidth="1.5" strokeDasharray="4 2" /></svg>
    ),
  },
  {
    id: 'geopolitics',
    label: 'Géopolitique',
    check: (map) => map.getLayoutProperty('geopolitics-conflict-fill', 'visibility') === 'visible',
    minZoom: 0,
    maxZoom: 22,
    symbol: () => (
      <svg width="12" height="10"><rect x="1" y="1" width="10" height="8" fill="rgba(192,57,43,0.4)" stroke="#C0392B" strokeWidth="1" rx="1" /></svg>
    ),
  },
  {
    id: 'railways',
    label: 'Réseau ferré',
    check: (map) => map.getLayoutProperty('custom-rail-lines', 'visibility') === 'visible',
    minZoom: 0,
    maxZoom: 22,
    symbol: () => (
      <svg width="18" height="4"><line x1="0" y1="2" x2="18" y2="2" stroke="#777" strokeWidth="1.5" strokeDasharray="4 3" /></svg>
    ),
  },
]

export default function MapLegend({ mapRef, darkMode }) {
  const [activeItems, setActiveItems] = useState([])
  const [zoom, setZoom] = useState(3)
  const intervalRef = useRef(null)

  useEffect(() => {
    function update() {
      const map = mapRef.current?.getMap()
      if (!map || !map.getStyle()) return

      const currentZoom = map.getZoom()
      setZoom(currentZoom)

      const items = []
      for (const item of LEGEND_ITEMS) {
        try {
          if (item.check(map)) {
            // Show item if current zoom is in range
            if (currentZoom >= item.minZoom && currentZoom <= item.maxZoom) {
              items.push(item)
            }
          }
        } catch {
          // Layer might not exist yet
        }
      }
      setActiveItems(items)
    }

    // Initial check + interval
    const timer = setTimeout(update, 1000)
    intervalRef.current = setInterval(update, 800)

    return () => {
      clearTimeout(timer)
      clearInterval(intervalRef.current)
    }
  }, [mapRef])

  // Don't render if no special layers are active (only route/steps are default)
  const nonDefaultItems = activeItems.filter(
    (i) => i.id !== 'route' && i.id !== 'steps' && i.id !== 'releves'
  )
  if (nonDefaultItems.length === 0) return null

  const bg = darkMode ? 'rgba(26,26,30,0.85)' : 'rgba(255,255,255,0.85)'
  const text = darkMode ? '#c0c0c0' : '#444'
  const border = darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 48,
        right: 8,
        background: bg,
        borderRadius: 6,
        padding: '8px 10px',
        border: `1px solid ${border}`,
        zIndex: 10,
        maxWidth: 180,
        backdropFilter: 'blur(8px)',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: darkMode ? '#888' : '#999',
          marginBottom: 6,
        }}
      >
        Légende
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {activeItems.map((item) => (
          <div
            key={item.id}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 18, flexShrink: 0 }}>
              {item.symbol(darkMode)}
            </span>
            <span style={{ fontSize: 10, color: text, lineHeight: 1.2 }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
