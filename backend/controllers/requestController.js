import { RequestDB } from '../models/dbAdapter.js';
import { sendSuccess, sendError } from '../middleware/responseHandler.js';

// @desc    Get all requests with filtering & pagination
// @route   GET /api/requests
export const getRequests = async (req, res, next) => {
  try {
    const {
      status,
      visibility,
      source,
      search,
      page = 1,
      limit = 30,
      sort = '-createdAt'
    } = req.query;

    const query = {};

    if (status && status !== 'All') {
      if (status === 'DriverRequests') {
        query['driverRequests.0'] = { $exists: true };
      } else {
        query.status = status;
      }
    }

    if (visibility) {
      query.visibility = visibility.toUpperCase();
    }

    if (source) {
      query.source = source.toUpperCase();
    }

    if (search) {
      query.$or = [
        { customerName: new RegExp(search, 'i') },
        { pickupLocation: new RegExp(search, 'i') },
        { dropLocation: new RegExp(search, 'i') },
        { requestId: new RegExp(search, 'i') },
        { vehiclePreference: new RegExp(search, 'i') }
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 30;
    const skip = (pageNum - 1) * limitNum;

    const total = await RequestDB.count(query);
    const requests = await RequestDB.find(query, sort, skip, limitNum);

    return sendSuccess(res, {
      requests,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum) || 1
      }
    }, 'Ride requests retrieved successfully');
  } catch (err) {
    next(err);
  }
};

// @desc    Get pending rides queue (for Pending Rides Monitor screen)
// @route   GET /api/requests/pending
export const getPendingRides = async (req, res, next) => {
  try {
    const { filterStatus = 'All', search = '' } = req.query;

    const pendingStatuses = [
      'PENDING',
      'Awaiting Driver Acceptance',
      'Scheduled (Not Completed)',
      'Waiting for Payment',
      'Awaiting Admin Confirmation',
      'Waiting for Driver'
    ];

    const query = {};

    if (filterStatus && filterStatus !== 'All') {
      query.status = filterStatus;
    } else {
      query.status = { $in: pendingStatuses };
    }

    if (search) {
      query.$or = [
        { customerName: new RegExp(search, 'i') },
        { pickupLocation: new RegExp(search, 'i') },
        { dropLocation: new RegExp(search, 'i') },
        { requestId: new RegExp(search, 'i') }
      ];
    }

    // Overdue rides first, then newest
    const rides = await RequestDB.find(query, { isOverdue: -1, createdAt: -1 }, 0, 100);

    return sendSuccess(res, rides, 'Pending rides retrieved successfully');
  } catch (err) {
    next(err);
  }
};

// @desc    Get ride stats for Ride Pool & Dashboard
// @route   GET /api/requests/stats
export const getRequestStats = async (req, res, next) => {
  try {
    const totalRides = await RequestDB.count();
    const availableRides = await RequestDB.count({
      $or: [{ status: 'Visible' }, { visibility: 'VISIBLE', status: { $ne: 'ASSIGNED' } }]
    });
    const assignedRides = await RequestDB.count({
      $or: [{ status: 'ASSIGNED' }, { status: 'COMPLETED' }, { status: /^Dispatched/ }]
    });
    const cancelledRides = await RequestDB.count({ status: 'CANCELLED' });

    const allRides = await RequestDB.find({}, null, 0, 1000);
    const driverRequestsCount = allRides.reduce((acc, r) => acc + (r.driverRequests?.length || 0), 0);

    return sendSuccess(res, {
      totalRides,
      availableRides,
      driverRequestsCount,
      assignedRides,
      cancelledRides,
      updatedAt: new Date()
    }, 'Ride statistics retrieved successfully');
  } catch (err) {
    next(err);
  }
};

// @desc    Get single request by ID or requestId
// @route   GET /api/requests/:id
export const getRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;

    let request = await RequestDB.findById(id);
    if (!request) {
      request = await RequestDB.findOne({ requestId: id });
    }

    if (!request) {
      return sendError(res, `Ride request not found with id: ${id}`, 404);
    }

    return sendSuccess(res, request, 'Ride request details retrieved successfully');
  } catch (err) {
    next(err);
  }
};

