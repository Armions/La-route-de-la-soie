/**
 * Extract Turkey-Armenia and Armenia-Azerbaijan borders from Armenia's boundary,
 * and fetch Nagorno-Karabakh polygon.
 * Adds them to the existing geopolitics.json.
 */
import { readFileSync, writeFileSync } from 'fs'

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

function simplify(coords, tolerance) {
  if (coords.length <= 2) return coords
  let maxDist = 0, maxIdx = 0
  for (let i = 1; i < coords.length - 1; i++) {
    const dx = coords[coords.length-1][0] - coords[0][0]
    const dy = coords[coords.length-1][1] - coords[0][1]
    const len2 = dx*dx + dy*dy
    let d
    if (len2 === 0) {
      d = Math.hypot(coords[i][0]-coords[0][0], coords[i][1]-coords[0][1])
    } else {
      const t = Math.max(0, Math.min(1, ((coords[i][0]-coords[0][0])*dx + (coords[i][1]-coords[0][1])*dy)/len2))
      d = Math.hypot(coords[i][0]-(coords[0][0]+t*dx), coords[i][1]-(coords[0][1]+t*dy))
    }
    if (d > maxDist) { maxDist = d; maxIdx = i }
  }
  if (maxDist > tolerance) {
    const left = simplify(coords.slice(0, maxIdx+1), tolerance)
    const right = simplify(coords.slice(maxIdx), tolerance)
    return left.slice(0,-1).concat(right)
  }
  return [coords[0], coords[coords.length-1]]
}

function roundCoords(coords, d=4) {
  return coords.map(c => [+(c[0].toFixed(d)), +(c[1].toFixed(d))])
}

function chainSegments(segments) {
  if (segments.length === 0) return []
  const lines = []
  const used = new Set()
  while (used.size < segments.length) {
    let startIdx = -1
    for (let i = 0; i < segments.length; i++) {
      if (!used.has(i)) { startIdx = i; break }
    }
    if (startIdx === -1) break
    const chain = [...segments[startIdx]]
    used.add(startIdx)
    let extended = true
    while (extended) {
      extended = false
      const lastPt = chain[chain.length-1]
      for (let i = 0; i < segments.length; i++) {
        if (used.has(i)) continue
        const seg = segments[i]
        if (Math.hypot(lastPt[0]-seg[0][0], lastPt[1]-seg[0][1]) < 0.005) {
          chain.push(...seg.slice(1))
          used.add(i); extended = true; break
        }
        if (Math.hypot(lastPt[0]-seg[seg.length-1][0], lastPt[1]-seg[seg.length-1][1]) < 0.005) {
          chain.push(...[...seg].reverse().slice(1))
          used.add(i); extended = true; break
        }
      }
      // Also try extending from the start of the chain
      if (!extended) {
        const firstPt = chain[0]
        for (let i = 0; i < segments.length; i++) {
          if (used.has(i)) continue
          const seg = segments[i]
          if (Math.hypot(firstPt[0]-seg[seg.length-1][0], firstPt[1]-seg[seg.length-1][1]) < 0.005) {
            chain.unshift(...seg.slice(0, -1))
            used.add(i); extended = true; break
          }
          if (Math.hypot(firstPt[0]-seg[0][0], firstPt[1]-seg[0][1]) < 0.005) {
            chain.unshift(...[...seg].reverse().slice(0, -1))
            used.add(i); extended = true; break
          }
        }
      }
    }
    lines.push(chain)
  }
  return lines
}

async function query(q) {
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'data=' + encodeURIComponent(q),
  })
  if (!res.ok) throw new Error(`Overpass ${res.status}`)
  return res.json()
}

