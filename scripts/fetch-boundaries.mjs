/**
 * Fetch real boundaries from OpenStreetMap Overpass API,
 * simplify them, and write to geopolitics.json
 */

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

// Douglas-Peucker simplification
function distToSegment(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  if (dx === 0 && dy === 0) return Math.hypot(p[0] - a[0], p[1] - a[1])
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

function simplify(coords, tolerance) {
  if (coords.length <= 2) return coords
  let maxDist = 0, maxIdx = 0
  for (let i = 1; i < coords.length - 1; i++) {
    const d = distToSegment(coords[i], coords[0], coords[coords.length - 1])
    if (d > maxDist) { maxDist = d; maxIdx = i }
  }
  if (maxDist > tolerance) {
    const left = simplify(coords.slice(0, maxIdx + 1), tolerance)
    const right = simplify(coords.slice(maxIdx), tolerance)
    return left.slice(0, -1).concat(right)
  }
  return [coords[0], coords[coords.length - 1]]
}

async function overpassQuery(query) {
  console.log(`  Querying Overpass...`)
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'data=' + encodeURIComponent(query),
  })
  if (!res.ok) throw new Error(`Overpass returned ${res.status}`)
  return res.json()
}

// Extract outer boundary ring from a relation's geometry members
function extractOuterRing(data) {
  if (!data.elements || data.elements.length === 0) return null

  const rel = data.elements[0]
  if (!rel.members) return null

  // Collect all outer way segments
  const outerWays = rel.members
    .filter(m => m.type === 'way' && (m.role === 'outer' || m.role === ''))
    .map(m => m.geometry ? m.geometry.map(p => [p.lon, p.lat]) : [])
    .filter(w => w.length > 0)

  if (outerWays.length === 0) return null

  // Chain ways into a ring by matching endpoints
  const ring = [...outerWays[0]]
  const used = new Set([0])

  while (used.size < outerWays.length) {
    const lastPt = ring[ring.length - 1]
    let found = false
    for (let i = 0; i < outerWays.length; i++) {
      if (used.has(i)) continue
      const way = outerWays[i]
      const first = way[0], last = way[way.length - 1]
      const dFirst = Math.hypot(lastPt[0] - first[0], lastPt[1] - first[1])
      const dLast = Math.hypot(lastPt[0] - last[0], lastPt[1] - last[1])

      if (dFirst < 0.001) {
        ring.push(...way.slice(1))
        used.add(i)
        found = true
        break
      } else if (dLast < 0.001) {
        ring.push(...way.slice(0, -1).reverse())
        used.add(i)
        found = true
        break
      }
    }
    if (!found) break // can't chain further
  }

  // Close the ring
  if (ring.length > 2) {
    const f = ring[0], l = ring[ring.length - 1]
    if (Math.hypot(f[0] - l[0], f[1] - l[1]) > 0.0001) {
      ring.push([...ring[0]])
    }
  }

  return ring
}

// Extract boundary line between two countries from Armenia's boundary relation
function extractBorderSegments(data, neighborCountryRelId) {
  if (!data.elements || data.elements.length === 0) return []

  // Find ways that appear in both the Armenia relation and the neighbor relation
  // Actually with Overpass we fetched specifically the shared ways
  const segments = []
  for (const el of data.elements) {
    if (el.type === 'way' && el.geometry) {
      segments.push(el.geometry.map(p => [p.lon, p.lat]))
    }
  }
  return segments
}

// Chain line segments into continuous lines
function chainSegments(segments) {
  if (segments.length === 0) return []
  const lines = []
  const used = new Set()

  while (used.size < segments.length) {
    // Find first unused segment
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
      const lastPt = chain[chain.length - 1]
      for (let i = 0; i < segments.length; i++) {
        if (used.has(i)) continue
        const seg = segments[i]
        const dFirst = Math.hypot(lastPt[0] - seg[0][0], lastPt[1] - seg[0][1])
        const dLast = Math.hypot(lastPt[0] - seg[seg.length - 1][0], lastPt[1] - seg[seg.length - 1][1])
        if (dFirst < 0.002) {
          chain.push(...seg.slice(1))
          used.add(i)
          extended = true
          break
        } else if (dLast < 0.002) {
          chain.push(...seg.slice(0, -1).reverse())
          used.add(i)
          extended = true
          break
        }
      }
    }
    lines.push(chain)
  }
  return lines
}

