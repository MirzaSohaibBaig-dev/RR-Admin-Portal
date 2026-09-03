import Vehicle from '../models/Vehicle.js';
import { sendSuccess, sendError } from '../middleware/responseHandler.js';

export const getVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find().populate('driver');
    sendSuccess(res, { count: vehicles.length, vehicles }, 'Vehicles fetched successfully');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

export const getPendingVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ verificationStatus: 'Pending' }).populate('driver');
    sendSuccess(res, { count: vehicles.length, vehicles }, 'Pending vehicles fetched successfully');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

export const getVerifiedVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ verificationStatus: 'Verified' }).populate('driver');
    sendSuccess(res, { count: vehicles.length, vehicles }, 'Verified vehicles fetched successfully');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

export const getRejectedVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ verificationStatus: 'Rejected' }).populate('driver');
    sendSuccess(res, { count: vehicles.length, vehicles }, 'Rejected vehicles fetched successfully');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

export const updateVerificationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { verificationStatus } = req.body;

    const vehicle = await Vehicle.findById(id);
    if (!vehicle) {
      return sendError(res, 'Vehicle not found', 404);
    }

    if (vehicle.verificationStatus !== 'Pending') {
      return sendError(res, 'Vehicle is already verified.', 400);
    }

    vehicle.verificationStatus = verificationStatus;
    await vehicle.save();
    
    sendSuccess(res, { vehicle }, 'Vehicle verified successfully');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

export const exportVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find().populate('driver');
    
    if (!vehicles || vehicles.length === 0) {
      return sendError(res, 'No vehicles to export', 404);
    }

    const headers = ['ID', 'Driver Name', 'Make', 'Model', 'Variant', 'Reg Number', 'Status', 'Joined Date'];
    const csvRows = [headers.join(',')];

    vehicles.forEach(vehicle => {
      const driverName = vehicle.driver ? (vehicle.driver.Name || vehicle.driver.name) : 'Unknown';
      csvRows.push([
        vehicle._id,
        driverName,
        vehicle.vehicleMake,
        vehicle.vehicleModel,
        vehicle.variant,
        vehicle.registrationNumber,
        vehicle.verificationStatus,
        vehicle.createdAt
      ].join(','));
    });

    const csvData = csvRows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=vehicles_export.csv');
    res.status(200).send(csvData);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};
