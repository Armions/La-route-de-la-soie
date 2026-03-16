import { useState, useEffect } from 'react'

const STORAGE_KEY = 'route-soie-dark-mode'

function getInitialMode() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) return stored === 'true'
  } catch (_) {}
  return false // light mode by default
}

export default function DarkModeToggle({ onChange }) {
  const [dark, setDark] = useState(getInitialMode)

  // Notify parent on mount
  useEffect(() => {
    onChange(dark)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function toggle() {
    const next = !dark
    setDark(next)
    try {
      localStorage.setItem(STORAGE_KEY, String(next))
    } catch (_) {}
    onChange(next)
  }

  return (
    <button
      onClick={toggle}
      title={dark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      className="fixed top-4 right-4 z-50 flex items-center justify-center w-9 h-9 rounded-full backdrop-blur-sm border transition-colors duration-200"
      style={{
        background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
        borderColor: dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)',
        color: dark ? '#e0e0e0' : '#444444',
      }}
    >
      {dark ? (
        // Sun icon — switch to light
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        // Moon icon — switch to dark
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  )
}
