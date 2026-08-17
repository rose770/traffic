import fs from 'fs';
import proj4 from 'proj4';

async function testFullBlockExpansion() {
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

  // Find median from top-level valid entities
  const allX = [];
  const allY = [];
  const checkPt = (p) => {
    if (p && typeof p.x === 'number' && isFinite(p.x) && typeof p.y === 'number' && isFinite(p.y)) {
      if (Math.abs(p.x) > 100000 && Math.abs(p.x) < 900000 && Math.abs(p.y) > 2000000 && Math.abs(p.y) < 4000000) {
        allX.push(p.x);
        allY.push(p.y);
      }
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

  console.log(`Median Center: (${medianX}, ${medianY})`);

  const isWorldPtValid = (p) => {
    if (!p || typeof p.x !== 'number' || typeof p.y !== 'number') return false;
    const dist = Math.hypot(p.x - medianX, p.y - medianY);
    return dist < 3000;
  };

  const toLatLng = (x, y) => {
    const [lng, lat] = proj4(utmZone37N, wgs84, [x, y]);
    return [lat, lng];
  };

  const features = [];

  const processEntities = (entities, transform = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 }, depth = 0) => {
    if (depth > 6) return; // Prevent infinite loop
    (entities || []).forEach((entity, idx) => {
      const applyTransform = (pt) => {
        if (!pt) return null;
        let x = pt.x * transform.scaleX;
        let y = pt.y * transform.scaleY;
        if (transform.rotation !== 0) {
          const cosA = Math.cos(transform.rotation);
          const sinA = Math.sin(transform.rotation);
          const nx = x * cosA - y * sinA;
          const ny = x * sinA + y * cosA;
          x = nx;
          y = ny;
        }
        x += transform.x;
        y += transform.y;
        return { x, y };
      };

      // Determine entity color from layer or entity
      const colorIndex = entity.colorIndex !== undefined ? entity.colorIndex : 7;

      switch (entity.type) {
        case 'LINE': {
          if (!entity.vertices || entity.vertices.length < 2) break;
          const p1 = applyTransform(entity.vertices[0]);
          const p2 = applyTransform(entity.vertices[1]);
          if (!isWorldPtValid(p1) || !isWorldPtValid(p2)) break;
          const [lat1, lng1] = toLatLng(p1.x, p1.y);
          const [lat2, lng2] = toLatLng(p2.x, p2.y);
          features.push({
            type: 'Feature',
            properties: {
              layer: entity.layer,
              type: 'LINE',
              colorIndex,
              depth
            },
            geometry: { type: 'LineString', coordinates: [[lng1, lat1], [lng2, lat2]] }
          });
          break;
        }
        case 'LWPOLYLINE':
        case 'POLYLINE': {
          if (!entity.vertices || entity.vertices.length < 2) break;
          const pts = entity.vertices.map(applyTransform);
          if (!pts.every(isWorldPtValid)) break;
          const coords = pts.map(p => {
            const [lat, lng] = toLatLng(p.x, p.y);
            return [lng, lat];
          });
          features.push({
            type: 'Feature',
            properties: {
              layer: entity.layer,
              type: entity.type,
              colorIndex,
              shape: entity.shape,
              depth
            },
            geometry: {
              type: entity.shape ? 'Polygon' : 'LineString',
              coordinates: entity.shape ? [coords] : coords
            }
          });
          break;
        }
        case 'CIRCLE': {
          if (!entity.center || !entity.radius) break;
          const center = applyTransform(entity.center);
          if (!isWorldPtValid(center)) break;
          const [lat, lng] = toLatLng(center.x, center.y);
          features.push({
            type: 'Feature',
            properties: {
              layer: entity.layer,
              type: 'CIRCLE',
              colorIndex,
              radius: entity.radius * Math.abs(transform.scaleX),
              depth
            },
            geometry: { type: 'Point', coordinates: [lng, lat] }
          });
          break;
        }
        case 'TEXT':
        case 'MTEXT': {
          const pos = entity.position || entity.startPoint;
          if (!pos) break;
          const pt = applyTransform(pos);
          if (!isWorldPtValid(pt)) break;
          const [lat, lng] = toLatLng(pt.x, pt.y);
          features.push({
            type: 'Feature',
            properties: {
              layer: entity.layer,
              type: entity.type,
              text: entity.text || entity.string || '',
              rotation: ((entity.rotation || 0) + (transform.rotation * 180 / Math.PI)) % 360,
              colorIndex,
              depth
            },
            geometry: { type: 'Point', coordinates: [lng, lat] }
          });
          break;
        }
        case 'INSERT': {
          const blockName = entity.name || entity.block;
          if (!blockName || !dxf.blocks || !dxf.blocks[blockName]) break;
          const block = dxf.blocks[blockName];

          const insertPos = entity.position || { x: 0, y: 0 };
          const scaleX = entity.scale ? entity.scale.x : (entity.xScale || 1);
          const scaleY = entity.scale ? entity.scale.y : (entity.yScale || 1);
          const rotRad = entity.rotation ? (entity.rotation * Math.PI / 180) : 0;

          // Transform insert position to world coordinates
          const worldInsertPos = applyTransform(insertPos);
          if (!isWorldPtValid(worldInsertPos)) {
            // Outlier block like entity 21
            break;
          }

          const combinedTransform = {
            x: worldInsertPos.x,
            y: worldInsertPos.y,
            scaleX: transform.scaleX * scaleX,
            scaleY: transform.scaleY * scaleY,
            rotation: transform.rotation + rotRad
          };

          processEntities(block.entities, combinedTransform, depth + 1);
          break;
        }
      }
    });
  };

  processEntities(dxf.entities);
  console.log(`Successfully extracted ${features.length} features!`);

  const typeCounts = {};
  features.forEach(f => {
    typeCounts[f.properties.type] = (typeCounts[f.properties.type] || 0) + 1;
  });
  console.log('Feature counts by type:', typeCounts);

  const layerCounts = {};
  features.forEach(f => {
    layerCounts[f.properties.layer] = (layerCounts[f.properties.layer] || 0) + 1;
  });
  console.log('Feature counts by layer:', layerCounts);
}

testFullBlockExpansion().catch(console.error);
