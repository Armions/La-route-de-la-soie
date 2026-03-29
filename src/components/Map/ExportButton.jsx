import { useState, useRef, useEffect } from 'react'
import html2canvas from 'html2canvas'
import mapboxgl from 'mapbox-gl'

const TARGET_W = 3840
const TARGET_H = 2160

export default function ExportButton({ darkMode, mapRef, mapAreaRef }) {
  const [open, setOpen] = useState(false)
  const [fileName, setFileName] = useState('route-de-la-soie-export')
  const [exporting, setExporting] = useState(false)
  const [exportingHillshade, setExportingHillshade] = useState(false)
  const [preview, setPreview] = useState(null)

  // Generate preview when modal opens
  useEffect(() => {
    if (!open) { setPreview(null); return }
    const map = mapRef?.current?.getMap?.()
    if (!map) return
    try {
      const dataUrl = map.getCanvas().toDataURL('image/jpeg', 0.4)
      setPreview(dataUrl)
    } catch (_) {
      setPreview(null)
    }
  }, [open, mapRef])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  // Compute export dimensions matching main map canvas ratio, fitting within 4K
  function getExportDimensions() {
    const map = mapRef?.current?.getMap?.()
    if (!map) return { w: TARGET_W, h: TARGET_H }
    const mainCanvas = map.getCanvas()
    const ratio = mainCanvas.width / mainCanvas.height
    let w, h
    if (ratio >= TARGET_W / TARGET_H) {
      w = TARGET_W
      h = Math.round(TARGET_W / ratio)
    } else {
      h = TARGET_H
      w = Math.round(TARGET_H * ratio)
    }
    return { w, h }
  }

  async function handleExport() {
    const area = mapAreaRef?.current
    if (!area) return
    setExporting(true)

    // Elements to hide during capture
    const hideSelectors = [
      '.mapboxgl-ctrl-bottom-left',   // Mapbox logo
      '.mapboxgl-ctrl-bottom-right',  // Mapbox attribution
    ]
    const hiddenEls = []

    try {
      // Hide Mapbox UI controls inside the map area
      hideSelectors.forEach(sel => {
        area.querySelectorAll(sel).forEach(el => {
          hiddenEls.push({ el, prev: el.style.display })
          el.style.display = 'none'
        })
      })

      // Hide GPS coordinates (inside MapView, position:fixed)
      area.querySelectorAll('[style*="font-family: monospace"], [style*="font-family:monospace"]').forEach(el => {
        if (el.style.position === 'fixed' && el.style.zIndex === '9999') {
          hiddenEls.push({ el, prev: el.style.display })
          el.style.display = 'none'
        }
      })

      // Hide sidebar toggle button (inside map area)
      area.querySelectorAll('button').forEach(el => {
        if (el.style.position === 'absolute' && el.style.left === '0px') {
          hiddenEls.push({ el, prev: el.style.display })
          el.style.display = 'none'
        }
      })

      // Use same dimensions as hillshade export for pixel-perfect alignment
      const { w, h } = getExportDimensions()
      const areaRect = area.getBoundingClientRect()
      const scale = Math.min(w / areaRect.width, h / areaRect.height)

      const canvas = await html2canvas(area, {
        scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
        width: areaRect.width,
        height: areaRect.height,
        ignoreElements: (el) => {
          if (el.dataset?.exportModal === 'true') return true
          if (el.style?.position === 'fixed' && el.style?.zIndex === '9999' && !area.contains(el)) return true
          return false
        },
        onclone: (doc, clonedEl) => {
          const mapCanvas = mapRef?.current?.getMap?.()?.getCanvas()
          if (mapCanvas) {
            const clonedCanvas = clonedEl.querySelector('.mapboxgl-canvas')
            if (clonedCanvas) {
              clonedCanvas.width = mapCanvas.width
              clonedCanvas.height = mapCanvas.height
              const ctx = clonedCanvas.getContext('2d')
              ctx.drawImage(mapCanvas, 0, 0)
            }
          }

          clonedEl.querySelectorAll('div').forEach(el => {
            const s = el.style
            if (s.position === 'fixed' && s.fontFamily?.includes('monospace') && s.zIndex === '9999') {
              el.style.display = 'none'
            }
          })

          clonedEl.querySelectorAll('button').forEach(el => {
            if (el.style.position === 'absolute' && el.style.left === '0px') {
              el.style.display = 'none'
            }
          })

          clonedEl.querySelectorAll('.mapboxgl-ctrl-bottom-left, .mapboxgl-ctrl-bottom-right').forEach(el => {
            el.style.display = 'none'
          })
        },
      })

      // Convert to JPEG and download
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
      const link = document.createElement('a')
      link.download = (fileName.trim() || 'route-de-la-soie-export') + '.jpg'
      link.href = dataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setOpen(false)
    } catch (err) {
      console.error('Export error:', err)
      alert("Erreur lors de l'export. Veuillez réessayer.")
    } finally {
      hiddenEls.forEach(({ el, prev }) => { el.style.display = prev })
      setExporting(false)
    }
  }

  async function handleExportHillshade() {
    const mainMap = mapRef?.current?.getMap?.()
    if (!mainMap) return
    setExportingHillshade(true)

    const TIMEOUT = 30000 // 30s pour charger les tuiles haute résolution

    let container = null
    let hiddenMap = null

    try {
      // 1. Créer un div caché avec les MÊMES DIMENSIONS que le canvas principal
      const mainCanvas = mainMap.getCanvas()
      const cssW = mainCanvas.clientWidth
      const cssH = mainCanvas.clientHeight

      container = document.createElement('div')
      container.style.cssText = `
        position: fixed; left: -99999px; top: -99999px;
        width: ${cssW}px; height: ${cssH}px;
        visibility: hidden; pointer-events: none;
      `
      document.body.appendChild(container)

      // 2. Récupérer center/zoom/bearing/pitch de la carte principale
      const center = mainMap.getCenter()
      const zoom = mainMap.getZoom()
      const bearing = mainMap.getBearing()
      const pitch = mainMap.getPitch()

      // 3. Créer la carte cachée avec un style minimal (hillshade only)
      hiddenMap = new mapboxgl.Map({
        container,
        accessToken: mapboxgl.accessToken,
        style: {
          version: 8,
          sources: {
            'mapbox-dem': {
              type: 'raster-dem',
              url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
              tileSize: 512,
              maxzoom: 14,
            },
          },
          layers: [
            {
              id: 'background',
              type: 'background',
              paint: { 'background-color': '#ffffff' },
            },
            {
              id: 'hillshade-export',
              type: 'hillshade',
              source: 'mapbox-dem',
              paint: {
                'hillshade-exaggeration': 1.0,
                'hillshade-shadow-color': '#000000',
                'hillshade-highlight-color': '#ffffff',
                'hillshade-accent-color': '#000000',
                'hillshade-illumination-direction': 315,
                'hillshade-illumination-anchor': 'map',
              },
            },
          ],
        },
        center,
        zoom,
        bearing,
        pitch,
        preserveDrawingBuffer: true,
        renderWorldCopies: false,
        interactive: false,
        fadeDuration: 0,
        attributionControl: false,
      })

      // 4. Forcer le cadrage exact après le load
      await new Promise(resolve => {
        hiddenMap.on('load', () => {
          hiddenMap.jumpTo({ center, zoom, bearing, pitch })
          resolve()
        })
      })

      // 5. Attendre que TOUTES les tuiles soient chargées
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout : tuiles non chargées après 30s'))
        }, TIMEOUT)

        function checkReady() {
          if (hiddenMap.areTilesLoaded()) {
            clearTimeout(timeout)
            resolve()
          } else {
            // Réessayer au prochain idle
            hiddenMap.once('idle', checkReady)
          }
        }

        hiddenMap.once('idle', checkReady)
      })

      // 6. Capturer le canvas et redimensionner en 4K
      const srcCanvas = hiddenMap.getCanvas()
      const exportW = 3840
      const exportH = Math.round(3840 * cssH / cssW)
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = exportW
      tempCanvas.height = exportH
      const ctx = tempCanvas.getContext('2d')
      ctx.drawImage(srcCanvas, 0, 0, tempCanvas.width, tempCanvas.height)

      const dataUrl = tempCanvas.toDataURL('image/png')

      // 7. Télécharger
      const link = document.createElement('a')
      link.download = (fileName.trim() || 'hillshade') + '.png'
      link.href = dataUrl
      link.click()

      setOpen(false)
    } catch(e) {
      console.error('Export hillshade error:', e)
      alert('Erreur export hillshade: ' + e.message)
    } finally {
      // 8. Nettoyer la carte cachée
      if (hiddenMap) {
        try { hiddenMap.remove() } catch(_) {}
      }
      if (container && container.parentNode) {
        container.parentNode.removeChild(container)
      }
      setExportingHillshade(false)
    }
  }

  const bg = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'
  const border = darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)'
  const color = darkMode ? '#e0e0e0' : '#444444'

  return (
    <>
      {/* Export button — top right, left of MapModeToggle */}
      <button
        onClick={() => setOpen(true)}
        title="Exporter la carte en JPEG 4K"
        className="fixed top-4 flex items-center justify-center h-9 rounded-full backdrop-blur-sm border transition-colors duration-200"
        style={{
          right: 112,
          background: bg,
          borderColor: border,
          color,
          zIndex: 9999,
          padding: '0 10px',
          fontSize: 12,
          gap: 4,
        }}
      >
        <span style={{ fontSize: 14 }}>📸</span>
        <span style={{ fontWeight: 500 }}>Export</span>
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          data-export-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(2px)',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div
            style={{
              background: darkMode ? '#1e1e22' : '#ffffff',
              borderRadius: 12,
              padding: 24,
              minWidth: 380,
              maxWidth: 440,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
              color: darkMode ? '#e0e0e0' : '#333',
            }}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>
              Exporter la carte
            </h3>

            {/* Preview */}
            <div
              style={{
                width: '100%',
                aspectRatio: '16/9',
                borderRadius: 8,
                overflow: 'hidden',
                background: darkMode ? '#111' : '#f0f0f0',
                marginBottom: 16,
                border: darkMode ? '1px solid #333' : '1px solid #ddd',
              }}
            >
              {preview ? (
                <img
                  src={preview}
                  alt="Aperçu export"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{
                  width: '100%', height: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: darkMode ? '#666' : '#999', fontSize: 13,
                }}>
                  Chargement de l'aperçu...
                </div>
              )}
            </div>

            {/* Filename */}
            <label style={{ display: 'block', marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: darkMode ? '#aaa' : '#666', display: 'block', marginBottom: 4 }}>
                Nom du fichier
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: darkMode ? '1px solid #444' : '1px solid #ccc',
                    background: darkMode ? '#2a2a2e' : '#fafafa',
                    color: darkMode ? '#e0e0e0' : '#333',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: 13, color: darkMode ? '#888' : '#999' }}>.jpg</span>
              </div>
            </label>

            {/* Resolution info */}
            <div style={{
              fontSize: 11, color: darkMode ? '#777' : '#999',
              marginBottom: 16, textAlign: 'center',
            }}>
              Résolution : 3 840 × 2 160 px (4K UHD) — carte + frise
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setOpen(false)}
                  disabled={exporting || exportingHillshade}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: darkMode ? '1px solid #444' : '1px solid #ccc',
                    background: 'transparent',
                    color: darkMode ? '#aaa' : '#666',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleExport}
                  disabled={exporting || exportingHillshade}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 6,
                    border: 'none',
                    background: exporting ? '#666' : '#2563eb',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: exporting ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {exporting && (
                    <span
                      style={{
                        width: 14, height: 14,
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#fff',
                        borderRadius: '50%',
                        display: 'inline-block',
                        animation: 'export-spin 0.8s linear infinite',
                      }}
                    />
                  )}
                  {exporting ? 'Export en cours...' : 'Exporter en JPEG 4K'}
                </button>
              </div>

              {/* Hillshade export */}
              <button
                onClick={handleExportHillshade}
                disabled={exporting || exportingHillshade}
                style={{
                  padding: '8px 20px',
                  borderRadius: 6,
                  border: darkMode ? '1px solid #555' : '1px solid #bbb',
                  background: exportingHillshade ? '#666' : (darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'),
                  color: exportingHillshade ? '#fff' : (darkMode ? '#ccc' : '#555'),
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: exportingHillshade ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  width: '100%',
                }}
              >
                {exportingHillshade && (
                  <span
                    style={{
                      width: 14, height: 14,
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'export-spin 0.8s linear infinite',
                    }}
                  />
                )}
                {exportingHillshade ? 'Export hillshade en cours...' : 'Exporter Hillshade (PNG)'}
              </button>
              <div style={{
                fontSize: 10, color: darkMode ? '#666' : '#aaa',
                textAlign: 'center', marginTop: -4,
              }}>
                Relief seul sur fond blanc — superposable en mode Multiply
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spinner keyframes */}
      <style>{`
        @keyframes export-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}
