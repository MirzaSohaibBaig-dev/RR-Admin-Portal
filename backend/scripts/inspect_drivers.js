import mongoose from 'mongoose';

async function run() {
  await mongoose.connect('mongodb+srv://sadiarafiquedev_db_user:KhmXmAyYP9SxabFR@cluster0.yhrbvje.mongodb.net/ride_and_serve?appName=Cluster0');
  const client = mongoose.connection.client;
  const db = client.db('ride_and_serve');

  const allDrivers = await db.collection('drivers').find({}).toArray();
  console.log('Total drivers in DB:', allDrivers.length);
  allDrivers.forEach(d => {
    console.log('Driver -> ID:', d._id, 'Name:', d.Name || d.name, 'Phone:', d.PhoneNumber, 'Code:', d.driverReferenceId || d.driverId, 'Status:', d.verificationStatus || d.status);
  });

  process.exit(0);
}

run();
