/**
 * Generate climate_zones.json GeoJSON from GPS route trace
 * Creates 9 climate zone polygons buffered ~100km around the route
 */

const fs = require('fs');
const path = require('path');

// --- Configuration ---
const BUFFER_KM = 100;
const OVERLAP_POINTS = 25; // points overlap between adjacent zones

const ZONES = [
  { id: 'cfb', code: 'Cfb', name: 'Océanique', description: 'Températures modérées, pluies réparties toute l\'année', region: 'France', color: '#5B8FA8' },
  { id: 'csa', code: 'Csa', name: 'Méditerranéen chaud', description: 'Étés secs et chauds, hivers doux et humides', region: 'Italie, Grèce, côte turque', color: '#F5C542' },
  { id: 'dsa', code: 'Dsa/Dsb', name: 'Continental à été sec', description: 'Hivers froids, étés secs, forte amplitude thermique', region: 'Turquie intérieure', color: '#D4845A' },
  { id: 'dfa', code: 'Dfa/Dfb', name: 'Continental humide', description: 'Hivers froids, précipitations toute l\'année', region: 'Géorgie, Arménie', color: '#6BAF6B' },
  { id: 'bsk', code: 'BSk', name: 'Semi-aride froid (steppe)', description: 'Faibles précipitations, hivers froids, étés chauds', region: 'Kazakhstan, Ouzbékistan', color: '#C9A84C' },
  { id: 'dwb', code: 'Dwb/Dwc', name: 'Continental subarctique', description: 'Hivers très froids et secs, étés courts', region: 'Kirghizstan', color: '#8B7EC8' },
  { id: 'bwk', code: 'BWk', name: 'Aride froid (désert)', description: 'Très faibles précipitations, amplitude thermique extrême', region: 'Xinjiang (Chine ouest)', color: '#D4A574' },
  { id: 'cfa-chine', code: 'Cfa', name: 'Subtropical humide', description: 'Étés chauds et humides, hivers doux', region: 'Chine est (Fujian, Zhejiang)', color: '#5AAF8F' },
  { id: 'cfa-japon', code: 'Cfa', name: 'Subtropical humide', description: 'Chaud et humide, mousson estivale', region: 'Japon (Kii, Tokyo)', color: '#5A8FBF' },
];

// --- Zone classification ---
// We classify points by route order + geographic position
// The route goes roughly west to east, so we use route index + coords
function classifyPoint(p, routeIndex, totalPoints) {
  const { lat, lon } = p;
  const progress = routeIndex / totalPoints;

  // Japan (lon > 129 and in Japan part of journey - after China)
  if (lon > 129 && progress > 0.65) return 'cfa-japon';

  // East China (lon 96-129, lat typically < 42 for the east china route)
  if (lon > 96 && lon <= 129 && progress > 0.35) return 'cfa-chine';

  // Xinjiang desert (lon 75-96)
  if (lon > 75 && lon <= 96) return 'bwk';

  // Kyrgyzstan (lon 68-81, lat 39-44) - but only if in the Kyrgyz section
  if (lon > 68 && lon <= 81 && lat >= 38 && lat <= 44 && progress > 0.25 && progress < 0.38) return 'dwb';

  // Steppe - Kazakhstan, Uzbekistan (lon 48-73)
  if (lon > 48 && lon <= 73 && progress > 0.2 && progress < 0.35) return 'bsk';

  // Caucasus - Georgia, Armenia (lon 40-48, lat 39-44)
  if (lon > 40 && lon <= 48 && lat >= 38 && lat <= 44) return 'dfa';

  // Turkey interior (lon 29-44, lat > 37) - but not Caucasus
  if (lon > 29 && lon <= 44 && lat > 37 && progress < 0.2) return 'dsa';

  // Mediterranean (lon 8-36, coastal)
  if (lon > 8 && lon <= 36 && progress < 0.15) return 'csa';

  // France (lon < 8)
  if (lon <= 8 && progress < 0.05) return 'cfb';

  // Fallback: assign to nearest zone based on progress
  if (progress < 0.03) return 'cfb';
  if (progress < 0.08) return 'csa';
  if (progress < 0.12) return 'dsa';
  if (progress < 0.2) return 'dfa';
  if (progress < 0.28) return 'bsk';
  if (progress < 0.35) return 'dwb';
  if (progress < 0.42) return 'bwk';
  if (progress < 0.7) return 'cfa-chine';
  return 'cfa-japon';
}

// --- Convex Hull (Graham Scan) ---
function cross(O, A, B) {
  return (A[0] - O[0]) * (B[1] - O[1]) - (A[1] - O[1]) * (B[0] - O[0]);
}

