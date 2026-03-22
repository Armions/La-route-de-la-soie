import { useState, useEffect } from 'react'

const STORAGE_KEY = 'route-soie-map-mode'

function getInitialMode() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'high') return 'high'
  } catch (_) {}
  return 'low'
}

export default function MapModeToggle({ darkMode, onChange }) {
  const [mode, setMode] = useState(getInitialMode)

  useEffect(() => {
    onChange(mode)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function toggle() {
    const next = mode === 'low' ? 'high' : 'low'
    setMode(next)
    try { localStorage.setItem(STORAGE_KEY, next) } catch (_) {}
    onChange(next)
  }

  const isHigh = mode === 'high'

  return (
    <button
      onClick={toggle}
      title={isHigh ? 'Mode Low — Atlas sobre' : 'Mode High — Terrain texturé'}
      className="fixed top-4 flex items-center justify-center w-9 h-9 rounded-full backdrop-blur-sm border transition-colors duration-200"
      style={{
        right: 60,
        background: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
        borderColor: darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)',
        color: darkMode ? '#e0e0e0' : '#444444',
        zIndex: 9999,
      }}
    >
      {isHigh ? (
        // Mountain icon (high mode active)
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3l4 8 5-5 5 15H2L8 3z" />
        </svg>
      ) : (
        // Globe icon (low mode)
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      )}
    </button>
  )
}
