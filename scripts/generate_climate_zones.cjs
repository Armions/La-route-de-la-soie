/**
 * Generate climate_zones.json with wide band polygons (~200km) following the GPS route
 * Each zone is a buffer polygon around the relevant segment of the route
 */

const fs = require('fs');
const path = require('path');

// Read and sort locations by time
const locationsPath = path.join(__dirname, '..', 'public', 'data', 'locations.json');
const locData = JSON.parse(fs.readFileSync(locationsPath, 'utf8'));
const points = locData.locations.sort((a, b) => a.time - b.time);

console.log(`Total GPS points: ${points.length}`);

// Less aggressive downsampling for better coverage
function downsample(pts, n) {
  const result = [];
  for (let i = 0; i < pts.length; i += n) {
    result.push(pts[i]);
  }
  if (result[result.length - 1] !== pts[pts.length - 1]) {
    result.push(pts[pts.length - 1]);
  }
  return result;
}

const sampled = downsample(points, 5); // Every 5th point for better density
console.log(`Downsampled to ${sampled.length} points`);

// Climate zone definitions
const climateZones = [
  {
    id: 'cfb', code: 'Cfb', name: 'Océanique',
    description: 'Températures modérées, pluies réparties toute l\'année',
    region: 'France', color: '#5B8FA8'
  },
  {
    id: 'csa', code: 'Csa', name: 'Méditerranéen chaud',
    description: 'Étés secs et chauds, hivers doux et humides',
    region: 'Italie, Grèce, côte turque', color: '#F5C542'
  },
  {
    id: 'dsa', code: 'Dsa/Dsb', name: 'Continental à été sec',
    description: 'Hivers froids, étés secs, forte amplitude thermique',
    region: 'Turquie intérieure', color: '#D4845A'
  },
  {
    id: 'dfa', code: 'Dfa/Dfb', name: 'Continental humide',
    description: 'Hivers froids, précipitations toute l\'année',
    region: 'Géorgie, Arménie', color: '#6BAF6B'
  },
  {
    id: 'bsk', code: 'BSk', name: 'Semi-aride froid (steppe)',
    description: 'Faibles précipitations, hivers froids, étés chauds',
    region: 'Kazakhstan, Ouzbékistan', color: '#C9A84C'
  },
  {
    id: 'dwb', code: 'Dwb/Dwc', name: 'Continental subarctique',
    description: 'Hivers très froids et secs, étés courts',
    region: 'Kirghizstan', color: '#8B7EC8'
  },
  {
    id: 'bwk', code: 'BWk', name: 'Aride froid (désert)',
    description: 'Très faibles précipitations, amplitude thermique extrême',
    region: 'Xinjiang (Chine ouest)', color: '#D4A574'
  },
  {
    id: 'cfa-chine', code: 'Cfa', name: 'Subtropical humide',
    description: 'Étés chauds et humides, hivers doux',
    region: 'Chine est (Fujian, Zhejiang)', color: '#5AAF8F'
  },
  {
    id: 'cfa-japon', code: 'Cfa', name: 'Subtropical humide',
    description: 'Chaud et humide, mousson estivale',
    region: 'Japon (Kii, Tokyo)', color: '#5A8FBF'
  }
];

const BUFFER_KM = 100; // 100 km each side

function offsetPoint(lat, lon, bearingDeg, distKm) {
  const R = 6371;
  const d = distKm / R;
  const brng = bearingDeg * Math.PI / 180;
  const lat1 = lat * Math.PI / 180;
  const lon1 = lon * Math.PI / 180;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng));
  const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: lat2 * 180 / Math.PI, lon: lon2 * 180 / Math.PI };
}

function calcBearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const la1 = lat1 * Math.PI / 180;
  const la2 = lat2 * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(la2);
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLon);
  return Math.atan2(y, x) * 180 / Math.PI;
}

