import fs from 'fs';
import proj4 from 'proj4';

async function checkRoadAndCadAlignment() {
  const dwgdxf = await import('dwgdxf');
  await dwgdxf.init();
  const buf = fs.readFileSync('C:/Users/WIN 11/Downloads/242206770.dwg');
  const dwgBytes = new Uint8Array(buf);
  const dxfBytes = await dwgdxf.convertDwgToDxf(dwgBytes);
  const dxfString = new TextDecoder().decode(dxfBytes);

  const DxfParser = (await import('dxf-parser')).default;
  const parser = new DxfParser();
  const dxf = parser.parseSync(dxfString);

  const utmZone37N = '+proj=utm +zone=37 +datum=WGS84 +units=m +no_defs';
  const wgs84 = '+proj=longlat +datum=WGS84 +no_defs';

  console.log('=== ROAD LINE ENTITIES IN DWG ===');
  dxf.entities.forEach((e, idx) => {
    if (e.type === 'LINE' || e.type === 'LWPOLYLINE') {
      if (e.vertices && e.vertices.length >= 2) {
        const v = e.vertices;
        const [lngStart, latStart] = proj4(utmZone37N, wgs84, [v[0].x, v[0].y]);
        const [lngEnd, latEnd] = proj4(utmZone37N, wgs84, [v[v.length - 1].x, v[v.length - 1].y]);
        const dx = v[v.length - 1].x - v[0].x;
        const dy = v[v.length - 1].y - v[0].y;
        const bearing = ((Math.atan2(dx, dy) * 180 / Math.PI) + 360) % 360;
        const len = Math.hypot(dx, dy);
        console.log(`[Entity ${idx}] Type: ${e.type}, Layer: "${e.layer}", Color: ${e.colorIndex}, Length: ${len.toFixed(1)}m, Bearing: ${bearing.toFixed(1)}°`);
        console.log(`   Start: [${latStart.toFixed(6)}, ${lngStart.toFixed(6)}] -> End: [${latEnd.toFixed(6)}, ${lngEnd.toFixed(6)}]`);
      }
    }
  });

  // Query Overpass for the actual road in Madinah
  const centerLat = 24.48723;
  const centerLng = 39.67998;
  const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];way(around:300,${centerLat},${centerLng})[highway];out geom;`;

  try {
    const res = await fetch(overpassUrl);
    const data = await res.json();
    console.log(`\n=== OVERPASS ROADS AROUND SITE (${data.elements?.length} ways) ===`);
    data.elements.forEach(way => {
      const name = way.tags?.name || way.tags?.['name:en'] || way.tags?.['name:ar'] || 'Unnamed';
      const geom = way.geometry || [];
      if (geom.length >= 2) {
        const p1 = geom[0];
        const p2 = geom[geom.length - 1];
        const dLat = p2.lat - p1.lat;
        const dLng = p2.lon - p1.lon;
        const bearing = ((Math.atan2(dLng, dLat) * 180 / Math.PI) + 360) % 360;
        console.log(`Road: "${name}" (${way.tags?.highway}), Bearing: ${bearing.toFixed(1)}°, Points: ${geom.length}`);
        console.log(`   Start: [${p1.lat.toFixed(6)}, ${p1.lon.toFixed(6)}] -> End: [${p2.lat.toFixed(6)}, ${p2.lon.toFixed(6)}]`);
      }
    });
  } catch (err) {
    console.error('Overpass error:', err.message);
  }
}

checkRoadAndCadAlignment().catch(console.error);
