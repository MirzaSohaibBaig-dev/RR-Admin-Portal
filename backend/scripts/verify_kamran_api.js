import mongoose from 'mongoose';

async function run() {
  await mongoose.connect('mongodb+srv://sadiarafiquedev_db_user:KhmXmAyYP9SxabFR@cluster0.yhrbvje.mongodb.net/ride_and_serve?appName=Cluster0');
  const db = mongoose.connection.client.db('ride_and_serve');

  const kamranId = '6aeb0887454d830a4dc84e98';

  // 1. Check riderequests query that driver app performs
  const ridesForKamran = await db.collection('riderequests').find({
    $or: [
      { assignedDriverId: kamranId },
      { driverId: new mongoose.Types.ObjectId(kamranId) },
      { driver: new mongoose.Types.ObjectId(kamranId) },
      { 'assignedDriverDetails.driverCode': 'DRV-1793788039789-WOYOH8' }
    ]
  }).toArray();

  console.log('✅ Rides returned for Kamran in riderequests:', ridesForKamran.length);
  ridesForKamran.forEach(r => {
    console.log(`  - Ride: ${r.requestId}, Status: ${r.status}, Passenger: ${r.passengerName}, Fare: ${r.fareFormatted || r.fare}`);
    console.log(`    assignedDriverId: ${r.assignedDriverId}, driverId: ${r.driverId}, driverName: ${r.assignedDriverName}`);
  });

  // 2. Check drivernotifications query that driver app performs
  const notifsForKamran = await db.collection('drivernotifications').find({
    $or: [
      { driverId: kamranId },
      { driverReferenceId: 'DRV-1793788039789-WOYOH8' }
    ]
  }).toArray();

  console.log('\n✅ Notifications returned for Kamran in drivernotifications:', notifsForKamran.length);
  notifsForKamran.forEach(n => {
    console.log(`  - Notif: ${n.title}, Ride: ${n.rideId}, Type: ${n.type}, Created: ${n.createdAt}`);
    console.log(`    Subtitle: ${n.subtitle}`);
  });

  // 3. Check customer notifications
  const notifsForCustomer = await db.collection('customernotifications').find({
    rideId: 'REQ-8047'
  }).toArray();

  console.log('\n✅ Customer notifications for REQ-8047:', notifsForCustomer.length);
  notifsForCustomer.forEach(c => {
    console.log(`  - Customer Notif: ${c.title}, Customer: ${c.passengerName}, Type: ${c.type}`);
    console.log(`    Message: ${c.message}`);
  });

  await mongoose.disconnect();
}

run();
