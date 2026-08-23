import dotenv from 'dotenv';
dotenv.config();

async function testRestApi() {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Respond with JSON only: {"status": "ok", "message": "Keymap AI connected"}' }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });

    console.log('HTTP Status:', res.status);
    const data = await res.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Fetch Error:', err.message);
  }
}

testRestApi();
