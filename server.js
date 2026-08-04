import express from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Allow large JSON payloads for CAD/Maps

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
      [contractor_id, JSON.stringify(data), 'Pending']
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

// --- SERVE THE BUILT FRONTEND ---
// Everything below this line must come AFTER all /api routes above,
// so API calls are handled by their own routes and never accidentally
// swallowed by the catch-all route that serves the React app.
//
// NOTE: adjust FRONTEND_DIR_NAME below if your frontend build lives in a
// different location relative to this server file (e.g. '../client/dist').
const candidateDirs = ['dist', 'build', path.join('client', 'dist'), path.join('client', 'build')];
const frontendDir = candidateDirs
  .map(dir => path.join(__dirname, dir))
  .find(fullPath => fs.existsSync(fullPath));

if (frontendDir) {
  console.log(`Serving frontend static files from: ${frontendDir}`);
  app.use(express.static(frontendDir));

  // Express 5 changed how wildcard routes are parsed by path-to-regexp,
  // so a bare app.get('*', ...) throws at startup. Using app.use() with no
  // path here matches every remaining request without needing route-pattern
  // parsing at all, so it works on both Express 4 and 5.
  app.use((req, res) => {
    res.sendFile(path.join(frontendDir, 'index.html'));
  });
} else {
  console.warn(
    'WARNING: No frontend build folder found (looked for dist/build). ' +
    'The API will work, but no frontend will be served. ' +
    'Make sure your build command actually builds the frontend before this server starts.'
  );
}

// Render assigns the port dynamically via process.env.PORT — hardcoding 5000
// causes Render's health check to fail and the whole service to appear down.
const PORT = process.env.PORT || 5000;
initializeDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
