import { useRef, useCallback, useEffect, useState } from 'react'
import { useWindowManager } from '../../hooks/useWindowManager'

const MIN_WIDTH = 260
const MIN_HEIGHT = 120

/**
 * Floating OS-style window: draggable title bar, minimize, close, optional resize.
 * Uses transform:translate3d (GPU) for smooth drag. pointer-events:auto on each window.
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
  const windowRef = useRef(null)
  const [dragging, setDragging] = useState(false)

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

  const posRef = useRef(win.position)
  posRef.current = win.position

  const handleDragStart = useCallback(
    (e) => {
      if (e.target.closest('button')) return
      e.preventDefault()
      focusWindow(id)
      setDragging(true)

      const startX = e.clientX
      const startY = e.clientY
      const pos = posRef.current || { x: 0, y: 0 }
      const origX = pos.x
      const origY = pos.y

      function onMove(ev) {
        updateWindowPosition(id, {
          x: origX + ev.clientX - startX,
          y: Math.max(0, origY + ev.clientY - startY),
        })
      }
      function onUp() {
        setDragging(false)
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    },
    [id, focusWindow, updateWindowPosition]
  )

  const sizeRef = useRef(win.size)
  sizeRef.current = win.size

  const handleResizeStart = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      focusWindow(id)

      const startX = e.clientX
      const startY = e.clientY
      const size = sizeRef.current || { width: 380, height: 300 }
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
    [id, focusWindow, updateWindowSize]
  )

  const pos = win.position || { x: 100, y: 100 }
  const size = win.size || {}

  const bg = darkMode ? '#1e1e22' : '#ffffff'
  const borderColor = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
  const titleBg = darkMode ? '#242428' : '#f7f7f7'
  const titleColor = darkMode ? '#d0d0d0' : '#333333'
  const btnHover = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'
  const shadow = darkMode
    ? '0 12px 40px rgba(0,0,0,0.55)'
    : '0 12px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)'

  return (
    <div
      ref={windowRef}
      onMouseDown={() => focusWindow(id)}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
        willChange: dragging ? 'transform' : 'auto',
        pointerEvents: 'auto',
        width: size.width || 'auto',
        height: size.height || 'auto',
        minWidth: MIN_WIDTH,
        zIndex: win.zIndex || 100,
        borderRadius: 10,
        border: `1px solid ${borderColor}`,
        background: bg,
        boxShadow: shadow,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Title bar */}
      <div
        onMouseDown={handleDragStart}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 14px',
          height: 38,
          flexShrink: 0,
          cursor: 'move',
          background: titleBg,
          borderBottom: `1px solid ${borderColor}`,
        }}
      >
        {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: titleColor,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </span>

        <button
          onClick={(e) => { e.stopPropagation(); minimizeWindow(id) }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 26, height: 26, borderRadius: 5,
            border: 'none', background: 'transparent', color: titleColor, cursor: 'pointer',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = btnHover)}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          title="Minimiser"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); closeWindow(id) }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 26, height: 26, borderRadius: 5,
            border: 'none', background: 'transparent', color: titleColor, cursor: 'pointer',
          }}
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
      <div style={{ flex: 1, overflow: 'auto', color: titleColor }}>
        {children}
      </div>

      {/* Resize handle */}
      {resizable && (
        <div
          onMouseDown={handleResizeStart}
          style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 18, height: 18, cursor: 'se-resize',
          }}
        >
          <svg
            width="10" height="10" viewBox="0 0 10 10"
            style={{ position: 'absolute', bottom: 4, right: 4, opacity: 0.25 }}
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
