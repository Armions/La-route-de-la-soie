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

// Boutons d'assets pour les arrêts-relevés
const ASSET_BUTTONS = [
  { key: 'photos',   icon: '\uD83D\uDCF7', label: 'Photos',         check: (s) => s.assets?.photos?.length > 0 },
  { key: 'drawings', icon: '\uD83D\uDCD0', label: 'Dessins',        check: (s) => s.assets?.drawings?.length > 0 },
  { key: 'model_3d', icon: '\uD83E\uDDCA', label: '3D',             check: (s) => s.assets?.model_3d != null },
  { key: 'text',     icon: '\uD83D\uDCDD', label: 'Lire la suite',  check: (s) => s.description?.trim() },
  { key: 'sketches', icon: '\u270F\uFE0F',  label: 'Croquis',       check: (s) => s.assets?.sketches?.length > 0 },
]

function truncate(text, max = 150) {
  if (!text || text.length <= max) return text || ''
  const cut = text.lastIndexOf(' ', max)
  return text.substring(0, cut > 0 ? cut : max) + '\u2026'
}

function countryFr(name) {
  return COUNTRY_FR[name] || name
}

function formatLocation(loc) {
  if (!loc) return ''
  return [loc.city, countryFr(loc.country)].filter(Boolean).join(' \u2014 ')
}

export default function StopHub({ step, zoneColor, darkMode }) {
  const { openWindow } = useWindowManager()

  if (!step) return null

  const windowId = `stop-hub-${step.id}`
  const weatherIcon = WEATHER_ICONS[step.weather?.condition] || ''
  const temperature = step.weather?.temperature
  const accroche = truncate(step.description)
  const isReleve = step.is_releve
  const habitatType = step.releves?.[0]?.habitat_type

  // Theme
  const text = darkMode ? '#d0d0d0' : '#2a2a2a'
  const textSecondary = darkMode ? '#999' : '#555'
  const textMuted = darkMode ? '#666' : '#888'
  const divider = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const btnBg = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)'
  const btnBorder = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
  const btnHover = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'
  const badgeBg = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)'
  const badgeBorder = darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const accentFaint = zoneColor
    ? (darkMode ? zoneColor + '18' : zoneColor + '12')
    : 'transparent'

  function handleReadMore() {
    openWindow({
      id: `text-viewer-${step.id}`,
      type: 'text-viewer',
      title: step.name,
      icon: '\uD83D\uDCDD',
      zoneColor,
    })
  }

  function handleAssetClick(key) {
    if (key === 'text') {
      handleReadMore()
    } else {
      console.log(`Open ${key} viewer for step:`, step.id, step.name)
    }
  }

  // Collect available asset buttons for relevé
  const availableAssets = isReleve
    ? ASSET_BUTTONS.filter((btn) => btn.check(step))
    : []

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
            margin: 0, fontSize: 15, fontWeight: 600, lineHeight: 1.35, color: text,
          }}>
            {step.name}
          </h2>
          <p style={{
            margin: '6px 0 0', fontSize: 11.5, color: textMuted, letterSpacing: '0.01em',
          }}>
            {formatLocation(step.location)}
          </p>
          {step.coordinates?.lat != null && step.coordinates?.lon != null && (
            <p style={{
              margin: '3px 0 0', fontSize: 9.5, color: textMuted,
              fontFamily: 'monospace', letterSpacing: '0.02em', opacity: 0.7,
            }}>
              {Math.abs(step.coordinates.lat).toFixed(4)}°{step.coordinates.lat >= 0 ? 'N' : 'S'}, {Math.abs(step.coordinates.lon).toFixed(4)}°{step.coordinates.lon >= 0 ? 'E' : 'W'}
            </p>
          )}

          {/* Relevé badge */}
          {isReleve && habitatType && (
            <div style={{
              marginTop: 14,
              padding: '10px 14px',
              borderRadius: 7,
              background: accentFaint,
              border: `1px solid ${badgeBorder}`,
            }}>
              <div style={{
                fontSize: 9, fontVariant: 'all-small-caps', letterSpacing: '0.1em',
                fontWeight: 600, color: textMuted, marginBottom: 4,
              }}>
                Relevé architectural
              </div>
              <div style={{
                fontSize: 14, fontWeight: 600, color: text,
                fontFamily: 'Georgia, "Times New Roman", serif',
              }}>
                {habitatType}
              </div>
            </div>
          )}

          {/* Weather */}
          {(weatherIcon || temperature != null) && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              marginTop: 16, paddingTop: 14,
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
              margin: '16px 0 0', fontSize: 12.5, lineHeight: 1.6, color: textSecondary,
            }}>
              {accroche}
            </p>
          )}

          {/* Asset action buttons — relevé only */}
          {isReleve && availableAssets.length > 0 && (
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 6,
              marginTop: 18, paddingTop: 16,
              borderTop: `1px solid ${divider}`,
            }}>
              {availableAssets.map((btn) => (
                <button
                  key={btn.key}
                  onClick={() => handleAssetClick(btn.key)}
                  title={btn.label}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '7px 12px', fontSize: 11, fontWeight: 500,
                    color: textSecondary,
                    background: btnBg, border: `1px solid ${btnBorder}`,
                    borderRadius: 6, cursor: 'pointer',
                    transition: 'background 150ms',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = btnHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = btnBg)}
                >
                  <span style={{ fontSize: 13 }}>{btn.icon}</span>
                  {btn.label}
                </button>
              ))}
            </div>
          )}

          {/* Read more — for simple stops (non-relevé) with description */}
          {!isReleve && step.description?.trim() && (
            <button
              onClick={handleReadMore}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                marginTop: 18, padding: '8px 14px',
                fontSize: 11.5, fontWeight: 500, color: textSecondary,
                background: btnBg, border: `1px solid ${btnBorder}`,
                borderRadius: 6, cursor: 'pointer',
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
