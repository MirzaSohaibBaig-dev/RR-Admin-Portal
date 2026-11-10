import mongoose from 'mongoose';

async function run() {
  await mongoose.connect('mongodb+srv://sadiarafiquedev_db_user:KhmXmAyYP9SxabFR@cluster0.yhrbvje.mongodb.net/ride_and_serve?appName=Cluster0');
  const db = mongoose.connection.client.db('ride_and_serve');
  
  const sample1 = await db.collection('drivernotifications').findOne({ title: /Customer Accepted/i });
  console.log('Sample 1 (Customer Accepted):', JSON.stringify(sample1, null, 2));

  const sample2 = await db.collection('drivernotifications').findOne({ title: /Trip Completed/i });
  console.log('Sample 2 (Trip Completed):', JSON.stringify(sample2, null, 2));

  const sample3 = await db.collection('drivernotifications').findOne({ title: /Dismissed All/i });
  console.log('Sample 3 (Dismissed All):', JSON.stringify(sample3, null, 2));

  // Check any other notification with different titles
  const otherTitles = await db.collection('drivernotifications').distinct('title');
  console.log('All unique titles in drivernotifications:', otherTitles);

  const reqDoc = await db.collection('riderequests').findOne({ requestId: 'REQ-8047' });
  console.log('\nREQ-8047 fields:');
  console.log('  driver:', reqDoc?.driver);
  console.log('  driverId:', reqDoc?.driverId);
  console.log('  assignedDriverId:', reqDoc?.assignedDriverId);
  console.log('  assignedDriver:', reqDoc?.assignedDriver);
  console.log('  assignedDriverName:', reqDoc?.assignedDriverName);
  console.log('  assignedDriverPhone:', reqDoc?.assignedDriverPhone);
  console.log('  assignedDriverCode:', reqDoc?.assignedDriverCode);

  await mongoose.disconnect();
}

run();
