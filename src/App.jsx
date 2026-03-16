import { useState, useRef } from 'react'
import MapView from './components/Map/MapView'
import DarkModeToggle from './components/Map/DarkModeToggle'
import LayerPanel from './components/LayerPanel/LayerPanel'

function App() {
  const [darkMode, setDarkMode] = useState(false)
  const mapViewRef = useRef(null)

  return (
    <>
      <MapView ref={mapViewRef} darkMode={darkMode} />
      <DarkModeToggle onChange={setDarkMode} />
      <LayerPanel mapRef={mapViewRef} darkMode={darkMode} />
    </>
  )
}

export default App
