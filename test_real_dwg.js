import fs from 'fs';
import proj4 from 'proj4';

async function test() {
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

  // 1. Gather all points to compute robust median
  const allX = [];
  const allY = [];
  const checkPt = (p) => {
    if (p && typeof p.x === 'number' && isFinite(p.x) && typeof p.y === 'number' && isFinite(p.y)) {
      allX.push(p.x);
      allY.push(p.y);
    }
  };

  (dxf.entities || []).forEach(e => {
    if (e.vertices) e.vertices.forEach(checkPt);
    if (e.center) checkPt(e.center);
    if (e.startPoint) checkPt(e.startPoint);
    if (e.endPoint) checkPt(e.endPoint);
    if (e.position) checkPt(e.position);
  });

  allX.sort((a, b) => a - b);
  allY.sort((a, b) => a - b);
  const medianX = allX[Math.floor(allX.length / 2)];
  const medianY = allY[Math.floor(allY.length / 2)];

  console.log(`Median Point: (${medianX.toFixed(2)}, ${medianY.toFixed(2)})`);

  // Max allowed distance from cluster center: 5000 meters for municipal road projects
  const MAX_RADIUS = 5000;
  const isPtValid = (p) => {
    if (!p || typeof p.x !== 'number' || typeof p.y !== 'number') return false;
    const dist = Math.hypot(p.x - medianX, p.y - medianY);
    return dist < MAX_RADIUS;
  };

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const validX = [];
  const validY = [];

  const checkValid = (p) => {
    if (isPtValid(p)) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
      validX.push(p.x);
      validY.push(p.y);
    }
  };

  (dxf.entities || []).forEach(e => {
    if (e.vertices) e.vertices.forEach(checkValid);
    if (e.center) checkValid(e.center);
    if (e.startPoint) checkValid(e.startPoint);
    if (e.endPoint) checkValid(e.endPoint);
    if (e.position) checkValid(e.position);
  });

  console.log(`Filtered Bounding Box: X=[${minX}, ${maxX}], Y=[${minY}, ${maxY}]`);
  const [swLng, swLat] = proj4(utmZone37N, wgs84, [minX, minY]);
  const [neLng, neLat] = proj4(utmZone37N, wgs84, [maxX, maxY]);
  console.log(`WGS84 GPS Bounds: [[${swLat}, ${swLng}], [${neLat}, ${neLng}]]`);
  console.log(`Center GPS: [${(swLat+neLat)/2}, ${(swLng+neLng)/2}]`);

  // Test generating GeoJSON features with filtering
  const toLatLng = (x, y) => {
    const [lng, lat] = proj4(utmZone37N, wgs84, [x, y]);
    return [lat, lng];
  };

  const features = [];
  (dxf.entities || []).forEach((entity, idx) => {
    if (entity.position && !isPtValid(entity.position)) {
      console.log(`Skipping outlier entity ${idx} (${entity.type})`);
      return;
    }
    if (entity.vertices && !entity.vertices.every(isPtValid)) {
      console.log(`Skipping outlier entity ${idx} (${entity.type})`);
      return;
    }

    if (entity.type === 'LINE' && entity.vertices?.length >= 2) {
      const coords = entity.vertices.map(v => {
        const [lat, lng] = toLatLng(v.x, v.y);
        return [lng, lat];
      });
      features.push({ type: 'Feature', properties: { layer: entity.layer, type: entity.type }, geometry: { type: 'LineString', coordinates: coords } });
    } else if ((entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') && entity.vertices?.length >= 2) {
      const coords = entity.vertices.map(v => {
        const [lat, lng] = toLatLng(v.x, v.y);
        return [lng, lat];
      });
      features.push({ type: 'Feature', properties: { layer: entity.layer, type: entity.type }, geometry: { type: 'LineString', coordinates: coords } });
    }
  });

  console.log(`Generated ${features.length} clean GeoJSON features for Leaflet!`);
  console.log('Sample Feature 0:', JSON.stringify(features[0]));
}

test().catch(console.error);
