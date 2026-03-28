import { useState } from 'react'
import VoyageTab from './VoyageTab'
import CalquesTab from './CalquesTab'
import Atlas from '../Atlas/Atlas'

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
  onCulturalFilter,
  timelineVisible,
  onTimelineVisibleChange,
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
          { id: 'atlas', label: 'Atlas' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              padding: '14px 0',
              fontSize: 13,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: tab === t.id ? tabActive : tabInactive,
              background: 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              borderBottom: `2px solid ${tab === t.id ? tabIndicator : 'transparent'}`,
              cursor: 'pointer',
              transition: 'color 150ms',
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
            onCulturalFilter={onCulturalFilter}
          />
        ) : tab === 'calques' ? (
          <CalquesTab darkMode={darkMode} mapRef={mapRef} timelineVisible={timelineVisible} onTimelineVisibleChange={onTimelineVisibleChange} />
        ) : (
          <Atlas
            darkMode={darkMode}
            steps={steps}
            meta={meta}
            onStepClick={onStepClick}
          />
        )}
      </div>
    </div>
  )
}
