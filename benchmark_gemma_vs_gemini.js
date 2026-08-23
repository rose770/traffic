import dotenv from 'dotenv';
dotenv.config();

const layersData = [
  { name: '0', color: 7, entityCount: 45, sampleTexts: ['TRANSITION ZONE 180 M', 'WORK ZONE 60 M', 'BUFFER ZONE 20 M'] },
  { name: '1-ROAD', color: 7, entityCount: 8, sampleTexts: [] },
  { name: 'SIGN', color: 5, entityCount: 12, sampleTexts: ['قف', 'تمهل - أعمال طريق'] },
  { name: '0-dim', color: 7, entityCount: 6, sampleTexts: ['180.00', '60.00'] },
  { name: 'تنظيم', color: 4, entityCount: 4, sampleTexts: ['خط التنظيم'] },
  { name: 'CADR-YEL', color: 2, entityCount: 14, sampleTexts: [] },
  { name: 'HATCH 90%', color: 7, entityCount: 1, sampleTexts: [] }
];

const prompt = `You are a Senior Traffic CAD GIS Specialist for Madinah Municipality (أمانة منطقة المدينة المنورة).
Analyze these AutoCAD layers from a traffic detour blueprint:
${JSON.stringify(layersData, null, 2)}

Generate a clean JSON keymap array for these layers.
Return ONLY valid JSON matching:
{
  "keymap": [
    {
      "layerName": "0",
      "titleAr": "المعلومات العامة وتحديد مناطق التحويلة",
      "titleEn": "General Detour Information & Safe Zones",
      "category": "traffic_detour",
      "icon": "🛣️",
      "colorHex": "#FF1744"
    }
  ]
}`;

async function benchmark() {
  const apiKey = process.env.GEMINI_API_KEY;

  console.log('=== 1. Testing Gemma 4 26B (gemma-4-26b-a4b-it) ===');
  const gemmaStart = Date.now();
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemma-4-26b-a4b-it:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });
    const data = await res.json();
    const gemmaElapsed = Date.now() - gemmaStart;
    console.log(`Gemma Status: ${res.status} | Time: ${gemmaElapsed}ms`);
    console.log('Gemma Output:\n', data.candidates?.[0]?.content?.parts?.[0]?.text?.substring(0, 400));
  } catch (e) {
    console.error('Gemma Failed:', e.message);
  }

  console.log('\n=== 2. Testing Gemini 2.5 Flash (gemini-2.5-flash) ===');
  const flashStart = Date.now();
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });
    const data = await res.json();
    const flashElapsed = Date.now() - flashStart;
    console.log(`Gemini Flash Status: ${res.status} | Time: ${flashElapsed}ms`);
    console.log('Flash Output:\n', data.candidates?.[0]?.content?.parts?.[0]?.text?.substring(0, 400));
  } catch (e) {
    console.error('Flash Failed:', e.message);
  }

  console.log('\n=== 3. Testing Gemini 2.5 Flash Lite (gemini-2.5-flash-lite) ===');
  const liteStart = Date.now();
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });
    const data = await res.json();
    const liteElapsed = Date.now() - liteStart;
    console.log(`Flash Lite Status: ${res.status} | Time: ${liteElapsed}ms`);
    console.log('Flash Lite Output:\n', data.candidates?.[0]?.content?.parts?.[0]?.text?.substring(0, 400));
  } catch (e) {
    console.error('Lite Failed:', e.message);
  }
}

benchmark().catch(console.error);
