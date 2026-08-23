import { geocodingService, MADINAH_GIS_ROADS } from './src/services/geocodingService.js';

async function testSearchSpeed() {
  console.log(`Madinah GIS Roads indexed: ${MADINAH_GIS_ROADS.length}`);

  const testQueries = ['مقرن', 'الملك فهد', 'سلطانة', 'الدائري', 'الهجرة', 'قباء', 'طريق السلام'];

  for (const q of testQueries) {
    const t0 = performance.now();
    const results = await geocodingService.searchRoads(q);
    const t1 = performance.now();
    console.log(`Query: "${q}" -> Found ${results.length} results in ${(t1 - t0).toFixed(2)}ms`);
    if (results.length > 0) {
      console.log(`  Top match: ${results[0].name} (${results[0].lat}, ${results[0].lng})`);
    }
  }
}

testSearchSpeed().catch(console.error);
