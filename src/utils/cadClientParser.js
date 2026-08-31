import DxfParser from 'dxf-parser';
import proj4 from 'proj4';
import { detectSaudiCrs, reprojectCadToWgs84 } from './coordinateEngine.js';

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
    .replace(/^[0-9.]+x;/i, '')
    .replace(/\\+p[a-zA-Z0-9,.:= -]+;/gi, ' ')
    .replace(/\\+f[^;]+;/gi, '')
    .replace(/\\+[A-Za-z0-9_#.=-]+;/gi, '')
    .replace(/\\+S[^;]*;/gi, '')
    .replace(/\\+[PpXx]/g, ' ')
    .replace(/\^J/g, ' ')
    .replace(/\^M/g, '')
    .replace(/\\+[a-zA-Z0-9~]/g, '')
    .replace(/\{|\}/g, '')
    .replace(/%%c/gi, '⌀')
    .replace(/%%d/gi, '°')
    .replace(/%%p/gi, '±')
    .replace(/%%u/gi, '')
    .replace(/%%o/gi, '')
    .replace(/%%%/g, '%')
    .replace(/\b(?:p?xqc|p?xql|p?xqr)\b/gi, '')
    .replace(/:\s*\)/g, ')')
    .replace(/:\s*$/, '')
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

  // 1. Calculate Robust Bounding Box with Outlier Rejection & Unit Scale Detection
  const allX = [];
  const allY = [];
  let utmCount = 0;
  let mmUtmCount = 0;

  const collectPt = (p) => {
    if (!p || typeof p.x !== 'number' || typeof p.y !== 'number' || isNaN(p.x) || isNaN(p.y)) return;
    const { x, y } = p;
    allX.push(x);
    allY.push(y);

    if (x >= 100000 && x <= 900000 && y >= 1500000 && y <= 3500000) {
      utmCount++;
    } else if (x >= 100000000 && x <= 900000000 && y >= 1500000000 && y <= 3500000000) {
      mmUtmCount++;
    }
  };

  dxf.entities.forEach(ent => {
    if (ent.vertices) ent.vertices.forEach(collectPt);
    if (ent.startPoint) collectPt(ent.startPoint);
    if (ent.endPoint) collectPt(ent.endPoint);
    if (ent.position) collectPt(ent.position);
    if (ent.center) collectPt(ent.center);
  });

  const isMillimeters = mmUtmCount > utmCount;
  const isGeoreferenced = (utmCount > 0) || (mmUtmCount > 0);

  // Compute median to filter out distant legends / paper space blocks (e.g. at 7,000,000)
  let medianX = 0, medianY = 0;
  if (allX.length > 0) {
    const sortedX = [...allX].sort((a, b) => a - b);
    const sortedY = [...allY].sort((a, b) => a - b);
    medianX = sortedX[Math.floor(sortedX.length / 2)];
    medianY = sortedY[Math.floor(sortedY.length / 2)];
    if (isMillimeters) {
      medianX /= 1000;
      medianY /= 1000;
    }
  }

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const MAX_CLUSTER_RADIUS = 15000; // 15 km cluster filter

  for (let i = 0; i < allX.length; i++) {
    let px = isMillimeters ? allX[i] / 1000 : allX[i];
    let py = isMillimeters ? allY[i] / 1000 : allY[i];
    if (Math.abs(px - medianX) <= MAX_CLUSTER_RADIUS && Math.abs(py - medianY) <= MAX_CLUSTER_RADIUS) {
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }
  }

  // Detect explicit GPS coordinates from drawing texts (e.g. N: 24.507072, E: 39.612235)
  let textDeclaredLat = null;
  let textDeclaredLng = null;
  (dxf.entities || []).forEach(e => {
    if (e.text || e.string) {
      const clean = cleanDxfText(e.text || e.string);
      const latMatch = clean.match(/(?:N|LAT|LATITUDE)[:\s=]+([2-3]\d\.\d+)/i) || clean.match(/([2-3]\d\.\d+)\s*(?:N|LAT)/i);
      const lngMatch = clean.match(/(?:E|LNG|LON|LONGITUDE)[:\s=]+([3-5]\d\.\d+)/i) || clean.match(/([3-5]\d\.\d+)\s*(?:E|LNG|LON)/i);
      if (latMatch) textDeclaredLat = parseFloat(latMatch[1]);
      if (lngMatch) textDeclaredLng = parseFloat(lngMatch[1]);
    }
  });

  const geomCenterX = (minX !== Infinity && maxX !== -Infinity) ? (minX + maxX) / 2 : medianX;
  const geomCenterY = (minY !== Infinity && maxY !== -Infinity) ? (minY + maxY) / 2 : medianY;

  const effectiveAnchorLat = textDeclaredLat || anchorLat;
  const effectiveAnchorLng = textDeclaredLng || anchorLng;

  const anchorCadX = (minX <= 0 && maxX >= 0 && minY <= 0 && maxY >= 0 && Math.hypot(geomCenterX, geomCenterY) < 300) ? 0 : geomCenterX;
  const anchorCadY = (minX <= 0 && maxX >= 0 && minY <= 0 && maxY >= 0 && Math.hypot(geomCenterX, geomCenterY) < 300) ? 0 : geomCenterY;

  const crs = preferredCrs || detectSaudiCrs(effectiveAnchorLng, effectiveAnchorLat, { x: geomCenterX, y: geomCenterY });

  const toLatLng = (rawX, rawY) => {
    let x = isMillimeters ? rawX / 1000 : rawX;
    let y = isMillimeters ? rawY / 1000 : rawY;

    if (isGeoreferenced && x >= 100000 && x <= 900000 && y >= 1500000 && y <= 3500000) {
      const [lng, lat] = reprojectCadToWgs84(x, y, crs);
      return [lat, lng];
    }

    if (isGeoreferenced) {
      // If relative point inside a georeferenced drawing
      const [centerLng, centerLat] = reprojectCadToWgs84(geomCenterX, geomCenterY, crs);
      const cosLat = Math.cos(centerLat * Math.PI / 180);
      const relX = x - geomCenterX;
      const relY = y - geomCenterY;
      return [centerLat + (relY / 110574.61), centerLng + (relX / (111320 * cosLat))];
    }

    // Local metric grid relative to effective anchor
    const cosLat = Math.cos(effectiveAnchorLat * Math.PI / 180);
    const relX = x - anchorCadX;
    const relY = y - anchorCadY;
    const lat = effectiveAnchorLat + (relY / 110574.61);
    const lng = effectiveAnchorLng + (relX / (111320 * cosLat));
    return [lat, lng];
  };

  // 2. Extract Entities & Build GeoJSON Features
  const features = [];
  const layerEntityCount = {};
  const detectedMotSigns = [];

  const processEntities = (entities, transform = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, isBlockChild: false }) => {
    if (!entities || !Array.isArray(entities)) return;

    entities.forEach((entity) => {
      const layer = entity.layer || '0';
      layerEntityCount[layer] = (layerEntityCount[layer] || 0) + 1;

      const hexCol = aciToHex(entity.colorIndex || (dxf.tables?.layer?.layers?.[layer]?.colorIndex) || 256);
      const props = {
        layer,
        color: hexCol,
        colorIndex: entity.colorIndex,
        handle: entity.handle,
        isBlockChild: Boolean(transform.isBlockChild)
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
            properties: { ...props, lengthMeters: Number(len.toFixed(2)), isShortLine: len < 5.0 },
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
              properties: { ...props, lengthMeters: Number(totalLength.toFixed(2)), vertexCount: pts.length, isClosed: true, isShortLine: totalLength < 5.0 },
              geometry: { type: 'Polygon', coordinates: [coords] }
            });
          } else {
            features.push({
              type: 'Feature',
              properties: { ...props, lengthMeters: Number(totalLength.toFixed(2)), vertexCount: pts.length, isClosed: false, isShortLine: totalLength < 5.0 },
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

          const [lat, lng] = toLatLng(worldInsertPos.x, worldInsertPos.y);
          const blockLayer = (entity.layer || '').toUpperCase();
          const bNameUpper = (blockName || '').toUpperCase();

          const blockTexts = (block.entities || [])
            .map(be => cleanDxfText(be.text || be.string || ''))
            .filter(Boolean)
            .join(' ')
            .toUpperCase();

          const hasSignLayer = blockLayer.includes('SIGN') || (block.entities || []).some(be => (be.layer || '').toUpperCase().includes('SIGN'));

          let recognizedSignType = null;
          let signLabelAr = '';

          if (blockTexts.includes('ROAD WORK END') || blockTexts.includes('نهاية') || bNameUpper === 'II') {
            recognizedSignType = 'road_work_ends_poster';
            signLabelAr = 'نهاية منطقة العمل';
          } else if (blockTexts.includes('CONCRETE NJB') || bNameUpper === 'W') {
            recognizedSignType = 'concrete_njb_poster';
            signLabelAr = 'حاجز خرساني CONCRETE NJB مع إنارة';
          } else if (blockTexts.includes('PLASTIC NJB') || bNameUpper === 'ER') {
            recognizedSignType = 'plastic_njb_poster';
            signLabelAr = 'حاجز بلاستيكي PLASTIC NJB مع إنارة';
          } else if (blockTexts.includes('SLOW') || blockTexts.includes('تمهل') || bNameUpper.includes('A$CE8A39C43')) {
            recognizedSignType = 'slow_sign';
            signLabelAr = 'لوحة تمهل (SLOW)';
          } else if (blockTexts.includes('50') || bNameUpper.includes('A$C217D7EA6')) {
            recognizedSignType = 'speed_limit_50';
            signLabelAr = 'تحديد سرعة ٥٠';
          } else if (blockTexts.includes('STOP') || blockTexts.includes('قف') || bNameUpper.includes('A$C13EFC72C') || (hasSignLayer && bNameUpper.startsWith('A$C'))) {
            recognizedSignType = 'stop_sign';
            signLabelAr = 'لوحة قف (STOP)';
          } else if (bNameUpper.includes('CHEVRON') || bNameUpper.includes('HAZARD')) {
            recognizedSignType = 'chevron_hazard';
            signLabelAr = 'شواخص تحذيرية عاكسة (Chevron)';
          } else if (bNameUpper.includes('SUN FLOWER') || bNameUpper.includes('FLASH LIGHT')) {
            recognizedSignType = 'flash_light';
            signLabelAr = 'إنارة تحذيرية';
          } else if (bNameUpper === 'JJ' || blockTexts.includes('ARROW')) {
            recognizedSignType = 'detour_split_arrow';
            signLabelAr = 'سهم توجيه التحويلة';
          }

          if (recognizedSignType) {
            const isDup = detectedMotSigns.some(s => Math.hypot(s.lat - lat, s.lng - lng) < 0.00008);
            if (!isDup) {
              detectedMotSigns.push({
                id: `auto_sign_${detectedMotSigns.length + 1}`,
                type: recognizedSignType,
                lat,
                lng,
                rotation: entity.rotation || 0,
                labelAr: signLabelAr,
                originalText: blockTexts || blockName
              });
            }
            // DO NOT explode sign block into raw lines
            break;
          }

          const scaleX = entity.scale ? entity.scale.x : (entity.xScale || 1);
          const scaleY = entity.scale ? entity.scale.y : (entity.yScale || 1);
          const rotRad = entity.rotation ? (entity.rotation * Math.PI / 180) : 0;

          processEntities(block.entities, {
            x: worldInsertPos.x,
            y: worldInsertPos.y,
            scaleX: transform.scaleX * scaleX,
            scaleY: transform.scaleY * scaleY,
            rotation: transform.rotation + rotRad,
            isBlockChild: true
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

  // 3. Extract Saudi MOT Traffic Signs from standalone text annotations & geometric signs
  features.forEach(f => {
    let motType = null;
    let labelAr = '';
    let lat = null;
    let lng = null;

    if (f.geometry?.type === 'Point' && f.properties?.text) {
      const t = f.properties.text.toUpperCase().trim();
      const layer = (f.properties.layer || '').toUpperCase();
      const isSignLayer = layer.includes('SIGN') || layer.includes('DETOUR') || layer.includes('SAFTY') || layer.includes('SAFETY');

      if (t.includes('ROAD WORK END') || t.includes('ROAD WORKS END') || t === 'END' || t.includes('نهاية منطقة العمل') || (isSignLayer && (t === 'I' || t === 'INFO'))) {
        motType = 'road_work_ends_poster';
        labelAr = 'نهاية منطقة العمل';
      } else if (t.includes('CONCRETE NJB') || (t.includes('CONCRETE') && (t.includes('LIGHTS') || t.includes('3LINE') || t.includes('NJB') || t.includes('BARRIER')))) {
        motType = 'concrete_njb_poster';
        labelAr = 'حاجز خرساني CONCRETE NJB مع إنارة';
      } else if (t.includes('PLASTIC NJB') || (t.includes('PLASTIC') && (t.includes('LIGHTS') || t.includes('3LINE') || t.includes('NJB') || t.includes('BARRIER')))) {
        motType = 'plastic_njb_poster';
        labelAr = 'حاجز بلاستيكي PLASTIC NJB مع إنارة';
      } else if (t === 'STOP' || t === 'قف' || (isSignLayer && t.includes('STOP'))) {
        motType = 'stop_sign';
        labelAr = 'لوحة قف (STOP)';
      } else if (t === 'SLOW' || t === 'تمهل' || (isSignLayer && t.includes('SLOW'))) {
        motType = 'slow_sign';
        labelAr = 'لوحة تمهل (SLOW)';
      } else if (isSignLayer && (t === '!' || t === '⚠️' || t.includes('HAZARD') || t.includes('CHEVRON') || t.includes('عاكس'))) {
        motType = 'chevron_hazard';
        labelAr = 'شاخصة تحذيرية عاكسة';
      } else if (!t.includes('M') && !t.includes('متر') && !t.includes('N:') && !t.includes('E:') && ((isSignLayer && /^50(\s*KM)?$/i.test(t)) || t.includes('SPEED 50') || t.includes('سرعة 50') || t.includes('سرعة ٥٠'))) {
        motType = 'speed_limit_50';
        labelAr = 'تحديد سرعة ٥٠';
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
      } else if (t.includes('DETOUR AHEAD')) {
        motType = 'detour_ahead';
        labelAr = 'تحويلة أمامك';
      }

      if (f.geometry.coordinates) {
        lng = f.geometry.coordinates[0];
        lat = f.geometry.coordinates[1];
      }
    } else if (f.geometry?.type === 'Polygon' || f.geometry?.type === 'LineString') {
      const coords = f.geometry.type === 'Polygon' ? f.geometry.coordinates?.[0] : f.geometry.coordinates;
      const layer = (f.properties?.layer || '').toUpperCase();

      // Check if it's an octagon or small sign geometry (< 3.5m across)
      if (coords && coords.length >= 8 && coords.length <= 12) {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        coords.forEach(c => {
          if (c[0] < minX) minX = c[0];
          if (c[0] > maxX) maxX = c[0];
          if (c[1] < minY) minY = c[1];
          if (c[1] > maxY) maxY = c[1];
        });
        const spanMeters = Math.max((maxX - minX) * 111320, (maxY - minY) * 110574);
        if (spanMeters >= 0.3 && spanMeters <= 3.5) {
          f.properties.isTrafficSign = true;
          f.properties.motType = 'stop_sign';
          motType = 'stop_sign';
          labelAr = 'لوحة قف (STOP)';
          lng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
          lat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
        }
      }
    }

    if (motType && lat !== null && lng !== null) {
      const isDup = detectedMotSigns.some(s => Math.hypot(s.lat - lat, s.lng - lng) < 0.00008);
      if (!isDup) {
        detectedMotSigns.push({
          id: `auto_${detectedMotSigns.length + 1}`,
          type: motType,
          lat,
          lng,
          rotation: f.properties?.rotationDeg || 0,
          labelAr,
          originalText: f.properties?.text
        });
      }
    }
  });

  const [centerLat, centerLng] = textDeclaredLat && textDeclaredLng
    ? [textDeclaredLat, textDeclaredLng]
    : toLatLng(geomCenterX, geomCenterY);
  if (onProgress) onProgress(100, 'Done');

  // Build Layer & Keymap metadata for the client parser
  const layers = Object.keys(layerEntityCount).map(name => ({
    name,
    color: dxf.tables?.layer?.layers?.[name]?.colorIndex || 7,
    entityCount: layerEntityCount[name] || 0,
    displayNameAr: name === '0' ? 'التحويلة الرئيسية' : name,
    displayNameEn: name,
    category: name.includes('WORK') ? 'work_zone' : (name.includes('TRANSITION') || name.includes('DETOUR') ? 'traffic_detour' : 'general'),
    colorHex: aciToHex(dxf.tables?.layer?.layers?.[name]?.colorIndex || 7),
    icon: name.includes('WORK') ? '🚧' : (name.includes('SIGN') ? '🛑' : '🛣️')
  }));

  const keymap = layers.map(l => ({
    layerName: l.name,
    titleAr: l.displayNameAr,
    titleEn: l.displayNameEn,
    category: l.category,
    icon: l.icon,
    colorHex: l.colorHex,
    descriptionAr: `عناصر طبقة ${l.name}`
  }));

  return {
    success: true,
    fileName,
    coordSystem: crs,
    centerLatLng: [centerLat, centerLng],
    totalFeatures: features.length,
    layers,
    keymap,
    detectedMotSigns,
    extractedInfo: {
      clientNameAr: '',
      clientNameEn: '',
      projectNameAr: '',
      projectNameEn: '',
      coordinates: `${centerLat.toFixed(6)}, ${centerLng.toFixed(6)}`,
      latitude: Number(centerLat.toFixed(6)),
      longitude: Number(centerLng.toFixed(6)),
      speedLimit: '',
      dimensions: {
        trenchLengthM: '',
        trenchWidthM: '',
        totalDetourLengthM: ''
      }
    },
    geojson: {
      type: 'FeatureCollection',
      features
    }
  };
}
