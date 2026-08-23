import fs from 'fs';
import path from 'path';

async function inspectAllCadExamples() {
  const dwgdxf = await import('dwgdxf');
  await dwgdxf.init();
  const DxfParser = (await import('dxf-parser')).default;

  const files = fs.readdirSync('d:/git/amanah_madinah/cad_examples').filter(f => f.endsWith('.dwg') || f.endsWith('.dxf'));
  console.log('Files to inspect:', files);

  for (const file of files) {
    console.log(`\n========================================`);
    console.log(`INSPECTING: ${file}`);
    console.log(`========================================`);
    const filePath = path.join('d:/git/amanah_madinah/cad_examples', file);
    const buf = fs.readFileSync(filePath);
    const dwgBytes = new Uint8Array(buf);
    const dxfBytes = await dwgdxf.convertDwgToDxf(dwgBytes);
    const dxfString = new TextDecoder().decode(dxfBytes);

    const parser = new DxfParser();
    const dxf = parser.parseSync(dxfString);

    console.log(`Entities count: ${dxf.entities?.length || 0}`);
    console.log(`Layers count: ${Object.keys(dxf.tables?.layer?.layers || {}).length}`);
    console.log(`Blocks count: ${Object.keys(dxf.blocks || {}).length}`);

    // Clean text function
    const cleanDxfText = (raw) => {
      if (!raw) return '';
      let text = raw;
      text = text.replace(/\\P/g, ' ');
      text = text.replace(/\\[A-Za-z0-9_]+;/g, '');
      text = text.replace(/\\[A-Za-z]/g, '');
      text = text.replace(/[{}]/g, '');
      text = text.replace(/%%c/gi, '⌀');
      text = text.replace(/%%d/gi, '°');
      text = text.replace(/%%p/gi, '±');
      return text.replace(/\s+/g, ' ').trim();
    };

    const textItems = [];
    const dimensionItems = [];
    const lineEntities = [];
    const polygonEntities = [];

    // Scan entities
    const scanEntities = (entities) => {
      (entities || []).forEach(e => {
        if (e.type === 'TEXT' || e.type === 'MTEXT') {
          const t = cleanDxfText(e.text || e.string || '');
          if (t) textItems.push({ text: t, layer: e.layer, color: e.colorIndex, pos: e.position || e.startPoint });
        }
        if (e.type === 'DIMENSION') {
          dimensionItems.push(e);
        }
        if (e.type === 'LINE' || e.type === 'LWPOLYLINE') {
          lineEntities.push(e);
          if (e.shape || (e.vertices && e.vertices.length > 2)) {
            polygonEntities.push(e);
          }
        }
      });
    };

    scanEntities(dxf.entities);

    console.log(`\n--- ALL TEXT ENTITIES (${textItems.length}) ---`);
    textItems.slice(0, 50).forEach((t, i) => {
      console.log(`[#${i}] (Layer: "${t.layer}", Col: ${t.color}) "${t.text}" at (${t.pos?.x?.toFixed(1)}, ${t.pos?.y?.toFixed(1)})`);
    });
    if (textItems.length > 50) {
      console.log(`... and ${textItems.length - 50} more texts.`);
    }

    console.log(`\n--- LAYER NAMES ---`);
    console.log(Object.keys(dxf.tables?.layer?.layers || {}));

    console.log(`\n--- BLOCK NAMES ---`);
    console.log(Object.keys(dxf.blocks || {}));
  }
}

inspectAllCadExamples().catch(console.error);
