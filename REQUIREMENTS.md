# Project Requirements & Dependencies

This document provides a detailed overview of all software requirements, runtime dependencies, and development tools required to run the **Amanah Madinah Smart Construction & Traffic Management Platform**.

---

## 💻 System Prerequisites

* **Node.js**: `v18.0.0` or higher (must support ES Modules and WebAssembly).
* **npm**: `v9.0.0` or higher.
* **Supported Browsers**: Modern evergreen browsers with WebGL & WebAssembly support (Google Chrome, Microsoft Edge, Mozilla Firefox, Apple Safari).

---

## 📦 Runtime Dependencies (`dependencies`)

| Package | Version | Purpose & Usage |
| :--- | :--- | :--- |
| `react` | `^19.2.7` | Core UI library for React application components |
| `react-dom` | `^19.2.7` | React DOM rendering engine |
| `express` | `^5.2.1` | Node.js web server framework for REST APIs and production static file serving |
| `sqlite` | `^5.1.1` | Promise-based SQLite client wrapper for Node.js |
| `sqlite3` | `^6.0.1` | SQLite3 database engine for project records and permit persistence |
| `cors` | `^2.8.6` | Middleware to enable Cross-Origin Resource Sharing |
| `multer` | `^2.2.0` | In-memory multipart upload handler for large DWG, DXF, and GeoTIFF files |
| `dwgdxf` | `^2.0.1` | WebAssembly (WASM) engine for direct binary DWG to DXF conversion |
| `dxf-parser` | `^1.1.2` | DXF entity and table parser (Lines, Polylines, MText, Blocks, Layers) |
| `proj4` | `^2.21.0` | Geospatial coordinate transformation between UTM Zone 37N (EPSG:32637) and WGS84 (EPSG:4326) |
| `geotiff` | `^3.0.5` | GeoTIFF spatial metadata reader and raster image parser |
| `lucide-react` | `^1.23.0` | Icon set for modern UI controls |
| `tailwindcss` | `^4.3.2` | Modern utility-first CSS styling framework |
| `@tailwindcss/vite` | `^4.3.2` | Vite integration plugin for Tailwind CSS v4 |
| `docx` | `^9.7.1` | Official permit documentation and compliance report generator in Microsoft Word format |
| `file-saver` | `^2.0.5` | Client-side file download and export utility |
| `html2canvas` | `^1.4.1` | High-definition map snapshot capture for visual inspection reports |
| `@google/genai` | `^2.17.0` | Google Gemini AI integration SDK |
| `dotenv` | `^17.4.2` | Environment variable loader from `.env` file |

---

## 🛠️ Development Dependencies (`devDependencies`)

| Package | Version | Purpose & Usage |
| :--- | :--- | :--- |
| `vite` | `^8.1.1` | Next-generation frontend build tool and local dev server |
| `@vitejs/plugin-react` | `^6.0.3` | React Fast Refresh / HMR plugin for Vite |
| `concurrently` | `^10.0.3` | Runs frontend and backend servers concurrently (`npm run dev`) |
| `oxlint` | `^1.71.0` | High-performance JavaScript/JSX linter |
| `@types/react` | `^19.2.17` | TypeScript type definitions for React |
| `@types/react-dom` | `^19.2.3` | TypeScript type definitions for React DOM |

---

## 🚀 Quick Setup & Installation

To install all dependencies:
```bash
npm install
```

To run the local development server (Frontend on `:5173`, Backend on `:5000`):
```bash
npm run dev
```

To build for production:
```bash
npm run build
```

To run the production server:
```bash
npm start
```
