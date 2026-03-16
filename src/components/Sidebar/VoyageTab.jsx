import { useRef, useEffect, useMemo } from 'react'

const CHAPTER_ORDER = [
  'europe',
  'mediterranee',
  'caucase',
  'transit',
  'asie_centrale',
  'chine',
  'japon',
]

const MINOR_ZONES = ['europe', 'transit']

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

  useEffect(() => {
    if (activeRef.current && listRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [activeStepId])

  const zoneCounts = useMemo(() => {
    const counts = {}
    for (const s of steps) counts[s.zone] = (counts[s.zone] || 0) + 1
    return counts
  }, [steps])

  // Theme
  const text = darkMode ? '#d0d0d0' : '#2a2a2a'
  const textSecondary = darkMode ? '#999' : '#777'
  const textMuted = darkMode ? '#555' : '#aaa'
  const hoverBg = darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'
  const activeBg = darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)'
  const divider = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const stepDivider = darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'

  function handleChapterClick(zone) {
    const map = mapRef.current?.getMap()
    if (!map) return
    const bounds = ZONE_BOUNDS[zone]
    if (bounds) map.flyTo({ center: bounds.center, zoom: bounds.zoom, duration: 1500 })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Header ── */}
      <div style={{
        flexShrink: 0,
        padding: '28px 22px 22px',
        borderBottom: `1px solid ${divider}`,
      }}>
        <h1 style={{
          margin: 0,
          fontSize: 18,
          lineHeight: 1.25,
          color: text,
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontWeight: 400,
          letterSpacing: '-0.015em',
        }}>
          Notre Route de la Soie
        </h1>
        <p style={{
          margin: '8px 0 0',
          fontSize: 11.5,
          lineHeight: 1.5,
          color: textSecondary,
          fontStyle: 'italic',
        }}>
          {meta.summary}
        </p>

        {/* Counters */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
          marginTop: 24,
          paddingTop: 20,
          borderTop: `1px solid ${divider}`,
        }}>
          {[
            { value: Math.round(meta.total_km).toLocaleString('fr-FR'), label: 'kilomètres' },
            { value: '13', label: 'pays' },
            { value: '7', label: 'mois' },
            { value: String(meta.total_steps), label: 'étapes' },
          ].map((c) => (
            <div key={c.label} style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: 22,
                lineHeight: 1,
                fontWeight: 300,
                color: text,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {c.value}
              </div>
              <div style={{
                marginTop: 6,
                fontSize: 9,
                lineHeight: 1,
                color: textMuted,
                fontVariant: 'all-small-caps',
                letterSpacing: '0.08em',
                fontWeight: 500,
              }}>
                {c.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Chapters ── */}
      <div style={{
        flexShrink: 0,
        padding: '18px 18px 14px',
        borderBottom: `1px solid ${divider}`,
      }}>
        <div style={{
          marginBottom: 12,
          paddingLeft: 4,
          fontSize: 9,
          color: textMuted,
          fontVariant: 'all-small-caps',
          letterSpacing: '0.1em',
          fontWeight: 600,
        }}>
          Chapitres
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {CHAPTER_ORDER.map((zone) => {
            const zoneInfo = meta.zones[zone]
            if (!zoneInfo) return null
            const count = zoneCounts[zone] || 0
            const isMinor = MINOR_ZONES.includes(zone)
            return (
              <button
                key={zone}
                onClick={() => handleChapterClick(zone)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 8px',
                  borderRadius: 6,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  opacity: isMinor ? 0.45 : 1,
                  transition: 'background 120ms',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: zoneInfo.color, flexShrink: 0,
                }} />
                <span style={{
                  fontSize: 12.5, flex: 1, color: text, fontWeight: 400,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {zoneInfo.label}
                </span>
                <span style={{ fontSize: 11, color: textMuted, fontVariantNumeric: 'tabular-nums' }}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Steps list header ── */}
      <div style={{
        flexShrink: 0,
        padding: '16px 22px 8px',
      }}>
        <div style={{
          fontSize: 9,
          color: textMuted,
          fontVariant: 'all-small-caps',
          letterSpacing: '0.1em',
          fontWeight: 600,
        }}>
          Étapes
        </div>
      </div>

      {/* ── Steps list — scrollable ── */}
      <div ref={listRef} style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        padding: '0 14px 20px',
      }}>
        {steps.map((step, idx) => {
          const isActive = step.id === activeStepId
          const zone = meta.zones[step.zone]
          const color = zone?.color || '#9CA3AF'
          return (
            <div key={step.id}>
              {idx > 0 && (
                <div style={{ height: 1, background: stepDivider, margin: '0 8px' }} />
              )}
              <button
                ref={isActive ? activeRef : null}
                onClick={() => onStepClick(step)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  width: '100%',
                  padding: '10px 8px',
                  borderRadius: 6,
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  background: isActive ? activeBg : 'transparent',
                  transition: 'background 120ms',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = hoverBg
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent'
                }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: color, flexShrink: 0, marginTop: 4,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {step.is_releve && (
                      <span style={{
                        flexShrink: 0,
                        fontSize: 9,
                        lineHeight: 1,
                        padding: '2px 5px',
                        borderRadius: 3,
                        background: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                        color: textSecondary,
                        letterSpacing: '0.02em',
                      }}>
                        relevé
                      </span>
                    )}
                    <span style={{
                      fontSize: 12.5,
                      lineHeight: 1.3,
                      color: text,
                      fontWeight: isActive ? 600 : 400,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {step.name}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 10.5,
                    color: textMuted,
                    marginTop: 3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {step.location?.city}
                    {step.date_start ? ` · ${formatDate(step.date_start)}` : ''}
                  </div>
                </div>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
