import { useMemo, useState, useRef, useCallback } from 'react'

/**
 * Frise chronologique — barre horizontale en bas de la carte.
 * Segments colorés par zone, proportionnels à la durée.
 * Hover = tooltip, clic = flyTo sur la carte.
 * Cultural region filter = "temporal zoom" on the selected region.
 */

// Hauteur totale exportée pour que la taskbar se positionne au-dessus
export const TIMELINE_HEIGHT = 82

const COUNTRY_FR = {
  'France': 'France',
  'Italy': 'Italie',
  'Greece': 'Grèce',
  'Turkey': 'Turquie',
  'Georgia': 'Géorgie',
  'Armenia': 'Arménie',
  'Russia': 'Russie',
  'Kazakhstan': 'Kazakhstan',
  'Uzbekistan': 'Ouzbékistan',
  'Kyrgyzstan': 'Kirghizstan',
  'China': 'Chine',
  'Hong Kong': 'Hong Kong',
  'Hong Kong S.A.R.': 'Hong Kong',
  'Japan': 'Japon',
}

function parseDate(str) {
  if (!str) return null
  return new Date(str + 'T00:00:00')
}

function formatDateShort(d) {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function formatDateLong(d) {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function countryFr(name) {
  return COUNTRY_FR[name] || name
}

// Cultural region names and colors for display
const CULTURAL_REGION_NAMES = {
  'IT,GR,TR': 'Bassin méditerranéen',
  'GE,AM': 'Caucase',
  'KZ,UZ,KG': 'Asie centrale',
  'CN,HK': 'Monde chinois',
  'JP': 'Archipel japonais',
}

const CULTURAL_REGION_COLORS = {
  'IT,GR,TR': '#E8A87C',
  'GE,AM': '#85C1A3',
  'KZ,UZ,KG': '#B8A9D4',
  'CN,HK': '#E8B4B8',
  'JP': '#7EB5D6',
}

function getCulturalRegionName(filterCountries) {
  if (!filterCountries) return null
  const key = [...filterCountries].sort().join(',')
  for (const [codes, name] of Object.entries(CULTURAL_REGION_NAMES)) {
    if ([...codes.split(',')].sort().join(',') === key) return name
  }
  return null
}

function getCulturalRegionColor(filterCountries) {
  if (!filterCountries) return null
  const key = [...filterCountries].sort().join(',')
  for (const [codes, color] of Object.entries(CULTURAL_REGION_COLORS)) {
    if ([...codes.split(',')].sort().join(',') === key) return color
  }
  return null
}

function isStepInRegion(step, filterCountries) {
  if (!filterCountries) return true
  return filterCountries.includes(step.location?.country_code)
}

export default function Timeline({ steps, meta, darkMode, mapRef, onStepClick, activeStepId, onHoverZone, onHoverFrac, filterCountries }) {
  const barRef = useRef(null)
  const [hoverInfo, setHoverInfo] = useState(null)
  const [hoverSegIdx, setHoverSegIdx] = useState(null)
  const [hoverFracLocal, setHoverFracLocal] = useState(null)

  // Build chronological zone segments + country transitions + step ticks (always from ALL steps)
  const { segments, totalDays, dateStart, dateEnd, countryLabels, stepTicks } = useMemo(() => {
    if (!steps || steps.length === 0) return { segments: [], totalDays: 1, dateStart: null, dateEnd: null, countryLabels: [], stepTicks: [] }

    const sorted = [...steps].sort((a, b) => {
      const da = parseDate(a.date_start)
      const db = parseDate(b.date_start)
      if (!da || !db) return (a.id - b.id)
      return da - db
    })

    const dateStart = parseDate(sorted[0].date_start)
    const dateEnd = parseDate(sorted[sorted.length - 1].date_start)
    const totalMs = dateEnd - dateStart
    const totalDays = Math.max(1, totalMs / (1000 * 60 * 60 * 24))

    // Build zone segments (group contiguous same-zone steps)
    const segs = []
    let currentZone = null
    let segSteps = []

    for (const step of sorted) {
      if (step.zone !== currentZone) {
        if (segSteps.length > 0) {
          segs.push({ zone: currentZone, steps: segSteps })
        }
        currentZone = step.zone
        segSteps = [step]
      } else {
        segSteps.push(step)
      }
    }
    if (segSteps.length > 0) {
      segs.push({ zone: currentZone, steps: segSteps })
    }

    // Compute start/end fraction for each segment
    const segments = segs.map((seg) => {
      const firstDate = parseDate(seg.steps[0].date_start)
      const lastDate = parseDate(seg.steps[seg.steps.length - 1].date_start)
      const start = totalMs > 0 ? (firstDate - dateStart) / totalMs : 0
      const end = totalMs > 0 ? (lastDate - dateStart) / totalMs : 1
      const color = meta.zones[seg.zone]?.color || '#9CA3AF'
      const label = meta.zones[seg.zone]?.label || seg.zone
      return { ...seg, start, end, color, label, firstDate, lastDate }
    })

    // Distribute space
    for (let i = 0; i < segments.length; i++) {
      if (i < segments.length - 1) {
        segments[i].endFrac = segments[i + 1].start
      } else {
        segments[i].endFrac = 1
      }
      segments[i].startFrac = segments[i].start
      segments[i].width = segments[i].endFrac - segments[i].startFrac
    }

    // Country labels at transitions
    const countryLabels = []
    let lastCountry = null
    for (const step of sorted) {
      const country = step.location?.country
      if (country && country !== lastCountry) {
        const d = parseDate(step.date_start)
        const frac = totalMs > 0 ? (d - dateStart) / totalMs : 0
        countryLabels.push({ country: countryFr(country), frac, step })
        lastCountry = country
      }
    }

    // Step ticks — position of each step on the timeline
    const stepTicks = sorted.map((step) => {
      const d = parseDate(step.date_start)
      const frac = totalMs > 0 && d ? (d - dateStart) / totalMs : 0
      return { id: step.id, frac, isReleve: step.is_releve, step }
    })

    return { segments, totalDays, dateStart, dateEnd, countryLabels, stepTicks }
  }, [steps, meta])

  // Compute zoomed view when cultural region is active
  const zoomed = useMemo(() => {
    if (!filterCountries || !segments.length || !dateStart || !dateEnd) return null

    // Find which segments belong to the region
    const matchingIndices = []
    segments.forEach((seg, i) => {
      if (seg.steps.some((s) => isStepInRegion(s, filterCountries))) {
        matchingIndices.push(i)
      }
    })
    if (matchingIndices.length === 0) return null

    // Collect all steps in the matching segments
    const matchingSteps = []
    for (const i of matchingIndices) {
      matchingSteps.push(...segments[i].steps)
    }
    matchingSteps.sort((a, b) => {
      const da = parseDate(a.date_start)
      const db = parseDate(b.date_start)
      return (da || 0) - (db || 0)
    })

    const zoomStart = parseDate(matchingSteps[0].date_start)
    const zoomEnd = parseDate(matchingSteps[matchingSteps.length - 1].date_start)
    const zoomMs = zoomEnd - zoomStart

    // Recompute segments within the zoomed range
    const zoomedSegments = matchingIndices.map((i) => {
      const seg = segments[i]
      const segStart = zoomMs > 0 ? (seg.firstDate - zoomStart) / zoomMs : 0
      const segEnd = zoomMs > 0 ? (seg.lastDate - zoomStart) / zoomMs : 1
      return { ...seg, zoomStartFrac: segStart, zoomEndFrac: segEnd }
    })

    // Distribute space among zoomed segments
    for (let i = 0; i < zoomedSegments.length; i++) {
      if (i < zoomedSegments.length - 1) {
        zoomedSegments[i].zoomWidth = zoomedSegments[i + 1].zoomStartFrac - zoomedSegments[i].zoomStartFrac
      } else {
        zoomedSegments[i].zoomWidth = 1 - zoomedSegments[i].zoomStartFrac
      }
    }

    // Step ticks within the zoomed range
    const zoomedTicks = matchingSteps.map((step) => {
      const d = parseDate(step.date_start)
      const frac = zoomMs > 0 && d ? (d - zoomStart) / zoomMs : 0
      return { id: step.id, frac, isReleve: step.is_releve, step }
    })

    // Country labels within zoomed range
    const zoomedCountryLabels = []
    let lastC = null
    for (const step of matchingSteps) {
      const country = step.location?.country
      if (country && country !== lastC) {
        const d = parseDate(step.date_start)
        const frac = zoomMs > 0 ? (d - zoomStart) / zoomMs : 0
        zoomedCountryLabels.push({ country: countryFr(country), frac, step })
        lastC = country
      }
    }

    return {
      segments: zoomedSegments,
      matchingIndices,
      dateStart: zoomStart,
      dateEnd: zoomEnd,
      ticks: zoomedTicks,
      countryLabels: zoomedCountryLabels,
    }
  }, [filterCountries, segments, dateStart, dateEnd])

  const isZoomed = !!zoomed

  // Active step cursor position
  const activeFrac = useMemo(() => {
    if (activeStepId == null || !stepTicks.length) return null
    if (isZoomed) {
      const tick = zoomed.ticks.find((t) => t.id === activeStepId)
      return tick ? tick.frac : null
    }
    const tick = stepTicks.find((t) => t.id === activeStepId)
    return tick ? tick.frac : null
  }, [activeStepId, stepTicks, isZoomed, zoomed])

  const handleMouseMove = useCallback((e) => {
    if (!barRef.current) return
    const rect = barRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const frac = Math.max(0, Math.min(1, x / rect.width))

    if (isZoomed && zoomed) {
      // In zoomed mode, find the closest step from the zoomed ticks
      const zDateStart = zoomed.dateStart
      const zDateEnd = zoomed.dateEnd
      const zTotalMs = zDateEnd - zDateStart
      const hoverDate = new Date(zDateStart.getTime() + frac * zTotalMs)

      let closestStep = zoomed.ticks[0]?.step
      let closestDist = Infinity
      for (const tick of zoomed.ticks) {
        const d = parseDate(tick.step.date_start)
        if (d) {
          const dist = Math.abs(d - hoverDate)
          if (dist < closestDist) {
            closestDist = dist
            closestStep = tick.step
          }
        }
      }

      // Find which zoomed segment we're in
      let segIdx = zoomed.segments.findIndex((seg, i) => {
        const end = i < zoomed.segments.length - 1
          ? zoomed.segments[i + 1].zoomStartFrac
          : 1
        return frac >= seg.zoomStartFrac && frac < end
      })
      if (segIdx === -1) segIdx = zoomed.segments.length - 1
      const seg = zoomed.segments[segIdx]

      if (closestStep && seg) {
        setHoverInfo({ x: e.clientX, step: closestStep, segment: seg, date: hoverDate })
        setHoverSegIdx(segIdx)
        setHoverFracLocal(frac)
        if (onHoverZone) onHoverZone(seg.zone)
        if (onHoverFrac) onHoverFrac({ frac, zoneColor: seg.color })
      }
      return
    }

    // Normal (non-zoomed) mode
    if (segments.length === 0) return
    let segIdx = segments.findIndex(
      (seg) => frac >= seg.startFrac && frac < seg.endFrac
    )
    if (segIdx === -1) segIdx = segments.length - 1

    const seg = segments[segIdx]
    if (!seg) return

    const totalMs = dateEnd - dateStart
    const hoverDate = new Date(dateStart.getTime() + frac * totalMs)
    let closestStep = seg.steps[0]
    let closestDist = Infinity
    for (const step of seg.steps) {
      const d = parseDate(step.date_start)
      if (d) {
        const dist = Math.abs(d - hoverDate)
        if (dist < closestDist) {
          closestDist = dist
          closestStep = step
        }
      }
    }

    setHoverInfo({ x: e.clientX, step: closestStep, segment: seg, date: hoverDate })
    setHoverSegIdx(segIdx)
    setHoverFracLocal(frac)
    if (onHoverZone) onHoverZone(seg.zone)
    if (onHoverFrac) onHoverFrac({ frac, zoneColor: seg.color })
  }, [segments, dateStart, dateEnd, onHoverZone, onHoverFrac, isZoomed, zoomed])

  const handleMouseLeave = useCallback(() => {
    setHoverInfo(null)
    setHoverSegIdx(null)
    setHoverFracLocal(null)
    if (onHoverZone) onHoverZone(null)
    if (onHoverFrac) onHoverFrac(null)
  }, [onHoverZone, onHoverFrac])

  const handleClick = useCallback(() => {
    if (!hoverInfo?.step) return
    if (onStepClick) onStepClick(hoverInfo.step)
  }, [hoverInfo, onStepClick])

  const culturalRegionName = getCulturalRegionName(filterCountries)
  const culturalRegionColor = getCulturalRegionColor(filterCountries)

  if (!steps || steps.length === 0 || !dateStart) return null

  // Theme
  const bg = darkMode ? 'rgba(22,22,26,0.88)' : 'rgba(255,255,255,0.9)'
  const border = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
  const textColor = darkMode ? '#aaa' : '#666'
  const textMuted = darkMode ? '#555' : '#bbb'
  const tooltipBg = darkMode ? 'rgba(30,30,34,0.96)' : 'rgba(255,255,255,0.98)'
  const tooltipBorder = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
  const tooltipText = darkMode ? '#d0d0d0' : '#333'
  const tooltipMuted = darkMode ? '#888' : '#777'
  const tickColor = darkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)'
  const tickReleveColor = darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.55)'
  const cursorColor = darkMode ? '#ffffff' : '#222222'

  // Determine which dates and labels to show
  const displayDateStart = isZoomed ? zoomed.dateStart : dateStart
  const displayDateEnd = isZoomed ? zoomed.dateEnd : dateEnd
  const displayTicks = isZoomed ? zoomed.ticks : stepTicks
  const displayCountryLabels = isZoomed ? zoomed.countryLabels : countryLabels

  // Filter country labels to avoid overlap
  const visibleCountryLabels = displayCountryLabels.filter((cl, i) => {
    if (i === 0) return true
    const prev = displayCountryLabels[i - 1]
    return (cl.frac - prev.frac) > (isZoomed ? 0.03 : 0.04)
  })

  return (
    <div style={{
      position: 'absolute',
      bottom: 12,
      left: 12,
      right: 12,
      zIndex: 50,
      pointerEvents: 'auto',
    }}>
      {/* Tooltip */}
      {hoverInfo && (
        <div style={{
          position: 'fixed',
          left: Math.min(Math.max(hoverInfo.x, 110), window.innerWidth - 110),
          bottom: TIMELINE_HEIGHT + 24,
          transform: 'translateX(-50%)',
          padding: '10px 14px',
          borderRadius: 8,
          background: tooltipBg,
          border: `1px solid ${tooltipBorder}`,
          boxShadow: darkMode
            ? '0 4px 16px rgba(0,0,0,0.4)'
            : '0 4px 16px rgba(0,0,0,0.1)',
          backdropFilter: 'blur(8px)',
          pointerEvents: 'none',
          zIndex: 60,
          maxWidth: 200,
        }}>
          <div style={{
            fontSize: 12, fontWeight: 600, color: tooltipText,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {hoverInfo.step.name}
          </div>
          <div style={{ fontSize: 10.5, color: tooltipMuted, marginTop: 3 }}>
            {hoverInfo.step.location?.city}
            {hoverInfo.step.date_start && ` · ${formatDateShort(parseDate(hoverInfo.step.date_start))}`}
          </div>
          <div style={{
            display: 'inline-block',
            marginTop: 6,
            padding: '2px 6px',
            borderRadius: 3,
            background: hoverInfo.segment.color + '20',
            color: hoverInfo.segment.color,
            fontSize: 9.5,
            fontWeight: 500,
          }}>
            {hoverInfo.segment.label}
          </div>
        </div>
      )}

      {/* Timeline bar */}
      <div style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 10,
        padding: '8px 16px 10px',
        boxShadow: darkMode
          ? '0 -2px 12px rgba(0,0,0,0.3)'
          : '0 -2px 12px rgba(0,0,0,0.06)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}>
        {/* Date labels row */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
          position: 'relative',
        }}>
          <span style={{
            fontSize: 10, color: textColor, fontWeight: 500,
            transition: 'opacity 300ms',
          }}>
            {formatDateLong(displayDateStart)}
          </span>
          {culturalRegionName && !hoverInfo && (
            <span style={{
              fontSize: 10, color: culturalRegionColor || (darkMode ? '#aaa' : '#666'),
              fontWeight: 600,
              position: 'absolute', left: '50%', transform: 'translateX(-50%)',
              fontStyle: 'italic',
            }}>
              {culturalRegionName}
            </span>
          )}
          {hoverInfo && (
            <span style={{
              fontSize: 10, color: hoverInfo.segment.color, fontWeight: 600,
              position: 'absolute', left: '50%', transform: 'translateX(-50%)',
            }}>
              {hoverInfo.segment.label}
            </span>
          )}
          <span style={{
            fontSize: 10, color: textColor, fontWeight: 500,
            transition: 'opacity 300ms',
          }}>
            {formatDateLong(displayDateEnd)}
          </span>
        </div>

        {/* Segments bar with step ticks + active cursor */}
        <div
          ref={barRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          style={{
            position: 'relative',
            height: 22,
            borderRadius: 5,
            overflow: 'hidden',
            cursor: 'pointer',
            display: 'flex',
          }}
        >
          {isZoomed ? (
            /* ====== ZOOMED MODE ====== */
            <>
              {/* Render only the matching segments, expanded to full width */}
              {zoomed.segments.map((seg, i) => (
                <div
                  key={`zoom-${seg.zone}-${i}`}
                  style={{
                    flex: `0 0 ${seg.zoomWidth * 100}%`,
                    background: culturalRegionColor || seg.color,
                    opacity: hoverSegIdx != null ? (hoverSegIdx === i ? 1 : 0.65) : 0.85,
                    transition: 'opacity 150ms',
                    borderRight: i < zoomed.segments.length - 1 ? `1px solid ${bg}` : 'none',
                  }}
                />
              ))}
            </>
          ) : (
            /* ====== NORMAL MODE ====== */
            segments.map((seg, i) => (
              <div
                key={`${seg.zone}-${i}`}
                style={{
                  flex: `0 0 ${seg.width * 100}%`,
                  background: seg.color,
                  opacity: hoverSegIdx != null ? (hoverSegIdx === i ? 1 : 0.5) : 0.75,
                  transition: 'opacity 150ms',
                  borderRight: i < segments.length - 1 ? `1px solid ${bg}` : 'none',
                }}
              />
            ))
          )}

          {/* Step ticks overlay */}
          {displayTicks.map((tick) => (
            <div
              key={tick.id}
              style={{
                position: 'absolute',
                left: `${tick.frac * 100}%`,
                bottom: 0,
                width: 1,
                height: tick.isReleve ? 14 : 6,
                background: tick.isReleve ? tickReleveColor : tickColor,
                pointerEvents: 'none',
                transition: 'left 300ms ease',
              }}
            />
          ))}

          {/* Active step cursor */}
          {activeFrac != null && (
            <div style={{
              position: 'absolute',
              left: `${activeFrac * 100}%`,
              top: -3,
              bottom: -3,
              width: 2,
              background: cursorColor,
              borderRadius: 1,
              pointerEvents: 'none',
              boxShadow: `0 0 4px ${darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)'}`,
              transition: 'left 300ms ease',
            }} />
          )}

          {/* Hover cursor — follows mouse */}
          {hoverFracLocal != null && (
            <div style={{
              position: 'absolute',
              left: `${hoverFracLocal * 100}%`,
              top: -4,
              bottom: -4,
              width: 2,
              background: '#ffffff',
              borderRadius: 1,
              pointerEvents: 'none',
              boxShadow: '0 0 6px rgba(0,0,0,0.5)',
              zIndex: 2,
            }} />
          )}
        </div>

        {/* Country labels below */}
        <div style={{
          position: 'relative',
          height: 14,
          marginTop: 4,
        }}>
          {visibleCountryLabels.map((cl, i) => {
            const leftPct = cl.frac * 100
            const clampedLeft = Math.max(2, Math.min(leftPct, 95))
            return (
              <span
                key={`${cl.country}-${i}`}
                style={{
                  position: 'absolute',
                  left: `${clampedLeft}%`,
                  fontSize: 8.5,
                  color: textMuted,
                  fontVariant: 'all-small-caps',
                  letterSpacing: '0.05em',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: isZoomed ? '15%' : '8%',
                  transform: i === 0 ? 'none' : 'translateX(-50%)',
                  transition: 'left 300ms ease, max-width 300ms ease',
                }}
              >
                {cl.country}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
