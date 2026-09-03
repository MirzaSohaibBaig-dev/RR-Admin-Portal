import Driver from '../models/Driver.js';
import { DriverDB } from '../models/dbAdapter.js';
import { sendSuccess, sendError } from '../middleware/responseHandler.js';

// Helper to attach vehicle data to drivers
const attachVehicleData = async (drivers) => {
  try {
    const VehicleModel = (await import('../models/Vehicle.js')).default;
    
    // Fetch all vehicles
    const allVehicles = await VehicleModel.find({}).lean();
    
    return drivers.map(d => {
      const dObj = d.toObject ? d.toObject() : { ...d };
      const dIdStr = dObj._id ? dObj._id.toString() : '';
      const dRefId = (dObj.driverReferenceId || dObj.driverId || '').toString();
      const dPhone = (dObj.PhoneNumber || dObj.phone || '').toString().replace(/\D/g, '');

      // Find matching vehicle
      const matchedVehicle = allVehicles.find(v => {
        const vDriverStr = v.driver ? (v.driver._id ? v.driver._id.toString() : v.driver.toString()) : '';
        const vCreatedByStr = v.createdBy ? (v.createdBy._id ? v.createdBy._id.toString() : v.createdBy.toString()) : '';
        const vDriverId = (v.driverId || v.driverReferenceId || '').toString();
        const vPhone = (v.phone || v.driverPhone || '').toString().replace(/\D/g, '');

        if (vDriverStr && dIdStr && vDriverStr === dIdStr) return true;
        if (vCreatedByStr && dIdStr && vCreatedByStr === dIdStr) return true;
        if (vDriverId && dRefId && vDriverId === dRefId) return true;
        if (vPhone && dPhone && (vPhone === dPhone || dPhone.endsWith(vPhone) || vPhone.endsWith(dPhone))) return true;
        return false;
      });

      if (matchedVehicle) {
        dObj.vehicleData = matchedVehicle;
      } else if (dObj.vehicle && typeof dObj.vehicle === 'object') {
        dObj.vehicleData = dObj.vehicle;
      }
      return dObj;
    });
  } catch (err) {
    console.error('Error attaching vehicle data:', err.message);
    return drivers.map(d => d.toObject ? d.toObject() : { ...d });
  }
};

