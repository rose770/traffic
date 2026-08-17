import fs from 'fs';

async function testTextCleaning() {
  const dwgdxf = await import('dwgdxf');
  await dwgdxf.init();
  const buf = fs.readFileSync('C:/Users/WIN 11/Downloads/242206770.dwg');
  const dwgBytes = new Uint8Array(buf);
  const dxfBytes = await dwgdxf.convertDwgToDxf(dwgBytes);
  const dxfString = new TextDecoder().decode(dxfBytes);

  const DxfParser = (await import('dxf-parser')).default;
  const parser = new DxfParser();
  const dxf = parser.parseSync(dxfString);

  function cleanDxfText(raw) {
    if (!raw) return '';
    let text = raw;
    // Replace \P, \p, \X with newline or space
    text = text.replace(/\\[PpXx]/g, ' ');
    // Remove formatting codes like \fArial|...; \C0; \H1.5; \W0.8; \Q15; \A1; \pxqc;
    text = text.replace(/\\f[^;]+;/gi, '');
    text = text.replace(/\\[CcHhWwQqAaFfTt][^;]*;/gi, '');
    text = text.replace(/\\p[a-z0-9]+;/gi, '');
    text = text.replace(/\\S[^;]*;/gi, '');
    text = text.replace(/\\L|\\l|\\O|\\o|\\K|\\k/g, ''); // Underline, overline, strike
    // Remove { and }
    text = text.replace(/[{}]/g, '');
    // Replace symbols
    text = text.replace(/%%c/gi, '⌀');
    text = text.replace(/%%d/gi, '°');
    text = text.replace(/%%p/gi, '±');
    // Remove multiple spaces
    text = text.replace(/\s+/g, ' ').trim();
    return text;
  }

  console.log('--- ALL TEXT & MTEXT IN DWG ---');
  dxf.entities.forEach((e, idx) => {
    if (e.type === 'TEXT' || e.type === 'MTEXT') {
      const raw = e.text || e.string || '';
      console.log(`[${e.type}] Layer: ${e.layer} | Raw: "${raw}" -> Cleaned: "${cleanDxfText(raw)}"`);
    }
  });

  // Check all layers and their entities
  const layerStats = {};
  dxf.entities.forEach(e => {
    layerStats[e.layer] = (layerStats[e.layer] || { count: 0, types: new Set() });
    layerStats[e.layer].count++;
    layerStats[e.layer].types.add(e.type);
  });

  console.log('--- LAYER STATS ---');
  for (const [layer, data] of Object.entries(layerStats)) {
    console.log(`Layer: "${layer}", Count: ${data.count}, Types: ${Array.from(data.types).join(', ')}`);
  }
}

testTextCleaning().catch(console.error);
