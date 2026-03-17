import { useState } from 'react'

/**
 * Layer sections with collapsible groups — Phase 3.0
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
        id: 'steps',
        label: 'Étapes',
        defaultOn: true,
        implemented: true,
        getMapLayers: () => ['steps-simple', 'steps-releve'],
      },
      {
        id: 'releves-only',
        label: 'Relevés architecturaux',
        defaultOn: false,
        implemented: true,
        getMapLayers: () => ['steps-simple'],
        inverted: true,
      },
    ],
  },
  {
    id: 'geographie',
    title: 'GÉOGRAPHIE',
    layers: [
      {
        id: 'country-labels',
        label: 'Pays traversés',
        defaultOn: true,
        implemented: true,
        getMapLayers: () => ['country-label', 'continent-label'],
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

// Build flat default toggle state from all sections
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

export default function CalquesTab({ darkMode, mapRef }) {
  const defaults = buildDefaults()
  const [toggles, setToggles] = useState(defaults.toggles)
  const [collapsed, setCollapsed] = useState(defaults.collapsed)

  const text = darkMode ? '#d0d0d0' : '#333333'
  const textMuted = darkMode ? '#666' : '#999'
  const divider = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const trackOff = darkMode ? '#444' : '#ccc'
  const trackOn = darkMode ? '#7c8cf5' : '#4f6cf5'
  const sectionBg = darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'

  function handleToggle(layerDef) {
    if (!layerDef.implemented) return
    const map = mapRef.current?.getMap()
    if (!map) return

    const next = !toggles[layerDef.id]
    setToggles((prev) => ({ ...prev, [layerDef.id]: next }))

    const layerIds = layerDef.getMapLayers(map)
    const visibility = layerDef.inverted
      ? (next ? 'none' : 'visible')
      : (next ? 'visible' : 'none')
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
            className="flex items-center justify-between w-full py-1.5 px-1 cursor-pointer select-none group"
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
                <label
                  key={layerDef.id}
                  className="flex items-center justify-between py-1.5 px-1 select-none"
                  style={{
                    cursor: layerDef.implemented ? 'pointer' : 'default',
                    opacity: layerDef.implemented ? 1 : 0.35,
                  }}
                >
                  <span className="text-xs" style={{ color: text }}>
                    {layerDef.label}
                  </span>

                  {layerDef.implemented ? (
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
                  ) : (
                    <span className="text-[10px] italic ml-3 shrink-0" style={{ color: textMuted }}>
                      Bientôt
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
