import mongoose from 'mongoose';

const driverRatingLogSchema = new mongoose.Schema({
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true
  },
  driverReferenceId: {
    type: String,
    default: ''
  },
  driverName: {
    type: String,
    default: ''
  },
  score: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  performanceTags: {
    type: [String],
    default: []
  },
  adminRemarks: {
    type: String,
    default: ''
  },
  ratedBy: {
    type: String,
    default: 'Super Admin'
  },
  ratedByAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  }
}, {
  timestamps: true
});

const DriverRatingLog = mongoose.models.DriverRatingLog || mongoose.model('DriverRatingLog', driverRatingLogSchema);

export default DriverRatingLog;
