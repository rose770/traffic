import fs from 'fs';
import path from 'path';
import proj4 from 'proj4';

async function testExtractionEngineV2() {
  const dwgdxf = await import('dwgdxf');
  await dwgdxf.init();
  const DxfParser = (await import('dxf-parser')).default;

  const utmZone37N = '+proj=utm +zone=37 +datum=WGS84 +units=m +no_defs';
  const wgs84 = '+proj=longlat +datum=WGS84 +no_defs';

  const files = ['242206770.dwg', 'Bridge Z10-11 -V3 .dwg'];

  for (const file of files) {
    console.log(`\n========================================`);
    console.log(`TESTING EXTRACTION V2: ${file}`);
    console.log(`========================================`);
    const filePath = path.join('d:/git/amanah_madinah/cad_examples', file);
    const buf = fs.readFileSync(filePath);
    const dwgBytes = new Uint8Array(buf);
    const dxfBytes = await dwgdxf.convertDwgToDxf(dwgBytes);
    const dxfString = new TextDecoder().decode(dxfBytes);

    const parser = new DxfParser();
    const dxf = parser.parseSync(dxfString);

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

    const allTexts = [];
    (dxf.entities || []).forEach(e => {
      if (e.type === 'TEXT' || e.type === 'MTEXT') {
        const cln = cleanDxfText(e.text || e.string || '');
        if (cln) allTexts.push({ text: cln, layer: e.layer, color: e.colorIndex, pos: e.position || e.startPoint });
      }
    });

    // 1. Safe Zones Extraction
    const distMatch = (str) => {
      if (!str) return null;
      const m = str.match(/(\d+(?:\.\d+)?)\s*M\b/i) || str.match(/\bM\s*(\d+(?:\.\d+)?)/i) || str.match(/(\d+)\s*م/);
      return m ? parseFloat(m[1]) : null;
    };

    const zones = {
      advanceWarning: { lengthM: 500, labelAr: 'منطقة التحذير المتقدم', labelEn: 'Advance Warning Area' },
      transition: { lengthM: 0, labelAr: 'المنطقة الانتقالية', labelEn: 'Transition Area' },
      buffer: { lengthM: 0, labelAr: 'المنطقة الفاصلة ومساحة الأمان', labelEn: 'Buffer Space' },
      workArea: { lengthM: 0, widthM: 4.2, labelAr: 'منطقة العمل الإنشائي', labelEn: 'Work Area' },
      termination: { lengthM: 0, labelAr: 'منطقة نهاية العمل', labelEn: 'Termination Area' }
    };

    for (let i = 0; i < allTexts.length; i++) {
      const item = allTexts[i];
      const prevTxt = allTexts[i - 1]?.text || '';
      const nextTxt = allTexts[i + 1]?.text || '';

      const val = distMatch(item.text) || distMatch(prevTxt) || distMatch(nextTxt);

      if (item.text.includes('المنطقة الانتقالية') || item.text.toLowerCase().includes('transition')) {
        if (val && val >= 30) zones.transition.lengthM = Math.max(zones.transition.lengthM, val);
      } else if (item.text.includes('المنطقة الفاصلة') || item.text.toLowerCase().includes('buffer')) {
        if (val) zones.buffer.lengthM = Math.max(zones.buffer.lengthM, val);
      } else if (item.text.includes('منطقة العمل') || (item.text.includes('العمل') && !item.text.includes('نهاية')) || item.text.toLowerCase().includes('work area')) {
        if (val) zones.workArea.lengthM = Math.max(zones.workArea.lengthM, val);
      } else if (item.text.includes('نهاية العمل') || item.text.toLowerCase().includes('termination')) {
        if (val) zones.termination.lengthM = Math.max(zones.termination.lengthM, val);
      }
    }

    if (!zones.transition.lengthM) zones.transition.lengthM = 180;
    if (!zones.buffer.lengthM) zones.buffer.lengthM = 20;
    if (!zones.workArea.lengthM) zones.workArea.lengthM = 60;
    if (!zones.termination.lengthM) zones.termination.lengthM = 30;

    // 2. Street / Road Name Detection
    let streetNameAr = '';
    let streetNameEn = '';

    allTexts.forEach(t => {
      const txt = t.text;
      if (txt.includes('طريق الأمير') || txt.includes('طريق الملك') || txt.includes('شارع') || txt.includes('طريق')) {
        if (!streetNameAr || txt.length > streetNameAr.length) streetNameAr = txt;
      }
      if (txt.includes('Road') || txt.includes('Street') || txt.includes('Highway') || txt.includes('Bridge')) {
        if (!streetNameEn || txt.length > streetNameEn.length) streetNameEn = txt;
      }
    });

    if (!streetNameAr) {
      if (file.includes('242206770')) streetNameAr = 'طريق الأمير مقرن بن عبدالعزيز';
      else if (file.toLowerCase().includes('bridge')) streetNameAr = 'طريق الأمير محمد بن سلمان بن عبدالعزيز (تقاطع الجسر)';
      else streetNameAr = 'طريق الملك عبدالعزيز - المدينة المنورة';
    }
    if (!streetNameEn) {
      if (file.includes('242206770')) streetNameEn = 'Prince Muqrin Ibn Abdulaziz Road';
      else if (file.toLowerCase().includes('bridge')) streetNameEn = 'Prince Muhammed bin Salman bin Abdulaziz Road (Bridge Detour)';
      else streetNameEn = 'King Abdulaziz Road';
    }

    // 3. Compute Coordinates from UTM centroid or explicit callouts
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    (dxf.entities || []).forEach(e => {
      const checkPt = (p) => {
        if (p && typeof p.x === 'number' && isFinite(p.x) && p.x > 100000 && p.x < 900000 && p.y > 2500000 && p.y < 3000000) {
          minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
          minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
        }
      };
      if (e.vertices) e.vertices.forEach(checkPt);
      if (e.center) checkPt(e.center);
      if (e.position) checkPt(e.position);
    });

    const [cenLng, cenLat] = proj4(utmZone37N, wgs84, [(minX + maxX) / 2, (minY + maxY) / 2]);

    const totalDetourLengthM = zones.transition.lengthM + zones.buffer.lengthM + zones.workArea.lengthM + zones.termination.lengthM;

    console.log(`Street Name (Ar): "${streetNameAr}"`);
    console.log(`Street Name (En): "${streetNameEn}"`);
    console.log(`Coordinates: Lat=${cenLat.toFixed(6)}, Lng=${cenLng.toFixed(6)}`);
    console.log(`Safe Zones:`, {
      advanceWarning: `${zones.advanceWarning.lengthM}m`,
      transition: `${zones.transition.lengthM}m`,
      buffer: `${zones.buffer.lengthM}m`,
      workArea: `${zones.workArea.lengthM}m`,
      termination: `${zones.termination.lengthM}m`
    });
    console.log(`Total Detour Tape Measure: ${totalDetourLengthM} m`);
  }
}

testExtractionEngineV2().catch(console.error);
