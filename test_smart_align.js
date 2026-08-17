import fs from 'fs';
import proj4 from 'proj4';

async function testSmartAlignment() {
  const dwgdxf = await import('dwgdxf');
  await dwgdxf.init();
  const buf = fs.readFileSync('C:/Users/WIN 11/Downloads/242206770.dwg');
  const dwgBytes = new Uint8Array(buf);
  const dxfBytes = await dwgdxf.convertDwgToDxf(dwgBytes);
  const dxfString = new TextDecoder().decode(dxfBytes);

  const DxfParser = (await import('dxf-parser')).default;
  const parser = new DxfParser();
  const dxf = parser.parseSync(dxfString);

  // 1. Scan for coordinate callout texts
  const controlPoints = [];
  const textEntities = [];

  dxf.entities.forEach(e => {
    if (e.type === 'TEXT' || e.type === 'MTEXT') {
      const text = e.text || e.string || '';
      textEntities.push({ text, pos: e.position || e.startPoint });
    }
  });

  console.log('Text entities found:', textEntities.length);

  // Parse N/E coordinate pairs
  let currentE = null, currentN = null;
  textEntities.forEach(t => {
    const eMatch = t.text.match(/E:\s*([0-9.]+)/i);
    const nMatch = t.text.match(/N:\s*([0-9.]+)/i);
    if (eMatch) currentE = { val: parseFloat(eMatch[1]), pos: t.pos };
    if (nMatch) currentN = { val: parseFloat(nMatch[1]), pos: t.pos };

    if (currentE && currentN) {
      controlPoints.push({
        gpsLat: currentN.val,
        gpsLng: currentE.val,
        cadPos: currentN.pos || currentE.pos
      });
      currentE = null;
      currentN = null;
    }
  });

  console.log('Detected Control Points inside CAD drawing:', controlPoints);

  // Compare CAD coordinate projection vs ground-truth callouts
  const utmZone37N = '+proj=utm +zone=37 +datum=WGS84 +units=m +no_defs';
  const wgs84 = '+proj=longlat +datum=WGS84 +no_defs';

  // Check the regulatory line entity (Line on layer 'تنظيم')
  const regLine = dxf.entities.find(e => e.type === 'LINE' && e.layer === 'تنظيم');
  if (regLine) {
    console.log('Regulatory Line vertices (CAD UTM):', regLine.vertices);
    const p1 = regLine.vertices[0];
    const p2 = regLine.vertices[1];

    const [lng1, lat1] = proj4(utmZone37N, wgs84, [p1.x, p1.y]);
    const [lng2, lat2] = proj4(utmZone37N, wgs84, [p2.x, p2.y]);

    console.log(`P1 Projected: Lat=${lat1.toFixed(6)}, Lng=${lng1.toFixed(6)}`);
    console.log(`P2 Projected: Lat=${lat2.toFixed(6)}, Lng=${lng2.toFixed(6)}`);

    if (controlPoints.length >= 2) {
      console.log(`P1 Target (Callout 2): Lat=${controlPoints[0].gpsLat}, Lng=${controlPoints[0].gpsLng}`);
      console.log(`P2 Target (Callout 1): Lat=${controlPoints[1].gpsLat}, Lng=${controlPoints[1].gpsLng}`);

      const dLat1 = controlPoints[0].gpsLat - lat1;
      const dLng1 = controlPoints[0].gpsLng - lng1;
      console.log(`Delta Lat: ${dLat1.toFixed(6)} (≈ ${(dLat1 * 111000).toFixed(2)} m), Delta Lng: ${dLng1.toFixed(6)} (≈ ${(dLng1 * 101000).toFixed(2)} m)`);
    }
  }
}

testSmartAlignment().catch(console.error);
