import mongoose from 'mongoose';

async function run() {
  await mongoose.connect('mongodb+srv://sadiarafiquedev_db_user:KhmXmAyYP9SxabFR@cluster0.yhrbvje.mongodb.net/ride_and_serve?appName=Cluster0');
  const db = mongoose.connection.client.db('ride_and_serve');

  const kamranIdStr = '6aeb0887454d830a4dc84e98';
  const kamranObjId = new mongoose.Types.ObjectId(kamranIdStr);
  const kamranCode = 'DRV-1793788039789-WOYOH8';
  const kamranName = 'Kamran khan';
  const kamranPhone = '03328904413';
  const kamranVehicle = 'Toyota Corolla';

  console.log('--- 1. Updating riderequests for REQ-8047 ---');
  const updateResult = await db.collection('riderequests').updateOne(
    { requestId: 'REQ-8047' },
    {
      $set: {
        driver: kamranObjId,
        driverId: kamranObjId,
        assignedDriverId: kamranIdStr,
        assignedDriver: kamranName,
        assignedDriverName: kamranName,
        assignedDriverPhone: kamranPhone,
        assignedDriverCode: kamranCode,
        assignedDriverDetails: {
          driverCode: kamranCode,
          name: kamranName,
          phone: kamranPhone,
          vehicle: kamranVehicle,
          rating: 4.9
        },
        status: 'ASSIGNED',
        updatedAt: new Date()
      }
    }
  );
  console.log('riderequests matched:', updateResult.matchedCount, 'modified:', updateResult.modifiedCount);

  console.log('--- 2. Updating rides collection for REQ-8047 (if exists) ---');
  await db.collection('rides').updateMany(
    { $or: [{ requestId: 'REQ-8047' }, { rideId: 'REQ-8047' }] },
    {
      $set: {
        driver: kamranObjId,
        driverId: kamranObjId,
        assignedDriverId: kamranIdStr,
        assignedDriver: kamranName,
        assignedDriverName: kamranName,
        assignedDriverPhone: kamranPhone,
        assignedDriverCode: kamranCode,
        assignedDriverDetails: {
          driverCode: kamranCode,
          name: kamranName,
          phone: kamranPhone,
          vehicle: kamranVehicle,
          rating: 4.9
        },
        status: 'ASSIGNED',
        updatedAt: new Date()
      }
    }
  );

  console.log('--- 3. Updating driver status to On Trip in drivers ---');
  await db.collection('drivers').updateOne(
    { _id: kamranObjId },
    { $set: { availability: 'On Trip', liveStatus: 'On Trip', updatedAt: new Date() } }
  );

  console.log('--- 4. Updating assignments collection ---');
  await db.collection('assignments').updateMany(
    { $or: [{ requestId: 'REQ-8047' }, { driverId: kamranObjId }] },
    { $set: { driverCode: kamranCode, driverName: kamranName, driverPhone: kamranPhone, updatedAt: new Date() } }
  );

  console.log('--- 5. Inserting notification into drivernotifications for Kamran ---');
  // First check if already exists
  const existingDriverNotif = await db.collection('drivernotifications').findOne({
    driverId: kamranIdStr,
    rideId: 'REQ-8047'
  });

  const driverNotifDoc = {
    notificationId: `REQ-8047_ASSIGNED_${Date.now()}`,
    driverId: kamranIdStr,
    driverName: kamranName,
    driverReferenceId: kamranCode,
    rideId: 'REQ-8047',
    customerName: 'Bibi SAbeeqa',
    customerPhone: '03113037093',
    customerCount: 0,
    routeId: '',
    routeName: 'Chaklala Scheme 3 ➔ Saddar Rawalpindi',
    timeRange: '08:00 AM - 10:00 AM',
    pickup: 'Chaklala Scheme 3, Rawalpindi',
    destination: 'Saddar Rawalpindi',
    fareFormatted: 'Rs. 10,000',
    status: 'ASSIGNED',
    title: '🚗 Replacement Ride Assigned!',
    subtitle: 'Customer Bibi SAbeeqa (REQ-8047) has been assigned to you. Tap to view ride details.',
    type: 'NEW_ASSIGNMENT',
    isRead: false,
    isDismissed: false,
    payload: {
      id: 'REQ-8047',
      rideId: 'REQ-8047',
      requestId: 'REQ-8047',
      passengerName: 'Bibi SAbeeqa',
      customerName: 'Bibi SAbeeqa',
      passengerPhone: '03113037093',
      pickupLocation: 'Chaklala Scheme 3, Rawalpindi',
      dropoffLocation: 'Saddar Rawalpindi',
      fare: 10000,
      fareFormatted: 'Rs. 10,000',
      status: 'ASSIGNED'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  if (existingDriverNotif) {
    await db.collection('drivernotifications').updateOne(
      { _id: existingDriverNotif._id },
      { $set: { ...driverNotifDoc, isDismissed: false, isRead: false, updatedAt: new Date() } }
    );
    console.log('Updated existing driver notification for Kamran:', existingDriverNotif._id);
  } else {
    const inserted = await db.collection('drivernotifications').insertOne(driverNotifDoc);
    console.log('Inserted new driver notification for Kamran:', inserted.insertedId);
  }

  console.log('--- 6. Inserting notification into customernotifications for Bibi SAbeeqa ---');
  const customerNotifDoc = {
    notificationId: `NOTIF-REP-8047-${Date.now()}`,
    customerId: '03113037093',
    passengerName: 'Bibi SAbeeqa',
    passengerPhone: '03113037093',
    rideId: 'REQ-8047',
    type: 'DRIVER_REPLACED',
    title: '🚗 New Driver Assigned',
    subtitle: `New driver ${kamranName} (${kamranPhone}) has been assigned to your ride.`,
    message: `Your ride REQ-8047 has been reassigned to driver ${kamranName} (${kamranVehicle}).`,
    status: 'ASSIGNED',
    driverDetails: {
      driverId: kamranIdStr,
      driverCode: kamranCode,
      name: kamranName,
      phone: kamranPhone,
      vehicle: kamranVehicle,
      rating: 4.9
    },
    isRead: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  await db.collection('customernotifications').insertOne(customerNotifDoc);
  console.log('Inserted customer notification for Bibi SAbeeqa');

  console.log('\n=== VERIFYING FINAL STATE ===');
  const finalRide = await db.collection('riderequests').findOne({ requestId: 'REQ-8047' });
  console.log('Final REQ-8047:');
  console.log('  assignedDriverId:', finalRide.assignedDriverId);
  console.log('  driverId:', finalRide.driverId);
  console.log('  driver:', finalRide.driver);
  console.log('  assignedDriver:', finalRide.assignedDriver);
  console.log('  assignedDriverName:', finalRide.assignedDriverName);
  console.log('  assignedDriverCode:', finalRide.assignedDriverCode);
  console.log('  assignedDriverPhone:', finalRide.assignedDriverPhone);

  const finalNotifs = await db.collection('drivernotifications').find({ driverId: kamranIdStr }).toArray();
  console.log('Kamran notifications count:', finalNotifs.length);
  finalNotifs.forEach(n => console.log('  Notif ID:', n._id, 'Title:', n.title, 'Ride:', n.rideId));

  await mongoose.disconnect();
  console.log('Done!');
}

run();
