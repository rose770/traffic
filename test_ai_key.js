import dotenv from 'dotenv';
dotenv.config();

async function testGeminiApiKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('API Key present:', !!apiKey, 'Starts with:', apiKey?.substring(0, 8));

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });
    
    // Test a basic generateContent call
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Translate to Arabic: "Traffic Detour Work Zone Keymap"'
    });
    console.log('Gemini 2.5 Flash Result:', response.text);
  } catch (err) {
    console.log('Gemini 2.5 Flash error:', err.message);
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: 'Translate to Arabic: "Traffic Detour Work Zone Keymap"'
      });
      console.log('Gemini 1.5 Flash Result:', response.text);
    } catch (e2) {
      console.log('Gemini 1.5 Flash error:', e2.message);
    }
  }
}

testGeminiApiKey().catch(console.error);
