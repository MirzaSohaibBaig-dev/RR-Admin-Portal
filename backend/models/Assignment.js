import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema({
  assignmentId: {
    type: String,
    unique: true,
    index: true
  },
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request',
    required: [true, 'Request ID is required'],
    index: true
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: [true, 'Driver ID is required'],
    index: true
  },
  status: {
    type: String,
    enum: ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    default: 'ASSIGNED',
    index: true
  },
  dispatchedAt: {
    type: Date,
    default: Date.now
  },
  remarks: {
    type: String,
    default: ''
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

assignmentSchema.pre('save', async function (next) {
  if (!this.assignmentId) {
    const count = await mongoose.model('Assignment').countDocuments();
    this.assignmentId = `ASG-${5000 + count + 1}`;
  }
  next();
});

const Assignment = mongoose.model('Assignment', assignmentSchema);

export default Assignment;
