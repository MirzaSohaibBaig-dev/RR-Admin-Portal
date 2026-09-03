import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from '../models/Admin.js';
import { connectDB, closeDB } from '../config/db.js';

dotenv.config();

const seedAdmin = async () => {
  try {
    await connectDB();

    const existingAdmin = await Admin.findOne({ Email: 'admin@example.com' });
    if (existingAdmin) {
      console.log('Admin already exists');
      process.exit();
    }

    const admin = await Admin.create({
      Name: 'Super Admin',
      Email: 'admin@example.com',
      Password: 'yourpassword', // Default password as per instructions
      role: 'superadmin'
    });

    console.log('Admin user seeded successfully');
    console.log(`Email: ${admin.Email}`);
    console.log(`Password: yourpassword`);
    
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

seedAdmin();
