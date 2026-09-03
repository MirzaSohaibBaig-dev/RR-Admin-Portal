import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema({
  requestId: {
    type: String,
    unique: true,
    index: true
  },
  customerName: {
    type: String,
    required: [true, 'Customer/Passenger name is required'],
    trim: true
  },
  pickupLocation: {
    type: String,
    required: [true, 'Pickup location is required'],
    trim: true
  },
  dropLocation: {
    type: String,
    required: [true, 'Drop-off location is required'],
    trim: true
  },
  status: {
    type: String,
    enum: [
      'PENDING',
      'ASSIGNED',
      'COMPLETED',
      'CANCELLED',
      'Awaiting Driver Acceptance',
      'Scheduled (Not Completed)',
      'Waiting for Payment',
      'Awaiting Admin Confirmation',
      'Waiting for Driver',
      'Visible',
      'Draft'
    ],
    default: 'PENDING',
    index: true
  },
  visibility: {
    type: String,
    enum: ['VISIBLE', 'HIDDEN'],
    default: 'VISIBLE',
    index: true
  },
  source: {
    type: String,
    enum: ['APP', 'MANUAL'],
    default: 'MANUAL',
    index: true
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    default: null,
    index: true
  },
  assignedDriverDetails: {
    driverCode: String,
    name: String,
    phone: String,
    vehicle: String,
    rating: Number
  },
  fare: {
    type: String,
    default: 'Rs. 5,000'
  },
  date: {
    type: String,
    default: '2026-08-31'
  },
  timeToLeave: {
    type: String,
    default: '08:00 AM'
  },
  timeToReach: {
    type: String,
    default: '09:00 AM'
  },
  seatsNeeded: {
    type: Number,
    default: 1
  },
  vehiclePreference: {
    type: String,
    default: 'Sedan'
  },
  acRequired: {
    type: Boolean,
    default: true
  },
  oneWay: {
    type: Boolean,
    default: true
  },
  driverRequests: [{
    driverId: String,
    driverName: String,
    rating: Number,
    vehicle: String,
    proposedFare: String,
    timeRequested: String
  }],
  passengerRating: {
    type: Number,
    default: 4.9
  },
  driverRating: {
    type: Number,
    default: 4.8
  },
  distance: {
    type: String,
    default: '320 km'
  },
  isOverdue: {
    type: Boolean,
    default: false,
    index: true
  },
  notes: {
    type: String,
    default: ''
  },
  timeline: [{
    action: String,
    timestamp: { type: Date, default: Date.now },
    performedBy: String,
    details: String
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Auto-generate requestId if not provided
requestSchema.pre('save', async function (next) {
  if (!this.requestId) {
    const count = await mongoose.model('Request').countDocuments();
    this.requestId = `REQ-${8000 + count + 1}`;
  }
  next();
});

const Request = mongoose.model('Request', requestSchema);

export default Request;
