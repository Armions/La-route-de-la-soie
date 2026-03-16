import { useState } from 'react'
import VoyageTab from './VoyageTab'
import CalquesTab from './CalquesTab'

/**
 * Sidebar — panneau latéral gauche, 320px, deux onglets.
 * Le parent contrôle la largeur visible (0 ou 320px) et le collapse.
 */
export default function Sidebar({
  darkMode,
  steps,
  meta,
  onStepClick,
  activeStepId,
  mapRef,
}) {
  const [tab, setTab] = useState('voyage')

  // Theme
  const bg = darkMode ? '#1a1a1e' : '#ffffff'
  const border = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const text = darkMode ? '#d0d0d0' : '#2a2a2a'
  const tabInactive = darkMode ? '#666' : '#aaa'
  const tabActive = darkMode ? '#d0d0d0' : '#2a2a2a'
  const tabIndicator = darkMode ? '#888' : '#2a2a2a'

  return (
    <div
      className="flex flex-col h-full"
      style={{
        width: 320,
        minWidth: 320,
        background: bg,
        borderRight: `1px solid ${border}`,
      }}
    >
      {/* Tabs — top of sidebar */}
      <div
        className="flex shrink-0"
        style={{ borderBottom: `1px solid ${border}` }}
      >
        {[
          { id: 'voyage', label: 'Voyage' },
          { id: 'calques', label: 'Calques' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 py-3 text-[11px] font-medium uppercase tracking-[0.12em] transition-colors"
            style={{
              color: tab === t.id ? tabActive : tabInactive,
              borderBottom: tab === t.id
                ? `2px solid ${tabIndicator}`
                : '2px solid transparent',
              letterSpacing: '0.12em',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content — fills remaining height, handles its own scroll */}
      <div className="flex-1 min-h-0">
        {tab === 'voyage' ? (
          <VoyageTab
            darkMode={darkMode}
            steps={steps}
            meta={meta}
            onStepClick={onStepClick}
            activeStepId={activeStepId}
            mapRef={mapRef}
          />
        ) : (
          <CalquesTab darkMode={darkMode} mapRef={mapRef} />
        )}
      </div>
    </div>
  )
}