export const getDrivers = async (req, res) => {
  try {
    const drivers = await DriverDB.find({}, '-createdAt', 0, 1000);
    const enrichedDrivers = await attachVehicleData(drivers);
    sendSuccess(res, { count: enrichedDrivers.length, drivers: enrichedDrivers }, 'Drivers fetched successfully');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

export const getPendingDrivers = async (req, res) => {
  try {
    const drivers = await DriverDB.find({ verificationStatus: 'Pending' }, '-createdAt', 0, 1000);
    const enrichedDrivers = await attachVehicleData(drivers);
    sendSuccess(res, { count: enrichedDrivers.length, drivers: enrichedDrivers }, 'Pending drivers fetched successfully');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

export const getVerifiedDrivers = async (req, res) => {
  try {
    const drivers = await DriverDB.find({ verificationStatus: 'Verified' }, '-createdAt', 0, 1000);
    const enrichedDrivers = await attachVehicleData(drivers);
    sendSuccess(res, { count: enrichedDrivers.length, drivers: enrichedDrivers }, 'Verified drivers fetched successfully');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

export const getRejectedDrivers = async (req, res) => {
  try {
    const drivers = await DriverDB.find({ verificationStatus: 'Rejected' }, '-createdAt', 0, 1000);
    const enrichedDrivers = await attachVehicleData(drivers);
    sendSuccess(res, { count: enrichedDrivers.length, drivers: enrichedDrivers }, 'Rejected drivers fetched successfully');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

export const updateVerificationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { verificationStatus } = req.body;

    const driver = await DriverDB.findById(id);
    if (!driver) {
      return sendError(res, 'Driver not found', 404);
    }

    const updatedDriver = await DriverDB.update({ _id: id }, { 
      verificationStatus,
      status: verificationStatus === 'Verified' ? 'APPROVED' : (verificationStatus === 'Rejected' ? 'REJECTED' : 'PENDING')
    });
    
    sendSuccess(res, { driver: updatedDriver }, `Driver status updated to ${verificationStatus} successfully`);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Full Admin Driver Profile Update (Unrestricted)
export const updateDriverProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, Name,
      phone, PhoneNumber, CountryCode,
      email, Email,
      city,
      cnic, CnicNumber,
      license, License,
      preferredRoutes,
      verificationStatus,
      vehicleInfo,
      vehicleData
    } = req.body;

    const driver = await DriverDB.findById(id);
    if (!driver) {
      return sendError(res, 'Driver not found', 404);
    }

    const driverUpdate = {};
    if (Name || name) {
      driverUpdate.Name = (Name || name).trim();
      driverUpdate.name = (Name || name).trim();
    }
    if (PhoneNumber || phone) {
      driverUpdate.PhoneNumber = (PhoneNumber || phone).trim();
      driverUpdate.phone = (PhoneNumber || phone).trim();
    }
    if (CountryCode) driverUpdate.CountryCode = CountryCode;
    if (Email !== undefined || email !== undefined) {
      driverUpdate.Email = (Email || email || '').trim();
      driverUpdate.email = (Email || email || '').trim();
    }
    if (city) driverUpdate.city = city.trim();
    if (CnicNumber || cnic) driverUpdate.CnicNumber = (CnicNumber || cnic).trim();
    if (License || license) {
      driverUpdate.License = (License || license).trim();
      driverUpdate.license = (License || license).trim();
    }
    if (preferredRoutes) driverUpdate.preferredRoutes = Array.isArray(preferredRoutes) ? preferredRoutes : [preferredRoutes];
    if (verificationStatus) {
      driverUpdate.verificationStatus = verificationStatus;
      driverUpdate.status = verificationStatus === 'Verified' ? 'APPROVED' : (verificationStatus === 'Rejected' ? 'REJECTED' : 'PENDING');
    }

    const updatedDriver = await DriverDB.update({ _id: id }, driverUpdate);

    // Also update or create associated Vehicle
    const vInfo = vehicleInfo || vehicleData;
    let updatedVehicle = null;
    if (vInfo) {
      const VehicleModel = (await import('../models/Vehicle.js')).default;
      const vUpdate = {
        vehicleMake: vInfo.make || vInfo.vehicleMake || 'Toyota',
        vehicleModel: vInfo.model || vInfo.vehicleModel || 'Corolla',
        vehicleColor: vInfo.color || vInfo.vehicleColor || 'White',
        registrationNumber: vInfo.plateNumber || vInfo.registrationNumber || 'ISB-000',
        numberOfSeats: parseInt(vInfo.numberOfSeats || vInfo.seats || 4, 10),
        category: vInfo.category || 'Sedan',
        variant: vInfo.variant || 'Standard'
      };

      updatedVehicle = await VehicleModel.findOneAndUpdate(
        { $or: [{ driver: driver._id }, { createdBy: driver._id }] },
        { $set: vUpdate },
        { new: true, upsert: false }
      ).lean();
    }

    sendSuccess(res, { driver: updatedDriver, vehicle: updatedVehicle }, 'Driver profile updated successfully');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

export const exportDrivers = async (req, res) => {
  try {
    const drivers = await DriverDB.find({}, '-createdAt', 0, 10000);
    
    if (!drivers || drivers.length === 0) {
      return sendError(res, 'No drivers to export', 404);
    }

    const headers = ['ID', 'Reference ID', 'Name', 'Phone', 'Email', 'Status', 'Joined Date'];
    const csvRows = [headers.join(',')];

    drivers.forEach(driver => {
      csvRows.push([
        driver._id,
        driver.driverReferenceId,
        driver.Name || driver.name,
        driver.PhoneNumber || driver.phone,
        driver.Email || driver.email,
        driver.verificationStatus,
        driver.createdAt
      ].join(','));
    });

    const csvData = csvRows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=drivers_export.csv');
    res.status(200).send(csvData);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};
