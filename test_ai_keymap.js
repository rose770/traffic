import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
dotenv.config();

async function testAiKeymapClassifier() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('Using Gemini API Key:', apiKey ? 'Loaded' : 'Missing');

  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey });

  const dwgdxf = await import('dwgdxf');
  await dwgdxf.init();
  const DxfParser = (await import('dxf-parser')).default;

  const buf = fs.readFileSync('d:/git/amanah_madinah/cad_examples/242206770.dwg');
  const dwgBytes = new Uint8Array(buf);
  const dxfBytes = await dwgdxf.convertDwgToDxf(dwgBytes);
  const dxfString = new TextDecoder().decode(dxfBytes);

  const parser = new DxfParser();
  const dxf = parser.parseSync(dxfString);

  // Extract layer info
  const rawLayers = Object.entries(dxf.tables?.layer?.layers || {}).map(([name, info]) => {
    return {
      name,
      color: info.color || 7,
      entities: (dxf.entities || []).filter(e => e.layer === name).map(e => e.type),
      sampleTexts: (dxf.entities || []).filter(e => e.layer === name && (e.type === 'TEXT' || e.type === 'MTEXT')).map(e => e.text || e.string || '').slice(0, 5)
    };
  });

  console.log('Raw layers extracted:', rawLayers.map(l => ({ name: l.name, count: l.entities.length, sampleTexts: l.sampleTexts })));

  const prompt = `
You are a Traffic & Highway CAD GIS Expert for the Ministry of Transport and Madinah Municipality (أمانة منطقة المدينة المنورة).
You are analyzing AutoCAD layers from a traffic detour / road work construction blueprint.

Here are the raw layers in the CAD file:
${JSON.stringify(rawLayers, null, 2)}

Task:
Map every raw layer name (even if named '0', '1', '2', '32', 'Defpoints', 'R00', etc.) to a clear, professional Arabic and English engineering title for the Map Keymap / Legend (مفتاح الخريطة).

Respond with valid JSON ONLY in this format:
{
  "keymap": [
    {
      "layerName": "raw_layer_name",
      "titleAr": "Professional Arabic Name (e.g. مسار التحويلة المرورية الرئيسي)",
      "titleEn": "Professional English Name (e.g. Main Detour Traffic Path)",
      "category": "traffic_detour | work_zone | safety_barriers | signage | dimensions | cadastral | general",
      "colorHex": "#FF1744",
      "descriptionAr": "شرح وظيفة هذا العنصر في المخطط المروري",
      "icon": "🛣️ | 🚧 | 🛡️ | 🛑 | 📐 | 📍 | 🗺️"
    }
  ]
}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    console.log('\n--- AI KEYMAP CLASSIFICATION RESULT ---');
    console.log(response.text);
  } catch (err) {
    console.error('AI Error:', err);
  }
}

testAiKeymapClassifier().catch(console.error);
