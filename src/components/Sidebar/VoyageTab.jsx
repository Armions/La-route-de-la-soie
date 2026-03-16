import { useRef, useEffect, useMemo } from 'react'

// Zone display order for chapters
const CHAPTER_ORDER = [
  'europe',
  'mediterranee',
  'caucase',
  'transit',
  'asie_centrale',
  'chine',
  'japon',
]

// Minor zones (visually less prominent)
const MINOR_ZONES = ['europe', 'transit']

// Approximate bounding boxes per zone for flyTo
const ZONE_BOUNDS = {
  europe:        { center: [2.4, 48.8], zoom: 6 },
  mediterranee:  { center: [22, 40], zoom: 4.5 },
  caucase:       { center: [44, 42], zoom: 5.5 },
  transit:       { center: [60, 48], zoom: 4 },
  asie_centrale: { center: [68, 40], zoom: 5 },
  chine:         { center: [108, 28], zoom: 4.5 },
  japon:         { center: [135, 35], zoom: 5.5 },
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default function VoyageTab({
  darkMode,
  steps,
  meta,
  onStepClick,
  activeStepId,
  mapRef,
}) {
  const listRef = useRef(null)
  const activeRef = useRef(null)

  // Auto-scroll to active step
  useEffect(() => {
    if (activeRef.current && listRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [activeStepId])

  // Count steps per zone
  const zoneCounts = useMemo(() => {
    const counts = {}
    for (const s of steps) {
      counts[s.zone] = (counts[s.zone] || 0) + 1
    }
    return counts
  }, [steps])

  // Theme
  const text = darkMode ? '#d0d0d0' : '#2a2a2a'
  const textSecondary = darkMode ? '#999' : '#777'
  const textMuted = darkMode ? '#666' : '#aaa'
  const hoverBg = darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)'
  const activeBg = darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)'
  const divider = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'

  function handleChapterClick(zone) {
    const map = mapRef.current?.getMap()
    if (!map) return
    const bounds = ZONE_BOUNDS[zone]
    if (bounds) {
      map.flyTo({ center: bounds.center, zoom: bounds.zoom, duration: 1500 })
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-5 pt-5 pb-4" style={{ borderBottom: `1px solid ${divider}` }}>
        <h1
          className="text-[17px] leading-snug mb-1.5"
          style={{
            color: text,
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontWeight: 400,
            letterSpacing: '-0.01em',
          }}
        >
          Notre Route de la Soie
        </h1>
        <p
          className="text-[11px] leading-relaxed"
          style={{ color: textSecondary, fontStyle: 'italic' }}
        >
          {meta.summary}
        </p>

        {/* Counters — big numbers + small caps labels */}
        <div
          className="grid grid-cols-4 gap-2 mt-5 pt-4"
          style={{ borderTop: `1px solid ${divider}` }}
        >
          {[
            { value: Math.round(meta.total_km).toLocaleString('fr-FR'), label: 'kilomètres' },
            { value: '13', label: 'pays' },
            { value: '7', label: 'mois' },
            { value: String(meta.total_steps), label: 'étapes' },
          ].map((c) => (
            <div key={c.label} className="text-center">
              <div
                className="text-xl leading-none font-light tabular-nums"
                style={{ color: text }}
              >
                {c.value}
              </div>
              <div
                className="mt-1.5 leading-none"
                style={{
                  color: textMuted,
                  fontSize: 9,
                  fontVariant: 'all-small-caps',
                  letterSpacing: '0.08em',
                  fontWeight: 500,
                }}
              >
                {c.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chapters (zones) */}
      <div className="shrink-0 px-4 py-3" style={{ borderBottom: `1px solid ${divider}` }}>
        <div
          className="mb-2.5 px-1"
          style={{
            color: textMuted,
            fontSize: 9,
            fontVariant: 'all-small-caps',
            letterSpacing: '0.1em',
            fontWeight: 600,
          }}
        >
          Chapitres
        </div>
        <div className="flex flex-col">
          {CHAPTER_ORDER.map((zone) => {
            const zoneInfo = meta.zones[zone]
            if (!zoneInfo) return null
            const count = zoneCounts[zone] || 0
            const isMinor = MINOR_ZONES.includes(zone)
            return (
              <button
                key={zone}
                onClick={() => handleChapterClick(zone)}
                className="flex items-center gap-2.5 px-2 py-[7px] rounded transition-colors text-left group"
                style={{ opacity: isMinor ? 0.5 : 1 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span
                  className="w-[9px] h-[9px] rounded-full shrink-0"
                  style={{ background: zoneInfo.color }}
                />
                <span
                  className="text-[12px] flex-1 truncate"
                  style={{ color: text, fontWeight: 400 }}
                >
                  {zoneInfo.label}
                </span>
                <span
                  className="text-[11px] tabular-nums"
                  style={{ color: textMuted }}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Step list — independently scrollable */}
      <div className="shrink-0 px-4 pt-3 pb-1">
        <div
          className="px-1"
          style={{
            color: textMuted,
            fontSize: 9,
            fontVariant: 'all-small-caps',
            letterSpacing: '0.1em',
            fontWeight: 600,
          }}
        >
          Étapes
        </div>
      </div>
      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto px-3 pb-4">
        {steps.map((step) => {
          const isActive = step.id === activeStepId
          const zone = meta.zones[step.zone]
          const color = zone?.color || '#9CA3AF'
          return (
            <button
              key={step.id}
              ref={isActive ? activeRef : null}
              onClick={() => onStepClick(step)}
              className="flex items-start gap-2.5 w-full px-2 py-[6px] rounded text-left transition-colors"
              style={{
                background: isActive ? activeBg : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = hoverBg
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'transparent'
              }}
            >
              {/* Zone dot — vertically centered with first line */}
              <span
                className="w-[7px] h-[7px] rounded-full shrink-0 mt-[4px]"
                style={{ background: color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {step.is_releve && (
                    <span
                      className="shrink-0 text-[9px] leading-none px-1 py-[2px] rounded"
                      style={{
                        background: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                        color: textSecondary,
                      }}
                      title="Relevé architectural"
                    >
                      relevé
                    </span>
                  )}
                  <span
                    className="text-[12px] truncate leading-tight"
                    style={{ color: text, fontWeight: isActive ? 600 : 400 }}
                  >
                    {step.name}
                  </span>
                </div>
                <div
                  className="text-[10px] truncate mt-[2px]"
                  style={{ color: textMuted }}
                >
                  {step.location?.city}
                  {step.date_start ? ` · ${formatDate(step.date_start)}` : ''}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
