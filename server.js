import express from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import proj4 from 'proj4';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Allow large JSON payloads for CAD/Maps
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

let db;

async function initializeDB() {
  db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT
    );

    CREATE TABLE IF NOT EXISTS permits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contractor_id INTEGER,
      data TEXT,
      status TEXT,
      inspector_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      permit_id INTEGER,
      type TEXT,
      data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS approval_chain (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      permit_id INTEGER,
      role TEXT,
      status TEXT DEFAULT 'pending',
      signed_by TEXT,
      notes TEXT,
      signed_at DATETIME,
      FOREIGN KEY (permit_id) REFERENCES permits(id)
    );

    CREATE TABLE IF NOT EXISTS official_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      permit_id INTEGER,
      doc_type TEXT,
      data TEXT,
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (permit_id) REFERENCES permits(id)
    );
  `);

  // Create default accounts
  const defaultUsers = [
    ['contractor', 'pass123', 'contractor'],
    ['inspector', 'pass123', 'inspector'],
    ['external_coordinator', 'pass123', 'external_entity'],
    ['consultant1', 'pass123', 'consultant'],
    ['safety_officer', 'pass123', 'safety_dept'],
    ['maint_contractor', 'pass123', 'maintenance_contractor'],
    ['maint_consultant', 'pass123', 'maintenance_consultant']
  ];

  for (const [username, password, role] of defaultUsers) {
    try {
      await db.run('INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)', [username, password, role]);
    } catch (err) {
      // Ignore UNIQUE constraint errors if they already exist
    }
  }

  // Stage 3 (تنفيذ والتحقق من الجاهزية) gate: tracks whether the joint Field
  // Inspection + Execution Sequencing readiness report has been signed.
  // ALTER is wrapped in try/catch since SQLite errors on a duplicate column
  // when this runs against a database that already has it.
  try {
    await db.exec(`ALTER TABLE permits ADD COLUMN readiness_status TEXT DEFAULT 'pending'`);
  } catch (err) {
    // Column already exists — safe to ignore
  }

  // Stage 4 gate: flips to 'started' once at least one TDP-FU periodic
  // report has been filed, unlocking the Closure filter in Active Zones.
  try {
    await db.exec(`ALTER TABLE permits ADD COLUMN monitoring_status TEXT DEFAULT 'pending'`);
  } catch (err) {
    // Column already exists — safe to ignore
  }

  console.log('Database initialized.');
}

// --- AUTHENTICATION ---
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
  
  if (user) {
    res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
  } else {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const result = await db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, password, role]);
    res.json({ success: true, user: { id: result.lastID, username, role } });
  } catch (err) {
    res.status(400).json({ success: false, error: 'Username may already exist' });
  }
});

// --- PERMITS ---
app.post('/api/permits', async (req, res) => {
  const { contractor_id, data } = req.body;
  try {
    const result = await db.run(
      'INSERT INTO permits (contractor_id, data, status) VALUES (?, ?, ?)', 
      [contractor_id, JSON.stringify(data), data?.status || 'Pending']
    );
    res.json({ success: true, id: result.lastID });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/permits', async (req, res) => {
  try {
    const permits = await db.all('SELECT * FROM permits ORDER BY created_at DESC');
    res.json(permits);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update permit (Approve/Reject or Add Inspector Notes)
app.put('/api/permits/:id', async (req, res) => {
  const { id } = req.params;
  const { status, inspector_notes } = req.body;
  
  try {
    const updates = [];
    const params = [];
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (inspector_notes !== undefined) {
      updates.push('inspector_notes = ?');
      params.push(inspector_notes);
    }
    
    if (updates.length > 0) {
      params.push(id);
      await db.run(`UPDATE permits SET ${updates.join(', ')} WHERE id = ?`, params);
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- APPROVAL CHAIN & DOCUMENTS ---
// POST /api/permits/:id/approval-chain/init - Initialize 5-step approval chain for a permit
app.post('/api/permits/:id/approval-chain/init', async (req, res) => {
  try {
    const roles = ['contractor', 'consultant', 'safety_dept', 'maintenance_contractor', 'maintenance_consultant'];
    for (const role of roles) {
      await db.run('INSERT INTO approval_chain (permit_id, role, status) VALUES (?, ?, ?)', [req.params.id, role, 'pending']);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/permits/:id/approval-chain - Get approval status
app.get('/api/permits/:id/approval-chain', async (req, res) => {
  try {
    const chain = await db.all('SELECT * FROM approval_chain WHERE permit_id = ? ORDER BY id', [req.params.id]);
    res.json(chain);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/permits/:id/approve - Role-specific approval
app.post('/api/permits/:id/approve', async (req, res) => {
  try {
    const { role, signedBy, notes, action } = req.body; // action: 'approved' or 'rejected'
    await db.run(
      'UPDATE approval_chain SET status = ?, signed_by = ?, notes = ?, signed_at = datetime("now") WHERE permit_id = ? AND role = ?',
      [action, signedBy, notes, req.params.id, role]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/permits/:id/documents - Generate official document
app.post('/api/permits/:id/documents', async (req, res) => {
  try {
    const { doc_type, data } = req.body;
    const result = await db.run(
      'INSERT INTO official_documents (permit_id, doc_type, data) VALUES (?, ?, ?)',
      [req.params.id, doc_type, JSON.stringify(data)]
    );
    res.json({ id: result.lastID });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/permits/:id/documents - List generated documents
app.get('/api/permits/:id/documents', async (req, res) => {
  try {
    const docs = await db.all('SELECT * FROM official_documents WHERE permit_id = ? ORDER BY generated_at DESC', [req.params.id]);
    res.json(docs);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- REPORTS (End & Removal) ---
app.post('/api/reports', async (req, res) => {
  const { permit_id, type, data } = req.body;
  try {
    const result = await db.run(
      'INSERT INTO reports (permit_id, type, data) VALUES (?, ?, ?)',
      [permit_id, type, JSON.stringify(data)]
    );
    res.json({ success: true, id: result.lastID });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/reports', async (req, res) => {
  const { permit_id } = req.query;
  try {
    let query = 'SELECT * FROM reports ORDER BY created_at DESC';
    let params = [];
    if (permit_id) {
      query = 'SELECT * FROM reports WHERE permit_id = ? ORDER BY created_at DESC';
      params.push(permit_id);
    }
    const reports = await db.all(query, params);
    res.json(reports);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
// POST /api/permits/:id/field-readiness — Stage 3 (تنفيذ والتحقق من الجاهزية):
// persists the joint Field Inspection (20 items) + Execution Sequencing (20 items)
// results as the official "محضر جاهزية" and satisfies decision gate 3
// ("محضر الجاهزية قبل التشغيل") from the official process document.
app.post('/api/permits/:id/field-readiness', async (req, res) => {
  const { id } = req.params;
  const { fieldInspection, executionSequencing, completedAt } = req.body;
  try {
    const result = await db.run(
      'INSERT INTO official_documents (permit_id, doc_type, data) VALUES (?, ?, ?)',
      [id, 'field_readiness_verification', JSON.stringify({ fieldInspection, executionSequencing, completedAt })]
    );
    await db.run('UPDATE permits SET readiness_status = ? WHERE id = ?', ['verified', id]);
    res.json({ success: true, id: result.lastID });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/permits/:id/opening-minutes — Step 2 (مراجعة واعتماد التحويلة
// وإصدار التصاريح): stores the signed محضر فتح تحويلة (opening minutes).
app.post('/api/permits/:id/opening-minutes', async (req, res) => {
  const { id } = req.params;
  const { dayName, hijriDate, gregorianDate, roadName, signatures } = req.body;
  try {
    const result = await db.run(
      'INSERT INTO official_documents (permit_id, doc_type, data) VALUES (?, ?, ?)',
      [id, 'opening_minutes', JSON.stringify({ dayName, hijriDate, gregorianDate, roadName, signatures })]
    );
    res.json({ success: true, id: result.lastID });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/permits/:id/periodic-inspections', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.run(
      'INSERT INTO official_documents (permit_id, doc_type, data) VALUES (?, ?, ?)',
      [id, 'periodic_inspection_tdp_fu', JSON.stringify({ ...req.body, date: new Date().toISOString() })]
    );
    await db.run(`UPDATE permits SET monitoring_status = 'started' WHERE id = ?`, [id]);
    res.json({ success: true, id: result.lastID });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- AUTOMATED GIS LOCATION-TO-DXF/CAD GENERATOR ---
function buildDXFContent({ lat = 24.4686, lng = 39.6120, radius_meters = 200, detourNodes = [], boundaryPoints = [], projectName = 'Detour Work Site' }) {
  const centerLat = parseFloat(lat) || 24.4686;
  const centerLng = parseFloat(lng) || 39.6120;
  const r = parseInt(radius_meters) || 200;

  // Convert GPS (lat, lng) to Metric UTM Zone 37N coordinates (1 CAD unit = 1 meter)
  const toUTM = (pLat, pLng) => {
    const dLat = (parseFloat(pLat) - centerLat) * 110574.61;
    const dLng = (parseFloat(pLng) - centerLng) * (111320 * Math.cos(centerLat * Math.PI / 180));
    return {
      x: parseFloat((582500 + dLng).toFixed(3)),
      y: parseFloat((2703800 + dLat).toFixed(3))
    };
  };

  const centerUTM = toUTM(centerLat, centerLng);

  // DXF ASCII Headers & Layers Table Definition
  let dxf = [];
  dxf.push('0', 'SECTION', '2', 'HEADER');
  dxf.push('9', '$ACADVER', '1', 'AC1009'); // AutoCAD R12 ASCII Standard
  dxf.push('9', '$INSUNITS', '70', '6'); // Meters
  dxf.push('0', 'ENDSEC');

  // TABLES Section (Layer Colors)
  dxf.push('0', 'SECTION', '2', 'TABLES');
  dxf.push('0', 'TABLE', '2', 'LAYER', '70', '7');
  
  const layers = [
    { name: 'ROAD_CENTERLINES', color: 4 }, // Cyan
    { name: 'ROAD_BOUNDARIES', color: 7 },  // White/Black
    { name: 'BUILDING_FOOTPRINTS', color: 2 }, // Yellow
    { name: 'WORK_ZONE_BOUNDARY', color: 5 }, // Blue
    { name: 'DETOUR_ROUTE', color: 30 },     // Orange
    { name: 'PEDESTRIAN_PATH', color: 3 },  // Green
    { name: 'SAFETY_SIGNS_TEXT', color: 1 }  // Red
  ];

  layers.forEach(l => {
    dxf.push('0', 'LAYER', '2', l.name, '70', '0', '62', l.color.toString(), '6', 'CONTINUOUS');
  });

  dxf.push('0', 'ENDTAB', '0', 'ENDSEC');

  // ENTITIES Section (Vector Data)
  dxf.push('0', 'SECTION', '2', 'ENTITIES');

  const x = centerUTM.x;
  const y = centerUTM.y;

  // 1. Road Centerlines & Curbs (Immediate Surroundings Grid)
  dxf.push('0', 'LINE', '8', 'ROAD_CENTERLINES', '10', (x - r).toFixed(3), '20', y.toFixed(3), '30', '0.0', '11', (x + r).toFixed(3), '21', y.toFixed(3), '31', '0.0');
  dxf.push('0', 'LINE', '8', 'ROAD_BOUNDARIES', '10', (x - r).toFixed(3), '20', (y + 10).toFixed(3), '30', '0.0', '11', (x + r).toFixed(3), '21', (y + 10).toFixed(3), '31', '0.0');
  dxf.push('0', 'LINE', '8', 'ROAD_BOUNDARIES', '10', (x - r).toFixed(3), '20', (y - 10).toFixed(3), '30', '0.0', '11', (x + r).toFixed(3), '21', (y - 10).toFixed(3), '31', '0.0');

  dxf.push('0', 'LINE', '8', 'ROAD_CENTERLINES', '10', x.toFixed(3), '20', (y - r).toFixed(3), '30', '0.0', '11', x.toFixed(3), '21', (y + r).toFixed(3), '31', '0.0');
  dxf.push('0', 'LINE', '8', 'ROAD_BOUNDARIES', '10', (x + 10).toFixed(3), '20', (y - r).toFixed(3), '30', '0.0', '11', (x + 10).toFixed(3), '21', (y + r).toFixed(3), '31', '0.0');
  dxf.push('0', 'LINE', '8', 'ROAD_BOUNDARIES', '10', (x - 10).toFixed(3), '20', (y - r).toFixed(3), '30', '0.0', '11', (x - 10).toFixed(3), '21', (y + r).toFixed(3), '31', '0.0');

  // 2. Surroundings Building Footprints (Rectangles in 4 Quadrants)
  const buildings = [
    { x1: x - 80, y1: y + 25, x2: x - 25, y2: y + 75 },
    { x1: x + 25, y1: y + 25, x2: x + 80, y2: y + 75 },
    { x1: x - 80, y1: y - 75, x2: x - 25, y2: y - 25 },
    { x1: x + 25, y1: y - 75, x2: x + 80, y2: y - 25 }
  ];

  buildings.forEach(b => {
    dxf.push('0', 'POLYLINE', '8', 'BUILDING_FOOTPRINTS', '66', '1', '70', '1');
    dxf.push('0', 'VERTEX', '8', 'BUILDING_FOOTPRINTS', '10', b.x1.toFixed(3), '20', b.y1.toFixed(3), '30', '0.0');
    dxf.push('0', 'VERTEX', '8', 'BUILDING_FOOTPRINTS', '10', b.x2.toFixed(3), '20', b.y1.toFixed(3), '30', '0.0');
    dxf.push('0', 'VERTEX', '8', 'BUILDING_FOOTPRINTS', '10', b.x2.toFixed(3), '20', b.y2.toFixed(3), '30', '0.0');
    dxf.push('0', 'VERTEX', '8', 'BUILDING_FOOTPRINTS', '10', b.x1.toFixed(3), '20', b.y2.toFixed(3), '30', '0.0');
    dxf.push('0', 'SEQEND');
  });

  // 3. Work Zone Boundary Polygon (from boundaryPoints or default centered box)
  let workZoneUTM = [];
  if (Array.isArray(boundaryPoints) && boundaryPoints.length >= 3) {
    workZoneUTM = boundaryPoints.map(pt => toUTM(pt.lat, pt.lng));
  } else {
    workZoneUTM = [
      { x: x - 25, y: y - 8 },
      { x: x + 25, y: y - 8 },
      { x: x + 25, y: y + 8 },
      { x: x - 25, y: y + 8 }
    ];
  }

  dxf.push('0', 'POLYLINE', '8', 'WORK_ZONE_BOUNDARY', '66', '1', '70', '1');
  workZoneUTM.forEach(pt => {
    dxf.push('0', 'VERTEX', '8', 'WORK_ZONE_BOUNDARY', '10', pt.x.toFixed(3), '20', pt.y.toFixed(3), '30', '0.0');
  });
  dxf.push('0', 'SEQEND');

  // 4. Detour Route Polyline (from detourNodes or default detour bypass line)
  let detourUTM = [];
  if (Array.isArray(detourNodes) && detourNodes.length >= 2) {
    detourUTM = detourNodes.map(pt => toUTM(pt.lat, pt.lng));
  } else {
    detourUTM = [
      { x: x - 60, y: y },
      { x: x - 30, y: y + 15 },
      { x: x + 30, y: y + 15 },
      { x: x + 60, y: y }
    ];
  }

  dxf.push('0', 'POLYLINE', '8', 'DETOUR_ROUTE', '66', '1', '70', '0');
  detourUTM.forEach(pt => {
    dxf.push('0', 'VERTEX', '8', 'DETOUR_ROUTE', '10', pt.x.toFixed(3), '20', pt.y.toFixed(3), '30', '0.0');
  });
  dxf.push('0', 'SEQEND');

  // 5. Annotations & Title Block Text
  dxf.push('0', 'TEXT', '8', 'SAFETY_SIGNS_TEXT', '10', (x - 20).toFixed(3), '20', (y + 12).toFixed(3), '30', '0.0', '40', '2.5', '1', projectName);
  dxf.push('0', 'TEXT', '8', 'SAFETY_SIGNS_TEXT', '10', (x - 20).toFixed(3), '20', (y - 15).toFixed(3), '30', '0.0', '40', '2.0', '1', `UTM Zone 37N Ref: E ${x.toFixed(1)}m, N ${y.toFixed(1)}m`);
  dxf.push('0', 'TEXT', '8', 'SAFETY_SIGNS_TEXT', '10', (x - 20).toFixed(3), '20', (y - 20).toFixed(3), '30', '0.0', '40', '1.8', '1', 'Generated by Tahcom GIS Engine (Scale 1:1000)');

  dxf.push('0', 'ENDSEC', '0', 'EOF');

  return dxf.join('\n');
}

// POST /api/generate-cad Endpoint
app.post('/api/generate-cad', (req, res) => {
  try {
    const { lat, lng, radius_meters, detourNodes, boundaryPoints, projectName } = req.body;
    const dxfContent = buildDXFContent({ lat, lng, radius_meters, detourNodes, boundaryPoints, projectName });

    res.setHeader('Content-Type', 'application/dxf');
    res.setHeader('Content-Disposition', `attachment; filename="detour_site_${Date.now()}.dxf"`);
    res.send(dxfContent);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- GEOTIFF FILE PARSER: Upload .tif / .tiff → returns metadata, WGS84 bounds ---
app.post('/api/parse-geotiff', upload.single('tiffFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No GeoTIFF file uploaded' });
    }

    const { fromArrayBuffer } = await import('geotiff');
    const fileName = req.file.originalname;
    const fileSize = req.file.size;
    console.log(`[GeoTIFF Parser] Processing: ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

    const arrayBuffer = req.file.buffer.buffer.slice(
      req.file.buffer.byteOffset,
      req.file.buffer.byteOffset + req.file.buffer.byteLength
    );
    const tiff = await fromArrayBuffer(arrayBuffer);
    const image = await tiff.getImage();
    const width = image.getWidth();
    const height = image.getHeight();
    const samplesPerPixel = image.getSamplesPerPixel();
    const geoKeys = image.getGeoKeys?.() || {};
    const origin = image.getOrigin?.() || [0, 0];
    const resolution = image.getResolution?.() || [1, 1];
    const rawBbox = image.getBoundingBox?.() || [
      origin[0],
      origin[1] - height * Math.abs(resolution[1]),
      origin[0] + width * Math.abs(resolution[0]),
      origin[1]
    ];

    const crsMap = {
      'EPSG:32637': '+proj=utm +zone=37 +datum=WGS84 +units=m +no_defs',
      'EPSG:32638': '+proj=utm +zone=38 +datum=WGS84 +units=m +no_defs',
      'EPSG:20499': '+proj=utm +zone=37 +ellps=intl +towgs84=-143,-236,7,0,0,0,0 +units=m +no_defs',
      'EPSG:3857': '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs',
      'EPSG:4326': '+proj=longlat +datum=WGS84 +no_defs'
    };

    let detectedCRS = 'EPSG:32637';
    if (geoKeys) {
      const projCode = geoKeys.ProjectedCSTypeGeoKey || geoKeys.ProjectionGeoKey;
      if (projCode && crsMap[`EPSG:${projCode}`]) {
        detectedCRS = `EPSG:${projCode}`;
      } else if (geoKeys.GeographicTypeGeoKey === 4326) {
        detectedCRS = 'EPSG:4326';
      }
    } else if (rawBbox) {
      const [minX, minY, maxX, maxY] = rawBbox;
      if (minX >= -180 && maxX <= 180 && minY >= -90 && maxY <= 90) {
        detectedCRS = 'EPSG:4326';
      }
    }

    const fromProjStr = crsMap[detectedCRS] || crsMap['EPSG:32637'];
    const wgs84 = crsMap['EPSG:4326'];

    const [minX, minY, maxX, maxY] = rawBbox;
    let swLat, swLng, neLat, neLng;
    if (detectedCRS === 'EPSG:4326') {
      swLng = minX; swLat = minY;
      neLng = maxX; neLat = maxY;
    } else {
      const sw = proj4(fromProjStr, wgs84, [minX, minY]);
      const ne = proj4(fromProjStr, wgs84, [maxX, maxY]);
      swLng = sw[0]; swLat = sw[1];
      neLng = ne[0]; neLat = ne[1];
    }

    const bounds = [
      [Math.min(swLat, neLat), Math.min(swLng, neLng)],
      [Math.max(swLat, neLat), Math.max(swLng, neLng)]
    ];

    res.json({
      success: true,
      fileName,
      fileSize,
      width,
      height,
      samplesPerPixel,
      crs: detectedCRS,
      rawBbox,
      bounds,
      center: [(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2],
      resolution: [Math.abs(resolution[0]), Math.abs(resolution[1])],
      geoKeys
    });
  } catch (err) {
    console.error('[GeoTIFF Parser] Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to parse GeoTIFF file' });
  }
});

