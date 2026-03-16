import FloatingWindow from '../FloatingWindow/FloatingWindow'
import { useWindowManager } from '../../hooks/useWindowManager'

const WEATHER_ICONS = {
  'clear-day': '\u2600\uFE0F',
  'clear-night': '\uD83C\uDF19',
  'partly-cloudy-day': '\u26C5',
  'partly-cloudy-night': '\uD83C\uDF24\uFE0F',
  'cloudy': '\u2601\uFE0F',
  'rain': '\uD83C\uDF27\uFE0F',
  'snow': '\u2744\uFE0F',
  'wind': '\uD83C\uDF2C\uFE0F',
  'fog': '\uD83C\uDF2B\uFE0F',
}

function truncate(text, max = 150) {
  if (!text || text.length <= max) return text || ''
  const cut = text.lastIndexOf(' ', max)
  return text.substring(0, cut > 0 ? cut : max) + '\u2026'
}

function formatLocation(loc) {
  if (!loc) return ''
  const parts = [loc.city, loc.country].filter(Boolean)
  return parts.join(' \u2014 ')
}

export default function StopHub({ step, zoneColor, darkMode }) {
  const { openWindow } = useWindowManager()

  if (!step) return null

  const windowId = `stop-hub-${step.id}`
  const weatherIcon = WEATHER_ICONS[step.weather?.condition] || ''
  const temperature = step.weather?.temperature
  const accroche = truncate(step.description)

  const text = darkMode ? '#d0d0d0' : '#2a2a2a'
  const textSecondary = darkMode ? '#999' : '#555'
  const textMuted = darkMode ? '#666' : '#888'
  const divider = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const btnBg = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)'
  const btnBorder = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
  const btnHover = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'

  function handleReadMore() {
    const textWinId = `text-viewer-${step.id}`
    openWindow({ id: textWinId, type: 'text-viewer', title: step.name, icon: '\uD83D\uDCDD' })
  }

  return (
    <FloatingWindow
      id={windowId}
      title={step.name}
      icon={weatherIcon || '\uD83D\uDCCD'}
      darkMode={darkMode}
      resizable={false}
    >
      <div style={{ width: 320 }}>
        {/* Zone color accent bar */}
        <div style={{ height: 3, background: zoneColor || '#9CA3AF' }} />

        <div style={{ padding: '20px 22px 22px' }}>
          {/* Header */}
          <h2 style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 600,
            lineHeight: 1.35,
            color: text,
          }}>
            {step.name}
          </h2>
          <p style={{
            margin: '6px 0 0',
            fontSize: 11.5,
            color: textMuted,
            letterSpacing: '0.01em',
          }}>
            {formatLocation(step.location)}
          </p>

          {/* Weather */}
          {(weatherIcon || temperature != null) && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 16,
              paddingTop: 14,
              borderTop: `1px solid ${divider}`,
            }}>
              {weatherIcon && <span style={{ fontSize: 20, lineHeight: 1 }}>{weatherIcon}</span>}
              {temperature != null && (
                <span style={{ fontSize: 14, fontWeight: 500, color: text }}>
                  {temperature}°C
                </span>
              )}
            </div>
          )}

          {/* Description accroche */}
          {accroche && (
            <p style={{
              margin: '16px 0 0',
              fontSize: 12.5,
              lineHeight: 1.6,
              color: textSecondary,
            }}>
              {accroche}
            </p>
          )}

          {/* Read more button */}
          {step.description && step.description.trim() && (
            <button
              onClick={handleReadMore}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 18,
                padding: '8px 14px',
                fontSize: 11.5,
                fontWeight: 500,
                color: textSecondary,
                background: btnBg,
                border: `1px solid ${btnBorder}`,
                borderRadius: 6,
                cursor: 'pointer',
                transition: 'background 150ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = btnHover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = btnBg)}
            >
              <span style={{ fontSize: 13 }}>{'\uD83D\uDCDD'}</span>
              Lire la suite
            </button>
          )}
        </div>
      </div>
    </FloatingWindow>
  )
}
