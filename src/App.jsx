import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import MapView from './components/Map/MapView'
import MapLegend from './components/Map/MapLegend'
import DarkModeToggle from './components/Map/DarkModeToggle'
import MapModeToggle from './components/Map/MapModeToggle'
import Sidebar from './components/Sidebar/Sidebar'
import StopHub from './components/StopHub/StopHub'
import TextViewer from './components/TextViewer/TextViewer'
import Timeline from './components/Timeline/Timeline'
import WindowTaskbar from './components/FloatingWindow/WindowTaskbar'
import useStepsData from './hooks/useStepsData'
import { WindowManagerProvider, useWindowManager } from './hooks/useWindowManager'

function App() {
  const [darkMode, setDarkMode] = useState(false)
  const [mapMode, setMapMode] = useState('low')

  return (
    <WindowManagerProvider>
      <AppContent darkMode={darkMode} setDarkMode={setDarkMode} mapMode={mapMode} setMapMode={setMapMode} />
    </WindowManagerProvider>
  )
}

function AppContent({ darkMode, setDarkMode, mapMode, setMapMode }) {
  const mapViewRef = useRef(null)
  const { steps, meta, locations, loading, error } = useStepsData()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeStepId, setActiveStepId] = useState(null)
  const [highlightedZone, setHighlightedZone] = useState(null)
  const [timelineHoverFrac, setTimelineHoverFrac] = useState(null)
  const [filterCountries, setFilterCountries] = useState(null)
  const { windows, openWindow, minimizeWindow } = useWindowManager()
  const prevHubIdRef = useRef(null)
  const skipMapMoveRef = useRef(false)

  // Index steps by id for O(1) lookup
  const stepsById = useMemo(() => {
    if (!steps) return {}
    const map = {}
    for (const s of steps) map[s.id] = s
    return map
  }, [steps])

  // Resize map on mount + whenever sidebar toggles
  useEffect(() => {
    const timers = [0, 50, 200, 350].map((ms) =>
      setTimeout(() => {
        const map = mapViewRef.current?.getMap()
        if (map) map.resize()
      }, ms)
    )
    return () => timers.forEach(clearTimeout)
  }, [sidebarCollapsed, loading])

  // Map move → find closest step to center → update frise cursor
  // Skip when flyTo is in progress (triggered by step click)
  const handleMapMove = useCallback((center) => {
    if (skipMapMoveRef.current) return
    if (!steps || steps.length === 0) return
    let closest = null
    let minDist = Infinity
    for (const s of steps) {
      const dx = s.coordinates.lon - center.lng
      const dy = s.coordinates.lat - center.lat
      const dist = dx * dx + dy * dy
      if (dist < minDist) {
        minDist = dist
        closest = s
      }
    }
    if (closest) {
      setActiveStepId((prev) => prev === closest.id ? prev : closest.id)
    }
  }, [steps])

  const handleStepClick = useCallback((step) => {
    setActiveStepId(step.id)

    const newHubId = `stop-hub-${step.id}`
    const zoneColor = meta?.zones[step.zone]?.color || '#9CA3AF'

    // Minimize (never close) previous hub if it's a different one
    if (prevHubIdRef.current && prevHubIdRef.current !== newHubId) {
      minimizeWindow(prevHubIdRef.current)
    }
    prevHubIdRef.current = newHubId

    // Open new hub (or restore if it already exists minimized)
    openWindow({
      id: newHubId,
      type: 'stop-hub',
      title: step.name,
      stepId: step.id,
      zoneColor,
    })

    // Fly to step — skip map move handler during animation
    const map = mapViewRef.current?.getMap()
    if (map) {
      skipMapMoveRef.current = true
      map.flyTo({
        center: [step.coordinates.lon, step.coordinates.lat],
        zoom: Math.max(map.getZoom(), 8),
        duration: 1200,
      })
      setTimeout(() => { skipMapMoveRef.current = false }, 1400)
    }
  }, [openWindow, minimizeWindow, meta])

  if (error) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'red' }}>Erreur de chargement des données</div>
  }

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#888' }}>Chargement…</div>
  }

  const sidebarWidth = sidebarCollapsed ? 0 : 320

  // Collect all open StopHub and TextViewer windows
  const hubWindows = windows.filter((w) => w.type === 'stop-hub')
  const textWindows = windows.filter((w) => w.type === 'text-viewer')

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div
        style={{
          flex: 'none',
          width: sidebarWidth,
          height: '100%',
          overflow: 'hidden',
          transition: 'width 300ms ease',
        }}
      >
        <Sidebar
          darkMode={darkMode}
          steps={steps}
          meta={meta}
          onStepClick={handleStepClick}
          activeStepId={activeStepId}
          mapRef={mapViewRef}
          onCulturalFilter={setFilterCountries}
        />
      </div>

      {/* Map */}
      <div style={{ flex: 1, height: '100%', position: 'relative', minWidth: 0 }}>
        <MapView
          ref={mapViewRef}
          darkMode={darkMode}
          mapMode={mapMode}
          steps={steps}
          meta={meta}
          locations={locations}
          onStepClick={handleStepClick}
          onMapMove={handleMapMove}
          highlightedZone={highlightedZone}
          timelineHoverFrac={timelineHoverFrac}
        />
        <SidebarToggle
          collapsed={sidebarCollapsed}
          darkMode={darkMode}
          onToggle={() => setSidebarCollapsed((c) => !c)}
        />
        <MapLegend mapRef={mapViewRef} darkMode={darkMode} />
        <Timeline
          steps={steps}
          meta={meta}
          darkMode={darkMode}
          mapRef={mapViewRef}
          onStepClick={handleStepClick}
          activeStepId={activeStepId}
          onHoverZone={setHighlightedZone}
          onHoverFrac={setTimelineHoverFrac}
          filterCountries={filterCountries}
        />
      </div>

      {/* Floating windows layer — pointer-events:none so map stays interactive */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 100,
        pointerEvents: 'none',
      }}>
        {/* Render ALL open StopHub windows (active + minimized) */}
        {hubWindows.map((win) => {
          const step = stepsById[win.stepId]
          if (!step) return null
          return (
            <StopHub
              key={win.id}
              step={step}
              zoneColor={meta.zones[step.zone]?.color}
              darkMode={darkMode}
            />
          )
        })}

        {/* Render ALL open TextViewer windows */}
        {textWindows.map((win) => {
          const stepId = parseInt(win.id.replace('text-viewer-', ''), 10)
          const step = stepsById[stepId]
          if (!step) return null
          return (
            <TextViewer
              key={win.id}
              step={step}
              darkMode={darkMode}
            />
          )
        })}
      </div>

      <MapModeToggle darkMode={darkMode} onChange={setMapMode} />
      <DarkModeToggle onChange={setDarkMode} />
      <WindowTaskbar darkMode={darkMode} sidebarWidth={sidebarWidth} />
    </div>
  )
}

function SidebarToggle({ collapsed, darkMode, onToggle }) {
  const bg = darkMode ? '#1a1a1e' : '#ffffff'
  const border = darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'
  const color = darkMode ? '#aaa' : '#666'

  return (
    <button
      onClick={onToggle}
      style={{
        position: 'absolute',
        zIndex: 60,
        left: 0,
        top: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 24,
        height: 40,
        background: bg,
        borderRight: `1px solid ${border}`,
        borderTop: `1px solid ${border}`,
        borderBottom: `1px solid ${border}`,
        borderLeft: 'none',
        borderRadius: '0 5px 5px 0',
        color,
        cursor: 'pointer',
      }}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
        {collapsed ? (
          <polyline points="4,1 9,6 4,11" />
        ) : (
          <polyline points="8,1 3,6 8,11" />
        )}
      </svg>
    </button>
  )
}

export default App
