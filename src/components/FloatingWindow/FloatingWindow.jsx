import { useRef, useCallback, useEffect, useState } from 'react'
import { useWindowManager } from '../../hooks/useWindowManager'

const MIN_WIDTH = 260
const MIN_HEIGHT = 150

/**
 * Floating OS-style window: draggable title bar, minimize, close, optional resize.
 * Reads position/size/zIndex from the window manager by `id`.
 */
export default function FloatingWindow({
  id,
  title = '',
  icon = null,
  darkMode = false,
  resizable = true,
  children,
}) {
  const {
    windows,
    closeWindow,
    minimizeWindow,
    focusWindow,
    updateWindowPosition,
    updateWindowSize,
  } = useWindowManager()

  const win = windows.find((w) => w.id === id)
  if (!win || win.minimized) return null

  return (
    <FloatingWindowInner
      id={id}
      win={win}
      title={title}
      icon={icon}
      darkMode={darkMode}
      resizable={resizable}
      closeWindow={closeWindow}
      minimizeWindow={minimizeWindow}
      focusWindow={focusWindow}
      updateWindowPosition={updateWindowPosition}
      updateWindowSize={updateWindowSize}
    >
      {children}
    </FloatingWindowInner>
  )
}

function FloatingWindowInner({
  id,
  win,
  title,
  icon,
  darkMode,
  resizable,
  closeWindow,
  minimizeWindow,
  focusWindow,
  updateWindowPosition,
  updateWindowSize,
  children,
}) {
  const dragRef = useRef(null)
  const windowRef = useRef(null)
  const resizeRef = useRef(null)

  // Centering on first render if no position set
  const [centered, setCentered] = useState(false)
  useEffect(() => {
    if (!centered && windowRef.current && !win.position) {
      const rect = windowRef.current.getBoundingClientRect()
      updateWindowPosition(id, {
        x: Math.max(40, (window.innerWidth - rect.width) / 2),
        y: Math.max(40, (window.innerHeight - rect.height) / 3),
      })
      setCentered(true)
    }
  }, [centered, id, win.position, updateWindowPosition])

  // Drag handling
  const handleDragStart = useCallback(
    (e) => {
      // Ignore if clicking buttons
      if (e.target.closest('button')) return
      e.preventDefault()
      focusWindow(id)

      const startX = e.clientX
      const startY = e.clientY
      const pos = win.position || { x: 0, y: 0 }
      const origX = pos.x
      const origY = pos.y

      function onMove(ev) {
        updateWindowPosition(id, {
          x: origX + ev.clientX - startX,
          y: Math.max(0, origY + ev.clientY - startY),
        })
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    },
    [id, win.position, focusWindow, updateWindowPosition]
  )

  // Resize handling
  const handleResizeStart = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      focusWindow(id)

      const startX = e.clientX
      const startY = e.clientY
      const size = win.size || { width: 380, height: 300 }
      const origW = size.width
      const origH = size.height

      function onMove(ev) {
        updateWindowSize(id, {
          width: Math.max(MIN_WIDTH, origW + ev.clientX - startX),
          height: Math.max(MIN_HEIGHT, origH + ev.clientY - startY),
        })
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    },
    [id, win.size, focusWindow, updateWindowSize]
  )

  const pos = win.position || { x: 100, y: 100 }
  const size = win.size || {}

  // Theme
  const bg = darkMode ? '#1e1e22' : '#ffffff'
  const borderColor = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)'
  const titleBg = darkMode ? '#28282e' : '#f5f5f5'
  const titleColor = darkMode ? '#d0d0d0' : '#333333'
  const btnHover = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'
  const shadow = darkMode
    ? '0 8px 32px rgba(0,0,0,0.5)'
    : '0 8px 32px rgba(0,0,0,0.15)'

  return (
    <div
      ref={windowRef}
      onMouseDown={() => focusWindow(id)}
      className="fixed select-none"
      style={{
        left: pos.x,
        top: pos.y,
        width: size.width || 'auto',
        height: size.height || 'auto',
        minWidth: MIN_WIDTH,
        minHeight: MIN_HEIGHT,
        zIndex: win.zIndex || 100,
        borderRadius: 8,
        border: `1px solid ${borderColor}`,
        background: bg,
        boxShadow: shadow,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Title bar */}
      <div
        ref={dragRef}
        onMouseDown={handleDragStart}
        className="flex items-center gap-2 px-3 shrink-0 cursor-move"
        style={{
          height: 36,
          background: titleBg,
          borderBottom: `1px solid ${borderColor}`,
        }}
      >
        {icon && <span className="text-sm">{icon}</span>}
        <span
          className="text-xs font-medium truncate flex-1"
          style={{ color: titleColor }}
        >
          {title}
        </span>

        {/* Minimize */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            minimizeWindow(id)
          }}
          className="flex items-center justify-center w-6 h-6 rounded transition-colors"
          style={{ color: titleColor }}
          onMouseEnter={(e) => (e.currentTarget.style.background = btnHover)}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          title="Minimiser"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>

        {/* Close */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            closeWindow(id)
          }}
          className="flex items-center justify-center w-6 h-6 rounded transition-colors"
          style={{ color: titleColor }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.15)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          title="Fermer"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5" />
            <line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto" style={{ color: titleColor }}>
        {children}
      </div>

      {/* Resize handle */}
      {resizable && (
        <div
          ref={resizeRef}
          onMouseDown={handleResizeStart}
          className="absolute bottom-0 right-0 cursor-se-resize"
          style={{ width: 16, height: 16 }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            className="absolute bottom-1 right-1"
            style={{ opacity: 0.3 }}
          >
            <line x1="9" y1="1" x2="1" y2="9" stroke={titleColor} strokeWidth="1" />
            <line x1="9" y1="4" x2="4" y2="9" stroke={titleColor} strokeWidth="1" />
            <line x1="9" y1="7" x2="7" y2="9" stroke={titleColor} strokeWidth="1" />
          </svg>
        </div>
      )}
    </div>
  )
}
