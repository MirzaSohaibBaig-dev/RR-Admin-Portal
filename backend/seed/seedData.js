import dotenv from 'dotenv';
import { connectDB, closeDB } from '../config/db.js';
import { DriverDB, RequestDB, AssignmentDB, AdminStatsDB } from '../models/dbAdapter.js';

dotenv.config();

const sampleDrivers = [
  {
    driverId: 'DRV-1001',
    name: 'Ahmed Khan',
    email: 'ahmed.khan@gmail.com',
    phone: '+92 300 1234567',
    vehicleType: 'Executive',
    status: 'APPROVED',
    source: 'APP',
    rating: 4.9,
    availability: 'Available',
    city: 'Islamabad',
    preferredRoutes: ['Islamabad - Rawalpindi', 'Islamabad - Lahore', 'Islamabad - Peshawar'],
    vehicleDetails: {
      make: 'Honda',
      model: 'Civic RS',
      year: '2023',
      color: 'Black Metallic',
      plateNumber: 'ICT-LE-9900',
      category: 'Executive',
      ac: true
    },
    documents: {
      cnic: 'Verified',
      license: 'Verified',
      registration: 'Verified',
      insurance: 'Verified',
      inspection: 'Verified'
    },
    performance: {
      totalTrips: 142,
      completionRate: '98.5%',
      rating: 4.9
    }
  },
  {
    driverId: 'DRV-1002',
    name: 'Ali Raza',
    email: 'ali.raza@yahoo.com',
    phone: '+92 321 9876543',
    vehicleType: 'Sedan',
    status: 'APPROVED',
    source: 'APP',
    rating: 4.7,
    availability: 'Available',
    city: 'Karachi',
    preferredRoutes: ['Karachi - Hyderabad', 'Karachi - Sukkur'],
    vehicleDetails: {
      make: 'Toyota',
      model: 'Corolla GLi',
      year: '2022',
      color: 'Super White',
      plateNumber: 'KHI-BG-4512',
      category: 'Sedan',
      ac: true
    },
    documents: {
      cnic: 'Verified',
      license: 'Verified',
      registration: 'Verified',
      insurance: 'Verified',
      inspection: 'Verified'
    },
    performance: {
      totalTrips: 89,
      completionRate: '96.2%',
      rating: 4.7
    }
  },
  {
    driverId: 'DRV-1003',
    name: 'Usman Tariq',
    email: 'usman.tariq@outlook.com',
    phone: '+92 333 5554433',
    vehicleType: 'Mini',
    status: 'APPROVED',
    source: 'MANUAL',
    rating: 4.8,
    availability: 'Available',
    city: 'Lahore',
    preferredRoutes: ['Lahore - Faisalabad', 'Lahore - Gujranwala'],
    vehicleDetails: {
      make: 'Suzuki',
      model: 'Alto VXL',
      year: '2024',
      color: 'Silky Silver',
      plateNumber: 'LHR-AZ-8080',
      category: 'Mini',
      ac: true
    },
    documents: {
      cnic: 'Verified',
      license: 'Verified',
      registration: 'Verified',
      insurance: 'Verified',
      inspection: 'Verified'
    },
    performance: {
      totalTrips: 56,
      completionRate: '99.0%',
      rating: 4.8
    }
  },
  {
    driverId: 'DRV-1004',
    name: 'Bilal Shahid',
    email: 'bilal.shahid@gmail.com',
    phone: '+92 345 6789012',
    vehicleType: 'Sedan',
    status: 'PENDING',
    source: 'APP',
    rating: 4.6,
    availability: 'Available',
    city: 'Rawalpindi',
    preferredRoutes: ['Rawalpindi - Islamabad', 'Rawalpindi - Peshawar'],
    vehicleDetails: {
      make: 'Toyota',
      model: 'Yaris ATIV',
      year: '2023',
      color: 'Grey Graphite',
      plateNumber: 'RWP-LX-3321',
      category: 'Sedan',
      ac: true
    },
    documents: {
      cnic: 'Pending',
      license: 'Verified',
      registration: 'Verified',
      insurance: 'Pending',
      inspection: 'Pending'
    },
    performance: {
      totalTrips: 0,
      completionRate: '100%',
      rating: 4.6
    }
  },
  {
    driverId: 'DRV-1005',
    name: 'Hamza Farooq',
    email: 'hamza.farooq@gmail.com',
    phone: '+92 312 3456789',
    vehicleType: 'Executive',
    status: 'PENDING',
    source: 'MANUAL',
    rating: 4.9,
    availability: 'Available',
    city: 'Islamabad',
    preferredRoutes: ['Islamabad - Lahore', 'Islamabad - Murree'],
    vehicleDetails: {
      make: 'Hyundai',
      model: 'Sonata 2.5',
      year: '2024',
      color: 'Diamond Black',
      plateNumber: 'ICT-SN-5555',
      category: 'Executive',
      ac: true
    },
    documents: {
      cnic: 'Verified',
      license: 'Verified',
      registration: 'Verified',
      insurance: 'Verified',
      inspection: 'Pending'
    },
    performance: {
      totalTrips: 0,
      completionRate: '100%',
      rating: 4.9
    }
  }
];

