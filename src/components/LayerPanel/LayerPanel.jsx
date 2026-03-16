import { useState, useEffect, useRef } from 'react'

/**
 * Layer definitions for Phase 1.
 * Each entry: { id, label, mapLayers(map) => string[] }
 * mapLayers returns the Mapbox layer IDs to toggle.
 */
const PHASE1_LAYERS = [
  {
    id: 'route',
    label: 'Tracé du voyage',
    defaultOn: true,
    getMapLayers: (map) => {
      const style = map.getStyle()
      if (!style) return []
      return style.layers
        .filter((l) => l.id.startsWith('route-halo-') || l.id.startsWith('route-line-'))
        .map((l) => l.id)
    },
  },
  {
    id: 'steps',
    label: 'Étapes',
    defaultOn: true,
    getMapLayers: () => ['steps-simple', 'steps-releve'],
  },
  {
    id: 'country-labels',
    label: 'Noms des pays',
    defaultOn: true,
    getMapLayers: () => ['country-label', 'state-label', 'continent-label'],
  },
]

export default function LayerPanel({ mapRef, darkMode }) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)

  // Track toggle state per layer
  const [toggles, setToggles] = useState(() =>
    Object.fromEntries(PHASE1_LAYERS.map((l) => [l.id, l.defaultOn]))
  )

  // Close panel on click outside
  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleToggle(layerDef) {
    const map = mapRef.current?.getMap()
    if (!map) return

    const next = !toggles[layerDef.id]
    setToggles((prev) => ({ ...prev, [layerDef.id]: next }))

    const visibility = next ? 'visible' : 'none'
    const layerIds = layerDef.getMapLayers(map)
    layerIds.forEach((lid) => {
      try {
        map.setLayoutProperty(lid, 'visibility', visibility)
      } catch (_) {}
    })
  }

  // Theme-aware colors
  const bg = darkMode ? 'rgba(30,30,35,0.85)' : 'rgba(255,255,255,0.88)'
  const border = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'
  const text = darkMode ? '#d0d0d0' : '#333333'
  const textMuted = darkMode ? '#888888' : '#888888'
  const btnBg = darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
  const btnBgHover = darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'
  const trackOff = darkMode ? '#555' : '#ccc'
  const trackOn = darkMode ? '#7c8cf5' : '#4f6cf5'

  return (
    <div ref={panelRef} className="fixed top-4 left-4 z-50">
      {/* Toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        title="Calques"
        className="flex items-center justify-center w-9 h-9 rounded-full backdrop-blur-sm border transition-colors duration-200"
        style={{
          background: btnBg,
          borderColor: border,
          color: text,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      </button>

      {/* Panel */}
      {open && (
        <div
          className="mt-2 rounded-lg backdrop-blur-md border"
          style={{
            background: bg,
            borderColor: border,
            minWidth: 200,
            padding: '12px 14px',
          }}
        >
          <div className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: textMuted }}>
            Calques
          </div>

          <div className="flex flex-col gap-2">
            {PHASE1_LAYERS.map((layerDef) => (
              <label
                key={layerDef.id}
                className="flex items-center justify-between cursor-pointer select-none py-1"
              >
                <span className="text-sm" style={{ color: text }}>
                  {layerDef.label}
                </span>
                {/* Custom toggle switch */}
                <button
                  role="switch"
                  aria-checked={toggles[layerDef.id]}
                  onClick={() => handleToggle(layerDef)}
                  className="relative inline-flex items-center rounded-full transition-colors duration-200 ml-3"
                  style={{
                    width: 36,
                    height: 20,
                    background: toggles[layerDef.id] ? trackOn : trackOff,
                    flexShrink: 0,
                  }}
                >
                  <span
                    className="inline-block rounded-full bg-white shadow transition-transform duration-200"
                    style={{
                      width: 16,
                      height: 16,
                      transform: toggles[layerDef.id]
                        ? 'translateX(18px)'
                        : 'translateX(2px)',
                    }}
                  />
                </button>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
