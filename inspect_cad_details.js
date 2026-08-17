import fs from 'fs';

async function inspectAllBlocksAndEntities() {
  const dwgdxf = await import('dwgdxf');
  await dwgdxf.init();
  const buf = fs.readFileSync('C:/Users/WIN 11/Downloads/242206770.dwg');
  const dwgBytes = new Uint8Array(buf);
  const dxfBytes = await dwgdxf.convertDwgToDxf(dwgBytes);
  const dxfString = new TextDecoder().decode(dxfBytes);

  const DxfParser = (await import('dxf-parser')).default;
  const parser = new DxfParser();
  const dxf = parser.parseSync(dxfString);

  console.log('=== BLOCKS IN DWG ===');
  for (const [blockName, block] of Object.entries(dxf.blocks || {})) {
    console.log(`Block "${blockName}": entities=${block.entities?.length}`);
    const types = {};
    (block.entities || []).forEach(e => { types[e.type] = (types[e.type] || 0) + 1; });
    console.log(`  Types:`, types);
  }

  console.log('\n=== MAIN ENTITIES ===');
  dxf.entities.forEach((e, idx) => {
    console.log(`Entity ${idx}: type=${e.type}, layer="${e.layer}", colorIndex=${e.colorIndex}, color=${e.color}`, {
      rotation: e.rotation,
      text: e.text || e.string,
      name: e.name,
      verticesCount: e.vertices?.length,
      start: e.vertices ? e.vertices[0] : (e.position || e.startPoint)
    });
  });
}

inspectAllBlocksAndEntities().catch(console.error);