const sampleRequests = [
  {
    requestId: 'PR-8001',
    customerName: 'Ayesha Malik',
    pickupLocation: 'Islamabad F-7/2',
    dropLocation: 'Lahore DHA Phase 5',
    status: 'Waiting for Driver',
    visibility: 'VISIBLE',
    source: 'APP',
    fare: 'Rs. 12,000',
    date: '2026-08-31',
    timeToLeave: '02:00 PM',
    timeToReach: '06:30 PM',
    seatsNeeded: 1,
    vehiclePreference: 'Executive',
    acRequired: true,
    oneWay: true,
    passengerRating: 4.9,
    distance: '375 km',
    isOverdue: false,
    notes: 'Passenger requested non-smoking driver with luggage space for 2 bags.'
  },
  {
    requestId: 'PR-8002',
    customerName: 'Sana Javed',
    pickupLocation: 'Karachi Clifton',
    dropLocation: 'Sukkur Military Road',
    status: 'Awaiting Driver Acceptance',
    visibility: 'VISIBLE',
    source: 'APP',
    fare: 'Rs. 18,500',
    date: '2026-08-31',
    timeToLeave: '04:30 PM',
    timeToReach: '10:30 PM',
    seatsNeeded: 2,
    vehiclePreference: 'Sedan',
    acRequired: true,
    oneWay: true,
    assignedDriverDetails: {
      driverCode: 'DRV-1002',
      name: 'Ali Raza',
      phone: '+92 321 9876543',
      vehicle: '2022 Toyota Corolla GLi',
      rating: 4.7
    },
    passengerRating: 4.8,
    driverRating: 4.7,
    distance: '480 km',
    isOverdue: false,
    notes: 'Ride offer sent to Ali Raza. Awaiting driver response in app.'
  },
  {
    requestId: 'PR-8003',
    customerName: 'Babar Azam',
    pickupLocation: 'Multan Cantt',
    dropLocation: 'Lahore Gulberg III',
    status: 'Scheduled (Not Completed)',
    visibility: 'VISIBLE',
    source: 'APP',
    fare: 'Rs. 14,000',
    date: '2026-08-31',
    timeToLeave: '11:00 AM',
    timeToReach: '03:30 PM',
    seatsNeeded: 1,
    vehiclePreference: 'Executive',
    acRequired: true,
    oneWay: true,
    assignedDriverDetails: {
      driverCode: 'DRV-1001',
      name: 'Ahmed Khan',
      phone: '+92 300 1234567',
      vehicle: '2023 Honda Civic RS',
      rating: 4.9
    },
    passengerRating: 5.0,
    driverRating: 4.9,
    distance: '340 km',
    isOverdue: true,
    notes: '⚠️ Ride scheduled time was 11:00 AM. Requires investigation or completion check.'
  },
  {
    requestId: 'PR-8004',
    customerName: 'Mahira Khan',
    pickupLocation: 'Islamabad E-11',
    dropLocation: 'Peshawar University Town',
    status: 'Waiting for Payment',
    visibility: 'VISIBLE',
    source: 'APP',
    fare: 'Rs. 8,500',
    date: '2026-08-31',
    timeToLeave: '01:15 PM',
    timeToReach: '03:45 PM',
    seatsNeeded: 1,
    vehiclePreference: 'Sedan',
    acRequired: true,
    oneWay: true,
    assignedDriverDetails: {
      driverCode: 'DRV-1003',
      name: 'Usman Tariq',
      phone: '+92 333 5554433',
      vehicle: '2024 Suzuki Alto VXL',
      rating: 4.8
    },
    passengerRating: 4.9,
    driverRating: 4.8,
    distance: '185 km',
    isOverdue: false,
    notes: 'Ride completed. Awaiting passenger card authorization or cash collection confirmation.'
  },
  {
    requestId: 'PR-8005',
    customerName: 'Zainab Abbas',
    pickupLocation: 'Lahore Model Town',
    dropLocation: 'Faisalabad D-Ground',
    status: 'Awaiting Admin Confirmation',
    visibility: 'VISIBLE',
    source: 'MANUAL',
    fare: 'Rs. 7,200',
    date: '2026-08-31',
    timeToLeave: '05:00 PM',
    timeToReach: '07:30 PM',
    seatsNeeded: 1,
    vehiclePreference: 'Sedan',
    acRequired: true,
    oneWay: true,
    assignedDriverDetails: {
      driverCode: 'DRV-1001',
      name: 'Ahmed Khan',
      phone: '+92 300 1234567',
      vehicle: '2023 Honda Civic RS',
      rating: 4.9
    },
    passengerRating: 4.7,
    driverRating: 4.9,
    distance: '140 km',
    isOverdue: false,
    notes: 'Corporate discount applied. Admin confirmation required before dispatch.'
  },
  {
    requestId: 'POOL-9001',
    customerName: 'Fatima Noor',
    pickupLocation: 'Islamabad',
    dropLocation: 'Lahore',
    status: 'Visible',
    visibility: 'VISIBLE',
    source: 'MANUAL',
    fare: 'Rs. 10,000',
    date: '30/08/2026 10:00 AM',
    timeToLeave: '10:00 AM',
    timeToReach: '02:30 PM',
    seatsNeeded: 1,
    vehiclePreference: 'Executive',
    acRequired: true,
    oneWay: true,
    driverRequests: [
      {
        driverId: 'DRV-1001',
        driverName: 'Ahmed Khan',
        rating: 4.9,
        vehicle: 'Honda Civic (Executive)',
        proposedFare: 'Rs. 10,000',
        timeRequested: '10 mins ago'
      },
      {
        driverId: 'DRV-1002',
        driverName: 'Ali Raza',
        rating: 4.7,
        vehicle: 'Toyota Corolla (Sedan)',
        proposedFare: 'Rs. 9,500',
        timeRequested: '25 mins ago'
      }
    ]
  },
  {
    requestId: 'POOL-9002',
    customerName: 'Hamza Sheikh',
    pickupLocation: 'Rawalpindi',
    dropLocation: 'Peshawar',
    status: 'Visible',
    visibility: 'VISIBLE',
    source: 'MANUAL',
    fare: 'Rs. 7,500',
    date: '30/08/2026 02:00 PM',
    timeToLeave: '02:00 PM',
    timeToReach: '04:30 PM',
    seatsNeeded: 2,
    vehiclePreference: 'Sedan',
    acRequired: true,
    oneWay: true,
    driverRequests: [
      {
        driverId: 'DRV-1003',
        driverName: 'Usman Tariq',
        rating: 4.8,
        vehicle: 'Suzuki Alto (Mini)',
        proposedFare: 'Rs. 7,000',
        timeRequested: '5 mins ago'
      }
    ]
  },
  {
    requestId: 'POOL-9003',
    customerName: 'Sara Ali',
    pickupLocation: 'Lahore',
    dropLocation: 'Faisalabad',
    status: 'Draft',
    visibility: 'HIDDEN',
    source: 'MANUAL',
    fare: 'Rs. 5,500',
    date: '31/08/2026 09:00 AM',
    timeToLeave: '09:00 AM',
    timeToReach: '11:30 AM',
    seatsNeeded: 1,
    vehiclePreference: 'Sedan',
    acRequired: true,
    oneWay: true,
    driverRequests: []
  }
];

