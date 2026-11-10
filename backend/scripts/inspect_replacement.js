import mongoose from 'mongoose';

async function run() {
  await mongoose.connect('mongodb+srv://sadiarafiquedev_db_user:KhmXmAyYP9SxabFR@cluster0.yhrbvje.mongodb.net/ride_and_serve?appName=Cluster0');
  const client = mongoose.connection.client;
  const db = client.db('ride_and_serve');

  console.log('=== 1. CHECK REQ-8047 in riderequests ===');
  const req8047 = await db.collection('riderequests').findOne({ requestId: 'REQ-8047' });
  console.log('riderequests REQ-8047:', JSON.stringify(req8047, null, 2));

  console.log('=== 2. CHECK DRIVER KAMRAN KHAN in drivers ===');
  const kamran = await db.collection('drivers').findOne({
    $or: [
      { Name: /kamran/i },
      { name: /kamran/i },
      { PhoneNumber: /03328904413/ },
      { PhoneNumber: /3328904413/ }
    ]
  });
  console.log('Driver Kamran:', JSON.stringify(kamran, null, 2));

  console.log('=== 3. CHECK DRIVERNOTIFICATIONS for Kamran or REQ-8047 ===');
  const dNotifs = await db.collection('drivernotifications').find({
    $or: [
      { driverName: /kamran/i },
      { rideId: 'REQ-8047' },
      { 'payload.requestId': 'REQ-8047' },
      { 'payload.rideId': 'REQ-8047' }
    ]
  }).toArray();
  console.log('drivernotifications found:', dNotifs.length);
  dNotifs.forEach(n => console.log('  Notif:', n._id, 'driverId:', n.driverId, 'driverName:', n.driverName, 'title:', n.title, 'rideId:', n.rideId, 'createdAt:', n.createdAt));

  console.log('=== 4. ALL RECENT DRIVERNOTIFICATIONS (last 5) ===');
  const recentNotifs = await db.collection('drivernotifications').find({}).sort({ _id: -1 }).limit(5).toArray();
  recentNotifs.forEach(n => console.log('  RecentNotif:', n._id, 'driverId:', n.driverId, 'driverName:', n.driverName, 'title:', n.title, 'rideId:', n.rideId, 'createdAt:', n.createdAt));

  console.log('=== 5. CHECK ASSIGNMENTS for REQ-8047 ===');
  const asgs = await db.collection('assignments').find({
    $or: [{ requestId: 'REQ-8047' }, { requestId: req8047?._id }]
  }).sort({ createdAt: -1 }).toArray();
  console.log('assignments found:', asgs.length);
  asgs.forEach(a => console.log('  Assignment:', a._id, 'driverId:', a.driverId, 'driverCode:', a.driverCode, 'status:', a.status, 'remarks:', a.remarks));

  console.log('=== 6. CHECK ISSUEREPORTS for Bibi SAbeeqa or REQ-8047 ===');
  const issues = await db.collection('issuereports').find({
    $or: [{ requestId: 'REQ-8047' }, { customerName: /sabeeqa/i }]
  }).toArray();
  console.log('issuereports found:', issues.length);
  issues.forEach(iss => console.log('  Issue:', iss._id, 'driverName:', iss.driverName, 'status:', iss.status, 'repDriver:', iss.replacementDriverName, 'remarks:', iss.remarks));

  process.exit(0);
}

run();
