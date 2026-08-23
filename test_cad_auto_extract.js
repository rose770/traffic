import fs from 'fs';
import proj4 from 'proj4';

async function testCadExtraction() {
  const dwgdxf = await import('dwgdxf');
  await dwgdxf.init();
  const buf = fs.readFileSync('C:/Users/WIN 11/Downloads/242206770.dwg');
  const dwgBytes = new Uint8Array(buf);
  const dxfBytes = await dwgdxf.convertDwgToDxf(dwgBytes);
  const dxfString = new TextDecoder().decode(dxfBytes);

  const DxfParser = (await import('dxf-parser')).default;
  const parser = new DxfParser();
  const dxf = parser.parseSync(dxfString);

  console.log('Entities count:', dxf.entities?.length);

  // 1. Text cleaning helper
  const cleanDxfText = (raw) => {
    if (!raw) return '';
    let text = raw;
    text = text.replace(/\\P/g, ' ');
    text = text.replace(/\\[A-Za-z0-9_]+;/g, '');
    text = text.replace(/\\[A-Za-z]/g, '');
    text = text.replace(/[{}]/g, '');
    return text.replace(/\s+/g, ' ').trim();
  };

  // 2. Extract texts and positions
  const texts = [];
  dxf.entities.forEach(e => {
    if (e.type === 'TEXT' || e.type === 'MTEXT') {
      const cleaned = cleanDxfText(e.text || e.string || '');
      if (cleaned) texts.push({ text: cleaned, pos: e.position || e.startPoint, color: e.colorIndex });
    }
  });

  console.log('\n--- EXTRACTED TEXTS ---');
  texts.forEach(t => console.log(`[Color ${t.color}] "${t.text}"`));

  // 3. Zone Matching
  const zones = {
    transition: null,
    buffer: null,
    workArea: null,
    termination: null
  };

  // Scan texts for zones and associated distances (e.g. "المنطقة الانتقالية" near "180 M")
  for (let i = 0; i < texts.length; i++) {
    const t = texts[i];
    const nextT = texts[i + 1] ? texts[i + 1].text : '';
    const prevT = texts[i - 1] ? texts[i - 1].text : '';

    const distMatch = (str) => {
      const m = str.match(/(\d+)\s*M/i) || str.match(/M\s*(\d+)/i);
      return m ? parseFloat(m[1]) : null;
    };

    if (t.text.includes('المنطقة الانتقالية') || t.text.includes('Transition')) {
      const dist = distMatch(t.text) || distMatch(nextT) || distMatch(prevT) || 180;
      if (!zones.transition || dist > zones.transition) zones.transition = dist;
    } else if (t.text.includes('المنطقة الفاصلة') || t.text.includes('Buffer')) {
      const dist = distMatch(t.text) || distMatch(nextT) || distMatch(prevT) || 20;
      zones.buffer = dist;
    } else if (t.text.includes('منطقة العمل') || (t.text.includes('العمل') && !t.text.includes('نهاية'))) {
      const dist = distMatch(t.text) || distMatch(nextT) || distMatch(prevT) || 60;
      zones.workArea = dist;
    } else if (t.text.includes('نهاية العمل') || t.text.includes('Termination')) {
      const dist = distMatch(t.text) || distMatch(nextT) || distMatch(prevT) || 30;
      zones.termination = dist;
    }
  }

  console.log('\n--- EXTRACTED TRAFFIC ZONES ---', zones);

  // 4. Coordinates & Street Name
  let controlCoords = [];
  texts.forEach(t => {
    const eMatch = t.text.match(/E:\s*([0-9.]+)/i);
    const nMatch = t.text.match(/N:\s*([0-9.]+)/i);
    if (eMatch) controlCoords.push({ lng: parseFloat(eMatch[1]) });
    if (nMatch) controlCoords.push({ lat: parseFloat(nMatch[1]) });
  });

  console.log('\n--- EXTRACTED COORDINATES ---', controlCoords);

  // 5. Calculate Total Tape Measure
  const totalDetourLength = (zones.transition || 0) + (zones.buffer || 0) + (zones.workArea || 0) + (zones.termination || 0);
  console.log('Total Detour Length (m):', totalDetourLength);
}

testCadExtraction().catch(console.error);
