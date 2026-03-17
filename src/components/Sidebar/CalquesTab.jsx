import { useState } from 'react'

/**
 * Layer sections with collapsible groups — Phase 3.0
 *
 * Each layer can use either:
 *   - getMapLayers(map) → array of Mapbox layer IDs to show/hide via visibility
 *   - applyToggle(map, isOn) → custom function for paint-based toggling
 */
const SECTIONS = [
  {
    id: 'voyage',
    title: 'VOYAGE',
    layers: [
      {
        id: 'route',
        label: 'Tracé du voyage',
        defaultOn: true,
        implemented: true,
        getMapLayers: (map) => {
          const style = map.getStyle()
          if (!style) return []
          return style.layers
            .filter((l) => l.id.startsWith('route-halo-') || l.id.startsWith('route-line-'))
            .map((l) => l.id)
        },
      },
      {
        id: 'steps-simple',
        label: 'Étapes',
        defaultOn: true,
        implemented: true,
        getMapLayers: () => ['steps-simple'],
      },
      {
        id: 'steps-releve',
        label: 'Relevés architecturaux',
        defaultOn: true,
        implemented: true,
        getMapLayers: () => ['steps-releve'],
      },
    ],
  },
  {
    id: 'geographie',
    title: 'GÉOGRAPHIE',
    layers: [
      {
        id: 'country-highlight',
        label: 'Pays traversés',
        defaultOn: true,
        implemented: true,
        applyToggle: (map, isOn) => {
          try {
            if (isOn) {
              map.setPaintProperty('country-fills-traversed', 'fill-opacity', 1)
              map.setPaintProperty('country-fills-other', 'fill-opacity', 1)
            } else {
              map.setPaintProperty('country-fills-traversed', 'fill-opacity', 0)
              map.setPaintProperty('country-fills-other', 'fill-opacity', 0)
            }
          } catch (_) {}
        },
      },
      {
        id: 'capitals',
        label: 'Capitales',
        defaultOn: false,
        implemented: true,
        getMapLayers: () => ['settlement-major-label'],
      },
      {
        id: 'waterways',
        label: 'Fleuves & mers',
        defaultOn: false,
        implemented: false,
      },
      {
        id: 'contours',
        label: 'Courbes topographiques',
        defaultOn: false,
        implemented: false,
      },
    ],
  },
  {
    id: 'thematique',
    title: 'THÉMATIQUE',
    layers: [
      {
        id: 'climate',
        label: 'Climat (Köppen-Geiger)',
        defaultOn: false,
        implemented: false,
      },
      {
        id: 'cultural-regions',
        label: 'Régions culturelles',
        defaultOn: false,
        implemented: false,
      },
    ],
  },
  {
    id: 'contexte',
    title: 'CONTEXTE',
    layers: [
      {
        id: 'geopolitics',
        label: 'Contexte géopolitique',
        defaultOn: false,
        implemented: false,
      },
      {
        id: 'railways',
        label: 'Réseau ferré',
        defaultOn: false,
        implemented: false,
      },
    ],
  },
]

function buildDefaults() {
  const toggles = {}
  const collapsed = {}
  SECTIONS.forEach((s) => {
    collapsed[s.id] = false
    s.layers.forEach((l) => {
      toggles[l.id] = l.defaultOn
    })
  })
  return { toggles, collapsed }
}

const DEFAULTS = buildDefaults()

export default function CalquesTab({ darkMode, mapRef }) {
  const [toggles, setToggles] = useState(DEFAULTS.toggles)
  const [collapsed, setCollapsed] = useState(DEFAULTS.collapsed)

  const text = darkMode ? '#d0d0d0' : '#333333'
  const textMuted = darkMode ? '#666' : '#999'
  const divider = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const trackOff = darkMode ? '#444' : '#ccc'
  const trackOn = darkMode ? '#7c8cf5' : '#4f6cf5'

  function handleToggle(layerDef) {
    if (!layerDef.implemented) return
    const map = mapRef.current?.getMap()
    if (!map) return

    const next = !toggles[layerDef.id]
    setToggles((prev) => ({ ...prev, [layerDef.id]: next }))

    // Custom paint-based toggle (e.g. country fills)
    if (layerDef.applyToggle) {
      layerDef.applyToggle(map, next)
      return
    }

    // Standard visibility toggle
    const layerIds = layerDef.getMapLayers(map)
    const visibility = next ? 'visible' : 'none'
    layerIds.forEach((lid) => {
      try { map.setLayoutProperty(lid, 'visibility', visibility) } catch (_) {}
    })
  }

  function toggleSection(sectionId) {
    setCollapsed((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }

  return (
    <div className="px-4 py-4 flex flex-col gap-2">
      {SECTIONS.map((section, si) => (
        <div key={section.id}>
          {si > 0 && <div style={{ borderTop: `1px solid ${divider}`, marginBottom: 8 }} />}

          {/* Section header — clickable to collapse */}
          <button
            onClick={() => toggleSection(section.id)}
            className="flex items-center justify-between w-full py-1.5 px-1 cursor-pointer select-none"
          >
            <span
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: textMuted }}
            >
              {section.title}
            </span>
            <span
              className="text-[10px] transition-transform duration-200"
              style={{
                color: textMuted,
                transform: collapsed[section.id] ? 'rotate(-90deg)' : 'rotate(0deg)',
              }}
            >
              ▼
            </span>
          </button>

          {/* Section content */}
          {!collapsed[section.id] && (
            <div className="flex flex-col gap-0.5 mt-1">
              {section.layers.map((layerDef) => (
                <div
                  key={layerDef.id}
                  className="flex items-center justify-between py-1.5 px-1 select-none"
                  style={{
                    cursor: layerDef.implemented ? 'pointer' : 'default',
                    opacity: layerDef.implemented ? 1 : 0.35,
                  }}
                  onClick={() => layerDef.implemented && handleToggle(layerDef)}
                >
                  <span className="text-xs" style={{ color: text }}>
                    {layerDef.label}
                  </span>

                  {layerDef.implemented ? (
                    <div
                      role="switch"
                      aria-checked={toggles[layerDef.id]}
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
                    </div>
                  ) : (
                    <span className="text-[10px] italic ml-3 shrink-0" style={{ color: textMuted }}>
                      Bientôt
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