export const seedDatabase = async () => {
  try {
    console.log('[Seeder] Initializing database seeding...');
    await DriverDB.deleteMany({});
    await RequestDB.deleteMany({});
    await AssignmentDB.deleteMany({});
    await AdminStatsDB.deleteMany({});

    console.log('[Seeder] Inserting sample drivers...');
    const insertedDrivers = await DriverDB.insertMany(sampleDrivers);
    console.log(`[Seeder] Inserted ${insertedDrivers.length} drivers.`);

    console.log('[Seeder] Inserting sample ride requests...');
    const insertedRequests = await RequestDB.insertMany(sampleRequests);
    console.log(`[Seeder] Inserted ${insertedRequests.length} requests.`);

    console.log('[Seeder] Syncing admin KPI stats...');
    const stats = await AdminStatsDB.syncStats();
    console.log('[Seeder] Admin KPI stats synced:', stats);

    console.log('[Seeder] Database seeding completed successfully! ✨');
    return { drivers: insertedDrivers, requests: insertedRequests, stats };
  } catch (err) {
    console.error('[Seeder] Error seeding database:', err);
    throw err;
  }
};

if (process.argv[1] && process.argv[1].includes('seedData.js')) {
  (async () => {
    await connectDB();
    await seedDatabase();
    await closeDB();
    process.exit(0);
  })();
}
