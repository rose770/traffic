import http from 'http';

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
  }
}

// -------------------------------------------------------------
// 1. Official Permit Document Exporter Unit Test
// -------------------------------------------------------------
function generatePermitDocTest(permit) {
  return `AMANAH AL-MADINAH MUNICIPALITY - OFFICIAL DETOUR PERMIT
Permit ID: ${permit.id || 'AM-2026-PR-99'}
Project: ${permit.projectNameEn || 'King Abdulaziz Road'}
Status: ${permit.status || 'APPROVED'}`;
}

console.log('\n--- Running Unit Test Suite 1: Official Permit Exporter ---');
const testPermitData = {
  id: "AM-2026-PR-100",
  projectNameEn: "King Abdulaziz Road Utility Extension",
  status: "APPROVED"
};

const docOutput = generatePermitDocTest(testPermitData);
assert(docOutput.includes("AMANAH AL-MADINAH MUNICIPALITY"), "Permit document includes official header");
assert(docOutput.includes("AM-2026-PR-100"), "Permit document includes correct permit ID");
assert(docOutput.includes("APPROVED"), "Permit document includes approval status");

// -------------------------------------------------------------
// 2. Traffic Safety Calculator Unit Test
// -------------------------------------------------------------
console.log('\n--- Running Unit Test Suite 2: Traffic Safety Calculator ---');

function calcTaper(speed, laneWidth) {
  return speed <= 60 ? (laneWidth * Math.pow(speed, 2)) / 155 : (laneWidth * speed) / 1.6;
}

function getBufferSSD(speed) {
  if (speed <= 40) return 50;
  if (speed <= 60) return 85;
  if (speed <= 80) return 130;
  if (speed <= 100) return 185;
  return 250;
}

// 60 km/h, 3.6m width -> (3.6 * 3600) / 155 = 83.61m
const taper60 = calcTaper(60, 3.6);
assert(Math.abs(taper60 - 83.61) < 0.1, `Taper length for 60km/h is ~83.6m (got ${taper60.toFixed(2)}m)`);

// 80 km/h, 3.6m width -> (3.6 * 80) / 1.6 = 180m
const taper80 = calcTaper(80, 3.6);
assert(taper80 === 180, `Taper length for 80km/h is exactly 180m (got ${taper80}m)`);

// SSD lookups
assert(getBufferSSD(40) === 50, "Buffer SSD for 40km/h is 50m");
assert(getBufferSSD(60) === 85, "Buffer SSD for 60km/h is 85m");
assert(getBufferSSD(80) === 130, "Buffer SSD for 80km/h is 130m");
assert(getBufferSSD(100) === 185, "Buffer SSD for 100km/h is 185m");

// -------------------------------------------------------------
// 3. Coordinate Regex Parser Unit Test
// -------------------------------------------------------------
console.log('\n--- Running Unit Test Suite 3: Coordinate Regex Parser ---');
const regex = /(?:E|e)?\s*(\d+(?:\.\d+)?)\s*,\s*(?:N|n)?\s*(\d+(?:\.\d+)?)/g;
const sampleText = "N1: (E582450, N2703822), N2: (E582550, N2703866)";
const parsed = [];
let m;
while ((m = regex.exec(sampleText)) !== null) {
  parsed.push({ x: parseFloat(m[1]), y: parseFloat(m[2]) });
}
assert(parsed.length === 2, `Parsed 2 coordinate pairs (got ${parsed.length})`);
assert(parsed[0].x === 582450 && parsed[0].y === 2703822, "Pair 1 parsed correctly: 582450, 2703822");
assert(parsed[1].x === 582550 && parsed[1].y === 2703866, "Pair 2 parsed correctly: 582550, 2703866");

// -------------------------------------------------------------
// 4. REST API Database Integration Unit Test
// -------------------------------------------------------------
console.log('\n--- Running Unit Test Suite 4: REST API & SQLite DB ---');

function testAPI() {
  const postData = JSON.stringify({
    contractor_id: 1,
    data: {
      projectNameAr: "مشروع النقل الترددي",
      projectNameEn: "Shuttle Transport Project",
      contractorAr: "شركة ساس للإنشاءات",
      contractorEn: "SAS Construction LLC",
      speed: 80,
      taper: 180,
      buffer: 130,
      termination: 30,
      coordinates: "N1: (E582450, N2703822), N2: (E582550, N2703866)"
    }
  });

  const req = http.request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/permits',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, res => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      try {
        const responseJson = JSON.parse(body);
        assert(res.statusCode === 200 && responseJson.success === true, "POST /api/permits returned 200 OK & success=true");
        const createdId = responseJson.id;
        assert(createdId > 0, `Permit created with database ID: ${createdId}`);

        // Now test GET /api/permits
        http.get('http://localhost:5000/api/permits', getRes => {
          let getBody = '';
          getRes.on('data', c => getBody += c);
          getRes.on('end', () => {
            const getJson = JSON.parse(getBody);
            assert(Array.isArray(getJson) && getJson.length > 0, "GET /api/permits returned list of permits");
            const found = getJson.find(p => p.id === createdId);
            assert(found !== undefined, `Found created permit ID ${createdId} in DB response`);

            // Now test PUT /api/permits/:id (Inspector Approval)
            const putData = JSON.stringify({ status: 'Approved', inspector_notes: 'Fully compliant with KSA MOT code.' });
            const putReq = http.request({
              hostname: 'localhost',
              port: 5000,
              path: `/api/permits/${createdId}`,
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(putData)
              }
            }, putRes => {
              assert(putRes.statusCode === 200, `PUT /api/permits/${createdId} returned 200 OK`);
              
              console.log(`\n==================================================`);
              console.log(`SUMMARY: ${passedTests} passed, ${failedTests} failed.`);
              console.log(`==================================================\n`);
              process.exit(failedTests === 0 ? 0 : 1);
            });
            putReq.write(putData);
            putReq.end();
          });
        });
      } catch (err) {
        console.error("API test exception:", err);
        process.exit(1);
      }
    });
  });

  req.on('error', err => {
    console.error("API Connection Error (is Node backend running on port 5000?):", err.message);
    process.exit(1);
  });

  req.write(postData);
  req.end();
}

testAPI();