function roundCoords(coords, decimals = 4) {
  return coords.map(c => [
    Math.round(c[0] * 10 ** decimals) / 10 ** decimals,
    Math.round(c[1] * 10 ** decimals) / 10 ** decimals,
  ])
}

async function main() {
  const features = []

  // Keep existing Crimea and Oblasts features
  const existingCrimea = {
    type: 'Feature',
    properties: {
      id: 'crimee', name: 'Crimée', level: 'conflict',
      tooltip: 'Péninsule annexée par la Russie en 2014. Invasion russe (2022-). Raison principale du détour par le Caucase.',
    },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [33.64,46.18],[33.55,46.10],[33.42,46.02],[33.25,45.97],[33.08,45.94],[32.92,45.93],
        [32.78,45.88],[32.65,45.80],[32.55,45.70],[32.50,45.58],[32.48,45.45],[32.48,45.33],
        [32.52,45.20],[32.60,45.10],[32.72,44.98],[32.85,44.90],[33.00,44.82],[33.12,44.74],
        [33.25,44.65],[33.35,44.56],[33.42,44.48],[33.50,44.43],[33.58,44.40],[33.65,44.38],
        [33.73,44.38],[33.82,44.38],[33.92,44.39],[34.02,44.40],[34.12,44.42],[34.22,44.43],
        [34.33,44.45],[34.45,44.48],[34.55,44.51],[34.65,44.55],[34.75,44.58],[34.85,44.62],
        [34.95,44.67],[35.05,44.72],[35.15,44.78],[35.25,44.85],[35.35,44.92],[35.42,44.98],
        [35.50,45.04],[35.58,45.10],[35.70,45.14],[35.82,45.17],[35.95,45.20],[36.10,45.23],
        [36.25,45.26],[36.38,45.30],[36.48,45.34],[36.56,45.38],[36.62,45.44],[36.65,45.50],
        [36.63,45.56],[36.58,45.62],[36.48,45.70],[36.35,45.78],[36.20,45.85],[36.02,45.92],
        [35.82,45.97],[35.60,46.02],[35.38,46.06],[35.15,46.10],[34.90,46.14],[34.65,46.17],
        [34.40,46.20],[34.15,46.22],[33.90,46.22],[33.64,46.18],
      ]],
    },
  }

  const existingOblasts = {
    type: 'Feature',
    properties: {
      id: 'oblasts-occupes', name: 'Oblasts occupés', level: 'conflict',
      tooltip: 'Oblasts de Donetsk, Louhansk, Zaporijjia et Kherson partiellement occupés. Invasion russe (2022-).',
    },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [33.05,46.90],[33.25,47.02],[33.50,47.18],[33.75,47.32],[34.00,47.42],[34.25,47.45],
        [34.50,47.48],[34.72,47.55],[34.85,47.68],[34.92,47.82],[35.00,47.95],[35.15,48.05],
        [35.35,48.12],[35.55,48.15],[35.75,48.22],[35.95,48.35],[36.15,48.48],[36.35,48.58],
        [36.55,48.68],[36.75,48.78],[37.00,48.88],[37.25,48.98],[37.50,49.05],[37.75,49.12],
        [38.00,49.20],[38.30,49.28],[38.60,49.35],[38.90,49.42],[39.15,49.50],[39.40,49.58],
        [39.62,49.68],[39.80,49.80],[39.95,49.92],[40.08,50.02],[40.18,49.85],[40.15,49.62],
        [40.10,49.40],[40.05,49.18],[39.98,48.95],[39.90,48.72],[39.82,48.50],[39.72,48.28],
        [39.62,48.05],[39.50,47.82],[39.38,47.62],[39.25,47.42],[39.10,47.25],[38.95,47.10],
        [38.78,46.98],[38.60,46.88],[38.40,46.78],[38.18,46.68],[37.95,46.58],[37.72,46.50],
        [37.48,46.42],[37.22,46.35],[36.95,46.28],[36.68,46.22],[36.40,46.20],[36.12,46.22],
        [35.85,46.28],[35.58,46.32],[35.32,46.35],[35.05,46.38],[34.78,46.42],[34.50,46.48],
        [34.22,46.55],[33.95,46.62],[33.68,46.70],[33.40,46.78],[33.20,46.85],[33.05,46.90],
      ]],
    },
  }

  const existingXinjiang = {
    type: 'Feature',
    properties: {
      id: 'xinjiang', name: 'Xinjiang', level: 'conflict',
      tooltip: 'Région autonome ouïghoure. Zone de surveillance renforcée, contrôles fréquents.',
    },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [73.50,39.50],[74.00,37.80],[75.50,36.20],[77.80,35.50],[80.00,35.40],
        [82.50,35.60],[85.00,36.00],[87.50,36.50],[90.00,36.80],[92.50,37.20],
        [95.00,38.00],[96.00,39.50],[96.40,41.50],[96.30,43.00],[95.50,44.50],
        [92.50,45.80],[90.00,46.80],[88.00,48.00],[87.50,49.10],[86.20,49.20],
        [85.00,48.50],[83.00,47.50],[81.00,47.10],[80.20,45.80],[79.50,44.80],
        [78.50,43.80],[76.50,42.80],[75.00,41.50],[74.00,40.50],[73.50,39.50],
      ]],
    },
  }

  features.push(existingCrimea, existingOblasts)

  // 1. SOUTH OSSETIA
  console.log('1. Fetching South Ossetia...')
  try {
    const soData = await overpassQuery(`
      [out:json][timeout:60];
      relation["name:en"="South Ossetia"]["boundary"="administrative"];
      out geom;
    `)
    let soRing = extractOuterRing(soData)
    if (soRing && soRing.length > 10) {
      soRing = simplify(soRing, 0.005)
      soRing = roundCoords(soRing)
      console.log(`  → ${soRing.length} points (simplified)`)
      features.push({
        type: 'Feature',
        properties: {
          id: 'ossetie-sud', name: 'Ossétie du Sud', level: 'conflict',
          tooltip: 'Région sécessionniste de Géorgie, occupée par la Russie depuis 2008.',
        },
        geometry: { type: 'Polygon', coordinates: [soRing] },
      })
    } else {
      console.log('  → FAILED, no polygon extracted')
    }
  } catch (err) {
    console.error('  → Error:', err.message)
  }

  // 2. ABKHAZIA
  console.log('2. Fetching Abkhazia...')
  try {
    const abData = await overpassQuery(`
      [out:json][timeout:60];
      relation["name:en"="Abkhazia"]["boundary"="administrative"];
      out geom;
    `)
    let abRing = extractOuterRing(abData)
    if (abRing && abRing.length > 10) {
      abRing = simplify(abRing, 0.005)
      abRing = roundCoords(abRing)
      console.log(`  → ${abRing.length} points (simplified)`)
      features.push({
        type: 'Feature',
        properties: {
          id: 'abkhazie', name: 'Abkhazie', level: 'conflict',
          tooltip: 'Région sécessionniste de Géorgie, occupée par la Russie depuis 2008.',
        },
        geometry: { type: 'Polygon', coordinates: [abRing] },
      })
    } else {
      console.log('  → FAILED, no polygon extracted')
    }
  } catch (err) {
    console.error('  → Error:', err.message)
  }

  // 3. NAGORNO-KARABAKH (try several names)
  console.log('3. Fetching Nagorno-Karabakh...')
  let nkDone = false
  for (const name of ['Nagorno-Karabakh', 'Republic of Artsakh', 'Нагорный Карабах']) {
    if (nkDone) break
    try {
      const nkData = await overpassQuery(`
        [out:json][timeout:60];
        relation["name:en"~"${name}|Karabakh|Artsakh"];
        out geom;
      `)
      let nkRing = extractOuterRing(nkData)
      if (nkRing && nkRing.length > 10) {
        nkRing = simplify(nkRing, 0.005)
        nkRing = roundCoords(nkRing)
        console.log(`  → ${nkRing.length} points (simplified) [name: ${name}]`)
        features.push({
          type: 'Feature',
          properties: {
            id: 'haut-karabakh', name: 'Haut-Karabakh', level: 'conflict',
            tooltip: 'Conflit Arménie-Azerbaïdjan. Offensive azerbaïdjanaise sept. 2023, exode de la population arménienne.',
          },
          geometry: { type: 'Polygon', coordinates: [nkRing] },
        })
        nkDone = true
      }
    } catch (err) {
      console.log(`  → "${name}" failed: ${err.message}`)
    }
  }
  if (!nkDone) {
    // Try by relation ID (former NKAO boundary is relation 3759840)
    try {
      const nkData = await overpassQuery(`
        [out:json][timeout:60];
        relation(3759840);
        out geom;
      `)
      let nkRing = extractOuterRing(nkData)
      if (nkRing && nkRing.length > 10) {
        nkRing = simplify(nkRing, 0.005)
        nkRing = roundCoords(nkRing)
        console.log(`  → ${nkRing.length} points (simplified) [by relation ID]`)
        features.push({
          type: 'Feature',
          properties: {
            id: 'haut-karabakh', name: 'Haut-Karabakh', level: 'conflict',
            tooltip: 'Conflit Arménie-Azerbaïdjan. Offensive azerbaïdjanaise sept. 2023, exode de la population arménienne.',
          },
          geometry: { type: 'Polygon', coordinates: [nkRing] },
        })
        nkDone = true
      }
    } catch (err) {
      console.log(`  → By ID failed: ${err.message}`)
    }
  }
  if (!nkDone) console.log('  → FAILED to get Nagorno-Karabakh polygon')

  features.push(existingXinjiang)

  // 4. TURKEY-ARMENIA BORDER
  console.log('4. Fetching Turkey-Armenia border...')
  try {
    // Get ways shared between Turkey (rel 174737) and Armenia (rel 364066) boundaries
    const borderData = await overpassQuery(`
      [out:json][timeout:90];
      rel(364066);
      way(r:"outer");
      rel(174737);
      way(r:"outer")(w);
      out geom;
    `)
    // Alternative: find ways that are members of both relations
    // Try simpler approach: get Armenia boundary and filter by bounding box of Turkey border
    let borderCoords = []
    if (borderData.elements && borderData.elements.length > 0) {
      const segments = borderData.elements
        .filter(e => e.type === 'way' && e.geometry)
        .map(e => e.geometry.map(p => [p.lon, p.lat]))
      const chains = chainSegments(segments)
      if (chains.length > 0) {
        borderCoords = chains.reduce((a, b) => a.length > b.length ? a : b)
      }
    }
    if (borderCoords.length > 5) {
      borderCoords = simplify(borderCoords, 0.003)
      borderCoords = roundCoords(borderCoords)
      console.log(`  → ${borderCoords.length} points`)
      features.push({
        type: 'Feature',
        properties: {
          id: 'frontiere-turquie-armenie',
          name: 'Frontière Turquie ↔ Arménie',
          level: 'border',
          tooltip: 'Frontière fermée depuis 1993. Passage par la Géorgie obligatoire.',
        },
        geometry: { type: 'LineString', coordinates: borderCoords },
      })
    } else {
      console.log('  → Cross-relation query failed, trying direct approach...')
      // Direct approach: get Armenia's boundary ways in the Turkey border bbox
      const amData = await overpassQuery(`
        [out:json][timeout:90];
        relation(364066);
        way(r)(43.3,39.5,44.0,41.2);
        out geom;
      `)
      if (amData.elements) {
        const segments = amData.elements
          .filter(e => e.type === 'way' && e.geometry)
          .map(e => e.geometry.map(p => [p.lon, p.lat]))
        const chains = chainSegments(segments)
        // Filter: keep segments west of 44.0 (Turkey side)
        const westChains = chains.filter(ch => {
          const avgLon = ch.reduce((s, c) => s + c[0], 0) / ch.length
          return avgLon < 44.0
        })
        if (westChains.length > 0) {
          let border = westChains.reduce((a, b) => a.length > b.length ? a : b)
          border = simplify(border, 0.003)
          border = roundCoords(border)
          console.log(`  → ${border.length} points (bbox approach)`)
          features.push({
            type: 'Feature',
            properties: {
              id: 'frontiere-turquie-armenie',
              name: 'Frontière Turquie ↔ Arménie',
              level: 'border',
              tooltip: 'Frontière fermée depuis 1993. Passage par la Géorgie obligatoire.',
            },
            geometry: { type: 'LineString', coordinates: border },
          })
        }
      }
    }
  } catch (err) {
    console.error('  → Error:', err.message)
  }

  // 5. ARMENIA-AZERBAIJAN BORDER
  console.log('5. Fetching Armenia-Azerbaijan border...')
  try {
    // East border: Armenia boundary ways in the Azerbaijan border bbox
    const eastData = await overpassQuery(`
      [out:json][timeout:90];
      relation(364066);
      way(r)(44.5,38.8,46.6,41.3);
      out geom;
    `)
    // Nakhchivan border: Armenia boundary ways in Nakhchivan bbox
    const nakhData = await overpassQuery(`
      [out:json][timeout:90];
      relation(364066);
      way(r)(44.5,38.8,46.2,40.0);
      out geom;
    `)

    const allSegments = []

    if (eastData.elements) {
      const eastSegments = eastData.elements
        .filter(e => e.type === 'way' && e.geometry)
        .map(e => e.geometry.map(p => [p.lon, p.lat]))
      // Filter: keep segments east of 45.0 (Azerbaijan side) or south of 39.8 (Nakhchivan)
      const eastFiltered = eastSegments.filter(seg => {
        const avgLon = seg.reduce((s, c) => s + c[0], 0) / seg.length
        return avgLon > 45.0
      })
      allSegments.push(...eastFiltered)
    }

    if (nakhData.elements) {
      const nakhSegments = nakhData.elements
        .filter(e => e.type === 'way' && e.geometry)
        .map(e => e.geometry.map(p => [p.lon, p.lat]))
      const nakhFiltered = nakhSegments.filter(seg => {
        const avgLat = seg.reduce((s, c) => s + c[1], 0) / seg.length
        const avgLon = seg.reduce((s, c) => s + c[0], 0) / seg.length
        return avgLat < 39.8 && avgLon > 44.5
      })
      allSegments.push(...nakhFiltered)
    }

    const chains = chainSegments(allSegments)
    const validChains = chains.filter(c => c.length > 5)

    if (validChains.length > 0) {
      const simplified = validChains.map(c => roundCoords(simplify(c, 0.003)))
      console.log(`  → ${simplified.length} segment(s), ${simplified.map(s => s.length).join('+')} points`)

      if (simplified.length === 1) {
        features.push({
          type: 'Feature',
          properties: {
            id: 'frontiere-armenie-azerbaidjan',
            name: 'Frontière Arménie ↔ Azerbaïdjan',
            level: 'border',
            tooltip: 'Frontière fermée. Conflit du Haut-Karabakh.',
          },
          geometry: { type: 'LineString', coordinates: simplified[0] },
        })
      } else {
        features.push({
          type: 'Feature',
          properties: {
            id: 'frontiere-armenie-azerbaidjan',
            name: 'Frontière Arménie ↔ Azerbaïdjan',
            level: 'border',
            tooltip: 'Frontière fermée. Conflit du Haut-Karabakh.',
          },
          geometry: { type: 'MultiLineString', coordinates: simplified },
        })
      }
    } else {
      console.log('  → FAILED to extract border segments')
    }
  } catch (err) {
    console.error('  → Error:', err.message)
  }

  // Write output
  const geojson = { type: 'FeatureCollection', features }
  const { writeFileSync } = await import('fs')
  writeFileSync(
    'public/data/layers/geopolitics.json',
    JSON.stringify(geojson, null, 2),
    'utf8'
  )
  console.log(`\nDone! Wrote ${features.length} features to geopolitics.json`)
  console.log('Features:', features.map(f => `${f.properties.id} (${f.geometry.type})`).join(', '))
}

main().catch(console.error)
