# Amanah Madinah Smart Construction & Traffic Management Platform

An advanced geospatial and traffic management engineering platform designed for the **Municipality of Al-Madinah Al-Munawwarah (Amanah Madinah)**. The platform streamlines road work permits, temporary traffic detour planning, automated AutoCAD (DWG/DXF) blueprint processing onto Ultra-HD satellite and GeoTIFF imagery, smart survey auto-alignment, and official compliance report generation.

---

## 🌟 Key Capabilities

### 1. 📐 AutoCAD (DWG/DXF) GIS Parsing Engine
* **Direct WebAssembly Conversion (WASM):** Converts binary `.dwg` CAD files to `.dxf` in-memory using `dwgdxf` (WASM) and extracts geometric entities into standard GeoJSON with zero external software dependencies.
* **AutoCAD Color Index (ACI) Mapping:** Accurately renders true engineering line hierarchies and colors (`#FF1744` for detour taper corridors, `#FFD600` for lane dividers, `#00E5FF` for regulatory municipal boundaries, and `#FFFFFF` for dimensions and layout marks).
* **Recursive Block Expansion (`INSERT`):** Recursively traverses nested CAD blocks up to depth 6, preserving local scales, rotations, and coordinate translations.
* **Rotated Engineering Typography:** Extracts Arabic and English text annotations (`180 M`, `60 M`, `المنطقة الانتقالية`, `منطقة العمل`) and dynamically rotates them parallel to the road corridor angle.
* **Spatial Median Outlier Filter:** Filters out stray Paper Space entities and coordinate anomalies to automatically center and zoom the map onto the real-world construction site.

### 2. 🎯 Smart Auto-Alignment Engine
* **Ground Control Point (GCP) Tie-in:** Scans CAD text entities for surveyed coordinate pairs (e.g., `N: 24.487426, E: 39.679453`), computes the local Saudi datum shift against UTM Zone 37N (EPSG:32637), and automatically snaps the CAD geometry into place.
* **Interactive Live Drag Handle (`✥`):** Click and drag the central blue handle directly on the map to manually align and reposition the CAD blueprint over the street in real-time.
* **Precision Directional Nudge & Rotation:** On-screen 1-meter N/S/E/W nudge buttons and a $-45^\circ$ to $+45^\circ$ fine-rotation slider for millimeter-accurate positioning.
* **Position Lock:** Securely locks the blueprint in place once aligned.

### 3. 🛰️ Ultra-HD Satellite & GeoTIFF Mapping
* **High-DPI Satellite Imagery:** Integrated **Google Satellite HD** and **Esri World Imagery Clarity** supporting deep native zoom levels ($18\text{–}22$) with sub-10cm resolution, rendering asphalt, lane markings, and curbs clearly.
* **GeoTIFF Orthomosaic Support:** Decodes and renders geo-referenced GeoTIFF raster images with opacity and layer controls.

### 4. 🚧 Saudi MOT Traffic Engineering Palette
* Comprehensive catalog of official Saudi Ministry of Transport (MOT) approved traffic control elements:
  * **Warning Signs:** Road Work Ahead, Speed Limits (40/60/80), Lane Closures, Road Narrows.
  * **Barriers & Delineators:** Illuminated Concrete New Jersey Barriers (NJB w/ lights), Water-Filled Plastic Barriers, Traffic Cones, Steel Guardrails.
  * **Guidance & Warning Equipment:** Flashing Arrow Board Trailers, Detour Direction Arrows, Chevrons.
  * **Pedestrian & Safety:** Temporary Signals, Flagman stations, Crash Attenuator Trucks.
* Drag-and-drop placement, click-to-rotate ($45^\circ$), and real-time positioning on the map.

### 5. 📄 Official Document & Report Generator
* Export official permit approval forms, detour compliance checklists, and site inspection reports to Microsoft Word (`.docx`) and high-resolution image snapshots.

---

## 🛠️ Architecture & Technology Stack

* **Frontend:**
  * React 19 + Vite 8
  * Tailwind CSS v4 + Lucide Icons
  * Leaflet Maps (Custom Vector & Raster Panes, Canvas Rendering)
  * HTML2Canvas (Map Snapshots & Visual Reporting)
* **Backend:**
  * Node.js (ES Modules) + Express 5
  * SQLite3 (Local Project & Permit Database)
  * `dwgdxf` (WASM binary DWG $\rightarrow$ DXF converter)
  * `dxf-parser` (DXF Entity and Table Parser)
  * `proj4` (EPSG:32637 UTM 37N $\leftrightarrow$ EPSG:4326 WGS84 projection)
  * `multer` (Streaming multipart file uploads)
  * `docx` & `file-saver` (Document generation)
  * `@google/genai` (Google Gemini AI integration)

---

## 🚀 Installation & Local Setup

### 1. Prerequisites
* **Node.js**: Version `18.0.0` or higher (with ES Modules and WebAssembly support).
* **npm**: Version `9.0.0` or higher.

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory (or use the provided defaults):
```env
PORT=5000
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Run Development Server
```bash
npm run dev
```
> This command concurrently launches:
> - **Frontend (Vite dev server):** `http://localhost:5173`
> - **Backend (Express API server):** `http://localhost:5000`

---

## ⚙️ Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Runs both the Vite frontend and Express backend concurrently |
| `npm run build` | Builds the optimized production bundle into the `dist/` directory |
| `npm start` | Starts the Express server in production mode (`node server.js`) |
| `npm run lint` | Runs `oxlint` to perform fast static code analysis |
| `npm run preview` | Locally previews the production build via Vite |

---

## 🌐 Production Deployment Guide

The Express server (`server.js`) is configured to serve the production bundle from `dist/` and handle client-side Single Page Application (SPA) routing fallbacks. It is ready for deployment on **Render**, **Railway**, **DigitalOcean**, or **AWS**.

### Deployment Settings:
1. **Build Command:**
   ```bash
   npm install && npm run build
   ```
2. **Start Command:**
   ```bash
   npm start
   ```
3. **Port Binding:**
   The server binds to `process.env.PORT` dynamically in production, falling back to `5000` locally.

---

## 📡 Key API Endpoints

* `POST /api/parse-dwg`: Uploads a `.dwg` or `.dxf` CAD file, performs spatial clustering, extracts entities/layers/blocks, calculates ground control points, and returns GeoJSON with metric measurements.
* `GET /api/projects`: Retrieves the list of all road projects and permit records.
* `POST /api/projects`: Creates a new project and saves road attributes, coordinates, and supervisor details.
* `POST /api/generate-permit-doc`: Generates and downloads the official permit documentation as a `.docx` file.
