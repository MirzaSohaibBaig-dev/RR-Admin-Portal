const BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('🧪 Starting Backend API Verification Tests...\n');
  let passed = 0;
  let failed = 0;

  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}:`, err.message);
      failed++;
    }
  };

  // 1. Drivers Stats
  await test('GET /api/drivers/stats (KPI Stats)', async () => {
    const res = await fetch(`${BASE}/drivers/stats`);
    const json = await res.json();
    if (!json.success || !json.data.approvalRate) throw new Error('Invalid response');
  });

  // 2. Drivers Filter (PENDING)
  await test('GET /api/drivers?status=PENDING', async () => {
    const res = await fetch(`${BASE}/drivers?status=PENDING&page=1&limit=10`);
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data.drivers)) throw new Error('Invalid response');
  });

  // 3. Available Drivers
  await test('GET /api/drivers/available', async () => {
    const res = await fetch(`${BASE}/drivers/available?rideLocation=Islamabad&vehicleType=Executive`);
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data)) throw new Error('Invalid response');
  });

  // 4. Get Driver By ID
  await test('GET /api/drivers/:id', async () => {
    const res = await fetch(`${BASE}/drivers/DRV-1001`);
    const json = await res.json();
    if (!json.success || json.data.driverId !== 'DRV-1001') throw new Error('Driver not found');
  });

  // 5. Create Driver (Manual/App)
  await test('POST /api/drivers', async () => {
    const res = await fetch(`${BASE}/drivers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Kamran Akmal',
        email: 'kamran.akmal@test.com',
        phone: '+92 300 9988776',
        vehicleType: 'Sedan',
        source: 'MANUAL'
      })
    });
    const json = await res.json();
    if (!json.success || json.data.status !== 'PENDING') throw new Error('Create failed');
  });

  // 6. Approve Driver
  await test('PUT /api/drivers/:id/approve', async () => {
    const res = await fetch(`${BASE}/drivers/DRV-1004/approve`, { method: 'PUT' });
    const json = await res.json();
    if (!json.success || json.data.status !== 'APPROVED') throw new Error('Approve failed');
  });

  // 7. Reject Driver
  await test('PUT /api/drivers/:id/reject', async () => {
    const res = await fetch(`${BASE}/drivers/DRV-1005/reject`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Incomplete document' })
    });
    const json = await res.json();
    if (!json.success || json.data.status !== 'REJECTED') throw new Error('Reject failed');
  });

  // 8. Requests Stats
  await test('GET /api/requests/stats', async () => {
    const res = await fetch(`${BASE}/requests/stats`);
    const json = await res.json();
    if (!json.success || json.data.totalRides === undefined) throw new Error('Invalid response');
  });

  // 9. Pending Rides Queue (Screen 4 Monitor)
  await test('GET /api/requests/pending', async () => {
    const res = await fetch(`${BASE}/requests/pending`);
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data)) throw new Error('Invalid response');
  });

  // 10. Create Ride Request
  await test('POST /api/requests', async () => {
    const res = await fetch(`${BASE}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Hira Mani',
        pickupLocation: 'Islamabad F-6',
        dropLocation: 'Lahore Cantt',
        fare: 'Rs. 11,000',
        publishToPool: true,
        source: 'MANUAL'
      })
    });
    const json = await res.json();
    if (!json.success || json.data.status !== 'Visible') throw new Error('Create ride failed');
  });

  // 11. Toggle Ride Visibility
  await test('PUT /api/requests/:id/visibility', async () => {
    const res = await fetch(`${BASE}/requests/POOL-9001/visibility`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visibility: 'HIDDEN' })
    });
    const json = await res.json();
    if (!json.success || json.data.visibility !== 'HIDDEN') throw new Error('Visibility toggle failed');
  });

  // 12. Driver Requests Bids For Ride
  await test('GET /api/requests/:id/driver-requests', async () => {
    const res = await fetch(`${BASE}/requests/POOL-9001/driver-requests`);
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data.driverRequests)) throw new Error('Invalid response');
  });

  // 13. Create Assignment (Dispatch)
  await test('POST /api/assignments (Dispatch driver)', async () => {
    const res = await fetch(`${BASE}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: 'PR-8001',
        driverId: 'DRV-1001',
        remarks: 'Dispatched for morning trip'
      })
    });
    const json = await res.json();
    if (!json.success || json.data.status !== 'ASSIGNED') throw new Error('Dispatch failed');
  });

  // 14. Get Assignments List
  await test('GET /api/assignments', async () => {
    const res = await fetch(`${BASE}/assignments`);
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data.assignments)) throw new Error('Get assignments failed');
  });

  console.log(`\n====================================`);
  console.log(`🎯 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`====================================`);
}

runTests();
