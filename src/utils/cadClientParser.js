import DxfParser from 'dxf-parser';
import proj4 from 'proj4';
import { detectSaudiCrs, reprojectCadToWgs84 } from './coordinateEngine';

// ══════════════════════════════════════════════════════════════════════
// AutoCAD Color Index (ACI) Standard Palette Lookup
// ══════════════════════════════════════════════════════════════════════
const ACI_COLORS = {
  1: '#FF0000', 2: '#FFFF00', 3: '#00FF00', 4: '#00FFFF',
  5: '#0000FF', 6: '#FF00FF', 7: '#FFFFFF', 8: '#808080',
  9: '#C0C0C0', 10: '#FF0000', 30: '#FF7F00', 40: '#FFD700',
  50: '#FFFF00', 70: '#7FFF00', 90: '#00FF00', 130: '#00FFFF',
  150: '#007FFF', 170: '#0000FF', 210: '#7F00FF', 230: '#FF00FF',
  250: '#333333', 256: '#FFFFFF'
};

const aciToHex = (colorIndex) => {
  if (!colorIndex || colorIndex === 256) return '#FFFFFF';
  return ACI_COLORS[colorIndex] || '#38BDF8';
};

const cleanDxfText = (txt = '') => {
  if (!txt) return '';
  return txt
    .replace(/\\A[0-9];/g, '')
    .replace(/\\H[0-9.]+x;/g, '')
    .replace(/\\C[0-9]+;/g, '')
    .replace(/\\f[^;]+;/g, '')
    .replace(/\\W[0-9.]+;/g, '')
    .replace(/\\Q[0-9.-]+;/g, '')
    .replace(/\\T[0-9.]+;/g, '')
    .replace(/\\L/g, '')
    .replace(/\\l/g, '')
    .replace(/\\O/g, '')
    .replace(/\\o/g, '')
    .replace(/\\K/g, '')
    .replace(/\\k/g, '')
    .replace(/\\P/g, ' ')
    .replace(/\\X/g, ' ')
    .replace(/\\~[0-9]+/g, '')
    .replace(/\\[a-zA-Z0-9]+/g, '')
    .replace(/\{|\}/g, '')
    .replace(/\^J/g, ' ')
    .replace(/\^M/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * 100% In-Browser Client-Side DXF to GeoJSON Parser
 * Runs in the browser thread or Web Worker without any backend dependencies.
 */
export async function parseCadClientSide(fileContent, fileName = 'blueprint.dxf', anchorLat = 24.4686, anchorLng = 39.6120, preferredCrs = null, onProgress = null) {
  if (onProgress) onProgress(25, 'Parsing vector entities...');

  const parser = new DxfParser();
  let dxf = null;

  try {
    dxf = parser.parseSync(fileContent);
  } catch (parseErr) {
    throw new Error(`DXF Parser syntax error: ${parseErr.message}`);
  }

  if (!dxf || !dxf.entities) {
    throw new Error('No valid vector entities found in the CAD file.');
  }

  if (onProgress) onProgress(55, 'Transforming Saudi UTM coordinates...');

  // 1. Calculate Bounding Box
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const checkPt = (p) => {
    if (p && typeof p.x === 'number' && typeof p.y === 'number' && !isNaN(p.x) && !isNaN(p.y)) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
  };

  dxf.entities.forEach(ent => {
    if (ent.vertices) ent.vertices.forEach(checkPt);
    if (ent.startPoint) checkPt(ent.startPoint);
    if (ent.endPoint) checkPt(ent.endPoint);
    if (ent.position) checkPt(ent.position);
    if (ent.center) checkPt(ent.center);
  });

  const isGeoreferenced = minX > 100000 && minX < 900000 && minY > 1500000 && minY < 3500000;
  const geomCenterX = (minX !== Infinity && maxX !== -Infinity) ? (minX + maxX) / 2 : 0;
  const geomCenterY = (minY !== Infinity && maxY !== -Infinity) ? (minY + maxY) / 2 : 0;

  const crs = preferredCrs || detectSaudiCrs(anchorLng, anchorLat, { x: geomCenterX, y: geomCenterY });

  const toLatLng = (x, y) => {
    if (isGeoreferenced) {
      const [lng, lat] = reprojectCadToWgs84(x, y, crs);
      return [lat, lng];
    }
    // Local metric grid relative to anchor
    const cosLat = Math.cos(anchorLat * Math.PI / 180);
    const relX = x - geomCenterX;
    const relY = y - geomCenterY;
    const lat = anchorLat + (relY / 110574.61);
    const lng = anchorLng + (relX / (111320 * cosLat));
    return [lat, lng];
  };

  // 2. Extract Entities & Build GeoJSON Features
  const features = [];
  const layerEntityCount = {};

  const processEntities = (entities, transform = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 }) => {
    if (!entities || !Array.isArray(entities)) return;

    entities.forEach((entity) => {
      const layer = entity.layer || '0';
      layerEntityCount[layer] = (layerEntityCount[layer] || 0) + 1;

      const hexCol = aciToHex(entity.colorIndex || (dxf.tables?.layer?.layers?.[layer]?.colorIndex) || 256);
      const props = {
        layer,
        color: hexCol,
        colorIndex: entity.colorIndex,
        handle: entity.handle
      };

      const applyTransform = (pt) => {
        if (!pt || typeof pt.x !== 'number') return null;
        let { x, y } = pt;
        x = x * transform.scaleX;
        y = y * transform.scaleY;
        if (transform.rotation !== 0) {
          const cosR = Math.cos(transform.rotation);
          const sinR = Math.sin(transform.rotation);
          const rx = x * cosR - y * sinR;
          const ry = x * sinR + y * cosR;
          x = rx;
          y = ry;
        }
        return { x: x + transform.x, y: y + transform.y };
      };

      switch (entity.type) {
        case 'LINE': {
          const p1 = applyTransform(entity.vertices ? entity.vertices[0] : entity.startPoint);
          const p2 = applyTransform(entity.vertices ? entity.vertices[1] : entity.endPoint);
          if (!p1 || !p2) break;

          const [lat1, lng1] = toLatLng(p1.x, p1.y);
          const [lat2, lng2] = toLatLng(p2.x, p2.y);
          const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);

          features.push({
            type: 'Feature',
            properties: { ...props, lengthMeters: Number(len.toFixed(2)) },
            geometry: { type: 'LineString', coordinates: [[lng1, lat1], [lng2, lat2]] }
          });
          break;
        }
        case 'LWPOLYLINE':
        case 'POLYLINE': {
          if (!entity.vertices || entity.vertices.length < 2) break;
          const pts = entity.vertices.map(applyTransform).filter(Boolean);
          if (pts.length < 2) break;

          let totalLength = 0;
          for (let i = 1; i < pts.length; i++) {
            totalLength += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
          }

          const coords = pts.map(tp => {
            const [lat, lng] = toLatLng(tp.x, tp.y);
            return [lng, lat];
          });

          const isSelfClosing = pts.length >= 3 && Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y) < 0.05;
          const isExplicitlyClosed = Boolean(entity.shape === true || entity.closed === true || (entity.flags && (entity.flags & 1) === 1));
          const isClosed = (isExplicitlyClosed || isSelfClosing) && pts.length >= 3;

          if (isClosed) {
            const firstCoord = coords[0];
            const lastCoord = coords[coords.length - 1];
            if (firstCoord[0] !== lastCoord[0] || firstCoord[1] !== lastCoord[1]) {
              coords.push([...firstCoord]);
            }
            features.push({
              type: 'Feature',
              properties: { ...props, lengthMeters: Number(totalLength.toFixed(2)), vertexCount: pts.length, isClosed: true },
              geometry: { type: 'Polygon', coordinates: [coords] }
            });
          } else {
            features.push({
              type: 'Feature',
              properties: { ...props, lengthMeters: Number(totalLength.toFixed(2)), vertexCount: pts.length, isClosed: false },
              geometry: { type: 'LineString', coordinates: coords }
            });
          }
          break;
        }
        case 'LEADER': {
          const pts = (entity.vertices || entity.points || []).map(applyTransform).filter(Boolean);
          if (pts.length >= 2) {
            const coords = pts.map(tp => {
              const [lat, lng] = toLatLng(tp.x, tp.y);
              return [lng, lat];
            });
            features.push({
              type: 'Feature',
              properties: {
                ...props,
                isLeaderLine: true,
                functionalType: 'ANNOTATION_GUIDES',
                color: '#FFFFFF'
              },
              geometry: { type: 'LineString', coordinates: coords }
            });
          }
          break;
        }
        case 'DIMENSION': {
          const cleanedDimText = cleanDxfText(entity.text || entity.string || '');
          const textPos = entity.middlePoint || entity.textMidpoint || entity.insertionPoint;
          if (cleanedDimText && textPos) {
            const tp = applyTransform(textPos);
            if (tp) {
              const [lat, lng] = toLatLng(tp.x, tp.y);
              features.push({
                type: 'Feature',
                properties: {
                  ...props,
                  text: cleanedDimText,
                  tagType: 'dimension',
                  functionalType: 'ANNOTATION_GUIDES',
                  color: '#8B5CF6'
                },
                geometry: { type: 'Point', coordinates: [lng, lat] }
              });
            }
          }
          break;
        }
        case 'TEXT':
        case 'MTEXT': {
          const pos = entity.position || entity.startPoint;
          if (!pos) break;
          const tp = applyTransform(pos);
          if (!tp) break;
          const [lat, lng] = toLatLng(tp.x, tp.y);
          const cleaned = cleanDxfText(entity.text || entity.string || '');
          if (!cleaned) break;

          const netRotation = ((entity.rotation || 0) + (transform.rotation * 180 / Math.PI)) % 360;

          let tagType = 'label';
          if (cleaned.includes('منطقة') || cleaned.includes('Zone') || cleaned.includes('TRANSITION') || cleaned.includes('العمل')) {
            tagType = 'zone';
          } else if (/\b\d+\s*M\b/i.test(cleaned) || /\bM\s*\d+\b/i.test(cleaned)) {
            tagType = 'dimension';
          } else if (cleaned.startsWith('N:') || cleaned.startsWith('E:')) {
            tagType = 'coordinate';
          }

          features.push({
            type: 'Feature',
            properties: {
              ...props,
              text: cleaned,
              tagType,
              rotationDeg: Math.round(netRotation),
              height: entity.height || 1,
              utm: { x: Number(tp.x.toFixed(1)), y: Number(tp.y.toFixed(1)) }
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
          const worldInsertPos = applyTransform(insertPos);
          if (!worldInsertPos) break;

          const scaleX = entity.scale ? entity.scale.x : (entity.xScale || 1);
          const scaleY = entity.scale ? entity.scale.y : (entity.yScale || 1);
          const rotRad = entity.rotation ? (entity.rotation * Math.PI / 180) : 0;

          processEntities(block.entities, {
            x: worldInsertPos.x,
            y: worldInsertPos.y,
            scaleX: transform.scaleX * scaleX,
            scaleY: transform.scaleY * scaleY,
            rotation: transform.rotation + rotRad
          });
          break;
        }
        case 'ARC': {
          const center = applyTransform(entity.center || { x: 0, y: 0 });
          const r = (entity.radius || 1) * Math.abs(transform.scaleX || 1);
          if (!center || !r) break;
          const startA = entity.startAngle || 0;
          let endA = entity.endAngle || (Math.PI * 2);
          if (endA < startA) endA += Math.PI * 2;
          const segments = 16;
          const pts = [];
          for (let i = 0; i <= segments; i++) {
            const a = startA + (endA - startA) * (i / segments);
            const x = center.x + r * Math.cos(a);
            const y = center.y + r * Math.sin(a);
            const [lat, lng] = toLatLng(x, y);
            pts.push([lng, lat]);
          }
          features.push({
            type: 'Feature',
            properties: { ...props, lengthMeters: Number((r * Math.abs(endA - startA)).toFixed(2)) },
            geometry: { type: 'LineString', coordinates: pts }
          });
          break;
        }
        case 'CIRCLE': {
          const center = applyTransform(entity.center || { x: 0, y: 0 });
          const r = (entity.radius || 1) * Math.abs(transform.scaleX || 1);
          if (!center || !r) break;
          const segments = 24;
          const pts = [];
          for (let i = 0; i <= segments; i++) {
            const a = (Math.PI * 2) * (i / segments);
            const x = center.x + r * Math.cos(a);
            const y = center.y + r * Math.sin(a);
            const [lat, lng] = toLatLng(x, y);
            pts.push([lng, lat]);
          }
          features.push({
            type: 'Feature',
            properties: { ...props, lengthMeters: Number((2 * Math.PI * r).toFixed(2)), isClosed: true },
            geometry: { type: 'Polygon', coordinates: [pts] }
          });
          break;
        }
        case 'SPLINE': {
          const rawPts = (entity.controlPoints || entity.fitPoints || entity.vertices || []).map(applyTransform).filter(Boolean);
          if (rawPts.length >= 2) {
            const coords = rawPts.map(tp => {
              const [lat, lng] = toLatLng(tp.x, tp.y);
              return [lng, lat];
            });
            features.push({
              type: 'Feature',
              properties: { ...props },
              geometry: { type: 'LineString', coordinates: coords }
            });
          }
          break;
        }
        case 'SOLID':
        case '3DFACE': {
          const pts = (entity.points || entity.vertices || [entity.p1, entity.p2, entity.p3, entity.p4].filter(Boolean)).map(applyTransform).filter(Boolean);
          if (pts.length >= 3) {
            const coords = pts.map(tp => {
              const [lat, lng] = toLatLng(tp.x, tp.y);
              return [lng, lat];
            });
            coords.push([...coords[0]]);
            features.push({
              type: 'Feature',
              properties: { ...props, isSolid: true },
              geometry: { type: 'Polygon', coordinates: [coords] }
            });
          }
          break;
        }
        case 'POINT': {
          const pos = applyTransform(entity.position || entity.startPoint || { x: 0, y: 0 });
          if (pos) {
            const [lat, lng] = toLatLng(pos.x, pos.y);
            features.push({
              type: 'Feature',
              properties: { ...props },
              geometry: { type: 'Point', coordinates: [lng, lat] }
            });
          }
          break;
        }
        default:
          break;
      }
    });
  };

  processEntities(dxf.entities);

  // 3. Extract Saudi MOT Traffic Signs from annotations
  const detectedMotSigns = [];
  features.forEach(f => {
    if (f.geometry?.type === 'Point' && f.properties?.text) {
      const t = f.properties.text.toUpperCase().trim();
      const layer = (f.properties.layer || '').toUpperCase();
      let motType = null;
      let labelAr = '';

      const isSignLayer = layer === 'SIGN' || layer === 'DETOUR' || layer === 'SAFTY' || layer === 'SAFETY';

      if (t.includes('ROAD WORK END') || t.includes('ROAD WORKS END') || t === 'END' || t.includes('نهاية منطقة العمل')) {
        motType = 'road_work_ends_poster';
        labelAr = 'نهاية منطقة العمل';
      } else if (t.includes('CONCRETE NJB') || (t.includes('CONCRETE') && (t.includes('LIGHTS') || t.includes('3LINE') || t.includes('NJB')))) {
        motType = 'concrete_njb_poster';
        labelAr = 'حاجز خرساني CONCRETE NJB مع إنارة';
      } else if (t.includes('PLASTIC NJB') || (t.includes('PLASTIC') && (t.includes('LIGHTS') || t.includes('3LINE') || t.includes('NJB')))) {
        motType = 'plastic_njb_poster';
        labelAr = 'حاجز بلاستيكي PLASTIC NJB مع إنارة';
      } else if (t.includes('STOP') || t === 'قف') {
        motType = 'stop_sign';
        labelAr = 'لوحة قف (STOP)';
      } else if (t.includes('SLOW') || t.includes('تمهل')) {
        motType = 'slow_sign';
        labelAr = 'لوحة تمهل (SLOW)';
      } else if (t.includes('50') || (isSignLayer && /^50$/.test(t))) {
        motType = 'speed_limit_50';
        labelAr = 'تحديد سرعة ٥٠ + لوحة تحذير';
      } else if (isSignLayer && /^80$/.test(t)) {
        motType = 'speed_limit_80';
        labelAr = 'سرعة ٨٠';
      } else if (isSignLayer && /^60$/.test(t)) {
        motType = 'speed_limit_60';
        labelAr = 'سرعة ٦٠';
      } else if (isSignLayer && /^40$/.test(t)) {
        motType = 'speed_limit_40';
        labelAr = 'سرعة ٤٠';
      } else if (isSignLayer && /^70$/.test(t)) {
        motType = 'speed_limit_70';
        labelAr = 'سرعة ٧٠';
      } else if (t.includes('ARROW') || t.includes('سهم') || (isSignLayer && (t.includes('DETOUR') || t.includes('تحويل')))) {
        motType = 'detour_split_arrow';
        labelAr = 'سهم توجيه التحويلة الإلزامي';
      } else if (t.includes('CHEVRON') || t.includes('HAZARD') || t.includes('عاكس')) {
        motType = 'chevron_hazard';
        labelAr = 'شواخص تحذيرية عاكسة (Chevron)';
      } else if (t.includes('DETOUR AHEAD')) {
        motType = 'detour_ahead';
        labelAr = 'تحويلة أمامك';
      }

      if (motType && f.geometry.coordinates) {
        const [lng, lat] = f.geometry.coordinates;
        const isDup = detectedMotSigns.some(s => Math.hypot(s.lat - lat, s.lng - lng) < 0.0001);
        if (!isDup) {
          detectedMotSigns.push({
            id: `auto_${detectedMotSigns.length + 1}`,
            type: motType,
            lat,
            lng,
            rotation: f.properties.rotationDeg || 0,
            labelAr,
            originalText: f.properties.text
          });
        }
      }
    }
  });

  const [centerLat, centerLng] = toLatLng(geomCenterX, geomCenterY);
  if (onProgress) onProgress(100, 'Done');

  return {
    success: true,
    fileName,
    coordSystem: crs,
    centerLatLng: [centerLat, centerLng],
    totalFeatures: features.length,
    detectedMotSigns,
    geojson: {
      type: 'FeatureCollection',
      features
    }
  };
}
