import express from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import proj4 from 'proj4';
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

    // Step 1: Convert DWG → DXF using dwgdxf (WASM)
    const { convertDwgToDxf } = await getDwgDxf();
    const dwgBytes = new Uint8Array(req.file.buffer);
    const dxfBytes = await convertDwgToDxf(dwgBytes);
    const dxfString = new TextDecoder().decode(dxfBytes);
    console.log(`[DWG Parser] DXF generated: ${(dxfBytes.length / 1024).toFixed(1)} KB`);

    // Step 2: Parse DXF entities
    const DxfParser = (await import('dxf-parser')).default;
    const parser = new DxfParser();
    const dxf = parser.parseSync(dxfString);

    // Step 3: Extract layers metadata
    const layersRaw = dxf.tables?.layer?.layers || {};
    const layers = Object.entries(layersRaw).map(([name, info]) => ({
      name,
      color: info.color || 7,
      visible: !info.frozen && !info.off
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
      
      // Radius threshold: 5,000 meters from cluster center to eliminate rogue paper-space coordinates
      const MAX_CLUSTER_RADIUS = 5000;
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

    const isPtValid = (p) => {
      if (!p || typeof p.x !== 'number' || typeof p.y !== 'number') return false;
      const dist = Math.hypot(p.x - medianX, p.y - medianY);
      return dist < 5000;
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
      text = text.replace(/\\[PpXx]/g, ' ');
      text = text.replace(/\\f[^;]+;/gi, '');
      text = text.replace(/\\[A-Za-z0-9_]+;/gi, '');
      text = text.replace(/\\S[^;]*;/gi, '');
      text = text.replace(/\\[A-Za-z]/g, '');
      text = text.replace(/[{}]/g, '');
      text = text.replace(/%%c/gi, '⌀');
      text = text.replace(/%%d/gi, '°');
      text = text.replace(/%%p/gi, '±');
      return text.replace(/\s+/g, ' ').trim();
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

    // Recursive entity processor to handle blocks (INSERT) with full hierarchy & rotation
    const processEntities = (entities, transform = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 }, depth = 0) => {
      if (depth > 6) return;
      (entities || []).forEach((entity, idx) => {
      try {
        const colorIdx = entity.colorIndex !== undefined ? entity.colorIndex : (entity.color !== undefined ? entity.color : 7);
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

            const isClosed = entity.shape || (entity.type === 'LWPOLYLINE' && entity.vertices.length > 2 && pts.length >= 3);
            if (isClosed) {
              const first = coords[0];
              const last = coords[coords.length - 1];
              if (first[0] !== last[0] || first[1] !== last[1]) {
                coords.push([...first]);
              }
              features.push({
                type: 'Feature',
                properties: { ...props, lengthMeters: Number(totalLength.toFixed(2)), vertexCount: pts.length, isClosed: true },
                geometry: { type: 'Polygon', coordinates: [coords] }
              });
            } else {
              features.push({
                type: 'Feature',
                properties: { ...props, lengthMeters: Number(totalLength.toFixed(2)), vertexCount: pts.length },
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

            const scaleX = entity.scale ? entity.scale.x : (entity.xScale || 1);
            const scaleY = entity.scale ? entity.scale.y : (entity.yScale || 1);
            const rotRad = entity.rotation ? (entity.rotation * Math.PI / 180) : 0;

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

    const geojson = {
      type: 'FeatureCollection',
      features
    };

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
      bbox: { minX, maxX, minY, maxY },
      gpsBounds,
      centerLatLng,
      autoAlignment,
      layers,
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

