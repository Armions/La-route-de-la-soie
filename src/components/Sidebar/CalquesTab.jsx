import { useState } from 'react'

/**
 * Layer sections with collapsible groups — Phase 3.0+
 *
 * Each layer can use either:
 *   - getMapLayers(map) → array of Mapbox layer IDs to show/hide via visibility
 *   - applyToggle(map, isOn) → custom function for paint-based toggling
 */

const CLIMATE_ZONES = [
  { id: 'cfb', code: 'Cfb', name: 'Océanique', desc: 'Températures modérées, pluies réparties', region: 'France', color: '#5B8FA8' },
  { id: 'csa', code: 'Csa', name: 'Méditerranéen chaud', desc: 'Étés secs et chauds, hivers doux', region: 'Italie, Grèce, côte turque', color: '#F5C542' },
  { id: 'dsa', code: 'Dsa/Dsb', name: 'Continental à été sec', desc: 'Hivers froids, étés secs', region: 'Turquie intérieure', color: '#D4845A' },
  { id: 'dfa', code: 'Dfa/Dfb', name: 'Continental humide', desc: 'Hivers froids, précipitations toute l\'année', region: 'Géorgie, Arménie', color: '#6BAF6B' },
  { id: 'bsk', code: 'BSk', name: 'Semi-aride froid', desc: 'Faibles précipitations, forte amplitude', region: 'Kazakhstan, Ouzbékistan', color: '#C9A84C' },
  { id: 'dwb', code: 'Dwb/Dwc', name: 'Continental subarctique', desc: 'Hivers très froids et secs', region: 'Kirghizstan', color: '#8B7EC8' },
  { id: 'bwk', code: 'BWk', name: 'Aride froid (désert)', desc: 'Très faibles précipitations', region: 'Xinjiang', color: '#D4A574' },
  { id: 'cfa-chine', code: 'Cfa', name: 'Subtropical humide', desc: 'Étés chauds et humides', region: 'Chine est', color: '#5AAF8F' },
  { id: 'cfa-japon', code: 'Cfa', name: 'Subtropical humide', desc: 'Mousson estivale', region: 'Japon', color: '#5A8FBF' },
]

const CLIMATE_MAP_LAYERS = ['climate-zones-fill', 'climate-zones-border', 'climate-zones-label']

const CULTURAL_REGIONS = [
  { id: 'mediterranee', name: 'Bassin méditerranéen', desc: 'Italie, Grèce, côte turque ouest', color: '#E8A87C' },
  { id: 'caucase', name: 'Caucase', desc: 'Géorgie, Arménie, Turquie est', color: '#85C1A3' },
  { id: 'asie-centrale', name: 'Asie centrale', desc: 'Kazakhstan, Ouzbékistan, Kirghizstan', color: '#B8A9D4' },
  { id: 'monde-chinois', name: 'Monde chinois', desc: 'Chine continentale, Hong Kong', color: '#E8B4B8' },
  { id: 'japon', name: 'Archipel japonais', desc: 'Japon', color: '#7EB5D6' },
]

const CULTURAL_MAP_LAYERS = [
  'cultural-region-fill-mediterranee',
  'cultural-region-fill-caucase',
  'cultural-region-fill-asie-centrale',
  'cultural-region-fill-monde-chinois',
  'cultural-region-fill-japon',
  'cultural-regions-label',
]

const CULTURAL_REGION_COUNTRIES = {
  'mediterranee': ['IT', 'GR', 'TR'],
  'caucase': ['GE', 'AM'],
  'asie-centrale': ['KZ', 'UZ', 'KG'],
  'monde-chinois': ['CN', 'HK'],
  'japon': ['JP'],
}