function generateBufferPolygon(segmentPoints, bufferKm) {
  if (segmentPoints.length < 2) return null;

  // Simplify to max ~60 points for clean polygons
  let simplified = segmentPoints;
  if (segmentPoints.length > 60) {
    const step = Math.ceil(segmentPoints.length / 60);
    simplified = [];
    for (let i = 0; i < segmentPoints.length; i += step) {
      simplified.push(segmentPoints[i]);
    }
    if (simplified[simplified.length - 1] !== segmentPoints[segmentPoints.length - 1]) {
      simplified.push(segmentPoints[segmentPoints.length - 1]);
    }
  }

  const leftSide = [];
  const rightSide = [];

  for (let i = 0; i < simplified.length; i++) {
    const p = simplified[i];
    let brng;

    if (i === 0) {
      brng = calcBearing(p.lat, p.lon, simplified[i + 1].lat, simplified[i + 1].lon);
    } else if (i === simplified.length - 1) {
      brng = calcBearing(simplified[i - 1].lat, simplified[i - 1].lon, p.lat, p.lon);
    } else {
      const b1 = calcBearing(simplified[i - 1].lat, simplified[i - 1].lon, p.lat, p.lon);
      const b2 = calcBearing(p.lat, p.lon, simplified[i + 1].lat, simplified[i + 1].lon);
      const avgSin = (Math.sin(b1 * Math.PI / 180) + Math.sin(b2 * Math.PI / 180)) / 2;
      const avgCos = (Math.cos(b1 * Math.PI / 180) + Math.cos(b2 * Math.PI / 180)) / 2;
      brng = Math.atan2(avgSin, avgCos) * 180 / Math.PI;
    }

    const leftPt = offsetPoint(p.lat, p.lon, brng - 90, bufferKm);
    const rightPt = offsetPoint(p.lat, p.lon, brng + 90, bufferKm);
    leftSide.push([leftPt.lon, leftPt.lat]);
    rightSide.push([rightPt.lon, rightPt.lat]);
  }

  const coords = [...leftSide, ...rightSide.reverse()];
  coords.push(coords[0]);
  return [coords];
}

// Sequential zone assignment based on route progression
// The route goes: France -> Italy -> Greece -> Turkey coast -> Turkey interior ->
// Caucasus (Georgia/Armenia back and forth) -> Russia south -> Kazakhstan -> Uzbekistan ->
// Kyrgyzstan -> Xinjiang -> Central China -> Beijing -> South to HK -> Coast -> Japan
function assignZone(p, prevZone, idx, allPts) {
  const { lat, lon } = p;

  // Use sequential state machine approach
  // Once we've moved to a later zone, don't go back (except for special cases)

  const zoneOrder = ['cfb', 'csa', 'dsa', 'dfa', 'bsk', 'dwb', 'bwk', 'cfa-chine', 'cfa-japon'];
  const prevIdx = zoneOrder.indexOf(prevZone);

  // France (Cfb): lon < 7.5
  if (prevIdx <= 0 && lon < 7.5) return 'cfb';

  // Mediterranean (Csa): lon 7.5 to ~33
  if (prevIdx <= 1 && lon >= 7.5 && lon < 33) return 'csa';

  // Inner Turkey (Dsa/Dsb): lon 33 to ~43, before entering Caucasus
  if (prevIdx <= 2 && lon >= 33 && lon < 43.5 && (prevZone === 'csa' || prevZone === 'dsa')) return 'dsa';

  // Caucasus (Dfa/Dfb): lon 40-47, lat 40-44 - Georgia and Armenia
  if (prevIdx <= 3 && lon >= 40 && lon < 48 && lat >= 39 && lat <= 44) {
    if (prevZone === 'dsa' || prevZone === 'dfa') return 'dfa';
  }

  // Steppe (BSk): after Caucasus, lon 44+, heading east through Russia/Kazakhstan/Uzbekistan
  if (prevIdx <= 4 && lon >= 44 && lon < 69.5) {
    if (prevZone === 'dfa' || prevZone === 'bsk') return 'bsk';
  }

  // Kyrgyzstan (Dwb/Dwc): lon 69-80
  if (prevIdx <= 5 && lon >= 69 && lon < 80) {
    if (prevZone === 'bsk' || prevZone === 'dwb') return 'dwb';
  }

  // Xinjiang desert (BWk): lon 75-103, the desert/arid corridor
  if (prevIdx <= 6 && lon >= 75 && lon < 104) {
    if (prevZone === 'dwb' || prevZone === 'bwk') return 'bwk';
  }

  // Eastern China (Cfa): lon 103+ — everything from Gansu/Sichuan eastward
  // This covers the huge loop: Xi'an -> Shanxi -> Beijing -> south to HK -> coast to Shanghai
  if (prevIdx <= 7 && lon >= 103 && lon < 128) {
    if (prevZone === 'bwk' || prevZone === 'cfa-chine') return 'cfa-chine';
  }

  // Japan (Cfa): lon 128+
  if (lon >= 128) {
    if (prevZone === 'cfa-chine' || prevZone === 'cfa-japon') return 'cfa-japon';
  }

  // Fallback: stay in current zone
  return prevZone;
}