function convexHull(points) {
  if (points.length < 3) {
    // Return a triangle around the points
    if (points.length === 0) return [[0,0],[1,0],[0,1],[0,0]];
    if (points.length === 1) {
      const [x,y] = points[0];
      return [[x-1,y-1],[x+1,y-1],[x,y+1],[x-1,y-1]];
    }
    // 2 points - make a thin rectangle
    const [a, b] = points;
    return [a, b, [b[0]+0.1, b[1]+0.1], [a[0]+0.1, a[1]+0.1], a];
  }

  const sorted = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  // Remove duplicates
  const unique = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i][0] !== sorted[i-1][0] || sorted[i][1] !== sorted[i-1][1]) {
      unique.push(sorted[i]);
    }
  }

  if (unique.length < 3) {
    const [a] = unique;
    return [[a[0]-1,a[1]-1],[a[0]+1,a[1]-1],[a[0],a[1]+1],[a[0]-1,a[1]-1]];
  }

  const lower = [];
  for (const p of unique) {
    while (lower.length >= 2 && cross(lower[lower.length-2], lower[lower.length-1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper = [];
  for (let i = unique.length - 1; i >= 0; i--) {
    const p = unique[i];
    while (upper.length >= 2 && cross(upper[upper.length-2], upper[upper.length-1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  // Remove last point of each half because it's repeated
  lower.pop();
  upper.pop();

  const hull = lower.concat(upper);
  // Close the polygon
  hull.push(hull[0]);
  return hull;
}

// --- Buffer calculation ---
function bufferPoint(lat, lon, bufferKm) {
  const latOffset = bufferKm / 111.32; // ~111.32 km per degree latitude
  const lonOffset = bufferKm / (111.32 * Math.cos(lat * Math.PI / 180));

  return [
    [lon, lat + latOffset],           // North
    [lon, lat - latOffset],           // South
    [lon + lonOffset, lat],           // East
    [lon - lonOffset, lat],           // West
    [lon + lonOffset * 0.7, lat + latOffset * 0.7],  // NE
    [lon - lonOffset * 0.7, lat + latOffset * 0.7],  // NW
    [lon + lonOffset * 0.7, lat - latOffset * 0.7],  // SE
    [lon - lonOffset * 0.7, lat - latOffset * 0.7],  // SW
  ];
}

// --- Main ---
function main() {
  const locationsPath = path.join(__dirname, '..', 'public', 'data', 'locations.json');
  const outputPath = path.join(__dirname, '..', 'public', 'data', 'layers', 'climate_zones.json');

  const rawData = JSON.parse(fs.readFileSync(locationsPath, 'utf8'));
  const locations = rawData.locations.slice().sort((a, b) => a.time - b.time);

  console.log(`Loaded ${locations.length} GPS points`);

  // Classify each point
  const zonePoints = {};
  ZONES.forEach(z => { zonePoints[z.id] = []; });

  const classified = locations.map((p, i) => ({
    ...p,
    zone: classifyPoint(p, i, locations.length)
  }));

  // Collect points per zone
  classified.forEach(p => {
    if (zonePoints[p.zone]) {
      zonePoints[p.zone].push(p);
    }
  });

  // Add overlap: for each zone, find its index range and extend
  const zoneOrder = ZONES.map(z => z.id);
  for (let zi = 0; zi < zoneOrder.length; zi++) {
    const zoneId = zoneOrder[zi];
    const points = zonePoints[zoneId];
    if (points.length === 0) continue;

    // Find min/max index in the classified array
    let minIdx = Infinity, maxIdx = -1;
    classified.forEach((p, i) => {
      if (p.zone === zoneId) {
        if (i < minIdx) minIdx = i;
        if (i > maxIdx) maxIdx = i;
      }
    });

    // Extend range by OVERLAP_POINTS in each direction
    const extStart = Math.max(0, minIdx - OVERLAP_POINTS);
    const extEnd = Math.min(classified.length - 1, maxIdx + OVERLAP_POINTS);

    for (let i = extStart; i < minIdx; i++) {
      zonePoints[zoneId].push(classified[i]);
    }
    for (let i = maxIdx + 1; i <= extEnd; i++) {
      zonePoints[zoneId].push(classified[i]);
    }
  }

  // Log zone point counts
  ZONES.forEach(z => {
    console.log(`  ${z.id}: ${zonePoints[z.id].length} points`);
  });

  // Generate polygons
  const features = ZONES.map(zone => {
    const points = zonePoints[zone.id];

    if (points.length === 0) {
      console.warn(`WARNING: Zone ${zone.id} has no points!`);
      return null;
    }

    // Sample points to keep computation manageable (every Nth point)
    const sampleRate = Math.max(1, Math.floor(points.length / 300));
    const sampled = points.filter((_, i) => i % sampleRate === 0);

    // Generate buffer points
    const allBufferPoints = [];
    for (const p of sampled) {
      const buffered = bufferPoint(p.lat, p.lon, BUFFER_KM);
      allBufferPoints.push(...buffered);
    }

    console.log(`  ${zone.id}: ${sampled.length} sampled -> ${allBufferPoints.length} buffer points`);

    // Compute convex hull
    const hull = convexHull(allBufferPoints);

    // Round coordinates to 4 decimal places
    const coords = hull.map(([lon, lat]) => [
      Math.round(lon * 10000) / 10000,
      Math.round(lat * 10000) / 10000
    ]);

    return {
      type: 'Feature',
      properties: {
        id: zone.id,
        code: zone.code,
        name: zone.name,
        description: zone.description,
        region: zone.region,
        color: zone.color,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [coords],
      },
    };
  }).filter(Boolean);

  const geojson = {
    type: 'FeatureCollection',
    features,
  };

  fs.writeFileSync(outputPath, JSON.stringify(geojson, null, 2), 'utf8');
  console.log(`\nWrote ${features.length} features to ${outputPath}`);
}

main();
