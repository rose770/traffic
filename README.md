# Amanah Madinah Smart Construction & Traffic Management Platform
### منصة أمانة منطقة المدينة المنورة لإدارة وتراخيص التحويلات المرورية الذكية

An advanced geospatial engineering and traffic detour lifecycle management platform built for the **Municipality of Al-Madinah Al-Munawwarah (أمانة منطقة المدينة المنورة)**. The platform streamlines road work permit applications, interactive traffic detour drafting, automated AutoCAD (DWG/DXF) blueprint ingestion, satellite GIS overlay matching, Saudi MOT / KSA Road Code 305 engineering enforcement, live inspection audits, and official regulatory reporting.

---

## 🌟 Key Capabilities

### 1. 📐 Interactive GIS Multi-Layer Drawing & CAD Export Engine
* **Zero-File Direct Interactive Drawing**: Contractors can plan and draw site plans directly on satellite maps without needing an existing CAD file:
  * 🟡 **1. Site Boundary (`WORK_ZONE_BOUNDARY`)**: Polyline/Polygon boundary defining the active construction zone.
  * 🔴 **2. Detour Transition Taper (`DETOUR_TAPER`)**: Directional detour taper lines with node undo/redo and live coordinate readouts.
  * 🧱 **3. Continuous NJB Barrier Wall (`NJB_BARRIER_LINE`)**: Continuous wall line with automatic linear meter computation and piece count calculations (Concrete NJB, Plastic Water-Filled, Cones Series, Warning Lights Chain).
  * 🟢 **4. Pedestrian Safe Corridor (`PEDESTRIAN_ROUTE`)**: Optional protected walkway path with minimum width checks.
* **AutoCAD DXF (AC1032) Export**: Instant generation and download of 100% AutoCAD-compatible `.dxf` drawings with automatic `$EXTMIN`/`$EXTMAX` viewport centering and official layer standards.
* **In-Browser & Server CAD Parsing**: Ingests `.dwg`/`.dxf` files via `ezdxf` with automatic coordinate transformation (UTM Zone 37N $\leftrightarrow$ WGS84 EPSG:4326), recursive block expansion, and median spatial filtering.

### 2. 🛡️ Saudi Road Code 305 & MOT Engineering Compliance Engine
* **Automated Detour Sizer**: Automatic lookup of required advance warning distances, transition taper lengths ($L$), and longitudinal safety buffers based on road speed limits and classifications.
* **Deterministic Barrier Selection**: Enforces mandatory barrier classes (MASH TL-3 QuadGuard, Heavy Concrete NJB, Steel Guardrail) according to excavation depth, road design speed, and lateral clearance.
* **Trench Steel Plate Validation**: Cross-section engineering verification checking plate thickness ($\ge 30\text{ mm}$ for 40-tonne heavy traffic), flush milling depths, anti-skid surface treatments, and bearing overlap lengths ($\ge 40\text{ cm}$).
* **Arterial Crash Attenuators**: Mandatory crash cushion sizing and equipment tracking for arterial corridors ($\ge 80\text{ km/h}$).

### 3. 📋 End-to-End 5-Stage Detour Lifecycle Workflow
1. **Stage 1 — Prepare & Submit Request (المقاول / الاستشاري)**: Dual-path preparation (Direct Drawing or Smart CAD Upload), road auto-complete, and Gantt timeline scheduling.
2. **Stage 2 — Review & Technical Approval (إدارة السلامة المرورية)**: Side-by-side proposal review, 6-DOF coordinate inspection, and official permit issuance.
3. **Stage 3 — Execute & Verify Readiness (محضر الجاهزية الميداني)**: Day/night field checklist and opening minutes sign-off.
4. **Stage 4 — Operate & Monitor Performance (المتابعة الدورية)**: 17-point spatial inspection audits, recurring safety updates, and violation logging.
5. **Stage 5 — Remove & Close the Detour (محضر الإغلاق النهائي)**: Road condition restoration verification and final closure minutes archiving.

### 4. 🖥️ Live Diagnostics & System Logs Portal (`/logs`)
* **Dedicated Route**: Access directly at `/logs` (or `/#/logs`).
* **Direct Access Console**: One-click authentication button to enter the live diagnostics console.
* **Telemetry Dashboard**: Live server uptime, RAM / Memory RSS, database permit counts, and CAD subsystem status.
* **Live Log Stream**: Level filtering (`ALL`, `INFO`, `WARNING`, `ERROR`), text search, JSON context inspection, and one-click log file export (`.log`).

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Backend Framework** | Python 3.12 + FastAPI | Asynchronous REST API, request tracing, and CORS middleware |
| **ASGI Web Server** | Uvicorn | Production-ready high-concurrency ASGI server |
| **CAD Processing** | `ezdxf` 1.4.4 | Native Python DXF entity parsing, layer extraction, and DXF generation |
| **Geospatial & Projections** | `pyproj` + `numpy` | Saudi Datum UTM Zone 37N (EPSG:32637) $\leftrightarrow$ WGS84 conversions |
| **Database** | SQLite3 | Embedded transactional database with WAL journaling mode |
| **Telemetry & Health** | `psutil` + Custom Logger | In-memory circular log ring buffer and system telemetry |
| **Frontend Framework** | React 19 + Vite 8 | Client Single Page Application with optimized bundle splitting |
| **UI Styling & Icons** | Tailwind CSS v4 + Lucide Icons | Responsive Arabic/English RTL & LTR design system |
| **Mapping Engine** | Leaflet Maps | Interactive Ultra-HD Satellite imagery (Google HD / Esri Clarity) |
| **Test Suite** | Pytest + Httpx | Automated integration and regression test coverage |

---

## 🚀 Quickstart & Installation

### 1. Prerequisites
* **Python**: Version `3.10` or higher.
* **Node.js**: Version `18.0.0` or higher.
* **npm**: Version `9.0.0` or higher.

### 2. Backend Setup
```bash
# Clone the repository and checkout the test branch
git clone https://github.com/rose770/traffic.git
cd traffic
git checkout test

# Create and activate Python virtual environment
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

### 3. Frontend Setup & Build
```bash
# Install Node dependencies
npm install

# Build production frontend assets into dist/
npm run build
```

### 4. Running the Application
```bash
# Start the unified FastAPI application
python main.py
```
> The platform will be live at:
> * **Main Portal**: [http://127.0.0.1:5000](http://127.0.0.1:5000)
> * **Logs & Diagnostics**: [http://127.0.0.1:5000/logs](http://127.0.0.1:5000/logs)
> * **API Health Check**: [http://127.0.0.1:5000/api/system/health](http://127.0.0.1:5000/api/system/health)
> * **Interactive API Docs (Swagger)**: [http://127.0.0.1:5000/docs](http://127.0.0.1:5000/docs)

---

## 🧪 Running Automated Tests

Run the complete Pytest test suite:
```bash
pytest tests/ -v
```
Tests cover:
* `tests/test_alignment.py`: 6-DOF coordinate shifts, UTM conversions, and GCP snapping.
* `tests/test_cad_watermarking.py`: AutoCAD DXF generation, layer definitions, and metadata stamping.
* `tests/test_logging_and_errors.py`: Telemetry endpoints, error handling, and structured request tracing.

---

## 🐳 Docker Deployment

The application includes a production-ready `Dockerfile`:
```bash
# Build Docker image
docker build -t amanah-traffic-platform .

# Run container
docker run -p 5000:5000 amanah-traffic-platform
```

---

## 📄 License & Ownership
Developed for the **Municipality of Al-Madinah Al-Munawwarah (Amanah Madinah)**. All rights reserved.
