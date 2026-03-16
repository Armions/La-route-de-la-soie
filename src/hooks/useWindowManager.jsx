import { createContext, useContext, useState, useCallback, useRef } from 'react'

const WindowManagerContext = createContext(null)

/**
 * Window manager — tracks open/minimized floating windows.
 * Each window: { id, type, title, icon, minimized, position, size, zIndex, ...custom }
 *
 * Rules:
 * - closeWindow: ONLY removes a window (explicit user action via X button)
 * - minimizeWindow / restoreWindow: toggle minimized state, never remove
 * - openWindow: creates or re-focuses. Merges new props into existing window.
 * - Each window has a unique id and is fully independent.
 */
export function WindowManagerProvider({ children }) {
  const [windows, setWindows] = useState([])
  const zCounterRef = useRef(100)

  const openWindow = useCallback((win) => {
    setWindows((prev) => {
      const z = zCounterRef.current + 1
      zCounterRef.current = z

      const existing = prev.find((w) => w.id === win.id)
      if (existing) {
        // Merge new props, restore from minimized, bring to front
        return prev.map((w) =>
          w.id === win.id
            ? { ...w, ...win, minimized: false, zIndex: z }
            : w
        )
      }
      return [...prev, { ...win, minimized: false, zIndex: z }]
    })
  }, [])

  const closeWindow = useCallback((id) => {
    setWindows((prev) => prev.filter((w) => w.id !== id))
  }, [])

  const minimizeWindow = useCallback((id) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, minimized: true } : w))
    )
  }, [])

  const restoreWindow = useCallback((id) => {
    setWindows((prev) => {
      const z = zCounterRef.current + 1
      zCounterRef.current = z
      return prev.map((w) =>
        w.id === id ? { ...w, minimized: false, zIndex: z } : w
      )
    })
  }, [])

  const focusWindow = useCallback((id) => {
    setWindows((prev) => {
      const win = prev.find((w) => w.id === id)
      if (!win || win.zIndex === zCounterRef.current) return prev
      const z = zCounterRef.current + 1
      zCounterRef.current = z
      return prev.map((w) => (w.id === id ? { ...w, zIndex: z } : w))
    })
  }, [])

  const updateWindowPosition = useCallback((id, position) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, position } : w))
    )
  }, [])

  const updateWindowSize = useCallback((id, size) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, size } : w))
    )
  }, [])

  const value = {
    windows,
    openWindow,
    closeWindow,
    minimizeWindow,
    restoreWindow,
    focusWindow,
    updateWindowPosition,
    updateWindowSize,
  }

  return (
    <WindowManagerContext.Provider value={value}>
      {children}
    </WindowManagerContext.Provider>
  )
}

export function useWindowManager() {
  const ctx = useContext(WindowManagerContext)
  if (!ctx) throw new Error('useWindowManager must be used within WindowManagerProvider')
  return ctx
}