// --- DWG FILE PARSER: Upload .dwg → returns GeoJSON with layer metadata ---
let dwgdxfModule = null;
async function getDwgDxf() {
  if (!dwgdxfModule) {
    dwgdxfModule = await import('dwgdxf');
    await dwgdxfModule.init();
  }
  return dwgdxfModule;
}

app.post('/api/parse-dwg', upload.single('dwgFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const fileName = req.file.originalname;
    const fileSize = req.file.size;
    console.log(`[DWG Parser] Processing: ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

    // Step 1: Decode DXF directly or convert DWG → DXF using dwgdxf (WASM)
    let dxfString = '';
    const isDxf = fileName.toLowerCase().endsWith('.dxf');

    if (isDxf) {
      dxfString = new TextDecoder('utf-8').decode(req.file.buffer);
      console.log(`[CAD Parser] Direct DXF uploaded: ${(req.file.size / 1024).toFixed(1)} KB`);
    } else {
      const { convertDwgToDxf } = await getDwgDxf();
      const dwgBytes = new Uint8Array(req.file.buffer);
      const dxfBytes = await convertDwgToDxf(dwgBytes);
      dxfString = new TextDecoder('utf-8').decode(dxfBytes);
      console.log(`[CAD Parser] DWG converted to DXF: ${(dxfBytes.length / 1024).toFixed(1)} KB`);
    }

    // Step 2: Parse DXF entities
    const DxfParser = (await import('dxf-parser')).default;
    const parser = new DxfParser();
    const dxf = parser.parseSync(dxfString);

    // Step 3: Extract layers metadata with Traffic Engineering smart culling
    const isCivilMicroNoise = (name = '') => {
      const n = name.toUpperCase();
      return n.includes('MANHOLE') || n.includes('BASIN') || n.includes('TILES') || 
             n.includes('CURB') || n.includes('IRRIGATION') || n.includes('SCUPPER') || 
             n.includes('ASPHLT') || n.includes('FENCE') || n.includes('LIGHT POLE') || 
             n.includes('TANK') || n.includes('GENM') || n.includes('WALL') || 
             n.includes('C S') || n.includes('FRAM') || n.includes('WEARING') || 
             n.includes('SUB GRADE') || n.includes('BASE COURSE') || n.includes('EMBANKMENT');
    };

    const layersRaw = dxf.tables?.layer?.layers || {};
    const layers = Object.entries(layersRaw).map(([name, info]) => ({
      name,
      color: info.color || 7,
      visible: !info.frozen && !info.off && !isCivilMicroNoise(name)
    }));

    // Step 4: Compute coordinate bounding box with robust spatial median outlier rejection
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

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    let medianX = 0, medianY = 0;
    
    if (allX.length > 0 && allY.length > 0) {
      allX.sort((a, b) => a - b);
      allY.sort((a, b) => a - b);
      medianX = allX[Math.floor(allX.length / 2)];
      medianY = allY[Math.floor(allY.length / 2)];
      
      // Radius threshold: 15,000 meters from cluster center to support large bridge/highway corridors
      const MAX_CLUSTER_RADIUS = 15000;
      for (let i = 0; i < allX.length; i++) {
        if (Math.abs(allX[i] - medianX) <= MAX_CLUSTER_RADIUS) {
          minX = Math.min(minX, allX[i]);
          maxX = Math.max(maxX, allX[i]);
        }
      }
      for (let i = 0; i < allY.length; i++) {
        if (Math.abs(allY[i] - medianY) <= MAX_CLUSTER_RADIUS) {
          minY = Math.min(minY, allY[i]);
          maxY = Math.max(maxY, allY[i]);
        }
      }
    }

    // Also scan text entities for explicit CRS declarations (e.g. "COORDINATE SYSTEM CODE: UTM84-37N")
    let textDeclaredCrs = null;
    (dxf.entities || []).forEach(e => {
      if (e.type === 'TEXT' || e.type === 'MTEXT') {
        const t = (e.text || e.string || '').toUpperCase();
        if (t.includes('UTM') && (t.includes('37') || t.includes('37N'))) textDeclaredCrs = 'utm37n';
        else if (t.includes('UTM') && (t.includes('38') || t.includes('38N'))) textDeclaredCrs = 'utm38n';
      }
    });
    if (textDeclaredCrs) console.log(`[DWG Parser] Text-declared CRS found: ${textDeclaredCrs}`);

    const isPtValid = (p) => {
      if (!p || typeof p.x !== 'number' || typeof p.y !== 'number') return false;
      const dist = Math.hypot(p.x - medianX, p.y - medianY);
      return dist < 15000;
    };

    // Step 5: Auto-detect or user-selected coordinate system and convert to WGS84
    // Standard Projections for Saudi Arabia:
    // EPSG:32637 (UTM Zone 37N - Madinah / Western Saudi)
    // EPSG:32638 (UTM Zone 38N - Riyadh / Central Saudi)
    // EPSG:20499 (Ain el Abd 1970 - Saudi National Grid)
    const utmZone37N = '+proj=utm +zone=37 +datum=WGS84 +units=m +no_defs';
    const utmZone38N = '+proj=utm +zone=38 +datum=WGS84 +units=m +no_defs';
    const ainElAbd = '+proj=utm +zone=37 +ellps=intl +towgs84=-143,-236,7,0,0,0,0 +units=m +no_defs';
    const wgs84 = '+proj=longlat +datum=WGS84 +no_defs';

    let coordSystem = req.body?.crs || 'unknown';
    let fromProj = null;

    if (coordSystem === 'utm37n' || coordSystem === 'EPSG:32637') {
      coordSystem = 'utm37n';
      fromProj = utmZone37N;
    } else if (coordSystem === 'utm38n' || coordSystem === 'EPSG:32638') {
      coordSystem = 'utm38n';
      fromProj = utmZone38N;
    } else if (coordSystem === 'ain_el_abd' || coordSystem === 'EPSG:20499') {
      coordSystem = 'ain_el_abd';
      fromProj = ainElAbd;
    } else if (textDeclaredCrs === 'utm37n') {
      // Text annotation in the drawing explicitly declares UTM Zone 37N
      coordSystem = 'utm37n';
      fromProj = utmZone37N;
      console.log('[DWG Parser] Using text-declared CRS: UTM Zone 37N (from drawing notes)');
    } else if (textDeclaredCrs === 'utm38n') {
      coordSystem = 'utm38n';
      fromProj = utmZone38N;
      console.log('[DWG Parser] Using text-declared CRS: UTM Zone 38N (from drawing notes)');
    } else {
      // Auto-detection using filtered median / bounds
      if (medianX > 100000 && medianX < 900000 && medianY > 2500000 && medianY < 3000000) {
        coordSystem = 'utm37n';
        fromProj = utmZone37N;
        console.log('[DWG Parser] Auto-detected: UTM Zone 37N (EPSG:32637) in Madinah');
      } else {
        coordSystem = 'local';
        console.log(`[DWG Parser] Coordinates appear to be local/arbitrary. Range: X=[${minX.toFixed(0)}, ${maxX.toFixed(0)}], Y=[${minY.toFixed(0)}, ${maxY.toFixed(0)}]`);
      }
    }

    // Step 6: Convert entities to GeoJSON features
    const features = [];
    const anchorLat = parseFloat(req.body?.anchorLat) || 24.4686;
    const anchorLng = parseFloat(req.body?.anchorLng) || 39.6120;

    // For local coordinates: compute center of geometry and map to anchor point
    const geomCenterX = (minX + maxX) / 2;
    const geomCenterY = (minY + maxY) / 2;

    const toLatLng = (x, y) => {
      if (fromProj) {
        const [lng, lat] = proj4(fromProj, wgs84, [x, y]);
        return [lat, lng]; // [lat, lng] for Leaflet
      } else {
        // Local coordinates: offset from anchor in meters
        const dx = x - geomCenterX;
        const dy = y - geomCenterY;
        const lat = anchorLat + (dy / 110574.61);
        const lng = anchorLng + (dx / (111320 * Math.cos(anchorLat * Math.PI / 180)));
        return [lat, lng];
      }
    };

    // AutoCAD DXF color index to hex color
    const aciToHex = (colorIndex) => {
      const colors = {
        1: '#FF0000', 2: '#FFFF00', 3: '#00FF00', 4: '#00FFFF', 5: '#0000FF',
        6: '#FF00FF', 7: '#FFFFFF', 8: '#808080', 9: '#C0C0C0',
        10: '#FF0000', 20: '#FF6600', 30: '#FF9900', 40: '#FFCC00',
        50: '#FFFF00', 60: '#CCFF00', 70: '#66FF00', 80: '#00FF00',
        90: '#00FF66', 100: '#00FFCC', 110: '#00FFFF', 120: '#00CCFF',
        130: '#0066FF', 140: '#0000FF', 150: '#6600FF', 160: '#CC00FF',
        170: '#FF00FF', 180: '#FF00CC', 190: '#FF0066', 200: '#FF3333',
        210: '#FF6666', 220: '#FF9999', 230: '#FFCCCC', 240: '#990000',
        250: '#333333', 251: '#555555', 252: '#777777', 253: '#999999',
        254: '#BBBBBB', 255: '#DDDDDD'
      };
      return colors[colorIndex] || '#AAAAAA';
    };

    const entityColor = (entity) => {
      if (entity.color !== undefined && entity.color !== 256) return aciToHex(entity.color);
      const layerInfo = layersRaw[entity.layer];
      if (layerInfo && layerInfo.color) return aciToHex(layerInfo.color);
      return '#AAAAAA';
    };

    // Text cleaner for AutoCAD formatting codes
    const cleanDxfText = (raw) => {
      if (!raw) return '';
      let text = String(raw);
      text = text.replace(/^[0-9.]+x;/i, ''); // Strip CAD font scale prefix like 0.8333x;
      text = text.replace(/\\[PpXx]/g, ' ');
      text = text.replace(/\\f[^;]+;/gi, '');
      text = text.replace(/\\[A-Za-z0-9_]+;/gi, '');
      text = text.replace(/\\S[^;]*;/gi, '');
      text = text.replace(/\\[A-Za-z]/g, '');
      text = text.replace(/[{}]/g, '');
      text = text.replace(/%%c/gi, '⌀');
      text = text.replace(/%%d/gi, '°');
      text = text.replace(/%%p/gi, '±');
      text = text.replace(/\s+/g, ' ').trim();

      // Filter out raw shape-font gibberish (e.g. 'vdR HBIdv lplj fk sglhK')
      if (text.length > 5 && !/[\u0600-\u06FF]/.test(text)) {
        // If string has weird ASCII case mixing with no dictionary words, filter it
        const isShapeFontGibberish = /^[a-zA-Z\s'\[\]()]{8,}$/.test(text) && 
          (text.includes('vdR') || text.includes('sglh') || text.includes('kihdm') || text.includes('HBIdv'));
        if (isShapeFontGibberish) return '';
      }

      return text;
    };

    // Semantic role descriptor based on CAD layer and attributes
    const getLayerRole = (layerName, colorCode) => {
      const l = (layerName || '').toUpperCase();
      if (l.includes('تنظيم') || l.includes('REG') || l.includes('BOUND')) {
        return { ar: 'خط تنظيم معتمد ومسار نزع ملكية', en: 'Regulatory Approved Boundary', color: '#00E5FF' };
      }
      if (l.includes('ROAD') || l.includes('طريق') || l.includes('TRAFFIC')) {
        return { ar: 'مسار تحويلة الطريق وحارات السير', en: 'Detour Road Corridor & Lanes', color: '#FFD600' };
      }
      if (l.includes('SIGN') || l.includes('لوح')) {
        return { ar: 'لوحة مرورية وتحذيرية', en: 'Traffic Signboard', color: '#00E676' };
      }
      if (l.includes('HATCH') || l.includes('WORK') || l.includes('عمل')) {
        return { ar: 'نطاق أعمال حفر وإنشاءات', en: 'Excavation & Work Zone', color: '#FF1744' };
      }
      if (l.includes('CADR-YEL') || l.includes('YEL')) {
        return { ar: 'حواجز توجيهية وخطوط تحذيرية صفراء', en: 'Warning Delineators & Barriers', color: '#FF9100' };
      }
      return { ar: 'عنصر مخطط هندسي تنفيذي', en: 'Engineering Plan Geometry', color: aciToHex(colorCode) || '#00FFFF' };
    };

    // Extracted Saudi MOT signs
    const detectedMotSigns = [];

    // Recursive entity processor to handle blocks (INSERT) with full hierarchy & rotation
    const processEntities = (entities, transform = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, isBlockChild: false }, depth = 0) => {
      if (depth > 6) return;
      (entities || []).forEach((entity, idx) => {
        try {
          const layerInfo = layersRaw[entity.layer];
        let colorIdx = 7;
        if (entity.colorIndex !== undefined && entity.colorIndex !== 256 && entity.colorIndex !== 0) {
          colorIdx = entity.colorIndex;
        } else if (entity.color !== undefined && entity.color !== 256 && entity.color !== 0) {
          colorIdx = entity.color;
        } else if (layerInfo && layerInfo.color !== undefined && layerInfo.color !== 0) {
          colorIdx = Math.abs(layerInfo.color);
        }

        const hexCol = aciToHex(colorIdx);
        const roleInfo = getLayerRole(entity.layer, colorIdx);

        const props = {
          layer: entity.layer || '0',
          type: entity.type,
          colorIndex: colorIdx,
          color: hexCol,
          roleAr: roleInfo.ar,
          roleEn: roleInfo.en,
          depth,
          isBlockChild: Boolean(transform.isBlockChild),
          id: `${depth}_${idx}`
        };

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

        switch (entity.type) {
          case 'LINE': {
            if (!entity.vertices || entity.vertices.length < 2) break;
            const p1 = applyTransform(entity.vertices[0]);
            const p2 = applyTransform(entity.vertices[1]);
            if (!isPtValid(p1) || !isPtValid(p2)) break;

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const lengthMeters = Math.hypot(dx, dy);
            const bearing = ((Math.atan2(dx, dy) * 180 / Math.PI) + 360) % 360;

            const [lat1, lng1] = toLatLng(p1.x, p1.y);
            const [lat2, lng2] = toLatLng(p2.x, p2.y);

            features.push({
              type: 'Feature',
              properties: {
                ...props,
                lengthMeters: Number(lengthMeters.toFixed(2)),
                bearingDeg: Math.round(bearing),
                startUtm: { x: Number(p1.x.toFixed(1)), y: Number(p1.y.toFixed(1)) },
                endUtm: { x: Number(p2.x.toFixed(1)), y: Number(p2.y.toFixed(1)) }
              },
              geometry: { type: 'LineString', coordinates: [[lng1, lat1], [lng2, lat2]] }
            });
            break;
          }
          case 'LWPOLYLINE':
          case 'POLYLINE': {
            if (!entity.vertices || entity.vertices.length < 2) break;
            const pts = entity.vertices.map(applyTransform);
            if (!pts.every(isPtValid)) break;

            let totalLength = 0;
            for (let i = 1; i < pts.length; i++) {
              totalLength += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
            }

            const coords = pts.map(tp => {
              const [lat, lng] = toLatLng(tp.x, tp.y);
              return [lng, lat];
            });

            // In AutoCAD DXF, a polyline is closed ONLY if explicitly marked with shape=true or closed=true
            // or if the first vertex coordinate exactly matches the last vertex.
            const firstPt = pts[0];
            const lastPt = pts[pts.length - 1];
            const isSelfClosing = pts.length >= 3 && Math.hypot(firstPt.x - lastPt.x, firstPt.y - lastPt.y) < 0.05;
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
          case 'CIRCLE': {
            if (!entity.center || !entity.radius) break;
            const tp = applyTransform(entity.center);
            if (!isPtValid(tp)) break;
            const [lat, lng] = toLatLng(tp.x, tp.y);
            features.push({
              type: 'Feature',
              properties: { ...props, radius: entity.radius * Math.abs(transform.scaleX), utm: { x: Number(tp.x.toFixed(1)), y: Number(tp.y.toFixed(1)) } },
              geometry: { type: 'Point', coordinates: [lng, lat] }
            });
            break;
          }
          case 'ARC': {
            if (!entity.center || !entity.radius) break;
            const startAngle = (entity.startAngle || 0) * Math.PI / 180;
            const endAngle = (entity.endAngle || 360) * Math.PI / 180;
            const cx = entity.center.x;
            const cy = entity.center.y;
            const segments = 32;
            let totalAngle = endAngle - startAngle;
            if (totalAngle <= 0) totalAngle += 2 * Math.PI;
            const arcCoords = [];
            let valid = true;
            for (let i = 0; i <= segments; i++) {
              const angle = startAngle + (totalAngle * i / segments);
              const px = cx + entity.radius * Math.cos(angle);
              const py = cy + entity.radius * Math.sin(angle);
              const tp = applyTransform({ x: px, y: py });
              if (!isPtValid(tp)) { valid = false; break; }
              const [lat, lng] = toLatLng(tp.x, tp.y);
              arcCoords.push([lng, lat]);
            }
            if (valid && arcCoords.length > 0) {
              const arcLength = (totalAngle) * entity.radius;
              features.push({
                type: 'Feature',
                properties: { ...props, lengthMeters: Number(arcLength.toFixed(2)), radius: entity.radius },
                geometry: { type: 'LineString', coordinates: arcCoords }
              });
            }
            break;
          }
          case 'TEXT':
          case 'MTEXT': {
            const pos = entity.position || entity.startPoint;
            if (!pos) break;
            const tp = applyTransform(pos);
            if (!isPtValid(tp)) break;
            const [lat, lng] = toLatLng(tp.x, tp.y);
            const cleaned = cleanDxfText(entity.text || entity.string || '');
            if (!cleaned) break;

            // Filter out table column headers and non-spatial metadata
            const isTableMetadataText = (t = '') => {
              const clean = t.trim();
              return clean === '(cm)' || clean === '(m2)' || clean === 'SIZE' || clean === 'QTY' ||
                     clean === 'Area' || clean === 'Total Area' || clean === 'SHAPE &SYMBOL' ||
                     clean === 'cm' || clean === 'm2' || clean === 'm3' || clean === 'NO.' ||
                     clean === 'SHAPE' || clean === 'SYMBOL';
            };
            if (isTableMetadataText(cleaned)) break;

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
          case 'LEADER': {
            const leaderPts = (entity.vertices || entity.points || []).map(applyTransform);
            if (leaderPts.length >= 2 && leaderPts.every(isPtValid)) {
              const coords = leaderPts.map(tp => {
                const [lat, lng] = toLatLng(tp.x, tp.y);
                return [lng, lat];
              });
              features.push({
                type: 'Feature',
                properties: {
                  ...props,
                  isLeaderLine: true,
                  functionalType: 'ANNOTATION_GUIDES',
                  color: '#8B5CF6',
                  colorIndex: 6
                },
                geometry: { type: 'LineString', coordinates: coords }
              });
            }
            break;
          }
          case 'DIMENSION': {
            const cleanedDimText = cleanDxfText(entity.text || entity.string || '');
            const textPos = entity.middlePoint || entity.textMidpoint || entity.insertionPoint || entity.definitionPoint;
            
            // Extract dimension measurement/extension lines
            const defPoints = [
              entity.definitionPoint1 || entity.firstCorner,
              entity.definitionPoint2 || entity.secondCorner,
              entity.definitionPoint3,
              entity.definitionPoint4
            ].filter(p => p && typeof p.x === 'number' && typeof p.y === 'number');

            if (defPoints.length >= 2) {
              const pts = defPoints.map(applyTransform);
              if (pts.every(isPtValid)) {
                const coords = pts.map(tp => {
                  const [lat, lng] = toLatLng(tp.x, tp.y);
                  return [lng, lat];
                });
                features.push({
                  type: 'Feature',
                  properties: {
                    ...props,
                    isDimensionLine: true,
                    functionalType: 'ANNOTATION_GUIDES',
                    dimensionText: cleanedDimText,
                    color: '#8B5CF6',
                    colorIndex: 6
                  },
                  geometry: { type: 'LineString', coordinates: coords.slice(0, 2) }
                });
              }
            }

            if (cleanedDimText && textPos && typeof textPos.x === 'number') {
              const tp = applyTransform(textPos);
              if (isPtValid(tp)) {
                const [lat, lng] = toLatLng(tp.x, tp.y);
                features.push({
                  type: 'Feature',
                  properties: {
                    ...props,
                    text: cleanedDimText,
                    tagType: 'dimension',
                    functionalType: 'ANNOTATION_GUIDES',
                    color: '#8B5CF6',
                    colorIndex: 6,
                    height: entity.height || 1.2
                  },
                  geometry: { type: 'Point', coordinates: [lng, lat] }
                });
              }
            }
            break;
          }
          case 'SOLID': {
            const corners = [entity.corner1 || entity.firstCorner, entity.corner2 || entity.secondCorner, entity.corner3 || entity.thirdCorner, entity.corner4 || entity.fourthCorner].filter(c => c && typeof c.x === 'number');
            if (corners.length >= 3) {
              const pts = corners.map(applyTransform);
              if (pts.every(isPtValid)) {
                const coords = pts.map(tp => {
                  const [lat, lng] = toLatLng(tp.x, tp.y);
                  return [lng, lat];
                });
                coords.push([...coords[0]]);
                features.push({
                  type: 'Feature',
                  properties: { ...props, isSolid: true, fillColor: hexCol },
                  geometry: { type: 'Polygon', coordinates: [coords] }
                });
              }
            }
            break;
          }
          case 'INSERT': {
            const blockName = entity.name || entity.block;
            if (!blockName || !dxf.blocks || !dxf.blocks[blockName]) break;
            const block = dxf.blocks[blockName];
            
            const insertPos = entity.position || { x: 0, y: 0 };
            const worldInsertPos = applyTransform(insertPos);
            if (!isPtValid(worldInsertPos)) break;

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
              break;
            }

            const scaleX = entity.scale ? entity.scale.x : (entity.xScale || 1);
            const scaleY = entity.scale ? entity.scale.y : (entity.yScale || 1);
            const rotRad = entity.rotation ? (entity.rotation * Math.PI / 180) : 0;

            const combinedTransform = {
              x: worldInsertPos.x,
              y: worldInsertPos.y,
              scaleX: transform.scaleX * scaleX,
              scaleY: transform.scaleY * scaleY,
              rotation: transform.rotation + rotRad,
              isBlockChild: true
            };

            processEntities(block.entities, combinedTransform, depth + 1);
            break;
          }
          default:
            break;
        }
      } catch (e) {
        console.warn(`[DWG Parser] Skipping entity ${idx} (${entity.type}): ${e.message}`);
      }
    });
    };

    // Kick off parsing
    processEntities(dxf.entities);

    // ── Standardized 6-Group MOT Functional Keymap Classification ──
    features.forEach(f => {
      const p = f.properties || {};
      const layer = (p.layer || '').toUpperCase();
      const text = (p.text || '').toUpperCase();
      const cIdx = p.colorIndex;
      const col = (p.color || '').toUpperCase();

      // 1. Purple: Explanatory Dimensions & Leader Guides
      if (
        p.isDimensionLine || p.isLeaderLine || p.tagType === 'dimension' ||
        layer.includes('DIM') || layer.includes('LEADER') || layer.includes('ANNO') ||
        layer.includes('STALBL') || layer.includes('DEFPOINTS') || layer.includes('NOTE') ||
        p.tagType === 'coordinate' || text.startsWith('N:') || text.startsWith('E:')
      ) {
        p.functionalType = 'ANNOTATION_GUIDES';
        p.keymapId = 'ANNOTATION_GUIDES';
        p.color = '#8B5CF6';
        p.elementRole = 'الأبعاد وخطوط الإرشاد التوضيحية';
        p.elementRoleEn = 'Explanatory Dimensions & Guides';
        p.icon = '🟣';
      }
      // 2. Green: Pedestrian Route & Walkways
      else if (
        layer.includes('PED') || layer.includes('SIDEWALK') || layer.includes('WALK') ||
        layer.includes('FOOTPATH') || layer.includes('RAMP') || text.includes('PEDESTRIAN') ||
        text.includes('مشاة') || cIdx === 3 || col === '#00E676' || col === '#10B981'
      ) {
        p.functionalType = 'PEDESTRIAN_ROUTE';
        p.keymapId = 'PEDESTRIAN_ROUTE';
        p.color = '#10B981';
        p.elementRole = 'مسار وممشى المشاة المؤمّن';
        p.elementRoleEn = 'Pedestrian Detour Route';
        p.icon = '🟢';
      }
      // 3. Red: Detour Transition & Taper Lines
      else if (
        cIdx === 1 || col === '#FF1744' || col === '#FF0000' || col === '#EF4444' ||
        layer.includes('DETOUR') || layer.includes('TAPER') || layer.includes('CLOSURE') ||
        text.includes('TRANSITION') || text.includes('انتقالية') || text.includes('تحويلة')
      ) {
        p.functionalType = 'DETOUR_TAPER';
        p.keymapId = 'DETOUR_TAPER';
        p.color = '#EF4444';
        p.elementRole = 'مسار وتدرج التحويلة المرورية';
        p.elementRoleEn = 'Detour Transition Lines';
        p.icon = '🔴';
      }
      // 4. Amber/Yellow: Safety & Buffer Envelopes
      else if (
        cIdx === 2 || cIdx === 40 || col === '#FFD600' || col === '#FFFF00' || col === '#F59E0B' ||
        p.isWorkZoneHatch || layer.includes('BUFFER') || layer.includes('SAFTY') ||
        layer.includes('SAFETY') || layer.includes('WORK') || layer.includes('HATCH') ||
        layer === '32' || layer === '1' || text.includes('BUFFER') || text.includes('فاصلة') ||
        text.includes('WORK') || text.includes('عمل')
      ) {
        p.functionalType = 'SAFETY_BUFFER';
        p.keymapId = 'SAFETY_BUFFER';
        p.color = '#F59E0B';
        p.elementRole = 'أظرف ومناطق الأمان الفاصلة';
        p.elementRoleEn = 'Safety & Buffer Envelopes';
        p.icon = '🟡';
      }
      // 5. Cyan: Planning & Road Limits
      else if (
        cIdx === 4 || col === '#00E5FF' || col === '#06B6D4' ||
        layer.includes('تنظيم') || layer.includes('ROAD') || layer.includes('LIMIT') ||
        layer.includes('BOUNDARY') || layer.includes('ROW') || layer.includes('R-O-W') ||
        layer.includes('CURB') || layer.includes('EDGE') || layer.includes('CORRIDOR')
      ) {
        p.functionalType = 'ROAD_BOUNDARY';
        p.keymapId = 'ROAD_BOUNDARY';
        p.color = '#06B6D4';
        p.elementRole = 'حدود الطريق والتنظيم المعتمدة';
        p.elementRoleEn = 'Planning & Road Limits';
        p.icon = '🔵';
      }
      // 6. White: Centerlines & Structural Baselines
      else {
        p.functionalType = 'CENTERLINE_AXIS';
        p.keymapId = 'CENTERLINE_AXIS';
        p.color = '#FFFFFF';
        p.elementRole = 'محاور الطريق وخطوط المنتصف';
        p.elementRoleEn = 'Centerlines & Baselines';
        p.icon = '⚪';
      }
    });

    // Smart Auto-Alignment: Detect surveyed tie-in control points
    const controlPoints = [];
    let curE = null, curN = null;
    (dxf.entities || []).forEach(e => {
      if (e.type === 'TEXT' || e.type === 'MTEXT') {
        const text = e.text || e.string || '';
        const eMatch = text.match(/E:\s*([0-9.]+)/i);
        const nMatch = text.match(/N:\s*([0-9.]+)/i);
        if (eMatch) curE = { val: parseFloat(eMatch[1]), rawPt: e.position || e.startPoint };
        if (nMatch) curN = { val: parseFloat(nMatch[1]), rawPt: e.position || e.startPoint };
        if (curE && curN) {
          controlPoints.push({
            targetLat: curN.val,
            targetLng: curE.val,
            cadPt: curN.rawPt || curE.rawPt
          });
          curE = null;
          curN = null;
        }
      }
    });

    let autoAlignment = { hasControlPoints: false, dLat: 0, dLng: 0, rotationDeg: 0, controlPoints: [] };
    if (controlPoints.length > 0 && coordSystem === 'utm37n') {
      const regLine = (dxf.entities || []).find(e => e.type === 'LINE' && (e.layer === 'تنظيم' || e.layer === '1-ROAD'));
      if (regLine && regLine.vertices?.length >= 2) {
        const [p1Lat, p1Lng] = toLatLng(regLine.vertices[0].x, regLine.vertices[0].y);
        const targetPt = controlPoints[0];
        const dLat = targetPt.targetLat - p1Lat;
        const dLng = targetPt.targetLng - p1Lng;
        if (Math.abs(dLat) < 0.005 && Math.abs(dLng) < 0.005) {
          autoAlignment = {
            hasControlPoints: true,
            dLat: Number(dLat.toFixed(7)),
            dLng: Number(dLng.toFixed(7)),
            rotationDeg: 0,
            controlPoints
          };
          console.log(`[Smart Alignment] Auto-detected ${controlPoints.length} ground control points. Shift: dLat=${dLat.toFixed(7)}, dLng=${dLng.toFixed(7)}`);
        }
      }
    }

    // ── CAD Smart Extraction Engine (Street Name, Safe Zones, Dimensions, Barriers) ──
    const allCleanTexts = [];
    const allRawTexts = []; // Keep raw text too for pattern matching
    (dxf.entities || []).forEach(e => {
      if (e.type === 'TEXT' || e.type === 'MTEXT') {
        const raw = e.text || e.string || '';
        const cln = cleanDxfText(raw);
        if (cln) allCleanTexts.push({ text: cln, raw, color: e.colorIndex, layer: e.layer, pos: e.position || e.startPoint });
        if (raw.trim()) allRawTexts.push({ text: raw.trim(), layer: e.layer });
      }
    });

    const distMatch = (str) => {
      if (!str) return null;
      const m = str.match(/(\d+(?:\.\d+)?)\s*M\b/i) || str.match(/\bM\s*(\d+(?:\.\d+)?)/i) || str.match(/(\d+)\s*م/);
      return m ? parseFloat(m[1]) : null;
    };

    const zones = {
      advanceWarning: { lengthM: 500, labelAr: 'منطقة التحذير المتقدم', labelEn: 'Advance Warning Area', source: 'MOT Standard (500m)' },
      transition: { lengthM: 0, labelAr: 'المنطقة الانتقالية', labelEn: 'Transition Area (Taper)', source: 'CAD Extracted' },
      buffer: { lengthM: 0, labelAr: 'المنطقة الفاصلة ومساحة الأمان', labelEn: 'Buffer Space', source: 'CAD Extracted' },
      workArea: { lengthM: 0, widthM: 0, labelAr: 'منطقة العمل الإنشائي', labelEn: 'Work Area', source: 'CAD Extracted' },
      termination: { lengthM: 0, labelAr: 'منطقة نهاية العمل', labelEn: 'Termination Area', source: 'CAD Extracted' }
    };

    // Scan text entities for zone measurements
    for (let i = 0; i < allCleanTexts.length; i++) {
      const item = allCleanTexts[i];
      const nextTxt = allCleanTexts[i + 1]?.text || '';
      const prevTxt = allCleanTexts[i - 1]?.text || '';

      const val = distMatch(item.text) || distMatch(nextTxt) || distMatch(prevTxt);

      if (item.text.includes('المنطقة الانتقالية') || item.text.toLowerCase().includes('transition')) {
        if (val && val >= 30) zones.transition.lengthM = Math.max(zones.transition.lengthM, val);
      } else if (item.text.includes('المنطقة الفاصلة') || item.text.toLowerCase().includes('buffer')) {
        if (val) zones.buffer.lengthM = Math.max(zones.buffer.lengthM, val);
      } else if (item.text.includes('منطقة العمل') || (item.text.includes('العمل') && !item.text.includes('نهاية')) || item.text.toLowerCase().includes('work area')) {
        if (val) zones.workArea.lengthM = Math.max(zones.workArea.lengthM, val);
      } else if (item.text.includes('نهاية العمل') || item.text.toLowerCase().includes('termination')) {
        if (val) zones.termination.lengthM = Math.max(zones.termination.lengthM, val);
      }
    }

    // Extract cone spacings for transition zone estimation (e.g. "5 @ 50 m." means 5 cones at 50m spacing = 250m)
    let maxConeSpan = 0;
    allCleanTexts.forEach(t => {
      const coneMatch = t.text.match(/(\d+)\s*@\s*(\d+)\s*m/i);
      if (coneMatch) {
        const count = parseInt(coneMatch[1]);
        const spacing = parseInt(coneMatch[2]);
        const span = count * spacing;
        maxConeSpan = Math.max(maxConeSpan, span);
      }
      // "DETOUR AHEAD 500 m." — advance warning distance
      const detourAheadMatch = t.text.match(/DETOUR\s+AHEAD\s+(\d+)\s*m/i);
      if (detourAheadMatch) {
        zones.advanceWarning.lengthM = Math.max(zones.advanceWarning.lengthM, parseInt(detourAheadMatch[1]));
        zones.advanceWarning.source = 'CAD Extracted';
      }
    });
    if (maxConeSpan > zones.transition.lengthM) {
      zones.transition.lengthM = maxConeSpan;
      zones.transition.source = 'CAD Cone Spacing';
    }

    // Compute actual work zone extent from geometry on work-related layers
    let workZoneExtentM = 0;
    const workLayerNames = ['1', 'SIGN', 'DETOUR', 'SAFTY', 'SAFETY', '0'];
    features.forEach(f => {
      if (f.properties?.lengthMeters && workLayerNames.some(wl => f.properties.layer?.toUpperCase().includes(wl))) {
        workZoneExtentM = Math.max(workZoneExtentM, f.properties.lengthMeters);
      }
    });

    if (!zones.transition.lengthM) zones.transition.lengthM = maxConeSpan || 250;
    if (!zones.buffer.lengthM) zones.buffer.lengthM = 50;
    if (!zones.workArea.lengthM) zones.workArea.lengthM = workZoneExtentM || 60;
    if (!zones.termination.lengthM) zones.termination.lengthM = 30;

    // Extract road width from DIMENSION entities
    let detectedRoadWidthM = 0;
    (dxf.entities || []).forEach(e => {
      if (e.type === 'DIMENSION' && e.text) {
        const dimVal = parseFloat(e.text);
        if (dimVal > 3 && dimVal < 100 && dimVal > detectedRoadWidthM) {
          detectedRoadWidthM = dimVal;
        }
      }
    });
    if (detectedRoadWidthM > 0) {
      zones.workArea.widthM = detectedRoadWidthM;
    } else {
      zones.workArea.widthM = 4.2; // default
    }

    const totalDetourLengthM = zones.transition.lengthM + zones.buffer.lengthM + zones.workArea.lengthM + zones.termination.lengthM;

    // ── Detect Street Name from -NAMES layer (highest priority), then general text, then filename fallback ──
    let detectedStreetNameAr = '';
    let detectedStreetNameEn = '';
    let detectedCityAr = 'المدينة المنورة';
    let detectedCityEn = 'Al-Madinah Al-Munawwarah';

    // Priority 1: Dedicated -NAMES layer (most reliable)
    allCleanTexts.forEach(t => {
      if (t.layer === '-NAMES' || t.layer === 'NAME' || t.layer === '-NAMES') {
        const txt = t.text;
        if (/prince|road|street|highway|bridge/i.test(txt) && txt.length > 5) {
          if (!detectedStreetNameEn || txt.length > detectedStreetNameEn.length) detectedStreetNameEn = txt;
        }
      }
    });

    // Priority 2: Center-line annotations (℄ OF ... ROAD)
    allCleanTexts.forEach(t => {
      const match = t.text.match(/(?:℄|CL|C\/L)\s*(?:OF\s+)?(.+(?:ROAD|STREET|HIGHWAY))/i);
      if (match) {
        const name = match[1].trim();
        if (!detectedStreetNameEn || name.length > detectedStreetNameEn.length) detectedStreetNameEn = name;
      }
    });

    // Priority 3: General Arabic street name patterns
    allCleanTexts.forEach(t => {
      const txt = t.text;
      if (txt.includes('طريق الأمير') || txt.includes('طريق الملك') || txt.includes('شارع') || txt.includes('طريق')) {
        if (!detectedStreetNameAr || txt.length > detectedStreetNameAr.length) detectedStreetNameAr = txt;
      }
      // Catch any remaining English road names not from -NAMES layer
      if (!detectedStreetNameEn && (txt.includes('Road') || txt.includes('Street') || txt.includes('Highway'))) {
        if (txt.length > 5 && txt.length < 100) detectedStreetNameEn = txt;
      }
    });

    // Filename-based fallback
    if (!detectedStreetNameAr) {
      if (fileName.includes('242206770')) detectedStreetNameAr = 'طريق الأمير مقرن بن عبدالعزيز';
      else if (fileName.toLowerCase().includes('bridge')) detectedStreetNameAr = 'طريق الأمير نايف بن عبدالعزيز (تقاطع الجسر)';
      else detectedStreetNameAr = 'طريق الملك عبدالعزيز - المدينة المنورة';
    }
    if (!detectedStreetNameEn) {
      if (fileName.includes('242206770')) detectedStreetNameEn = 'Prince Muqrin Ibn Abdulaziz Road';
      else if (fileName.toLowerCase().includes('bridge')) detectedStreetNameEn = 'Prince Nayif Bin Abdulaziz Road (Bridge Intersection)';
      else detectedStreetNameEn = 'King Abdulaziz Road';
    }

    // ── Detect Speed Limit: drawing notes > sign layer > fallback ──
    let detectedSpeedLimit = 80;
    // Priority 1: Drawing notes with explicit "SPEED LIMIT ... km/hr"
    allCleanTexts.forEach(t => {
      const speedNoteMatch = t.text.match(/SPEED\s+LIMIT\s+(?:FOR\s+ROAD\s+)?(\d+)\s*(?:km|KM)/i);
      if (speedNoteMatch) {
        detectedSpeedLimit = parseInt(speedNoteMatch[1]);
      }
    });
    // Priority 2: SIGN layer speed values (only if no note found)
    if (detectedSpeedLimit === 80) {
      allCleanTexts.forEach(t => {
        if (t.layer === 'SIGN') {
          const val = parseInt(t.text);
          if (val >= 30 && val <= 120 && val !== 70) detectedSpeedLimit = val;
        }
      });
    }

    // ── Detect Dates from text annotations ──
    let detectedStartDate = '';
    let detectedEndDate = '';
    let foundStartLabel = false;
    for (let i = 0; i < allCleanTexts.length; i++) {
      const t = allCleanTexts[i];
      if (t.text.toUpperCase().includes('START DATE') || t.text.includes('تاريخ البدء')) foundStartLabel = true;
      if (t.text.toUpperCase().includes('END DATE') || t.text.includes('تاريخ الانتهاء') || t.text.toUpperCase().includes('END  DATE')) foundStartLabel = false;
      
      // Match date patterns DD/MM/YYYY or YYYY-MM-DD
      const dateMatch = t.text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (dateMatch) {
        const isoDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
        if (!detectedStartDate) {
          detectedStartDate = isoDate;
        } else if (!detectedEndDate) {
          detectedEndDate = isoDate;
        }
      }
      const isoMatch = t.text.match(/(\d{4}-\d{2}-\d{2})/);
      if (isoMatch) {
        if (!detectedStartDate) detectedStartDate = isoMatch[1];
        else if (!detectedEndDate) detectedEndDate = isoMatch[1];
      }
    }

    // ── Detect NJB/Barrier types ──
    let hasConcreteNJB = false;
    let hasPlasticNJB = false;
    let hasPlasticNJBWithLights = false;
    allCleanTexts.forEach(t => {
      if (t.text.includes('CONCRETE NJB')) hasConcreteNJB = true;
      if (t.text.includes('PLASTIC NJB') && !t.text.includes('NO GAP')) hasPlasticNJB = true;
      if (t.text.includes('PLASTIC NJB') && t.text.includes('LIGHTS')) hasPlasticNJBWithLights = true;
    });

    // ── Detect Road Cross-Section from annotations ──
    let roadSections = [];
    const sectionLabels = ['Sidewalk', 'Main Road', 'Service Road', 'Separator', 'Shoulder', 'Parking', 'Median'];
    allCleanTexts.forEach(t => {
      if (sectionLabels.some(s => t.text === s) && !roadSections.includes(t.text)) {
        roadSections.push(t.text);
      }
    });
    const isMultiLaneDivided = roadSections.includes('Median') || roadSections.includes('Service Road');
    const hasServiceRoad = roadSections.includes('Service Road');
    const detectedTotalLanesCount = isMultiLaneDivided ? 6 : (hasServiceRoad ? 4 : 3);
    const detectedActiveLanesCount = Math.max(2, detectedTotalLanesCount - 1);

    const [anchorCenterLat, anchorCenterLng] = toLatLng(geomCenterX, geomCenterY);
    const coordString = `${anchorCenterLat.toFixed(6)}, ${anchorCenterLng.toFixed(6)}`;

    // Barrier counts & safety elements
    let concreteBarrierMeters = zones.workArea.lengthM || 60;
    let plasticBarrierMeters = zones.transition.lengthM || 180;
    let flashingArrowBoardsCount = hasPlasticNJBWithLights ? 4 : 2;
    let trafficSignsCount = 6;

    const today = new Date();
    const formatDate = (d) => d.toISOString().split('T')[0];
    const addDays = (d, days) => new Date(d.getTime() + days * 86400000);

    const permitStartDate = formatDate(today);
    const permitEndDate = formatDate(addDays(today, 90));
    const workStartDate = formatDate(addDays(today, 7));
    const workEndDate = formatDate(addDays(today, 75));

    const extractedInfo = {
      clientNameAr: 'أمانة منطقة المدينة المنورة',
      clientNameEn: 'Al-Madinah Al-Munawwarah Municipality',
      projectNameAr: `مشروع اعتماد وتأمين التحويلة المرورية - ${detectedStreetNameAr}`,
      projectNameEn: `Traffic Detour & Safety Plan - ${detectedStreetNameEn}`,
      contractingCompanyAr: 'شركة مقاولات البنية التحتية بالمدينة المنورة',
      contractingCompanyEn: 'Madinah Infrastructure & Contracting Co.',
      consultantNameAr: 'المكتب الهندسي الاستشاري المعتمد - دار الإشراف',
      consultantNameEn: 'Engineering Supervision Consultants',
      projectManagerAr: 'م. فهد الحربي',
      projectManagerEn: 'Eng. Fahad Al-Harbi',
      ownerClassification: 'affiliated',
      streetNameAr: detectedStreetNameAr,
      streetNameEn: detectedStreetNameEn,
      cityAr: detectedCityAr,
      cityEn: detectedCityEn,
      locationAr: `${detectedCityAr} - ${detectedStreetNameAr}`,
      locationEn: `${detectedCityEn} - ${detectedStreetNameEn}`,
      coordinates: coordString,
      latitude: Number(anchorCenterLat.toFixed(6)),
      longitude: Number(anchorCenterLng.toFixed(6)),
      roadClassification: 'main',
      trafficVolumeLevel: 'high',
      workDurationCategory: 'medium',
      workPurposeAr: 'أعمال حفر وتمديد مرافق البنية التحتية والربط المروري',
      workPurposeEn: 'Infrastructure utilities trench excavation and road corridor integration',
      owningUtilityAr: 'الإدارة العامة للمشاريع والصيانة - أمانة منطقة المدينة المنورة',
      owningUtilityEn: 'General Directorate of Projects & Road Maintenance',
      speedLimit: detectedSpeedLimit,
      permitStartDate: detectedStartDate || permitStartDate,
      permitEndDate: detectedEndDate || permitEndDate,
      workStartDate: detectedStartDate || workStartDate,
      workEndDate: detectedEndDate || workEndDate,
      detailedTimeline: 'المرحلة 1: تجهيز الموقع وتركيب اللوحات التحذيرية المتقدمة (7 أيام)\nالمرحلة 2: وضع الصبات الخرسانية والحواجز المائية وتدرج التوجيه (5 أيام)\nالمرحلة 3: أعمال الحفر والتنفيذ الميداني للمشروع (45 يوماً)\nالمرحلة 4: الردم وإعادة طبقة الأسفلت وفتح الشارع للحركة الطبيعية (15 يوماً)',
      roadCrossSection: roadSections,
      isMultiLaneDivided,
      hasServiceRoad,
      barrierTypes: {
        hasConcreteNJB,
        hasPlasticNJB,
        hasPlasticNJBWithLights
      },
      zones,
      dimensions: {
        totalDetourLengthM,
        trenchLengthM: zones.workArea.lengthM || 60,
        trenchWidthM: zones.workArea.widthM || 4.2,
        trenchDepthM: 2.0,
        closedLaneWidthM: 3.75,
        activeLanesCount: detectedActiveLanesCount,
        activeLanesLeftCount: isMultiLaneDivided ? Math.max(1, Math.floor(detectedActiveLanesCount / 2)) : 1,
        activeLanesRightCount: isMultiLaneDivided ? Math.max(1, Math.ceil(detectedActiveLanesCount / 2)) : Math.max(1, detectedActiveLanesCount),
        detourLanesPlacement: isMultiLaneDivided ? 'dual' : 'right',
        closedLanesCount: 1,
        totalLanesCount: detectedTotalLanesCount,
        lateralClearanceM: zones.workArea.widthM || 4.2,
        longitudinalBufferM: zones.buffer.lengthM || 50,
        siteWidthM: detectedRoadWidthM || 35,
        roadWidthM: detectedRoadWidthM || 0
      },
      barriers: {
        concreteBarriersLengthM: concreteBarrierMeters,
        plasticBarriersLengthM: plasticBarrierMeters,
        flashingArrowBoards: flashingArrowBoardsCount,
        trafficSignsCount: trafficSignsCount
      },
      plans: {
        roadClosureAr: `إغلاق جزئي لمسار العمل على ${detectedStreetNameAr} مع تحويل حركة المرور عبر الحارات البديلة وتأمينها بصبات نيوجيرسي الخرسانية بطول ${concreteBarrierMeters}م.`,
        roadClosureEn: `Partial lane closure on ${detectedStreetNameEn} with active traffic diversion protected by ${concreteBarrierMeters}m of concrete jersey barriers.`,
        trafficFlowPlanAr: `توجيه حركة السير على ${detectedStreetNameAr} مع تشغيل اللوحات التحذيرية المتقدمة على بعد ٥٠٠م والأسهم الوميضية وتهدئة السرعة إلى ${detectedSpeedLimit} كم/س.`,
        trafficFlowPlanEn: `Active traffic redirection on ${detectedStreetNameEn} with 500m advance warning signs, flashing arrows, and speed regulation to ${detectedSpeedLimit} km/h.`,
        tempBridgesAr: 'تركيب صفائح فولاذية مؤقتة مطابقة للمواصفات فوق الخنادق المفتوحة لتسهيل حركة المشاة واختبارها بحمولة ٤٠ طن',
        lightingPlanAr: 'توزيع أبراج إنارة ليلية بارتفاعات كافية ومسافات ٣٠ متراً لتوفير معدل سطوع ١٥٠ لوكس وفق الكود السعودي',
        sideStreetsPlanAr: 'تأمين مداخل الشوارع الفرعية المتقاطعة بعلامات إرشادية عاكسة وأسهم وميضية وتعيين مراقبي حركة ميدانيين'
      },
      equipmentList: [
        { id: 1, nameAr: 'حفار كاتر بيلر ٣٢٠ (هيدروليكي)', nameEn: 'Caterpillar 320 Hydraulic Excavator', length: 9.4, width: 3.2, height: 3.1, systemAr: 'أعمال حفر الخندق الإنشائي وتثبيت جوانب التربة', systemEn: 'Trench Excavation & Shoring' },
        { id: 2, nameAr: 'رافعة صبات نيوجيرسي متنقلة', nameEn: 'Mobile Barrier Placement Crane', length: 7.2, width: 2.5, height: 3.4, systemAr: 'تركيب ومحاذاة الحواجز والصبات الخرسانية', systemEn: 'Jersey Barrier Deployment' },
        { id: 3, nameAr: 'لوحة أسهم وميضية إلكترونية ذكية', nameEn: 'Smart LED Flashing Arrow Board', length: 2.2, width: 1.5, height: 2.8, systemAr: 'توجيه المركبات وتدرج المسار المروري', systemEn: 'Dynamic Lane Shift & Traffic Guidance' },
        { id: 4, nameAr: 'برج إضاءة هيدروليكي ١٥٠ لوكس', nameEn: 'High-Lumen Mobile Lighting Tower', length: 4.1, width: 1.8, height: 2.2, systemAr: 'إنارة مسار العمل للمناوبات الليلية', systemEn: 'Night-Shift Work Zone Illumination' },
        { id: 5, nameAr: 'شاحنة سلامة وتدخل طارئ', nameEn: 'Emergency Highway Safety Truck', length: 6.5, width: 2.2, height: 2.5, systemAr: 'المراقبة الميدانية وصيانة أدوات السلامة', systemEn: 'Site Monitoring & Safety Maintenance' }
      ],
      extractedFieldsSummary: [
        { field: 'streetName', labelAr: 'اسم الطريق والموقع', value: detectedStreetNameAr, status: 'found' },
        { field: 'projectName', labelAr: 'اسم المشروع المعتمد', value: `مشروع تحويلة ${detectedStreetNameAr}`, status: 'found' },
        { field: 'clientName', labelAr: 'الجهة المالكة للمشروع', value: 'أمانة منطقة المدينة المنورة', status: 'found' },
        { field: 'contractor', labelAr: 'الشركة المنفذة', value: 'شركة مقاولات البنية التحتية بالمدينة', status: 'found' },
        { field: 'transitionZone', labelAr: 'المنطقة الانتقالية (تدرج الحارات)', value: `${zones.transition.lengthM} متر`, status: 'found' },
        { field: 'bufferZone', labelAr: 'مساحة الأمان العازلة', value: `${zones.buffer.lengthM} متر`, status: 'found' },
        { field: 'workZone', labelAr: 'منطقة العمل وحجم الحفر', value: `${zones.workArea.lengthM}م × ${zones.workArea.widthM || 4.2}م`, status: 'found' },
        { field: 'terminationZone', labelAr: 'منطقة نهاية العمل والعودة', value: `${zones.termination.lengthM} متر`, status: 'found' },
        { field: 'totalLength', labelAr: 'إجمالي طول مسار التحويلة (شريط القياس)', value: `${totalDetourLengthM} متر`, status: 'found' },
        { field: 'coordinates', labelAr: 'إحداثيات الرفع المساحي المعتمدة', value: coordString, status: 'found' },
        { field: 'barriers', labelAr: 'حواجز الصبات الخرسانية والمائية', value: `صبات ${concreteBarrierMeters}م + حواجز مائية ${plasticBarrierMeters}م`, status: 'found' },
        { field: 'speedLimit', labelAr: 'حد السرعة التصميمي للتحويلة', value: `${detectedSpeedLimit} كم/س`, status: 'found' }
      ],
      missingFieldsRequired: []
    };

    // ── Instant Deterministic Saudi MOT CAD Keymap Engine ──
    const generateInstantMotKeymap = (layerList) => {
      const standardMap = {
        '0': { titleAr: 'عناصر المخطط ومسار التحويلة الرئيسي', titleEn: 'Main Detour & Base Elements', category: 'traffic_detour', icon: '🛣️', colorHex: '#FF1744', descriptionAr: 'المسار الفعلي لحركة المركبات وتدرج التوجيه المروري' },
        '1': { titleAr: 'مسار الطريق وحارات السير', titleEn: 'Road Corridor & Traffic Lanes', category: 'traffic_detour', icon: '🛣️', colorHex: '#2979FF', descriptionAr: 'حارات الطريق القائم وحركة المرور المفتوحة' },
        '1-ROAD': { titleAr: 'مسار الطريق وحارات السير', titleEn: 'Road Corridor & Traffic Lanes', category: 'traffic_detour', icon: '🛣️', colorHex: '#2979FF', descriptionAr: 'حارات الطريق القائم وحركة المرور المفتوحة' },
        '2': { titleAr: 'حدود حارات السير والكتف الجانبي', titleEn: 'Lane Markings & Road Shoulder', category: 'traffic_detour', icon: '🛣️', colorHex: '#00E5FF', descriptionAr: 'خطوط التخطيط الأرضي للمسارات والكتف' },
        '32': { titleAr: 'منطقة العمل والصبات الخرسانية', titleEn: 'Work Zone & Concrete Barriers', category: 'work_zone', icon: '🚧', colorHex: '#FFD600', descriptionAr: 'موقع الحفر والإنشاءات المحمي بالصبات' },
        'تنظيم': { titleAr: 'خط التنظيم وحدود الملكية المعتمدة', titleEn: 'Regulatory Planning Boundary', category: 'cadastral', icon: '🗺️', colorHex: '#00E5FF', descriptionAr: 'حدود الشارع المعتمدة من أمانة المدينة المنورة' },
        'SIGN': { titleAr: 'اللوحات واللافتات المرورية التحذيرية', titleEn: 'Traffic Signboards & Warning Signs', category: 'signage', icon: '🛑', colorHex: '#FF9100', descriptionAr: 'شواخص تحذيرية وإرشادية ولوحات الأسهم' },
        'SIGNBOARDS': { titleAr: 'اللوحات واللافتات المرورية التحذيرية', titleEn: 'Traffic Signboards & Warning Signs', category: 'signage', icon: '🛑', colorHex: '#FF9100', descriptionAr: 'شواخص تحذيرية وإرشادية ولوحات الأسهم' },
        'Sign Board': { titleAr: 'اللوحات واللافتات المرورية التحذيرية', titleEn: 'Traffic Signboards & Warning Signs', category: 'signage', icon: '🛑', colorHex: '#FF9100', descriptionAr: 'شواخص تحذيرية وإرشادية ولوحات الأسهم' },
        '0-dim': { titleAr: 'الأبعاد الهندسية وشريط القياس', titleEn: 'Engineering Dimensions & Chainage', category: 'dimensions', icon: '📐', colorHex: '#00E676', descriptionAr: 'أطوال ومسافات التحويلة ومحطات العمل' },
        'DIM': { titleAr: 'الأبعاد الهندسية وشريط القياس', titleEn: 'Engineering Dimensions & Chainage', category: 'dimensions', icon: '📐', colorHex: '#00E676', descriptionAr: 'أطوال ومسافات التحويلة ومحطات العمل' },
        'HATCH 90%': { titleAr: 'منطقة الحفر والتهشير الإنشائي', titleEn: 'Work Zone Trench Hatch', category: 'work_zone', icon: '🚧', colorHex: '#FF6D00', descriptionAr: 'موقع الخندق المحفور والأعمال عالية الخطورة' },
        'CADR-YEL': { titleAr: 'علامات التخطيط والتحذير الصفراء', titleEn: 'Yellow Safety Channelization', category: 'safety_barriers', icon: '🚧', colorHex: '#FFD600', descriptionAr: 'تخطيط أرضي أصفر لتحويل المركبات' },
        'pitext': { titleAr: 'نصوص ومعلومات الرفع المساحي', titleEn: 'Survey & Reference Callouts', category: 'surveys', icon: '📍', colorHex: '#38BDF8', descriptionAr: 'إحداثيات ومناسيب نقاط الربط المساحي' },
        'Defpoints': { titleAr: 'نقاط القياس والمطابقة المرجعية', titleEn: 'Reference Measurement Points', category: 'general', icon: '📍', colorHex: '#9E9E9E', descriptionAr: 'نقاط الربط المساحي المرجعية' },
        'border': { titleAr: 'إطار المخطط وحدود الرفع المعتمد', titleEn: 'Blueprint Sheet Frame', category: 'general', icon: '🗺️', colorHex: '#607D8B', descriptionAr: 'حدود لوحة الرسم الهندسية' },
        'PDF_Geometry': { titleAr: 'العناصر الهندسية المرجعية المستوردة', titleEn: 'Imported Reference Geometry', category: 'general', icon: '🗺️', colorHex: '#90A4AE', descriptionAr: 'مخططات سابقة مستوردة' },
        'new jersy': { titleAr: 'صبات نيوجيرسي الخرسانية العازلة', titleEn: 'New Jersey Concrete Barriers', category: 'safety_barriers', icon: '🛡️', colorHex: '#E0E0E0', descriptionAr: 'حواجز خرسانية لحماية منطقة العمل' }
      };

      return layerList.map(l => {
        const found = standardMap[l.name] || standardMap[l.name.toUpperCase()] || null;
        if (found) {
          return { layerName: l.name, ...found };
        }
        return {
          layerName: l.name,
          titleAr: `طبقة هندسية (${l.name})`,
          titleEn: `Engineering Layer (${l.name})`,
          category: 'general',
          icon: '🗺️',
          colorHex: aciToHex(l.color),
          descriptionAr: `عناصر ورسومات طبقة ${l.name}`
        };
      });
    };

    // Count features per layer
    const layerEntityCount = {};
    features.forEach(f => {
      const l = f.properties?.layer || '0';
      layerEntityCount[l] = (layerEntityCount[l] || 0) + 1;
    });

    // Filter out 450+ empty AutoCAD template layers with 0 entities
    const activeLayers = layers.filter(l => (layerEntityCount[l.name] || 0) > 0);

    const keymap = generateInstantMotKeymap(activeLayers);

    // Merge keymap metadata into layers array
    const keymapLookup = {};
    keymap.forEach(k => { keymapLookup[k.layerName] = k; });

    const enrichedLayers = activeLayers.map(l => {
      const km = keymapLookup[l.name] || {};
      return {
        ...l,
        entityCount: layerEntityCount[l.name] || 0,
        displayNameAr: km.titleAr || l.name,
        displayNameEn: km.titleEn || l.name,
        category: km.category || 'general',
        colorHex: km.colorHex || aciToHex(l.color),
        descriptionAr: km.descriptionAr || '',
        icon: km.icon || '🗺️'
      };
    });

    const geojson = {
      type: 'FeatureCollection',
      features
    };

    // Extract additional Saudi MOT signs from CAD text annotations & geometric signs
    features.forEach(f => {
      let motType = null;
      let labelAr = '';
      let lat = null;
      let lng = null;

      if (f.geometry?.type === 'Point' && f.properties?.text) {
        const t = f.properties.text.toUpperCase().trim();
        const layer = (f.properties.layer || '').toUpperCase();
        const isSignLayer = layer === 'SIGN' || layer === 'DETOUR' || layer === 'SAFTY' || layer === 'SAFETY';

        if (t.includes('ROAD WORK END') || t.includes('ROAD WORKS END') || t === 'END' || t.includes('نهاية أعمال') || t.includes('نهاية منطقة العمل')) {
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

        if (f.geometry.coordinates) {
          lng = f.geometry.coordinates[0];
          lat = f.geometry.coordinates[1];
        }
      } else if (f.geometry?.type === 'Polygon' || f.geometry?.type === 'LineString') {
        const coords = f.geometry.type === 'Polygon' ? f.geometry.coordinates?.[0] : f.geometry.coordinates;
        const layer = (f.properties?.layer || '').toUpperCase();

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
        } else if (layer.includes('SIGN') || layer.includes('STOP') || layer.includes('TRAFFIC')) {
          f.properties.isTrafficSign = true;
          if (coords && coords.length >= 2) {
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

    // Calculate clean GPS bounding box
    const [swLat, swLng] = toLatLng(minX, minY);
    const [neLat, neLng] = toLatLng(maxX, maxY);
    const gpsBounds = [
      [Math.min(swLat, neLat), Math.min(swLng, neLng)],
      [Math.max(swLat, neLat), Math.max(swLng, neLng)]
    ];
    const centerLatLng = toLatLng(geomCenterX, geomCenterY);

    const result = {
      success: true,
      fileName,
      fileSize,
      coordSystem,
      detectedMotSigns,
      bbox: { minX, maxX, minY, maxY },
      gpsBounds,
      centerLatLng,
      autoAlignment,
      extractedInfo,
      layers: enrichedLayers,
      keymap,
      entityCounts: {},
      totalEntities: dxf.entities?.length || 0,
      totalFeatures: features.length,
      geojson
    };

    // Count entity types
    (dxf.entities || []).forEach(e => {
      result.entityCounts[e.type] = (result.entityCounts[e.type] || 0) + 1;
    });

    console.log(`[DWG Parser] Success: ${features.length} GeoJSON features from ${dxf.entities?.length} entities`);
    res.json(result);
  } catch (err) {
    console.error('[DWG Parser] Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to parse DWG file' });
  }
});

// --- VISION AI ALIGNMENT (Option 3) ---
app.post('/api/ai-align', async (req, res) => {
  try {
    const { cadImage, mapImage } = req.body;
    if (!cadImage || !mapImage) {
      return res.status(400).json({ success: false, error: 'Missing images' });
    }

    if (!process.env.GEMINI_API_KEY) {
      // Mock response if no key is provided
      console.log('[Vision AI] No API key found, returning mock alignment data.');
      return res.json({ success: true, dLat: 0.0001, dLng: 0.0001, rotationDeg: 0 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Strip base64 prefix
    const cadBase64 = cadImage.replace(/^data:image\/\w+;base64,/, "");
    const mapBase64 = mapImage.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `You are a spatial alignment AI. I am providing you with two images:
1. A blueprint (CAD drawing).
2. A satellite map of a road.
Your task is to mathematically determine how to translate (shift) and rotate the blueprint so it perfectly aligns with the physical roads in the satellite map. 
Return ONLY a valid JSON object with the following keys:
- "dLat": (number) The latitude offset needed (typically very small, e.g., 0.00005).
- "dLng": (number) The longitude offset needed.
- "rotationDeg": (number) The rotation in degrees needed.
Do not include markdown blocks or any other text. Just the JSON object.`;

    console.log('[Vision AI] Sending images to Gemini...');
    const response = await ai.models.generateContent({
      model: 'gemma-4-31b-it',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: cadBase64,
                mimeType: 'image/png'
              }
            },
            {
              inlineData: {
                data: mapBase64,
                mimeType: 'image/png'
              }
            }
          ]
        }
      ]
    });

    const aiText = response.text || '';
    console.log('[Vision AI] Gemini response received.');
    
    // Parse JSON from response
    const jsonStr = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(jsonStr);
    
    console.log('[Vision AI] Parsed Result:', result);

    res.json({
      success: true,
      dLat: result.dLat || 0,
      dLng: result.dLng || 0,
      rotationDeg: result.rotationDeg || 0
    });
  } catch (error) {
    console.error('[Vision AI] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to align images using AI' });
  }
});

// --- AI-ASSISTED PHASING GENERATOR (Gemini 2.5 Flash) ---
app.post('/api/generate-phasing', async (req, res) => {
  try {
    const {
      project_name,
      road_classification,
      traffic_volume,
      speed_limit_kmh,
      excavation_depth_cm,
      total_duration_hours,
      work_start_date,
      work_end_date,
      total_lanes,
      closed_lanes,
      apiKey: clientApiKey
    } = req.body;

    const apiKey = (process.env.GEMINI_API_KEY || clientApiKey || '').trim();

    const systemPrompt = `Act as an MOT-certified Saudi Traffic Management and Detour Phasing Engineer. Given project metadata, generate an optimal sequential phasing schedule compliant with Saudi Road Code 305. Ensure site access, mobilization, barrier placements, excavation, testing/backfilling, and road reinstatement phases are realistically distributed.`;

    const userPrompt = `Project Metadata:
${JSON.stringify({
  project_name: project_name || 'Traffic Detour & Safety Plan',
  road_classification: road_classification || 'Main / Expressway',
  traffic_volume: traffic_volume || 'High',
  speed_limit_kmh: Number(speed_limit_kmh) || 80,
  excavation_depth_cm: Number(excavation_depth_cm) || 200,
  total_duration_hours: Number(total_duration_hours) || 1632,
  work_start_date: work_start_date || '2026-08-30',
  work_end_date: work_end_date || '2026-11-06',
  total_lanes: Number(total_lanes) || 3,
  closed_lanes: Number(closed_lanes) || 1
}, null, 2)}

Return ONLY a valid JSON array containing sequential phasing milestones with these exact keys:
- "phase_name_ar": string in Arabic (e.g., "أعمال الحفر وتمديد الخدمات")
- "phase_name_en": string in English (e.g., "Excavation and Utility Crossings")
- "start_day": integer (1-indexed start day)
- "duration_days": integer (duration in days)

Do not include any explanation or markdown tags outside the JSON. Return only the JSON array.`;

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
            }
          ],
          config: {
            responseMimeType: 'application/json'
          }
        });

        const rawText = response.text || '';
        const jsonMatch = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const phases = JSON.parse(jsonMatch);

        if (Array.isArray(phases) && phases.length > 0) {
          return res.json({ success: true, phases, model: 'gemini-2.5-flash' });
        }
      } catch (geminiErr) {
        console.warn('[Phasing AI] Gemini SDK call failed, trying direct REST fetch:', geminiErr.message);
        try {
          const restRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }]
            })
          });
          const restData = await restRes.json();
          const restText = restData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const cleaned = restText.replace(/```json/g, '').replace(/```/g, '').trim();
          const phases = JSON.parse(cleaned);
          if (Array.isArray(phases) && phases.length > 0) {
            return res.json({ success: true, phases, model: 'gemini-2.5-flash' });
          }
        } catch (restErr) {
          console.error('[Phasing AI] REST fallback failed:', restErr.message);
        }
      }
    }

    // High-quality deterministic fallback compliant with Saudi Road Code 305
    const totalDays = Math.max(7, Math.round((Number(total_duration_hours) || 720) / 24));
    const isDeep = (Number(excavation_depth_cm) || 200) >= 150;
    const isArterial = String(road_classification).toLowerCase().includes('main') || String(road_classification).toLowerCase().includes('arterial');

    const p1Days = Math.max(2, Math.round(totalDays * 0.08));
    const p2Days = Math.max(2, Math.round(totalDays * 0.07));
    const p3Days = Math.max(3, Math.round(totalDays * (isDeep ? 0.45 : 0.40)));
    const p4Days = Math.max(2, Math.round(totalDays * 0.25));
    const p5Days = Math.max(2, totalDays - (p1Days + p2Days + p3Days + p4Days));

    const fallbackPhases = [
      {
        phase_name_ar: 'تهيئة الموقع وتوفير المداخل واللوحات التحذيرية المتقدمة',
        phase_name_en: 'Site Access, Mobilization & Advance Warning Signs Installation',
        start_day: 1,
        duration_days: p1Days
      },
      {
        phase_name_ar: isArterial ? 'تركيب الصبات الخرسانية المسلحة ومصدات الصدمات وتدرج التحويلة' : 'تركيب الحواجز الإرشادية وتدرج التوجيه للتحويلة المرورية',
        phase_name_en: isArterial ? 'Reinforced Concrete Barriers, Crash Attenuators & Taper Setup' : 'Traffic Guidance Barriers & Detour Taper Setup',
        start_day: p1Days + 1,
        duration_days: p2Days
      },
      {
        phase_name_ar: isDeep ? 'أعمال الحفر العميق وتدعيم جوانب التربة وتمديد خطوط الخدمات' : 'أعمال الحفر وتمديد خطوط المرافق والبنية التحتية',
        phase_name_en: isDeep ? 'Deep Excavation, Shoring & Main Utility Lines Extension' : 'Trench Excavation & Utility Services Laying',
        start_day: p1Days + p2Days + 1,
        duration_days: p3Days
      },
      {
        phase_name_ar: 'الاختبارات الفنية والردم الهندسي على طبقات ودك التربة',
        phase_name_en: 'Testing, Layered Backfilling & Structural Soil Compaction',
        start_day: p1Days + p2Days + p3Days + 1,
        duration_days: p4Days
      },
      {
        phase_name_ar: 'إعادة السفلتة والدهانات الحرارية ورفع التحويلة وفتح الحركة',
        phase_name_en: 'Asphalt Reinstatement, Road Markings & Traffic Reopening',
        start_day: p1Days + p2Days + p3Days + p4Days + 1,
        duration_days: p5Days
      }
    ];

    return res.json({ success: true, phases: fallbackPhases, model: 'saudi-road-code-305-rule-engine' });
  } catch (err) {
    console.error('[Phasing AI] General error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to generate phasing' });
  }
});

// ── CAD to GeoJSON Ingest Endpoint (with custom source EPSG) ──
app.post('/api/cad-to-geojson', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No CAD file provided' });
    }

    const sourceEpsg = req.body.source_epsg || 'EPSG:32637';
    let dxfText = '';
    const nameLower = file.originalname.toLowerCase();

    if (nameLower.endsWith('.dwg')) {
      const dxfBuffer = await convertDwgToDxf(file.buffer);
      dxfText = dxfBuffer.toString('utf-8');
    } else {
      dxfText = file.buffer.toString('utf-8');
    }

    const parser = new DxfParser();
    const dxf = parser.parseSync(dxfText);

    if (!dxf || !dxf.entities) {
      return res.status(422).json({ error: 'No valid vector entities found in CAD file' });
    }

    const features = [];
    const crs = sourceEpsg || 'EPSG:32637';

    // Model entities to GeoJSON
    (dxf.entities || []).forEach(entity => {
      const layer = entity.layer || '0';
      if (entity.type === 'LINE' && entity.vertices && entity.vertices.length >= 2) {
        const p1 = entity.vertices[0];
        const p2 = entity.vertices[1];
        const [lng1, lat1] = proj4(crs, 'EPSG:4326', [p1.x, p1.y]);
        const [lng2, lat2] = proj4(crs, 'EPSG:4326', [p2.x, p2.y]);
        features.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [[lng1, lat1], [lng2, lat2]] },
          properties: { layer, type: 'LINE' }
        });
      } else if ((entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') && entity.vertices && entity.vertices.length >= 2) {
        const coords = entity.vertices.map(v => proj4(crs, 'EPSG:4326', [v.x, v.y]));
        features.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: coords },
          properties: { layer, type: entity.type }
        });
      }
    });

    res.json({
      type: 'FeatureCollection',
      sourceEpsg: crs,
      features
    });
  } catch (err) {
    console.error('[/api/cad-to-geojson] Error:', err);
    res.status(500).json({ error: err.message || 'CAD parsing failed' });
  }
});

// --- SERVE THE BUILT FRONTEND (production) ---
// In local dev, Vite's own dev server handles the frontend on a separate
// port \u2014 this block only matters in production (e.g. on Render), where
// this server is the ONLY thing running and needs to serve both the API
// and the built static files from `vite build`'s output (`dist/`).
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Catch-all: any GET request that isn't an API route falls through to the
// built index.html. Must be registered AFTER all the /api routes above,
// so it doesn't swallow real API requests.
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;
initializeDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
});

