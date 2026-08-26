import fs from 'fs';
import path from 'path';
import { parseCadClientSide } from './src/utils/cadClientParser.js';

async function testParser() {
  const filePath = 'd:/git/amanah_madinah/cad_examples/road_detour_diagram (1).dxf';
  const fileContent = fs.readFileSync(filePath, 'utf8');

  console.log('\n=== TESTING parseCadClientSide on road_detour_diagram (1).dxf ===');
  const result = await parseCadClientSide(fileContent, 'road_detour_diagram (1).dxf', 24.4686, 39.6120);

  console.log('Result success!');
  console.log('Features count:', result.geojson.features.length);
  console.log('Detected MOT Signs count:', result.detectedMotSigns?.length);
  console.log('Detected MOT Signs:', result.detectedMotSigns);
  console.log('Layers:', result.layers);
  console.log('Keymap:', result.keymap);
  console.log('Extracted Info:', result.extractedInfo);
}

testParser().catch(console.error);
