import mongoose from 'mongoose';
import Driver from '../models/Driver.js';
import DriverRatingLog from '../models/DriverRatingLog.js';
import { sendSuccess, sendError } from '../middleware/responseHandler.js';

/**
 * GET /admin/ratings
 * Retrieve all drivers with rating metrics, completed rides, pending ride reviews, and KPI summary
 */
export const getDriversRatings = async (req, res) => {
  try {
    const drivers = await Driver.find({}).sort({ createdAt: -1 }).lean();

    // Fetch all rating logs to calculate monthly metrics & driver history
    const allLogs = await DriverRatingLog.find({}).sort({ createdAt: -1 }).lean();

    // Fetch all real completed rides from riderequests collection
    const db = mongoose.connection.db;
    const completedRides = await db.collection('riderequests')
      .find({ status: 'COMPLETED' })
      .sort({ updatedAt: -1, createdAt: -1 })
      .toArray()
      .catch(() => []);

    // Identify pending completed rides that need admin rating
    const pendingRides = [];

    for (const r of completedRides) {
      const rideIdStr = r._id.toString();
      const hasRatingLog = allLogs.some(l => l.rideId && l.rideId.toString() === rideIdStr);
      const isAlreadyRated = Boolean(r.isRatedByAdmin || r.adminRating || hasRatingLog);

      if (!isAlreadyRated) {
        // Find assigned driver object
        const rDriverStr = r.driver ? r.driver.toString() : (r.driverId ? r.driverId.toString() : '');
        const rDriverCode = (r.assignedDriverCode || r.assignedDriverDetails?.driverCode || '').toString();

        const matchedDriver = drivers.find(d => {
          const dIdStr = d._id.toString();
          const dCode = (d.driverReferenceId || d.driverId || '').toString();
          return (rDriverStr && rDriverStr === dIdStr) || (rDriverCode && dCode && rDriverCode === dCode);
        });

        pendingRides.push({
          _id: r._id,
          rideId: r._id,
          requestId: r.requestId || `REQ-${r._id.toString().slice(-4)}`,
          completedAt: r.updatedAt || r.createdAt || new Date().toISOString(),
          passengerName: r.passengerName || 'Passenger',
          passengerPhone: r.passengerPhone || 'N/A',
          pickup: r.pickupLocation || r.pickup || 'Pickup Location',
          dropoff: r.dropoffLocation || r.destination || r.dropLocation || 'Drop-off Location',
          fare: r.fareFormatted || ('Rs. ' + (r.fare || r.fareAmount || r.price || 0).toLocaleString()),
          fareAmount: r.fare || r.fareAmount || r.price || 0,
          serviceType: r.vehicleType || r.seatingArrangement || 'Standard',
          driverId: matchedDriver?._id || r.driver || null,
          driverName: matchedDriver ? (matchedDriver.Name || matchedDriver.name) : (r.assignedDriver || r.assignedDriverDetails?.name || 'Assigned Driver'),
          driverPhone: matchedDriver ? (matchedDriver.PhoneNumber || matchedDriver.phone) : (r.assignedDriverPhone || r.assignedDriverDetails?.phone || ''),
          driverCode: matchedDriver ? (matchedDriver.driverReferenceId || matchedDriver.driverId) : (r.assignedDriverCode || r.assignedDriverDetails?.driverCode || 'DRV'),
          driverPhoto: matchedDriver?.driverPhoto?.url || matchedDriver?.profilePhoto || r.driverDetails?.profilePic || null,
          vehicle: r.assignedDriverDetails?.vehicle || (matchedDriver?.vehicleDetails ? `${matchedDriver.vehicleDetails.make} ${matchedDriver.vehicleDetails.model}` : 'Toyota Corolla')
        });
      }
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const logsThisMonth = allLogs.filter(l => new Date(l.createdAt) >= startOfMonth);

    let totalScore = 0;
    let ratedCount = 0;
    let requiringReviewCount = 0;

    const enrichedDrivers = drivers.map(d => {
      const dIdStr = d._id.toString();
      const dCode = (d.driverReferenceId || d.driverId || '').toString();

      const driverLogs = allLogs.filter(l => 
        (l.driver && l.driver.toString() === dIdStr) || 
        (l.driverReferenceId && l.driverReferenceId === dCode)
      );

      // Match actual completed rides from database
      const driverCompletedRides = completedRides.filter(r => {
        const rDriverStr = r.driver ? r.driver.toString() : (r.driverId ? r.driverId.toString() : '');
        const rDriverCode = (r.assignedDriverCode || r.assignedDriverDetails?.driverCode || '').toString();
        return (rDriverStr && rDriverStr === dIdStr) || (rDriverCode && dCode && rDriverCode === dCode);
      });

      const isRated = Boolean(d.rating != null && Number(d.rating) > 0) || driverLogs.length > 0;
      const currentRating = isRated 
        ? Number((driverLogs.length > 0 ? (driverLogs.reduce((acc, c) => acc + c.score, 0) / driverLogs.length) : d.rating).toFixed(1))
        : null;

      if (isRated && currentRating != null) {
        totalScore += currentRating;
        ratedCount++;
        if (currentRating < 3.0) {
          requiringReviewCount++;
        }
      }

      const lastLog = driverLogs[0] || null;
      const lastRatedDate = lastLog?.createdAt || (isRated ? d.updatedAt : null);
      const ratedByName = lastLog?.ratedBy || (isRated ? 'Admin' : null);

      // Accurate completed rides count: DB completed rides or stored field
      const completedRidesCount = Math.max(driverCompletedRides.length, d.completedRides || d.totalRides || 0);

      return {
        _id: d._id,
        id: d._id,
        driverId: d.driverReferenceId || d.driverId || `DRV-${d._id.toString().substring(18).toUpperCase()}`,
        name: d.Name || d.name || 'Driver Partner',
        phone: d.PhoneNumber || d.phone || 'N/A',
        email: d.Email || d.email || '',
        photo: d.driverPhoto?.url || d.profilePhoto || d.photo || null,
        status: d.verificationStatus || d.status || 'Pending',
        city: d.city || 'Islamabad',
        completedRides: completedRidesCount,
        isRated,
        currentRating,
        ratingCount: driverLogs.length,
        lastRated: lastRatedDate,
        ratedBy: ratedByName,
        lastRemarks: lastLog?.adminRemarks || '',
        lastTags: lastLog?.performanceTags || []
      };
    });

    const averageRating = ratedCount > 0 ? Number((totalScore / ratedCount).toFixed(1)) : 0;

    return res.status(200).json({
      success: true,
      data: {
        drivers: enrichedDrivers,
        pendingRides,
        kpis: {
          totalRatedDrivers: ratedCount,
          averageRating: averageRating,
          ratedThisMonth: logsThisMonth.length,
          requiringReview: requiringReviewCount,
          pendingRidesCount: pendingRides.length
        }
      },
      message: 'Driver ratings retrieved successfully'
    });
  } catch (err) {
    console.error('[DriverRatingController] Error fetching ratings:', err.message);
    return sendError(res, err.message, 500);
  }
};

/**
 * GET /admin/ratings/:driverId/history
 * Retrieve all previous rating logs for a driver
 */
export const getDriverRatingHistory = async (req, res) => {
  try {
    const { driverId } = req.params;

    let driver = await Driver.findById(driverId).lean();
    if (!driver) {
      driver = await Driver.findOne({
        $or: [{ driverReferenceId: driverId }, { driverId: driverId }]
      }).lean();
    }

    const query = driver ? {
      $or: [
        { driver: driver._id },
        { driverReferenceId: driver.driverReferenceId || driver.driverId }
      ]
    } : { driverReferenceId: driverId };

    const logs = await DriverRatingLog.find(query).sort({ createdAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      data: {
        driver: driver ? {
          _id: driver._id,
          driverId: driver.driverReferenceId || driver.driverId,
          name: driver.Name || driver.name,
          currentRating: driver.rating || null
        } : null,
        history: logs
      },
      message: 'Rating history retrieved successfully'
    });
  } catch (err) {
    console.error('[DriverRatingController] Error fetching history:', err.message);
    return sendError(res, err.message, 500);
  }
};

/**
 * POST /admin/ratings
 * Admin submits or updates a driver rating (optionally linked to a completed ride)
 */
export const submitDriverRating = async (req, res) => {
  try {
    const { driverId, rideId, score, performanceTags, adminRemarks } = req.body;

    if (!driverId) {
      return sendError(res, 'Driver ID is required', 400);
    }

    const numScore = parseFloat(score);
    if (isNaN(numScore) || numScore < 1 || numScore > 5) {
      return sendError(res, 'Rating score must be a number between 1.0 and 5.0', 400);
    }

    let driver = await Driver.findById(driverId);
    if (!driver) {
      driver = await Driver.findOne({
        $or: [{ driverReferenceId: driverId }, { driverId: driverId }]
      });
    }

    if (!driver) {
      return sendError(res, 'Driver not found in system', 404);
    }

    const adminName = req.admin?.Name || req.admin?.name || 'Super Admin';
    const adminId = req.admin?._id || null;

    let rideReference = '';
    const db = mongoose.connection.db;

    // 1. If rideId provided, update riderequests collection
    if (rideId) {
      try {
        const rideObjectId = rideId.toString().match(/^[0-9a-fA-F]{24}$/) ? new mongoose.Types.ObjectId(rideId) : rideId;
        const ride = await db.collection('riderequests').findOne({ _id: rideObjectId });
        if (ride) {
          rideReference = ride.requestId || `REQ-${ride._id.toString().slice(-4)}`;
          await db.collection('riderequests').updateOne(
            { _id: rideObjectId },
            {
              $set: {
                isRatedByAdmin: true,
                adminRating: numScore,
                adminRatedAt: new Date(),
                adminRatingTags: Array.isArray(performanceTags) ? performanceTags : [],
                adminRatingRemarks: adminRemarks || ''
              }
            }
          );
        }
      } catch (rideErr) {
        console.error('Error linking ride to rating:', rideErr.message);
      }
    }

    // 2. Create audit rating log
    const ratingLog = await DriverRatingLog.create({
      driver: driver._id,
      driverReferenceId: driver.driverReferenceId || driver.driverId || `DRV-${driver._id.toString().substring(18)}`,
      driverName: driver.Name || driver.name || 'Driver Partner',
      rideId: (rideId && rideId.toString().match(/^[0-9a-fA-F]{24}$/)) ? new mongoose.Types.ObjectId(rideId) : null,
      rideReference,
      score: numScore,
      performanceTags: Array.isArray(performanceTags) ? performanceTags : [],
      adminRemarks: adminRemarks || '',
      ratedBy: adminName,
      ratedByAdminId: adminId
    });

    // 3. Recalculate average rating from all logs for this driver
    const driverLogs = await DriverRatingLog.find({
      $or: [{ driver: driver._id }, { driverReferenceId: driver.driverReferenceId || driver.driverId }]
    });

    const avgRating = driverLogs.length > 0 
      ? Number((driverLogs.reduce((acc, curr) => acc + curr.score, 0) / driverLogs.length).toFixed(1))
      : numScore;

    // 4. Update Driver model with new rating
    driver.rating = avgRating;
    driver.lastRatedAt = new Date();
    driver.lastRatedBy = adminName;
    await driver.save();

    return res.status(200).json({
      success: true,
      message: `Driver rating of ${numScore}★ recorded successfully by Admin`,
      data: {
        driver: {
          _id: driver._id,
          name: driver.Name || driver.name,
          rating: driver.rating,
          lastRatedAt: driver.lastRatedAt
        },
        ratingLog,
        rideReference
      }
    });
  } catch (err) {
    console.error('[DriverRatingController] Error submitting rating:', err.message);
    return sendError(res, err.message, 500);
  }
};
