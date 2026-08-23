import fs from 'fs';

async function testParseApi() {
  const fileBuf = fs.readFileSync('d:/git/amanah_madinah/cad_examples/242206770.dwg');
  const blob = new Blob([fileBuf], { type: 'application/octet-stream' });
  const formData = new FormData();
  formData.append('dwgFile', blob, '242206770.dwg');

  console.log('Sending /api/parse-dwg request...');
  const res = await fetch('http://localhost:5000/api/parse-dwg', {
    method: 'POST',
    body: formData
  });

  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Success:', data.success);
  console.log('Total Features:', data.totalFeatures);
  console.log('AI Keymap:', JSON.stringify(data.keymap, null, 2));
  console.log('Sample Layer names:', data.layers?.map(l => ({ raw: l.name, titleAr: l.displayNameAr, icon: l.icon })));
}

// wait 2s for server
setTimeout(testParseApi, 2000);
