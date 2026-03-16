import FloatingWindow from '../FloatingWindow/FloatingWindow'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function TextViewer({ step, darkMode }) {
  if (!step) return null

  const windowId = `text-viewer-${step.id}`

  const text = darkMode ? '#d0d0d0' : '#2a2a2a'
  const textSecondary = darkMode ? '#999' : '#555'
  const textMuted = darkMode ? '#666' : '#888'
  const divider = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'

  const location = [step.location?.city, step.location?.country].filter(Boolean).join(', ')
  const date = formatDate(step.date_start)
  const subtitle = [location, date].filter(Boolean).join(' \u2014 ')

  return (
    <FloatingWindow
      id={windowId}
      title={step.name}
      icon={'\uD83D\uDCDD'}
      darkMode={darkMode}
      resizable={true}
    >
      <div style={{ width: 380, maxHeight: 500, padding: '22px 24px 26px' }}>
        <h2 style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 600,
          lineHeight: 1.35,
          color: text,
        }}>
          {step.name}
        </h2>
        {subtitle && (
          <p style={{
            margin: '8px 0 0',
            fontSize: 11.5,
            color: textMuted,
            letterSpacing: '0.01em',
          }}>
            {subtitle}
          </p>
        )}

        <div style={{
          marginTop: 18,
          paddingTop: 16,
          borderTop: `1px solid ${divider}`,
          fontSize: 13.5,
          lineHeight: 1.75,
          color: textSecondary,
          whiteSpace: 'pre-wrap',
        }}>
          {step.description || 'Aucune description disponible.'}
        </div>
      </div>
    </FloatingWindow>
  )
}
