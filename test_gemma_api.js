import dotenv from 'dotenv';
dotenv.config();

async function checkModelsAndTestGemma() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('Using API Key:', apiKey?.substring(0, 8) + '...');

  // 1. Fetch available models from Google API
  const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const res = await fetch(listUrl);
  const data = await res.json();

  if (data.error) {
    console.error('Error listing models:', data.error);
    return;
  }

  const allModels = data.models || [];
  console.log(`Total models available: ${allModels.length}`);

  const gemmaModels = allModels.filter(m => m.name.toLowerCase().includes('gemma'));
  console.log('\n--- AVAILABLE GEMMA MODELS ---');
  gemmaModels.forEach(m => {
    console.log(`- ${m.name} (${m.displayName}) - Supported: ${m.supportedGenerationMethods?.join(', ')}`);
  });

  const flashModels = allModels.filter(m => m.name.toLowerCase().includes('flash'));
  console.log('\n--- AVAILABLE FLASH MODELS ---');
  flashModels.forEach(m => {
    console.log(`- ${m.name} (${m.displayName})`);
  });

  // 2. Test Gemma Model if available
  const samplePrompt = `You are a Traffic CAD Engineer in Madinah.
Given CAD layers: ["0", "1-ROAD", "SIGN", "0-dim", "تنظيم"].
Provide a JSON keymap with Arabic titles.`;

  for (const gm of gemmaModels) {
    const modelName = gm.name.replace('models/', '');
    console.log(`\nTesting Gemma model: ${modelName}...`);
    const startT = Date.now();
    try {
      const gemmaUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const gRes = await fetch(gemmaUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: samplePrompt }] }]
        })
      });
      const gData = await gRes.json();
      const elapsed = Date.now() - startT;
      console.log(`Status: ${gRes.status} (took ${elapsed}ms)`);
      if (gData.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.log(`Response text (${modelName}):\n`, gData.candidates[0].content.parts[0].text.substring(0, 300));
      } else {
        console.log('Error/Response:', JSON.stringify(gData, null, 2));
      }
    } catch (e) {
      console.error(`Failed ${modelName}:`, e.message);
    }
  }

  // 3. Test Gemini 2.5 Flash for comparison
  console.log(`\nTesting Gemini 2.5 Flash comparison...`);
  const startFlash = Date.now();
  try {
    const flashUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const fRes = await fetch(flashUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: samplePrompt }] }]
      })
    });
    const fData = await fRes.json();
    const elapsed = Date.now() - startFlash;
    console.log(`Flash Status: ${fRes.status} (took ${elapsed}ms)`);
    if (fData.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.log(`Response text (gemini-2.5-flash):\n`, fData.candidates[0].content.parts[0].text.substring(0, 300));
    }
  } catch (e) {
    console.error(`Failed flash:`, e.message);
  }
}

checkModelsAndTestGemma().catch(console.error);
