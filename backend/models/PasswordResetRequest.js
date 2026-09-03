import mongoose from 'mongoose';

const passwordResetRequestSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  userType: {
    type: String,
    enum: ['Customer', 'Driver'],
    default: 'Customer'
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  token: {
    type: String,
    default: null
  },
  adminRemarks: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

const PasswordResetRequest = mongoose.models.PasswordResetRequest || mongoose.model('PasswordResetRequest', passwordResetRequestSchema);

export default PasswordResetRequest;