// Assign each point to a zone
let currentZone = 'cfb';
const zoneSegments = {};
climateZones.forEach(z => { zoneSegments[z.id] = []; });

for (let i = 0; i < sampled.length; i++) {
  currentZone = assignZone(sampled[i], currentZone, i, sampled);
  zoneSegments[currentZone].push(sampled[i]);
}

// Print zone point counts
console.log('\nPoints per zone:');
for (const [id, pts] of Object.entries(zoneSegments)) {
  if (pts.length > 0) {
    console.log(`  ${id}: ${pts.length} points, lon ${pts[0].lon.toFixed(1)}..${pts[pts.length-1].lon.toFixed(1)}, lat ${Math.min(...pts.map(p=>p.lat)).toFixed(1)}..${Math.max(...pts.map(p=>p.lat)).toFixed(1)}`);
  } else {
    console.log(`  ${id}: 0 points`);
  }
}

// Add overlap: append a few points from the next zone's start and prepend from prev zone's end
const zoneIds = climateZones.map(z => z.id);
const OVERLAP_POINTS = 3; // Number of points to duplicate at boundaries

for (let i = 0; i < zoneIds.length - 1; i++) {
  const currId = zoneIds[i];
  const nextId = zoneIds[i + 1];
  const currPts = zoneSegments[currId];
  const nextPts = zoneSegments[nextId];

  if (currPts.length > 0 && nextPts.length > 0) {
    // Add last few points of current zone to start of next zone
    const overlap = currPts.slice(-OVERLAP_POINTS);
    zoneSegments[nextId] = [...overlap, ...nextPts];
    // Add first few points of next zone to end of current zone
    const overlap2 = nextPts.slice(0, OVERLAP_POINTS);
    zoneSegments[currId] = [...currPts, ...overlap2];
  }
}

// Generate GeoJSON features
const features = climateZones.map(zone => {
  const pts = zoneSegments[zone.id];
  if (pts.length < 2) {
    console.warn(`Zone ${zone.id} has ${pts.length} points, skipping`);
    return null;
  }

  const coords = generateBufferPolygon(pts, BUFFER_KM);
  if (!coords) return null;

  return {
    type: 'Feature',
    properties: {
      id: zone.id,
      code: zone.code,
      name: zone.name,
      description: zone.description,
      region: zone.region,
      color: zone.color
    },
    geometry: {
      type: 'Polygon',
      coordinates: coords
    }
  };
}).filter(f => f !== null);

const geojson = { type: 'FeatureCollection', features };
const outputPath = path.join(__dirname, '..', 'public', 'data', 'layers', 'climate_zones.json');
fs.writeFileSync(outputPath, JSON.stringify(geojson, null, 2));
console.log(`\nWritten ${features.length} climate zone polygons to climate_zones.json`);