const GEOPOLITICS_MAP_LAYERS = [
  'geopolitics-conflict-fill', 'geopolitics-conflict-border',
  'geopolitics-deconseille-fill',
  'geopolitics-border-line', 'geopolitics-label',
]

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
        getMapLayers: () => ['capitals-marker', 'capitals-label'],
      },
      {
        id: 'waterways',
        label: 'Fleuves & mers',
        defaultOn: false,
        implemented: true,
        applyToggle: (map, isOn) => {
          const vis = isOn ? 'visible' : 'none'
          try { map.setLayoutProperty('waterways-label-rivers', 'visibility', vis) } catch (_) {}
          try { map.setLayoutProperty('waterways-label-seas', 'visibility', vis) } catch (_) {}
          try {
            if (isOn) {
              map.setPaintProperty('water', 'fill-color', '#a8c8d8')
              map.setPaintProperty('water', 'fill-opacity', 0.8)
              map.setPaintProperty('waterway', 'line-color', '#5B8FA8')
              map.setPaintProperty('waterway', 'line-opacity', 0.7)
              map.setPaintProperty('waterway', 'line-width', 1.5)
            } else {
              const isDark = document.documentElement.classList.contains('dark') ||
                map.getPaintProperty('land', 'background-color') === '#1a1a1e'
              const oceanColor = isDark ? '#111114' : '#b8b8b8'
              const wwColor = isDark ? '#2a2a30' : '#a0a0a5'
              map.setPaintProperty('water', 'fill-color', oceanColor)
              map.setPaintProperty('water', 'fill-opacity', 1)
              map.setPaintProperty('waterway', 'line-color', wwColor)
              map.setPaintProperty('waterway', 'line-opacity', 0.5)
              map.setPaintProperty('waterway', 'line-width', 1)
            }
          } catch (_) {}
        },
      },
      {
        id: 'contours',
        label: 'Courbes topographiques',
        defaultOn: false,
        implemented: true,
        getMapLayers: () => ['contour-lines', 'contour-labels'],
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
        implemented: true,
        hasLegend: 'climate',
        getMapLayers: () => CLIMATE_MAP_LAYERS,
      },
      {
        id: 'cultural-regions',
        label: 'Régions culturelles',
        defaultOn: false,
        implemented: true,
        hasLegend: 'cultural',
        getMapLayers: () => CULTURAL_MAP_LAYERS,
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
        implemented: true,
        hasLegend: 'geopolitics',
        getMapLayers: () => GEOPOLITICS_MAP_LAYERS,
      },
      {
        id: 'railways',
        label: 'Réseau ferré',
        defaultOn: false,
        implemented: true,
        applyToggle: (map, isOn) => {
          const railLayers = map._railLayerIds || ['road-rail', 'bridge-rail']
          railLayers.forEach((lid) => {
            try {
              if (isOn) {
                map.setLayoutProperty(lid, 'visibility', 'visible')
                map.setPaintProperty(lid, 'line-color', '#888888')
                map.setPaintProperty(lid, 'line-opacity', 0.7)
                map.setPaintProperty(lid, 'line-width', 1)
                try { map.setPaintProperty(lid, 'line-dasharray', [4, 3]) } catch (_) {}
              } else {
                map.setLayoutProperty(lid, 'visibility', 'none')
              }
            } catch (_) {}
          })
        },
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

export default function CalquesTab({ darkMode, mapRef, onCulturalFilter }) {
  const [toggles, setToggles] = useState(DEFAULTS.toggles)
  const [collapsed, setCollapsed] = useState(DEFAULTS.collapsed)
  const [selectedClimate, setSelectedClimate] = useState(null)
  const [selectedCultural, setSelectedCultural] = useState(null)

  const text = darkMode ? '#d0d0d0' : '#333333'
  const textMuted = darkMode ? '#666' : '#999'
  const divider = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const trackOff = darkMode ? '#444' : '#ccc'
  const trackOn = darkMode ? '#7c8cf5' : '#4f6cf5'
  const legendBg = darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'

  function handleToggle(layerDef) {
    if (!layerDef.implemented) return
    const map = mapRef.current?.getMap()
    if (!map) return

    const next = !toggles[layerDef.id]
    setToggles((prev) => ({ ...prev, [layerDef.id]: next }))

    // Custom paint-based toggle
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

    // Reset selection when turning off
    if (layerDef.id === 'climate' && !next) {
      setSelectedClimate(null)
    }
    if (layerDef.id === 'cultural-regions' && !next) {
      setSelectedCultural(null)
      if (onCulturalFilter) onCulturalFilter(null)
    }
  }

  function handleClimateSelect(zoneId) {
    const map = mapRef.current?.getMap()
    if (!map) return

    const next = selectedClimate === zoneId ? null : zoneId

    setSelectedClimate(next)

    try {
      if (next) {
        // Selected zone at full opacity, others dimmed
        map.setPaintProperty('climate-zones-fill', 'fill-opacity', [
          'case',
          ['==', ['get', 'id'], next], 0.5,
          0.08,
        ])
        map.setPaintProperty('climate-zones-border', 'line-opacity', [
          'case',
          ['==', ['get', 'id'], next], 1,
          0.15,
        ])
        map.setPaintProperty('climate-zones-label', 'text-opacity', [
          'case',
          ['==', ['get', 'id'], next], 1,
          0.2,
        ])
      } else {
        // All zones equal
        map.setPaintProperty('climate-zones-fill', 'fill-opacity', 0.3)
        map.setPaintProperty('climate-zones-border', 'line-opacity', 0.8)
        map.setPaintProperty('climate-zones-label', 'text-opacity', 1)
      }
    } catch (_) {}
  }

  function handleCulturalSelect(regionId) {
    const map = mapRef.current?.getMap()
    if (!map) return

    const next = selectedCultural === regionId ? null : regionId

    setSelectedCultural(next)

    try {
      // Adjust opacity per-region fill layer
      CULTURAL_REGIONS.forEach((region) => {
        const layerId = `cultural-region-fill-${region.id}`
        try {
          if (next) {
            map.setPaintProperty(layerId, 'fill-opacity', region.id === next ? 0.45 : 0.06)
          } else {
            map.setPaintProperty(layerId, 'fill-opacity', 0.25)
          }
        } catch (_) {}
      })

      // Label opacity
      if (next) {
        map.setPaintProperty('cultural-regions-label', 'text-opacity', [
          'case',
          ['==', ['get', 'id'], next], 1,
          0.15,
        ])
      } else {
        map.setPaintProperty('cultural-regions-label', 'text-opacity', 1)
      }
    } catch (_) {}

    // Notify parent for frise filtering
    if (onCulturalFilter) {
      const countries = next ? (CULTURAL_REGION_COUNTRIES[next] || null) : null
      onCulturalFilter(countries)
    }
  }

  function toggleSection(sectionId) {
    setCollapsed((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }

  return (
    <div className="px-4 py-4 flex flex-col gap-4 h-full overflow-y-auto">
      {SECTIONS.map((section, si) => (
        <div key={section.id}>
          {si > 0 && <div style={{ borderTop: `1px solid ${divider}`, marginBottom: 12 }} />}

          {/* Section header */}
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
            <div className="flex flex-col gap-1 mt-2">
              {section.layers.map((layerDef) => (
                <div key={layerDef.id}>
                  {/* Toggle row */}
                  <div
                    className="flex items-center justify-between py-2.5 px-2 select-none"
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
                          className="inline-block rounded-full shadow transition-transform duration-200"
                          style={{
                            width: 14,
                            height: 14,
                            background: darkMode ? '#bbb' : '#ffffff',
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

                  {/* Climate legend — shown when toggle is ON */}
                  {layerDef.hasLegend === 'climate' && toggles[layerDef.id] && (
                    <div
                      className="mt-1 mb-2 mx-1 rounded-md py-2 px-2"
                      style={{ background: legendBg }}
                    >
                      <div className="flex flex-col gap-1">
                        {CLIMATE_ZONES.map((zone) => (
                          <div
                            key={zone.id}
                            className="flex items-start gap-2 py-1 px-1 rounded cursor-pointer transition-opacity duration-150"
                            style={{
                              opacity: selectedClimate && selectedClimate !== zone.id ? 0.35 : 1,
                              background: selectedClimate === zone.id
                                ? (darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)')
                                : 'transparent',
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleClimateSelect(zone.id)
                            }}
                          >
                            {/* Color dot */}
                            <span
                              className="shrink-0 rounded-full mt-0.5"
                              style={{
                                width: 10,
                                height: 10,
                                background: zone.color,
                                border: `1.5px solid ${zone.color}`,
                              }}
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="text-[11px] font-medium leading-tight" style={{ color: text }}>
                                {zone.code} — {zone.name}
                              </span>
                              <span className="text-[10px] leading-tight" style={{ color: textMuted }}>
                                {zone.region} · {zone.desc}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div
                        className="text-[9px] mt-2 pt-1.5 italic leading-tight"
                        style={{ color: textMuted, borderTop: `1px solid ${divider}` }}
                      >
                        Classification Köppen-Geiger, d'après Beck et al., 2023, Scientific Data
                      </div>
                    </div>
                  )}

                  {/* Cultural regions legend — shown when toggle is ON */}
                  {layerDef.hasLegend === 'cultural' && toggles[layerDef.id] && (
                    <div
                      className="mt-1 mb-2 mx-1 rounded-md py-2 px-2"
                      style={{ background: legendBg }}
                    >
                      <div className="flex flex-col gap-1">
                        {CULTURAL_REGIONS.map((region) => (
                          <div
                            key={region.id}
                            className="flex items-start gap-2 py-1 px-1 rounded cursor-pointer transition-opacity duration-150"
                            style={{
                              opacity: selectedCultural && selectedCultural !== region.id ? 0.35 : 1,
                              background: selectedCultural === region.id
                                ? (darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)')
                                : 'transparent',
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCulturalSelect(region.id)
                            }}
                          >
                            <span
                              className="shrink-0 rounded-full mt-0.5"
                              style={{
                                width: 10,
                                height: 10,
                                background: region.color,
                                border: `1.5px solid ${region.color}`,
                              }}
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="text-[11px] font-medium leading-tight" style={{ color: text }}>
                                {region.name}
                              </span>
                              <span className="text-[10px] leading-tight" style={{ color: textMuted }}>
                                {region.desc}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div
                        className="text-[9px] mt-2 pt-1.5 italic leading-tight"
                        style={{ color: textMuted, borderTop: `1px solid ${divider}` }}
                      >
                        Cliquer sur une région pour la mettre en valeur
                      </div>
                    </div>
                  )}

                  {/* Geopolitics legend — shown when toggle is ON */}
                  {layerDef.hasLegend === 'geopolitics' && toggles[layerDef.id] && (
                    <div
                      className="mt-1 mb-2 mx-1 rounded-md py-2 px-2"
                      style={{ background: legendBg }}
                    >
                      <div
                        className="text-[10px] leading-snug mb-2 px-1"
                        style={{ color: text }}
                      >
                        Contraintes géopolitiques en date du voyage (mai-déc 2025) ayant influencé le choix de l'itinéraire.
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {/* Niveau 1 — Conflit actif */}
                        <div className="flex items-center gap-2 px-1">
                          <span
                            className="shrink-0"
                            style={{
                              width: 12,
                              height: 12,
                              background: 'rgba(192,57,43,0.4)',
                              border: '1.5px solid #C0392B',
                              borderRadius: 2,
                            }}
                          />
                          <span className="text-[10px]" style={{ color: text }}>
                            Conflit actif / zone occupée
                          </span>
                        </div>
                        {/* Niveau 2 — Frontière fermée */}
                        <div className="flex items-center gap-2 px-1">
                          <span
                            className="shrink-0"
                            style={{
                              width: 12,
                              height: 0,
                              borderTop: '2.5px dashed #E74C3C',
                            }}
                          />
                          <span className="text-[10px]" style={{ color: text }}>
                            Frontière fermée
                          </span>
                        </div>
                        {/* Niveau 3 — Pays déconseillé */}
                        <div className="flex items-center gap-2 px-1">
                          <span
                            className="shrink-0"
                            style={{
                              width: 12,
                              height: 12,
                              background: 'rgba(231,76,60,0.15)',
                              border: '1.5px solid rgba(231,76,60,0.4)',
                              borderRadius: 2,
                            }}
                          />
                          <span className="text-[10px]" style={{ color: text }}>
                            Pays déconseillé (MEAE)
                          </span>
                        </div>
                      </div>
                      <div
                        className="text-[9px] mt-2 pt-1.5 italic leading-tight"
                        style={{ color: textMuted, borderTop: `1px solid ${divider}` }}
                      >
                        Source : Fil d'Ariane / MEAE France
                      </div>
                    </div>
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
