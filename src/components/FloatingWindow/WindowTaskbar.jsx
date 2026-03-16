import { useWindowManager } from '../../hooks/useWindowManager'

/**
 * Taskbar at bottom of screen showing minimized windows as tabs.
 */
export default function WindowTaskbar({ darkMode }) {
  const { windows, restoreWindow } = useWindowManager()
  const minimized = windows.filter((w) => w.minimized)

  if (minimized.length === 0) return null

  const bg = darkMode ? 'rgba(30,30,35,0.9)' : 'rgba(255,255,255,0.92)'
  const border = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
  const text = darkMode ? '#c0c0c0' : '#444444'
  const tabBg = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'
  const tabHover = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] flex items-center gap-1.5 px-3 backdrop-blur-sm"
      style={{
        height: 36,
        background: bg,
        borderTop: `1px solid ${border}`,
      }}
    >
      {minimized.map((win) => (
        <button
          key={win.id}
          onClick={() => restoreWindow(win.id)}
          className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium truncate max-w-[200px] transition-colors"
          style={{ background: tabBg, color: text }}
          onMouseEnter={(e) => (e.currentTarget.style.background = tabHover)}
          onMouseLeave={(e) => (e.currentTarget.style.background = tabBg)}
          title={win.title}
        >
          {win.icon && <span>{win.icon}</span>}
          <span className="truncate">{win.title}</span>
        </button>
      ))}
    </div>
  )
}