async function main() {
  // Load current geopolitics.json
  const geojson = JSON.parse(readFileSync('public/data/layers/geopolitics.json', 'utf8'))

  // Step 1: Fetch Armenia boundary
  console.log('Fetching Armenia boundary (rel 364066)...')
  const amData = await query('[out:json][timeout:180];relation(364066);out geom;')
  const amRel = amData.elements[0]
  const outerWays = amRel.members
    .filter(m => m.type === 'way' && (m.role === 'outer' || m.role === '') && m.geometry)

  console.log(`  ${outerWays.length} outer ways`)

  // Convert each way to [lon,lat] array
  const allWays = outerWays.map(w => ({
    coords: w.geometry.map(p => [p.lon, p.lat]),
    bbox: {
      minLon: Math.min(...w.geometry.map(p => p.lon)),
      maxLon: Math.max(...w.geometry.map(p => p.lon)),
      minLat: Math.min(...w.geometry.map(p => p.lat)),
      maxLat: Math.max(...w.geometry.map(p => p.lat)),
    },
  }))

  // Step 2: Extract Turkey-Armenia border segments
  // Turkey border: lon < 44.0, lat between 39.5 and 41.3, western boundary of Armenia
  console.log('Extracting Turkey-Armenia border...')
  const turkeySegments = allWays
    .filter(w => w.bbox.maxLon < 44.1 && w.bbox.minLat > 39.5 && w.bbox.maxLat < 41.3)
    .map(w => w.coords)

  console.log(`  ${turkeySegments.length} candidate segments`)
  const turkeyChains = chainSegments(turkeySegments)
  console.log(`  ${turkeyChains.length} chains: ${turkeyChains.map(c => c.length + 'pts').join(', ')}`)

  if (turkeyChains.length > 0) {
    let border = turkeyChains.reduce((a, b) => a.length > b.length ? a : b)
    border = simplify(border, 0.003)
    border = roundCoords(border)
    console.log(`  → Simplified to ${border.length} points`)

    // Remove existing feature if any
    geojson.features = geojson.features.filter(f => f.properties.id !== 'frontiere-turquie-armenie')
    geojson.features.push({
      type: 'Feature',
      properties: {
        id: 'frontiere-turquie-armenie',
        name: 'Frontière Turquie ↔ Arménie',
        level: 'border',
        tooltip: 'Frontière fermée depuis 1993. Passage par la Géorgie obligatoire.',
      },
      geometry: { type: 'LineString', coordinates: border },
    })
  } else {
    console.log('  → FAILED')
  }

  // Step 3: Extract Armenia-Azerbaijan border segments (east + Nakhchivan)
  console.log('Extracting Armenia-Azerbaijan border...')
  // East border: lon > 45.0
  const eastSegments = allWays
    .filter(w => w.bbox.minLon > 44.8)
    .map(w => w.coords)
  // Nakhchivan border: lat < 40.0, lon between 43.5 and 46.5
  const nakhSegments = allWays
    .filter(w => w.bbox.maxLat < 40.2 && w.bbox.minLon > 44.5 && w.bbox.maxLon < 46.5 && w.bbox.minLat > 38.8)
    .map(w => w.coords)

  console.log(`  East: ${eastSegments.length} segments, Nakhchivan: ${nakhSegments.length} segments`)

  const eastChains = chainSegments(eastSegments)
  const nakhChains = chainSegments(nakhSegments)
  console.log(`  East chains: ${eastChains.map(c => c.length + 'pts').join(', ')}`)
  console.log(`  Nakh chains: ${nakhChains.map(c => c.length + 'pts').join(', ')}`)

  const azLines = []
  if (eastChains.length > 0) {
    let east = eastChains.reduce((a, b) => a.length > b.length ? a : b)
    east = simplify(east, 0.003)
    east = roundCoords(east)
    azLines.push(east)
    console.log(`  → East simplified to ${east.length} points`)
  }
  if (nakhChains.length > 0) {
    let nakh = nakhChains.reduce((a, b) => a.length > b.length ? a : b)
    nakh = simplify(nakh, 0.003)
    nakh = roundCoords(nakh)
    azLines.push(nakh)
    console.log(`  → Nakh simplified to ${nakh.length} points`)
  }

  if (azLines.length > 0) {
    geojson.features = geojson.features.filter(f => f.properties.id !== 'frontiere-armenie-azerbaidjan')
    geojson.features.push({
      type: 'Feature',
      properties: {
        id: 'frontiere-armenie-azerbaidjan',
        name: 'Frontière Arménie ↔ Azerbaïdjan',
        level: 'border',
        tooltip: 'Frontière fermée. Conflit du Haut-Karabakh.',
      },
      geometry: azLines.length === 1
        ? { type: 'LineString', coordinates: azLines[0] }
        : { type: 'MultiLineString', coordinates: azLines },
    })
  }

  // Step 4: Nagorno-Karabakh — try bbox-limited ways query (lighter than full relation)
  console.log('Fetching Nagorno-Karabakh...')
  await new Promise(r => setTimeout(r, 5000)) // Rate limit pause
  try {
    const nkData = await query(`
      [out:json][timeout:120];
      (
        relation["name:en"~"Nagorno.Karabakh|Artsakh"]["boundary"];
        relation["name"~"Карабах"]["boundary"];
        relation(3759840);
      );
      out geom;
    `)
    if (nkData.elements?.length > 0) {
      const rel = nkData.elements[0]
      const outerWays = rel.members
        ?.filter(m => m.type === 'way' && (m.role === 'outer' || m.role === '') && m.geometry)
        ?.map(m => m.geometry.map(p => [p.lon, p.lat])) || []

      if (outerWays.length > 0) {
        const chains = chainSegments(outerWays)
        let ring = chains.reduce((a, b) => a.length > b.length ? a : b)
        // Close ring
        if (ring.length > 2) {
          const f = ring[0], l = ring[ring.length-1]
          if (Math.hypot(f[0]-l[0], f[1]-l[1]) > 0.001) ring.push([...ring[0]])
        }
        ring = simplify(ring, 0.005)
        ring = roundCoords(ring)
        console.log(`  → ${ring.length} points`)

        geojson.features = geojson.features.filter(f => f.properties.id !== 'haut-karabakh')
        // Insert before xinjiang
        const xiIdx = geojson.features.findIndex(f => f.properties.id === 'xinjiang')
        const nkFeature = {
          type: 'Feature',
          properties: {
            id: 'haut-karabakh', name: 'Haut-Karabakh', level: 'conflict',
            tooltip: 'Conflit Arménie-Azerbaïdjan. Offensive azerbaïdjanaise sept. 2023, exode de la population arménienne.',
          },
          geometry: { type: 'Polygon', coordinates: [ring] },
        }
        if (xiIdx >= 0) geojson.features.splice(xiIdx, 0, nkFeature)
        else geojson.features.push(nkFeature)
      } else {
        console.log('  → No outer ways found')
      }
    } else {
      console.log('  → No elements returned')
    }
  } catch(e) {
    console.log(`  → Failed: ${e.message}`)
  }

  // Write result
  writeFileSync('public/data/layers/geopolitics.json', JSON.stringify(geojson, null, 2), 'utf8')

  console.log('\nFinal features:')
  for (const f of geojson.features) {
    const g = f.geometry
    let pts
    if (g.type === 'Polygon') pts = g.coordinates[0].length
    else if (g.type === 'LineString') pts = g.coordinates.length
    else if (g.type === 'MultiLineString') pts = g.coordinates.map(c => c.length).join('+')
    console.log(`  ${f.properties.id} (${g.type}, ${pts} pts)`)
  }
}

main().catch(console.error)
