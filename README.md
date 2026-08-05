# Deployment Fix — "Cannot GET" on Render

## What was actually wrong (3 separate issues, all needed for deployment to work)

### 1. server.js never served the built frontend
In local dev, `npm run dev` runs Vite and Express as two separate processes
on two separate ports — Vite serves the frontend, Express serves the API.
On Render, only one thing runs. `server.js` had zero code to serve the
built `dist/` folder, so any visit to the actual site hit nothing —
exactly "Cannot GET".

**Fixed**: added `express.static()` + a catch-all route so Express now
serves the built frontend for any non-API request.

### 2. Hardcoded port would conflict with Render
`const PORT = 5000` — Render assigns its own port via an environment
variable and expects your app to listen on *that* port, not a fixed one.

**Fixed**: `const PORT = process.env.PORT || 5000` — uses Render's assigned
port in production, falls back to 5000 locally.

### 3. Every API call was hardcoded to `http://localhost:5000`
This is the one that would have caused a *second* round of broken behavior
even after fixing #1 and #2 — every fetch call in the app pointed at
`http://localhost:5000/api/...`. Once deployed, a visitor's browser would
try to reach `http://localhost:5000` on **their own machine**, not your
server. Every login, every save, every document generation would have
silently failed.

**Fixed**: switched all 12 occurrences to relative `/api/...` paths, and
added a dev-server proxy in `vite.config.js` so this still works correctly
in local development too (Vite forwards `/api/*` requests to port 5000
behind the scenes).

### Bonus: added the missing "start" script
`package.json` had no `"start"` script — added `"start": "node server.js"`,
which is what most deployment platforms (including Render) look for if a
custom start command wasn't explicitly configured.

## Files in this zip

| File | What changed |
|---|---|
| `server.js` | Static file serving, catch-all route, dynamic port |
| `vite.config.js` | Dev proxy for `/api` requests |
| `package.json` | Added `start` script |
| `ConstructionPlanningInterface.jsx` | All hardcoded API URLs switched to relative paths |

## How to apply

1. Replace all 4 files in your project
2. **Locally**: `npm run dev` should work exactly as before — the proxy
   makes relative paths work in dev too
3. **Commit and push** to GitHub:
   ```powershell
   git add .
   git commit -m "Fix deployment: serve frontend from Express, relative API paths"
   git push origin main
   ```
4. Render should auto-redeploy on push. If not, trigger a manual deploy.

## One thing to verify on Render's dashboard

Check that Render's **Start Command** is set to `npm start` (or `node server.js`
directly) — not left blank or set to something else. Also confirm the
**Build Command** is `npm install && npm run build` so the `dist/` folder
this server now depends on actually gets created before the server starts.
