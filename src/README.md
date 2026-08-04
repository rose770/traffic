# Colors/Names Reverted + Contractor Home Screen Cleaned Up

## What changed

### 1. Colors reverted to original teal/green
All Tahcom maroon values reverted back to the original theme (`#016b68`
primary, `#043531` dark, `#bfa260` gold) — the CSS variables, the hardcoded
colors in the Word export, and the 31 hardcoded colors in the road diagram
SVG that were touched during the maroon rebrand.

### 2. Project name/title reverted
- `package.json` → `"name": "amanah-madina"`
- `index.html` → `<title>amanah-madina</title>`

**Note:** I only reverted colors and the project name/title. The earlier
text cleanup (removing "Amanah"/"Madinah"/"municipal" wording from inside
the actual UI text) was **not** reverted, since that seemed separate from
what you asked for here — say so if you want that undone too.

### 3. Contractor Home Screen — no more empty box
Since Step 1's card was removed a couple rounds back, the contractor's Home
Screen was left with an empty box where the stage cards used to be. Now
that section doesn't render at all for the contractor role — they see:
- The Guide button
- The Checklist button
- Their request history log
- The "Continue to Submission" button at the bottom

The inspector's Home Screen (Steps 2–5 cards) is completely unaffected.

## Files in this zip

| File | Action |
|---|---|
| `index.css` | Colors reverted |
| `ConstructionPlanningInterface.jsx` | Hardcoded SVG colors reverted |
| `docxExport.js` | Hardcoded Word-export colors reverted |
| `ProcessHomeScreen.jsx` | Contractor stage-cards section removed entirely |
| `package.json` | Name reverted |
| `index.html` | Title reverted |

## How to apply

Replace all 6 files in `src\` (and project root for `package.json`/`index.html`),
restart `npm run dev`, hard-refresh.
