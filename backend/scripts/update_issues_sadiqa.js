import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';

async function run() {
  await connectDB();
  
  const updateData = {
    reason: 'Ride Refusal / Driver Unavailable',
    details: 'Driver saleem is unable / refusing to pick up customer (Sadiqa)\'s ride. As an admin, assign a new driver to this customer.',
    description: 'Driver saleem is unable / refusing to pick up customer (Sadiqa)\'s ride. As an admin, assign a new driver to this customer.',
    customerName: 'Bibi Sadiqa',
    customerPhone: '03328904415',
    rideId: 'REQ-8037',
    requestId: 'REQ-8037',
    pickupLocation: 'Chaklala Scheme 3, Rawalpindi',
    dropoffLocation: 'Kamran Market, Saddar Rawalpindi',
    updatedAt: new Date()
  };

  const client = mongoose.connection.client;
  for (const dbName of ['ride_and_serve', 'test']) {
    for (const colName of ['issuereports', 'driverissues']) {
      try {
        const res = await client.db(dbName).collection(colName).updateMany(
          { driverName: /saleem/i },
          { $set: updateData }
        );
        console.log(`${dbName}.${colName} updated: ${res.modifiedCount}`);
      } catch (e) {
        console.error(e.message);
      }
    }
  }
  process.exit(0);
}

run();
