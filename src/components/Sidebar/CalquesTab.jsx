import { useState } from 'react'

/**
 * Layer toggle definitions — Phase 2.
 */
const LAYERS_BASE = [
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
    getMapLayers: () => ['country-label', 'continent-label'],
  },
  {
    id: 'releves-only',
    label: 'Relevés architecturaux uniquement',
    defaultOn: false,
    getMapLayers: () => ['steps-simple'],
    // This one inverts: ON = hide simple steps, OFF = show them
    inverted: true,
  },
  {
    id: 'capitals',
    label: 'Capitales des pays traversés',
    defaultOn: false,
    getMapLayers: () => ['settlement-major-label'],
  },
]

const LAYERS_COMING_SOON = [
  'Géographie physique',
  'Courbes topographiques',
  'Climat (Köppen-Geiger)',
  'Régions culturelles',
  'Conflits',
  'Réseau ferré',
]

export default function CalquesTab({ darkMode, mapRef }) {
  const [toggles, setToggles] = useState(() =>
    Object.fromEntries(LAYERS_BASE.map((l) => [l.id, l.defaultOn]))
  )

  const text = darkMode ? '#d0d0d0' : '#333333'
  const textMuted = darkMode ? '#666' : '#999'
  const divider = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const trackOff = darkMode ? '#444' : '#ccc'
  const trackOn = darkMode ? '#7c8cf5' : '#4f6cf5'

  function handleToggle(layerDef) {
    const map = mapRef.current?.getMap()
    if (!map) return

    const next = !toggles[layerDef.id]
    setToggles((prev) => ({ ...prev, [layerDef.id]: next }))

    const layerIds = layerDef.getMapLayers(map)
    if (layerDef.inverted) {
      // Inverted: ON = hide layers, OFF = show layers
      const visibility = next ? 'none' : 'visible'
      layerIds.forEach((lid) => {
        try { map.setLayoutProperty(lid, 'visibility', visibility) } catch (_) {}
      })
    } else {
      const visibility = next ? 'visible' : 'none'
      layerIds.forEach((lid) => {
        try { map.setLayoutProperty(lid, 'visibility', visibility) } catch (_) {}
      })
    }
  }

  return (
    <div className="px-4 py-4">
      <div className="text-[10px] uppercase tracking-wider mb-3 px-1" style={{ color: textMuted }}>
        Calques de base
      </div>

      <div className="flex flex-col gap-1 mb-6">
        {LAYERS_BASE.map((layerDef) => (
          <label
            key={layerDef.id}
            className="flex items-center justify-between py-2 px-1 cursor-pointer select-none"
          >
            <span className="text-xs" style={{ color: text }}>
              {layerDef.label}
            </span>
            <button
              role="switch"
              aria-checked={toggles[layerDef.id]}
              onClick={() => handleToggle(layerDef)}
              className="relative inline-flex items-center rounded-full transition-colors duration-200 ml-3 shrink-0"
              style={{
                width: 34,
                height: 18,
                background: toggles[layerDef.id] ? trackOn : trackOff,
              }}
            >
              <span
                className="inline-block rounded-full bg-white shadow transition-transform duration-200"
                style={{
                  width: 14,
                  height: 14,
                  transform: toggles[layerDef.id]
                    ? 'translateX(18px)'
                    : 'translateX(2px)',
                }}
              />
            </button>
          </label>
        ))}
      </div>

      {/* Coming soon layers */}
      <div style={{ borderTop: `1px solid ${divider}`, paddingTop: 16 }}>
        <div className="text-[10px] uppercase tracking-wider mb-3 px-1" style={{ color: textMuted }}>
          Calques thématiques
        </div>
        <div className="flex flex-col gap-1">
          {LAYERS_COMING_SOON.map((name) => (
            <div
              key={name}
              className="flex items-center justify-between py-2 px-1"
              style={{ opacity: 0.35 }}
            >
              <span className="text-xs" style={{ color: text }}>
                {name}
              </span>
              <span className="text-[10px] italic" style={{ color: textMuted }}>
                Bientôt
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
