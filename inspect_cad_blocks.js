import fs from 'fs';

async function inspectBlocks() {
  const dwgdxf = await import('dwgdxf');
  await dwgdxf.init();
  const buf = fs.readFileSync('C:/Users/WIN 11/Downloads/242206770.dwg');
  const dwgBytes = new Uint8Array(buf);
  const dxfBytes = await dwgdxf.convertDwgToDxf(dwgBytes);
  const dxfString = new TextDecoder().decode(dxfBytes);

  const DxfParser = (await import('dxf-parser')).default;
  const parser = new DxfParser();
  const dxf = parser.parseSync(dxfString);

  console.log('=== BLOCKS DETAILS ===');
  for (const [blockName, block] of Object.entries(dxf.blocks || {})) {
    console.log(`\nBlock: "${blockName}" (entities: ${block.entities?.length})`);
    (block.entities || []).forEach((e, i) => {
      console.log(`  [${i}] ${e.type} layer=${e.layer} colorIndex=${e.colorIndex} color=${e.color}`);
    });
  }
}

inspectBlocks().catch(console.error);
