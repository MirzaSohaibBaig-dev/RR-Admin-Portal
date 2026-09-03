export const initialDrivers = [
  {
    id: 'DRV-1001',
    status: 'Approved',
    availability: 'Available',
    performance: { rating: 4.8, totalRides: 145, cancellationRate: '2%' },
    personalInfo: { name: 'Ahmed Khan', phone: '+92 300 1234567', email: 'ahmed.k@example.com', city: 'Lahore', joinDate: '2026-08-25' },
    vehicleInfo: { make: 'Toyota', model: 'Corolla', year: '2020', plateNumber: 'ABC-123', color: 'White', category: 'Sedan', ac: true },
    preferences: { routes: ['Islamabad -> Lahore', 'Lahore -> Multan'] },
    documents: { license: 'Valid (Exp: 2029)', idCard: 'Verified', backgroundCheck: 'Clear' }
  },
  {
    id: 'DRV-1002',
    status: 'Approved',
    availability: 'Busy',
    performance: { rating: 4.2, totalRides: 89, cancellationRate: '5%' },
    personalInfo: { name: 'Ali Raza', phone: '+92 311 9876543', email: 'ali.raza@example.com', city: 'Karachi', joinDate: '2026-08-26' },
    vehicleInfo: { make: 'Suzuki', model: 'Bolan', year: '2019', plateNumber: 'KHI-789', color: 'White', category: 'Mini', ac: false },
    preferences: { routes: ['Karachi -> Hyderabad', 'Karachi -> Sukkur'] },
    documents: { license: 'Valid (Exp: 2030)', idCard: 'Verified', backgroundCheck: 'Clear' }
  },
  {
    id: 'DRV-1003',
    status: 'Approved',
    availability: 'Available',
    performance: { rating: 4.9, totalRides: 312, cancellationRate: '0.5%' },
    personalInfo: { name: 'Usman Tariq', phone: '+92 322 4567890', email: 'usman.t@example.com', city: 'Islamabad', joinDate: '2026-08-20' },
    vehicleInfo: { make: 'Honda', model: 'Civic', year: '2023', plateNumber: 'ISL-456', color: 'Black', category: 'Executive', ac: true },
    preferences: { routes: ['Islamabad -> Lahore', 'Peshawar -> Islamabad'] },
    documents: { license: 'Valid', idCard: 'Verified', backgroundCheck: 'Clear' }
  }
];

export const initialRideRequests = [
  { id: 'RIDE-5001', passenger: 'Sarah Khan', route: 'Islamabad -> Lahore', date: '2026-08-28 10:00 AM', preferences: { vehicleCategory: 'Sedan', acRequired: true }, fare: 'Rs. 8,500', status: 'Pending Dispatch' },
  { id: 'RIDE-5002', passenger: 'Fahad Mustafa', route: 'Karachi -> Hyderabad', date: '2026-08-28 02:30 PM', preferences: { vehicleCategory: 'Any', acRequired: false }, fare: 'Rs. 3,200', status: 'Pending Dispatch' },
];

export const initialRidePool = [
  {
    id: 'POOL-9001',
    route: 'Islamabad -> Lahore',
    date: '2026-08-29 09:00 AM',
    fare: 'Rs. 10,000',
    vehicleCategory: 'Executive',
    status: 'Visible', 
    assignedTo: null,
    driverRequests: [
      { driverId: 'DRV-1003', driverName: 'Usman Tariq', rating: 4.9, vehicle: 'Honda Civic', proposedFare: 'Rs. 10,000', timeRequested: '10 mins ago' },
      { driverId: 'DRV-1001', driverName: 'Ahmed Khan', rating: 4.8, vehicle: 'Toyota Corolla', proposedFare: 'Rs. 9,500', timeRequested: '2 mins ago' }
    ]
  },
  { id: 'POOL-9002', route: 'Lahore -> Faisalabad', date: '2026-08-29 11:30 AM', fare: 'Rs. 4,500', vehicleCategory: 'Any', status: 'Draft', assignedTo: null, driverRequests: [] },
  { id: 'POOL-9003', route: 'Karachi -> Hyderabad', date: '2026-08-28 06:00 PM', fare: 'Rs. 4,000', vehicleCategory: 'Sedan', status: 'Assigned', assignedTo: 'Ali Raza (DRV-1002)', driverRequests: [] }
];

export const pendingRidesData = [
  {
    id: 'PR-8003',
    passenger: 'Babar Azam',
    route: 'Multan -> Lahore',
    date: '2026-08-28 11:00 AM',
    driver: 'Ahmed Khan (DRV-1001)',
    status: 'Scheduled (Not Completed)',
    lastUpdated: '2 hours ago',
    fare: 'Rs. 9,500',
    distance: '345 km',
    passengerRating: '4.9',
    driverRating: '4.8',
    notes: 'Trip was scheduled for 11:00 AM. Driver has not reported completion yet.',
    isOverdue: true
  },
  {
    id: 'PR-8002',
    passenger: 'Sana Javed',
    route: 'Karachi -> Sukkur',
    date: '2026-08-28 04:30 PM',
    driver: 'Ali Raza (DRV-1002)',
    status: 'Awaiting Driver Acceptance',
    lastUpdated: '30 mins ago',
    fare: 'Rs. 14,000',
    distance: '480 km',
    passengerRating: '5.0',
    driverRating: '4.7',
    notes: 'Ride assigned 30 mins ago; driver pinged via SMS reminder.',
    isOverdue: false
  },
  {
    id: 'PR-8004',
    passenger: 'Mahira Khan',
    route: 'Islamabad -> Peshawar',
    date: '2026-08-28 12:30 PM',
    driver: 'Usman Tariq (DRV-1003)',
    status: 'Waiting for Payment',
    lastUpdated: '5 mins ago',
    fare: 'Rs. 6,800',
    distance: '185 km',
    passengerRating: '4.8',
    driverRating: '4.9',
    notes: 'Online payment gateway transaction pending confirmation.',
    isOverdue: false
  },
  {
    id: 'PR-8005',
    passenger: 'Shaheen Afridi',
    route: 'Lahore -> Gujranwala',
    date: '2026-08-28 09:00 AM',
    driver: 'Zain Abbas (DRV-1004)',
    status: 'Awaiting Admin Confirmation',
    lastUpdated: '1 hour ago',
    fare: 'Rs. 4,200',
    distance: '75 km',
    passengerRating: '4.9',
    driverRating: '4.8',
    notes: 'Special VIP booking requiring manual dispatcher sign-off.',
    isOverdue: false
  },
  {
    id: 'PR-8001',
    passenger: 'Kamran Akmal',
    route: 'Lahore -> Islamabad',
    date: '2026-08-28 03:00 PM',
    driver: null,
    status: 'Waiting for Driver',
    lastUpdated: '15 mins ago',
    fare: 'Rs. 11,000',
    distance: '375 km',
    passengerRating: '4.7',
    driverRating: '-',
    notes: 'No driver assigned yet. 3 drivers available in nearby pool.',
    isOverdue: false
  }
];
