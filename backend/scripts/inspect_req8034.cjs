const mongoose = require('mongoose');

async function test() {
  await mongoose.connect('mongodb+srv://sadiarafiquedev_db_user:KhmXmAyYP9SxabFR@cluster0.yhrbvje.mongodb.net/ride_and_serve?appName=Cluster0');
  const db = mongoose.connection.client.db('ride_and_serve');

  const drivers = await db.collection('drivers').find({ Name: /kamran/i }).toArray();
  console.log('=== DRIVERS WITH NAME KAMRAN ===');
  drivers.forEach(d => console.log(JSON.stringify({
    _id: d._id,
    Name: d.Name,
    PhoneNumber: d.PhoneNumber,
    driverReferenceId: d.driverReferenceId,
    verificationStatus: d.verificationStatus,
    status: d.status
  }, null, 2)));

  const req8034 = await db.collection('monthlypickanddrop').findOne({ requestId: 'REQ-8034' });
  console.log('\n=== REQ-8034 in monthlypickanddrop ===');
  console.log(JSON.stringify(req8034, null, 2));

  const rr8034 = await db.collection('riderequests').findOne({ requestId: 'REQ-8034' });
  console.log('\n=== REQ-8034 in riderequests ===');
  console.log(JSON.stringify(rr8034, null, 2));

  const dn8034 = await db.collection('drivernotifications').find({ rideId: 'REQ-8034' }).toArray();
  console.log('\n=== drivernotifications for REQ-8034 ===');
  console.log(JSON.stringify(dn8034, null, 2));

  await mongoose.disconnect();
}
test();
