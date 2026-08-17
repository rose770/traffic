import fs from 'fs';

async function inspectAllEntitiesAndColors() {
  const dwgdxf = await import('dwgdxf');
  await dwgdxf.init();
  const buf = fs.readFileSync('C:/Users/WIN 11/Downloads/242206770.dwg');
  const dwgBytes = new Uint8Array(buf);
  const dxfBytes = await dwgdxf.convertDwgToDxf(dwgBytes);
  const dxfString = new TextDecoder().decode(dxfBytes);

  const DxfParser = (await import('dxf-parser')).default;
  const parser = new DxfParser();
  const dxf = parser.parseSync(dxfString);

  console.log('=== ALL 54 ENTITIES IN 242206770.DWG ===');
  dxf.entities.forEach((e, i) => {
    console.log(`[#${i}] Type: ${e.type}, Layer: "${e.layer}", ColorIndex: ${e.colorIndex}, Color: ${e.color}, Lineweight: ${e.lineweight}`);
    if (e.text || e.string) console.log(`    Text: "${e.text || e.string}", Rotation: ${e.rotation}`);
    if (e.name) console.log(`    Block Name: "${e.name}", Pos:`, e.position);
    if (e.vertices) {
      console.log(`    Vertices (${e.vertices.length}):`, e.vertices.map(v => `(${v.x.toFixed(1)}, ${v.y.toFixed(1)})`).join(' -> '));
      if (e.shape) console.log(`    Closed shape: true`);
    }
    if (e.type === 'SOLID') {
      console.log(`    SOLID corners:`, [e.corner1, e.corner2, e.corner3, e.corner4]);
    }
  });

  console.log('\n=== LAYER TABLE COLORS ===');
  for (const [name, layer] of Object.entries(dxf.tables?.layer?.layers || {})) {
    console.log(`Layer "${name}": colorIndex=${layer.color}, color=${layer.colorIndex || layer.color}`);
  }
}

inspectAllEntitiesAndColors().catch(console.error);
