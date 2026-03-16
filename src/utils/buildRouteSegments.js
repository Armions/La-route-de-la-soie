/**
 * Build GeoJSON route segments colored by geographic zone.
 *
 * 1. Sort GPS points by timestamp (ascending)
 * 2. For each point, find the temporally closest step
 * 3. Assign that step's zone to the point
 * 4. Group consecutive points of the same zone into LineString segments
 */

/**
 * Convert "YYYY-MM-DD" to a unix timestamp (seconds, noon UTC to avoid edge issues)
 */
function dateToTimestamp(dateStr) {
  return new Date(dateStr + 'T12:00:00Z').getTime() / 1000
}

/**
 * @param {Array} locations - [{lat, lon, time}, ...]
 * @param {Array} steps - data_model.json steps array
 * @param {Object} zones - data_model.json meta.zones
 * @returns {Array<{geojson: Object, color: string, zone: string}>}
 */
export function buildRouteSegments(locations, steps, zones) {
  // Sort GPS points by time
  const sorted = [...locations].sort((a, b) => a.time - b.time)

  // Pre-compute step timestamps for binary search
  const stepTimes = steps.map((s) => ({
    time: dateToTimestamp(s.date_start),
    zone: s.zone,
  }))
  // Sort steps by time too (they should be, but be safe)
  stepTimes.sort((a, b) => a.time - b.time)

  // For each GPS point, find the closest step by time
  function findZone(pointTime) {
    let lo = 0
    let hi = stepTimes.length - 1

    // Binary search for closest
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (stepTimes[mid].time < pointTime) {
        lo = mid + 1
      } else {
        hi = mid
      }
    }

    // lo is the first step >= pointTime, compare with lo-1
    if (lo === 0) return stepTimes[0].zone
    if (lo >= stepTimes.length) return stepTimes[stepTimes.length - 1].zone

    const diffBefore = Math.abs(pointTime - stepTimes[lo - 1].time)
    const diffAfter = Math.abs(pointTime - stepTimes[lo].time)
    return diffBefore <= diffAfter ? stepTimes[lo - 1].zone : stepTimes[lo].zone
  }

  // Assign zone to each point
  const points = sorted.map((p) => ({
    lon: p.lon,
    lat: p.lat,
    zone: findZone(p.time),
  }))

  // Group into segments by contiguous zone
  const segments = []
  let currentZone = points[0].zone
  let currentCoords = [[points[0].lon, points[0].lat]]

  for (let i = 1; i < points.length; i++) {
    const p = points[i]
    if (p.zone !== currentZone) {
      // Close current segment (overlap last point for continuity)
      segments.push({ zone: currentZone, coords: currentCoords })
      currentZone = p.zone
      // Start new segment from previous point for seamless join
      currentCoords = [[points[i - 1].lon, points[i - 1].lat]]
    }
    currentCoords.push([p.lon, p.lat])
  }
  // Push final segment
  segments.push({ zone: currentZone, coords: currentCoords })

  // Default color for unknown zones
  const fallbackColor = '#9CA3AF'

  return segments.map((seg, i) => ({
    zone: seg.zone,
    color: zones[seg.zone]?.color || fallbackColor,
    geojson: {
      type: 'Feature',
      properties: { zone: seg.zone, index: i },
      geometry: {
        type: 'LineString',
        coordinates: seg.coords,
      },
    },
  }))
}
