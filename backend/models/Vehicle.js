import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true
  },
  vehicleMake: { type: String, required: true },
  vehicleModel: { type: String, required: true },
  variant: { type: String },
  numberOfSeats: { type: Number },
  registrationNumber: { type: String, required: true },
  vehicleColor: { type: String },
  registrationBook: {
    url: String,
    public_id: String
  },
  vehicleImages: {
    frontView: {
      url: String,
      public_id: String
    }
  },
  verificationStatus: {
    type: String,
    enum: ['Pending', 'Verified', 'Rejected'],
    default: 'Pending'
  }
}, { timestamps: true, strict: false });

const Vehicle = mongoose.model('Vehicle', vehicleSchema);
export default Vehicle;
