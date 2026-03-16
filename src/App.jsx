import { useState } from 'react'
import MapView from './components/Map/MapView'
import DarkModeToggle from './components/Map/DarkModeToggle'

function App() {
  const [darkMode, setDarkMode] = useState(false)

  return (
    <>
      <MapView darkMode={darkMode} />
      <DarkModeToggle onChange={setDarkMode} />
    </>
  )
}

export default App