// @desc    Create new ride request (Admin Manual or App)
// @route   POST /api/requests
export const createRequest = async (req, res, next) => {
  try {
    const {
      customerName,
      pickupLocation,
      dropLocation,
      fare,
      date,
      timeToLeave,
      timeToReach,
      seatsNeeded,
      vehiclePreference,
      acRequired,
      oneWay,
      publishToPool,
      source = 'MANUAL',
      status,
      visibility,
      notes
    } = req.body;

    if (!customerName || !pickupLocation || !dropLocation) {
      return sendError(res, 'Passenger name, pickup location, and drop-off location are required', 400);
    }

    const isPublished = publishToPool !== undefined ? publishToPool : true;
    const finalVisibility = visibility || (isPublished ? 'VISIBLE' : 'HIDDEN');
    const finalStatus = status || (isPublished ? 'Visible' : 'Draft');

    const newRequestData = {
      customerName,
      pickupLocation,
      dropLocation,
      fare: fare || 'Rs. 9,500',
      date: date || new Date().toISOString().split('T')[0],
      timeToLeave: timeToLeave || '08:00 AM',
      timeToReach: timeToReach || '09:00 AM',
      seatsNeeded: Number(seatsNeeded) || 1,
      vehiclePreference: vehiclePreference || 'Sedan',
      acRequired: acRequired !== undefined ? acRequired : true,
      oneWay: oneWay !== undefined ? oneWay : true,
      status: finalStatus,
      visibility: finalVisibility,
      source: (source || 'MANUAL').toUpperCase(),
      notes: notes || '',
      timeline: [{
        action: 'CREATED',
        performedBy: 'Admin (Manual)',
        details: `Ride created: ${pickupLocation} -> ${dropLocation}`
      }]
    };

    const saved = await RequestDB.create(newRequestData);

    return sendSuccess(res, saved, `Ride request ${saved.requestId} created successfully`, 201);
  } catch (err) {
    next(err);
  }
};

// @desc    Update ride request
// @route   PUT /api/requests/:id
export const updateRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const filter = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { requestId: id };

    const updated = await RequestDB.update(
      filter,
      {
        ...updateData,
        $push: {
          timeline: {
            action: 'UPDATED',
            performedBy: 'Admin',
            details: 'Ride details updated'
          }
        }
      }
    );

    if (!updated) {
      return sendError(res, `Ride request not found with id: ${id}`, 404);
    }

    return sendSuccess(res, updated, `Ride ${updated.requestId} updated successfully`);
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle ride visibility (VISIBLE/HIDDEN)
// @route   PUT /api/requests/:id/visibility
export const toggleVisibility = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { visibility } = req.body;

    const filter = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { requestId: id };
    const request = await RequestDB.findOne(filter);

    if (!request) {
      return sendError(res, `Ride request not found with id: ${id}`, 404);
    }

    const nextVisibility = visibility || (request.visibility === 'VISIBLE' ? 'HIDDEN' : 'VISIBLE');
    const nextStatus = nextVisibility === 'VISIBLE' ? 'Visible' : 'Draft';

    const updated = await RequestDB.update(filter, {
      visibility: nextVisibility,
      status: nextStatus,
      $push: {
        timeline: {
          action: 'VISIBILITY_CHANGED',
          performedBy: 'Admin',
          details: `Visibility toggled to ${nextVisibility}`
        }
      }
    });

    return sendSuccess(res, updated, `Ride visibility updated to ${nextVisibility}`);
  } catch (err) {
    next(err);
  }
};

// @desc    Get driver bids/requests for a specific ride
// @route   GET /api/requests/:id/driver-requests
export const getDriverRequestsForRide = async (req, res, next) => {
  try {
    const { id } = req.params;

    const filter = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { requestId: id };
    const request = await RequestDB.findOne(filter);

    if (!request) {
      return sendError(res, `Ride request not found with id: ${id}`, 404);
    }

    return sendSuccess(res, {
      requestId: request.requestId,
      route: `${request.pickupLocation} -> ${request.dropLocation}`,
      driverRequests: request.driverRequests || []
    }, 'Driver requests for ride retrieved successfully');
  } catch (err) {
    next(err);
  }
};
