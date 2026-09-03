import mongoose from 'mongoose';

const adminStatsSchema = new mongoose.Schema({
  key: {
    type: String,
    default: 'global_stats',
    unique: true
  },
  totalDrivers: {
    type: Number,
    default: 0
  },
  pendingApprovals: {
    type: Number,
    default: 0
  },
  approvedDrivers: {
    type: Number,
    default: 0
  },
  rejectedDrivers: {
    type: Number,
    default: 0
  },
  approvalRate: {
    type: String,
    default: '100%'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Helper static method to recalculate and persist stats dynamically
adminStatsSchema.statics.syncStats = async function () {
  const Driver = mongoose.model('Driver');
  const totalDrivers = await Driver.countDocuments();
  const pendingApprovals = await Driver.countDocuments({ status: 'PENDING' });
  const approvedDrivers = await Driver.countDocuments({ status: 'APPROVED' });
  const rejectedDrivers = await Driver.countDocuments({ status: 'REJECTED' });

  const totalDecided = approvedDrivers + rejectedDrivers;
  const rateNum = totalDecided > 0 ? Math.round((approvedDrivers / totalDecided) * 100) : 100;
  const approvalRate = `${rateNum}%`;

  const stats = await this.findOneAndUpdate(
    { key: 'global_stats' },
    {
      totalDrivers,
      pendingApprovals,
      approvedDrivers,
      rejectedDrivers,
      approvalRate,
      updatedAt: new Date()
    },
    { upsert: true, new: true }
  );

  return stats;
};

const AdminStats = mongoose.model('AdminStats', adminStatsSchema);

export default AdminStats;
