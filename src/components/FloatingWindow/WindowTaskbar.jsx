import { useWindowManager } from '../../hooks/useWindowManager'
import { TIMELINE_HEIGHT } from '../Timeline/Timeline'

/**
 * Taskbar — barre en bas de l'écran, AU-DESSUS de la frise.
 * Affiche les fenêtres minimisées. Clic = restaurer.
 * Se décale à droite de la sidebar.
 */
export default function WindowTaskbar({ darkMode, sidebarWidth = 0 }) {
  const { windows, restoreWindow } = useWindowManager()
  const minimized = windows.filter((w) => w.minimized)

  if (minimized.length === 0) return null

  const barBg = darkMode ? 'rgba(22,22,26,0.92)' : 'rgba(250,250,250,0.94)'
  const barBorder = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
  const tabBg = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'
  const tabHoverBg = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.07)'
  const tabBorder = darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const textColor = darkMode ? '#c0c0c0' : '#444'
  const shadow = darkMode
    ? '0 -2px 12px rgba(0,0,0,0.3)'
    : '0 -2px 12px rgba(0,0,0,0.06)'
  const tabHoverShadow = darkMode
    ? '0 2px 8px rgba(0,0,0,0.3)'
    : '0 2px 8px rgba(0,0,0,0.08)'

  return (
    <div style={{
      position: 'fixed',
      bottom: TIMELINE_HEIGHT + 24,
      left: sidebarWidth + 12,
      right: 12,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 12px',
      borderRadius: 10,
      background: barBg,
      border: `1px solid ${barBorder}`,
      boxShadow: shadow,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      overflowX: 'auto',
      overflowY: 'hidden',
      pointerEvents: 'auto',
      transition: 'left 300ms ease',
    }}>
      {minimized.map((win) => (
        <button
          key={win.id}
          onClick={() => restoreWindow(win.id)}
          title={win.title}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            minWidth: 180,
            maxWidth: 240,
            padding: '8px 14px',
            borderRadius: 7,
            border: `1px solid ${tabBorder}`,
            background: tabBg,
            color: textColor,
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'background 150ms, box-shadow 150ms, transform 150ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = tabHoverBg
            e.currentTarget.style.boxShadow = tabHoverShadow
            e.currentTarget.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = tabBg
            e.currentTarget.style.boxShadow = 'none'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          {/* Pastille couleur de zone */}
          {win.zoneColor && (
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: win.zoneColor,
              flexShrink: 0,
            }} />
          )}
          {win.icon && !win.zoneColor && (
            <span style={{ fontSize: 13, flexShrink: 0 }}>{win.icon}</span>
          )}
          <span style={{
            fontSize: 12,
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}>
            {win.title}
          </span>
        </button>
      ))}
    </div>
  )
}
