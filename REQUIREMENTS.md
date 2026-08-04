# Project Package Requirements & Dependencies

This document provides a summary of all package requirements and dependencies for the **Amanah Madina** project.

---

## 🚀 Quick Setup / Installation

To install all required packages and dependencies, run:

```bash
npm install
```

To start the development environment (runs both the Vite dev server and Node Express backend concurrently):

```bash
npm run dev
```

---

## 📦 Runtime Dependencies (`dependencies`)

These packages are required for running the frontend web app and backend server in production.

| Package | Version | Description |
| :--- | :--- | :--- |
| `react` | `^19.2.7` | Core UI library for React application |
| `react-dom` | `^19.2.7` | React rendering package for DOM |
| `express` | `^5.2.1` | Node.js web server framework for handling APIs and backend |
| `cors` | `^2.8.6` | Middleware to enable Cross-Origin Resource Sharing (CORS) |
| `sqlite` | `^5.1.1` | Promise-based SQLite client wrapper for Node.js |
| `sqlite3` | `^6.0.1` | SQLite3 database driver |
| `lucide-react` | `^1.23.0` | Icon set for modern React UI components |
| `tailwindcss` | `^4.3.2` | Utility-first CSS framework |
| `@tailwindcss/vite` | `^4.3.2` | Tailwind CSS integration plugin for Vite |

---

## 🛠️ Development Dependencies (`devDependencies`)

These tools and libraries are needed for development, building, typing, and linting.

| Package | Version | Description |
| :--- | :--- | :--- |
| `vite` | `^8.1.1` | Fast frontend build tool and dev server |
| `@vitejs/plugin-react` | `^6.0.3` | React plugin for Vite with HMR support |
| `concurrently` | `^10.0.3` | Utility to run multiple commands concurrently (Vite + Node server) |
| `oxlint` | `^1.71.0` | High-performance JavaScript/JSX linter |
| `@types/react` | `^19.2.17` | TypeScript definitions for React |
| `@types/react-dom` | `^19.2.3` | TypeScript definitions for React DOM |

---

## ⚙️ Available Scripts

- **`npm run dev`**: Starts Vite dev server and Node backend concurrently (`node server.js`).
- **`npm run build`**: Compiles production-ready bundle via Vite.
- **`npm run lint`**: Runs `oxlint` to check code quality.
- **`npm run preview`**: Serves built production files locally for testing.
