import mongoose from 'mongoose';

const passwordResetRequestSchema = new mongoose.Schema({
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: null
  },
  phoneNumber: {
    type: String,
    trim: true,
    default: null
  },
  phone: {
    type: String,
    default: null
  },
  countryCode: {
    type: String,
    default: '+92'
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    default: null
  },
  userType: {
    type: String,
    enum: ['Customer', 'Driver'],
    default: 'Driver'
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  requestId: {
    type: String,
    default: null
  },
  token: {
    type: String,
    default: null
  },
  resetToken: {
    type: String,
    default: null
  },
  adminRemarks: {
    type: String,
    default: ''
  },
  approvedAt: {
    type: Date,
    default: null
  },
  rejectedAt: {
    type: Date,
    default: null
  },
  statusHistory: {
    type: Array,
    default: []
  }
}, {
  timestamps: true,
  strict: false // Allow all existing MongoDB fields from mobile apps
});

const PasswordResetRequest = mongoose.models.PasswordResetRequest || mongoose.model('PasswordResetRequest', passwordResetRequestSchema);

export default PasswordResetRequest;
