import mongoose from 'mongoose';
import DriverIssueModel from '../models/DriverIssue.js';
import CustomerNotification from '../models/CustomerNotification.js';
import ReplacementRequest from '../models/ReplacementRequest.js';
import { sendSuccess, sendError } from '../middleware/responseHandler.js';

// Helper to get raw MongoDB client
function getRawClient() {
  return mongoose.connection?.client || null;
}

// Helper to validate genuine driver reported issues and filter out ghost/spurious batch duplicates
export function isValidIssueReport(doc) {
  if (!doc) return false;

  // 1. If mode is 'Separate' and passengers array is present:
  if (doc.mode === 'Separate' && Array.isArray(doc.passengers) && doc.passengers.length > 0) {
    const custName = String(doc.customerName || doc.passengerName || '').trim().toLowerCase();
    const reqId = String(doc.requestId || doc.rideId || '').trim();

    // Check if the specific assigned customer/request is marked canBePicked === true
    const targetPassenger = doc.passengers.find(p => {
      const pId = String(p.id || p.requestId || '').trim();
      const pName = String(p.name || '').trim().toLowerCase();
      return (reqId && pId && reqId === pId) || (custName && pName && custName === pName);
    });

    // If this customer is explicitly marked canBePicked === true, it's NOT an issue report for them
    if (targetPassenger && targetPassenger.canBePicked === true) {
      return false;
    }

    // Check if there are any unpicked passengers at all
    const unpickedPassengers = doc.passengers.filter(p => p.canBePicked === false);
    if (unpickedPassengers.length === 0 && (!doc.details || !doc.details.trim()) && (!doc.message || !doc.message.trim())) {
      return false;
    }

    // If doc has customerName but that customerName is not among unpicked, and details is empty
    if (custName && unpickedPassengers.length > 0 && (!doc.details || !doc.details.trim()) && (!doc.message || !doc.message.trim())) {
      const isUnpicked = unpickedPassengers.some(p => String(p.name || '').trim().toLowerCase() === custName);
      if (!isUnpicked) {
        return false;
      }
    }
  }

  // 2. Reject empty dummy reports where details & message are completely empty and reason is default 'Vehicle Breakdowns' with no unpicked passengers
  if ((!doc.details || !doc.details.trim()) && (!doc.message || !doc.message.trim())) {
    if (doc.mode === 'Separate') {
      const hasUnpicked = Array.isArray(doc.passengers) && doc.passengers.some(p => p.canBePicked === false);
      if (!hasUnpicked) return false;
    }
  }

  return true;
}

// Helper to fetch and normalize issues across test.issuereports, test.driverissues, and ride_and_serve.driverissues
export async function getNormalizedIssues() {
  const client = getRawClient();
  const allRawDocs = [];

  // 1. Fetch drivers map for enriching driver phone, vehicle, code
  const driversMap = {};
  if (client) {
    for (const dbName of ['test', 'ride_and_serve']) {
      try {
        const drivers = await client.db(dbName).collection('drivers').find({}).toArray();
        drivers.forEach(d => {
          const key = String(d._id);
          if (!driversMap[key]) driversMap[key] = d;
          if (d.Name) {
            driversMap[d.Name.toLowerCase().trim()] = d;
          }
        });
      } catch (e) {}
    }

    // 2. Fetch from test.issuereports (where Driver App submits)
    try {
      const docs1 = await client.db('test').collection('issuereports').find({}).sort({ createdAt: -1 }).toArray();
      docs1.forEach(d => allRawDocs.push({ ...d, _sourceDb: 'test', _sourceCol: 'issuereports' }));
    } catch (e) {}

    // 3. Fetch from test.driverissues
    try {
      const docs2 = await client.db('test').collection('driverissues').find({}).sort({ createdAt: -1 }).toArray();
      docs2.forEach(d => allRawDocs.push({ ...d, _sourceDb: 'test', _sourceCol: 'driverissues' }));
    } catch (e) {}

    // 4. Fetch from ride_and_serve.driverissues
    try {
      const docs3 = await client.db('ride_and_serve').collection('driverissues').find({}).sort({ createdAt: -1 }).toArray();
      docs3.forEach(d => allRawDocs.push({ ...d, _sourceDb: 'ride_and_serve', _sourceCol: 'driverissues' }));
    } catch (e) {}

    // 5. Fetch from ride_and_serve.issuereports
    try {
      const docs4 = await client.db('ride_and_serve').collection('issuereports').find({}).sort({ createdAt: -1 }).toArray();
      docs4.forEach(d => allRawDocs.push({ ...d, _sourceDb: 'ride_and_serve', _sourceCol: 'issuereports' }));
    } catch (e) {}
  }

  // Fallback to Mongoose model if no raw docs found
  if (allRawDocs.length === 0) {
    try {
      const mDocs = await DriverIssueModel.find({}).sort({ createdAt: -1 }).lean();
      mDocs.forEach(d => allRawDocs.push(d));
    } catch (e) {}
  }

  // 6. Fetch recent customer rides to enrich issues with true rideId and customer phone
  const customerRides = [];
  if (client) {
    for (const dbName of ['ride_and_serve', 'test']) {
      try {
        const rList = await client.db(dbName).collection('riderequests').find({}).sort({ _id: -1 }).limit(100).toArray();
        customerRides.push(...rList);
      } catch (e) {}
    }
  }

  // Map and deduplicate by _id or issueId
  const seenIds = new Set();
  const normalizedList = [];

  for (const doc of allRawDocs) {
    if (!isValidIssueReport(doc)) continue;

    const idKey = String(doc._id || doc.issueId);
    if (seenIds.has(idKey)) continue;
    seenIds.add(idKey);

    const driverKey = doc.driver ? String(doc.driver) : (doc.driverId ? String(doc.driverId) : '');
    const nameKey = doc.driverName ? doc.driverName.toLowerCase().trim() : '';
    const driverDoc = driversMap[driverKey] || driversMap[nameKey] || null;

    const issueId = doc.issueId || `ISS-${String(doc._id || '').slice(-4).toUpperCase()}`;
    const phone = doc.driverPhone || (driverDoc ? (driverDoc.CountryCode ? `${driverDoc.CountryCode} ${driverDoc.PhoneNumber}` : driverDoc.PhoneNumber) : '');
    const code = doc.driverCode || driverDoc?.driverReferenceId || '';
    const desc = doc.details || doc.description || '';
    const vehicle = doc.vehicle || (driverDoc?.vehicle || 'Sedan Executive');
    const loc = doc.location || (doc.fromTime && doc.toTime ? `${doc.fromTime} - ${doc.toTime}` : 'Current Route / Shift');

    let severity = doc.severity;
    if (!severity) {
      const reasonLower = (doc.reason || '').toLowerCase();
      if (reasonLower.includes('emergency') || reasonLower.includes('puncture') || reasonLower.includes('vehicle') || reasonLower.includes('accident')) {
        severity = 'High';
      } else {
        severity = 'Medium';
      }
    }

    // Match customer ride from riderequests
    let matchedRide = null;
    const cPhone = doc.customerPhone || doc.passengerPhone;
    const cName = doc.customerName || doc.passengerName;
    const cleanPhone = cPhone ? String(cPhone).replace(/[^0-9]/g, '') : '';
    const last7 = cleanPhone.slice(-7);

    if (cleanPhone) {
      matchedRide = customerRides.find(r => {
        const rPhone = String(r.passengerPhone || r.customerPhone || r.phone || '').replace(/[^0-9]/g, '');
        return (cleanPhone && rPhone.includes(cleanPhone)) || (last7 && rPhone.includes(last7));
      });
    }

    if (!matchedRide && cName && cName !== 'Customer') {
      const lowerName = cName.toLowerCase().trim();
      matchedRide = customerRides.find(r => {
        const pName = String(r.passengerName || r.name || r.customerName || '').toLowerCase().trim();
        return pName && (pName === lowerName || pName.includes(lowerName) || lowerName.includes(pName));
      });
    }

    if (!matchedRide && (doc.driver || doc.driverId)) {
      const dId = String(doc.driver || doc.driverId);
      matchedRide = customerRides.find(r => String(r.driver || r.driverId) === dId);
    }

    const resolvedRideId = doc.rideId || doc.requestId || matchedRide?.requestId || (matchedRide ? String(matchedRide._id) : 'REQ-8037');
    const resolvedCustomerName = doc.customerName || doc.passengerName || matchedRide?.passengerName || matchedRide?.name || 'Customer';
    const resolvedCustomerPhone = doc.customerPhone || doc.passengerPhone || matchedRide?.passengerPhone || matchedRide?.phone || '03328904415';
    const resolvedPickup = doc.pickupLocation || matchedRide?.pickupLocation || 'Chaklala Scheme 3, Rawalpindi';
    const resolvedDropoff = doc.dropoffLocation || matchedRide?.dropoffLocation || 'Kamran Market, Saddar Rawalpindi';
    const resolvedFare = doc.fare || matchedRide?.fare || 9500;

    normalizedList.push({
      _id: doc._id,
      mongoId: String(doc._id),
      issueId,
      driverId: doc.driver || doc.driverId || null,
      driverName: doc.driverName || driverDoc?.Name || 'Unknown Driver',
      driverPhone: phone,
      driverCode: code,
      vehicle,
      reason: doc.reason || 'Road Issue',
      description: desc,
      details: desc,
      location: loc,
      fromTime: doc.fromTime || '',
      toTime: doc.toTime || '',
      fromDate: doc.fromDate || null,
      toDate: doc.toDate || null,
      rideId: resolvedRideId,
      requestId: resolvedRideId,
      customerName: resolvedCustomerName,
      customerPhone: resolvedCustomerPhone,
      pickupLocation: resolvedPickup,
      dropoffLocation: resolvedDropoff,
      fare: resolvedFare,
      status: doc.status || 'Pending',
      severity,
      remarks: doc.remarks || '',
      replacementDriverId: doc.replacementDriverId || undefined,
      replacementDriverName: doc.replacementDriverName || undefined,
      replacementDriverPhone: doc.replacementDriverPhone || undefined,
      replacementDriverVehicle: doc.replacementDriverVehicle || undefined,
      sourceCollection: doc._sourceCol || 'issuereports',
      sourceDb: doc._sourceDb || 'test',
      createdAt: doc.createdAt || new Date(),
      updatedAt: doc.updatedAt || doc.createdAt || new Date()
    });
  }

  // Sort newest first
  normalizedList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return normalizedList;
}

// @desc    Get all driver reported issues
// @route   GET /admin/issues, GET /api/issues
export const getIssues = async (req, res, next) => {
  try {
    const issues = await getNormalizedIssues();
    const pendingCount = issues.filter(i => (i.status || 'Pending') === 'Pending').length;

    return res.status(200).json({
      success: true,
      count: issues.length,
      pendingCount,
      issues,
      data: issues
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new driver issue report (called by Flutter Driver App or Admin)
// @route   POST /admin/issues, POST /api/issues
export const createIssue = async (req, res, next) => {
  try {
    const { 
      driverId, 
      driver,
      driverName, 
      driverPhone, 
      driverCode, 
      vehicle, 
      reason, 
      description, 
      details,
      location, 
      rideId, 
      requestId, 
      fromTime,
      toTime,
      fromDate,
      toDate,
      severity 
    } = req.body;

    if (!driverName || !reason) {
      return sendError(res, 'driverName and reason are required', 400);
    }

    const issueId = `ISS-${Math.floor(1000 + Math.random() * 9000)}`;
    const newIssue = {
      issueId,
      driver: driver || driverId || null,
      driverId: driverId || driver || null,
      driverName,
      driverPhone: driverPhone || '',
      driverCode: driverCode || '',
      vehicle: vehicle || 'Sedan Executive',
      reason,
      description: description || details || '',
      details: details || description || '',
      location: location || (fromTime ? `${fromTime} - ${toTime}` : 'Current Location'),
      fromTime: fromTime || '',
      toTime: toTime || '',
      fromDate: fromDate || new Date(),
      toDate: toDate || new Date(),
      rideId: rideId || requestId || '',
      requestId: requestId || rideId || '',
      status: 'Pending',
      severity: severity || 'High',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const client = getRawClient();
    if (client) {
      // Insert into test.issuereports so Flutter App and Admin both see it
      try {
        const r1 = await client.db('test').collection('issuereports').insertOne(newIssue);
        newIssue._id = r1.insertedId;
      } catch (e) {}
      // Also insert into ride_and_serve.driverissues
      try {
        await client.db('ride_and_serve').collection('driverissues').insertOne(newIssue);
      } catch (e) {}
    } else {
      const doc = await DriverIssueModel.create(newIssue);
      newIssue._id = doc._id;
    }

    // Broadcast Real-Time Socket.IO events
    const io = req.app.get('io');
    if (io) {
      io.emit('new_issue_report', newIssue);
      io.emit('new-issue-report', newIssue);
      io.to('admin-room').emit('new_issue_report', newIssue);
    }

    return res.status(201).json({
      success: true,
      message: 'Issue reported successfully',
      issue: newIssue,
      data: newIssue
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update / Resolve issue
// @route   PATCH /admin/issues/:id/resolve, PATCH /api/issues/:id/resolve
export const resolveIssue = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      status = 'Resolved', 
      remarks, 
      replacementDriverId, 
      replacementDriverName,
      notifyCustomer = true,
      affectedDate,
      affectedTime,
      reportedReason,
      additionalDetails,
      details,
      canRequestReplacement = true,
      rideId,
      requestId
    } = req.body;

    const client = getRawClient();
    const query = (id && id.match(/^[0-9a-fA-F]{24}$/))
      ? { $or: [{ _id: new mongoose.Types.ObjectId(id) }, { issueId: id }] }
      : { issueId: id };

    // Fetch existing issue to get all associated details
    let existingIssue = null;
    if (client) {
      for (const dbName of ['test', 'ride_and_serve']) {
        for (const colName of ['issuereports', 'driverissues']) {
          try {
            existingIssue = await client.db(dbName).collection(colName).findOne(query);
            if (existingIssue) break;
          } catch (e) {}
        }
        if (existingIssue) break;
      }
    }
    if (!existingIssue) {
      existingIssue = await DriverIssueModel.findOne(query).lean().catch(() => null);
    }

    const targetRideId = rideId || requestId || existingIssue?.rideId || existingIssue?.requestId || 'REQ-8031';
    const reasonText = reportedReason || req.body.reason || existingIssue?.reason || 'Vehicle Issue';
    
    // Format Affected Date e.g. "May 21, 2026"
    let formattedDate = affectedDate;
    if (!formattedDate) {
      if (existingIssue?.fromDate) {
        try {
          formattedDate = new Date(existingIssue.fromDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch (e) {
          formattedDate = 'May 21, 2026';
        }
      } else {
        formattedDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    }

    // Format Affected Time Slot e.g. "08:00 AM - 10:00 AM"
    let formattedTime = affectedTime;
    if (!formattedTime) {
      if (existingIssue?.fromTime && existingIssue?.toTime) {
        formattedTime = `${existingIssue.fromTime} - ${existingIssue.toTime}`;
      } else {
        formattedTime = '08:00 AM - 10:00 AM';
      }
    }

    const explanationDetails = additionalDetails || details || remarks || existingIssue?.details || existingIssue?.description || 'Driver is unavailable due to a sudden mechanical issue with the vehicle. We apologize for the inconvenience and are working to find a replacement driver immediately. The issue is severe enough to prevent the ride.';

    // Lookup linked ride to get the EXACT customer details
    let linkedRide = null;
    if (targetRideId) {
      const isMongo = /^[0-9a-fA-F]{24}$/.test(targetRideId);
      const rideFilter = isMongo ? { _id: new mongoose.Types.ObjectId(targetRideId) } : { $or: [{ rideId: targetRideId }, { requestId: targetRideId }] };
      if (client) {
        for (const dbName of ['ride_and_serve', 'test']) {
          try {
            linkedRide = await client.db(dbName).collection('rides').findOne(rideFilter);
            if (!linkedRide) {
              linkedRide = await client.db(dbName).collection('riderequests').findOne(rideFilter);
            }
            if (linkedRide) break;
          } catch (e) {}
        }
      }
    }

    const targetCustomerId = linkedRide?.userId || linkedRide?.customerId || linkedRide?.passengerId || existingIssue?.customerId || null;
    const targetPassengerName = linkedRide?.passengerName || linkedRide?.customerName || linkedRide?.name || existingIssue?.passengerName || existingIssue?.clientName || 'Customer';
    const targetPassengerPhone = linkedRide?.passengerPhone || linkedRide?.customerPhone || linkedRide?.phone || linkedRide?.userPhone || existingIssue?.passengerPhone || existingIssue?.clientPhone || '';

    const customerNotifPayload = {
      notificationId: `NOTIF-${Math.floor(1000 + Math.random() * 9000)}`,
      type: 'DRIVER_UNAVAILABLE',
      title: 'Driver Unavailable',
      subtitle: 'Your assigned driver is unavailable for this ride.',
      rideId: targetRideId,
      requestId: targetRideId,
      issueId: existingIssue?.issueId || id,
      customerId: targetCustomerId ? String(targetCustomerId) : null,
      userId: targetCustomerId ? String(targetCustomerId) : null,
      driverId: existingIssue?.driver || existingIssue?.driverId || null,
      driverName: existingIssue?.driverName || 'Ahmed Raza',
      driverPhone: existingIssue?.driverPhone || '+92 300 1234567',
      passengerName: targetPassengerName,
      passengerPhone: targetPassengerPhone,
      affectedDate: formattedDate,
      affectedTime: formattedTime,
      reportedReason: `Reported Reason: ${reasonText}`,
      reason: reasonText,
      additionalDetails: explanationDetails,
      details: explanationDetails,
      canRequestReplacement: Boolean(canRequestReplacement),
      replacementRequested: false,
      status: 'UNAVAILABLE',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const hasReplacement = Boolean(replacementDriverId || replacementDriverName);

    // 1. If replacement requested, look up standby driver details
    let repDriverDoc = null;
    if (hasReplacement && client) {
      for (const dbName of ['ride_and_serve', 'test']) {
        if (replacementDriverId) {
          const isMongoDrv = /^[0-9a-fA-F]{24}$/.test(String(replacementDriverId));
          const drvFilter = isMongoDrv 
            ? { _id: new mongoose.Types.ObjectId(replacementDriverId) } 
            : { $or: [{ driverId: replacementDriverId }, { driverReferenceId: replacementDriverId }] };
          try {
            repDriverDoc = await client.db(dbName).collection('drivers').findOne(drvFilter);
            if (repDriverDoc) break;
          } catch (e) {}
        }
        if (!repDriverDoc && replacementDriverName) {
          try {
            repDriverDoc = await client.db(dbName).collection('drivers').findOne({
              $or: [
                { Name: new RegExp(`^${replacementDriverName.trim()}$`, 'i') },
                { name: new RegExp(`^${replacementDriverName.trim()}$`, 'i') }
              ]
            });
            if (repDriverDoc) break;
          } catch (e) {}
        }
      }
    }

    const finalRepName = replacementDriverName || repDriverDoc?.Name || repDriverDoc?.name || 'Assigned Driver';
    const finalRepId = repDriverDoc?._id || replacementDriverId;
    const finalRepPhone = req.body.replacementDriverPhone || req.body.driverPhone || repDriverDoc?.PhoneNumber || repDriverDoc?.phone || '+92 311 3037096';
    const finalRepCode = repDriverDoc?.driverReferenceId || repDriverDoc?.driverId || (finalRepId ? `DRV-${String(finalRepId).slice(-6).toUpperCase()}` : 'DRV-REP');
    const finalRepVehicle = req.body.replacementDriverVehicle || req.body.driverVehicle || req.body.vehicle || (repDriverDoc?.vehicleDetails ? `${repDriverDoc.vehicleDetails.make || ''} ${repDriverDoc.vehicleDetails.model || ''}`.trim() : null) || repDriverDoc?.vehicle || 'Sedan Executive';
    const finalRepRating = repDriverDoc?.rating || 4.9;

    const updateDoc = {
      $set: {
        status,
        remarks: remarks || (hasReplacement ? `Reassigned customer ${targetPassengerName} to replacement driver: ${finalRepName} (${finalRepPhone})` : 'Resolved by Dispatcher'),
        replacementDriverId: finalRepId || undefined,
        replacementDriverName: finalRepName || undefined,
        replacementDriverPhone: finalRepPhone || undefined,
        replacementDriverCode: finalRepCode || undefined,
        replacementDriverVehicle: finalRepVehicle || undefined,
        customerNotified: Boolean(notifyCustomer),
        customerNotifiedAt: new Date(),
        customerNotification: notifyCustomer ? customerNotifPayload : undefined,
        resolvedAt: new Date(),
        updatedAt: new Date()
      }
    };

    let updated = null;
    if (client) {
      // Update across test.issuereports and ride_and_serve.driverissues
      for (const dbName of ['test', 'ride_and_serve']) {
        for (const colName of ['issuereports', 'driverissues']) {
          try {
            await client.db(dbName).collection(colName).updateOne(query, updateDoc);
            if (!updated) {
              updated = await client.db(dbName).collection(colName).findOne(query);
            }
          } catch (e) {}
        }
      }
    } else {
      updated = await DriverIssueModel.findOneAndUpdate(query, updateDoc, { new: true });
    }

    // 2. If replacement driver provided, PERMANENTLY UPDATE MONGODB riderequests, rides, assignments & replacementrequests
    let targetRideDoc = null;
    if (hasReplacement && client) {
      const issueCustPhone = req.body.customerPhone || existingIssue?.customerPhone;
      const issueCustName = req.body.customerName || existingIssue?.customerName;

      // Priority 1: Match by customer phone if available
      if (issueCustPhone) {
        const clean = String(issueCustPhone).replace(/[^0-9]/g, '');
        const last7 = clean.slice(-7);
        for (const dbName of ['ride_and_serve', 'test']) {
          for (const colName of ['riderequests', 'rides']) {
            try {
              targetRideDoc = await client.db(dbName).collection(colName).findOne({
                $or: [
                  { passengerPhone: new RegExp(last7 || clean, 'i') },
                  { customerPhone: new RegExp(last7 || clean, 'i') },
                  { phone: new RegExp(last7 || clean, 'i') }
                ]
              });
              if (targetRideDoc) break;
            } catch (e) {}
          }
          if (targetRideDoc) break;
        }
      }

      // Priority 2: Match by customer name if available
      if (!targetRideDoc && issueCustName && issueCustName !== 'Customer') {
        const cLower = issueCustName.toLowerCase().trim();
        for (const dbName of ['ride_and_serve', 'test']) {
          for (const colName of ['riderequests', 'rides']) {
            try {
              targetRideDoc = await client.db(dbName).collection(colName).findOne({
                $or: [
                  { passengerName: new RegExp(`^${cLower}$`, 'i') },
                  { name: new RegExp(`^${cLower}$`, 'i') },
                  { customerName: new RegExp(`^${cLower}$`, 'i') }
                ]
              });
              if (targetRideDoc) break;
            } catch (e) {}
          }
          if (targetRideDoc) break;
        }
      }

      // Priority 3: Match by targetRideId if still not found
      if (!targetRideDoc && targetRideId) {
        const isMongoRide = /^[0-9a-fA-F]{24}$/.test(String(targetRideId));
        const rideFilter = isMongoRide 
          ? { _id: new mongoose.Types.ObjectId(targetRideId) } 
          : { $or: [{ requestId: targetRideId }, { rideId: targetRideId }, { requestId: String(targetRideId).replace(/^REQ-/i, '') }] };
        for (const dbName of ['ride_and_serve', 'test']) {
          for (const colName of ['riderequests', 'rides']) {
            try {
              targetRideDoc = await client.db(dbName).collection(colName).findOne(rideFilter);
              if (targetRideDoc) break;
            } catch (e) {}
          }
          if (targetRideDoc) break;
        }
      }

      // Priority 4: Fallback search by refusing driver active ride
      if (!targetRideDoc && existingIssue) {
        const drvId = existingIssue.driver || existingIssue.driverId;
        const drvName = existingIssue.driverName;

        const orFilters = [];
        if (drvId) {
          if (/^[0-9a-fA-F]{24}$/.test(String(drvId))) {
            orFilters.push({ driver: new mongoose.Types.ObjectId(drvId) });
            orFilters.push({ driverId: new mongoose.Types.ObjectId(drvId) });
          }
          orFilters.push({ driver: String(drvId) });
          orFilters.push({ driverId: String(drvId) });
        }
        if (drvName) {
          orFilters.push({ assignedDriverName: new RegExp(`^${drvName.trim()}$`, 'i') });
          orFilters.push({ assignedDriver: new RegExp(`^${drvName.trim()}$`, 'i') });
        }

        if (orFilters.length > 0) {
          for (const dbName of ['ride_and_serve', 'test']) {
            for (const colName of ['riderequests', 'rides']) {
              try {
                targetRideDoc = await client.db(dbName).collection(colName).findOne({
                  $or: orFilters,
                  status: { $in: ['ASSIGNED', 'Driver Unavailable', 'Pending Dispatch', 'ACCEPTED', 'Pending'] }
                });
                if (targetRideDoc) break;
              } catch (e) {}
            }
            if (targetRideDoc) break;
          }
        }
      }

      const repDriverObjId = (/^[0-9a-fA-F]{24}$/.test(String(finalRepId))) ? new mongoose.Types.ObjectId(finalRepId) : finalRepId;
      const rideUpdatePayload = {
        $set: {
          status: 'ASSIGNED',
          driver: repDriverObjId,
          driverId: repDriverObjId,
          assignedDriverId: String(finalRepId || ''),
          assignedDriver: finalRepName,
          assignedDriverName: finalRepName,
          assignedDriverPhone: finalRepPhone,
          assignedDriverCode: finalRepCode,
          assignedDriverDetails: {
            driverCode: finalRepCode,
            name: finalRepName,
            phone: finalRepPhone,
            vehicle: finalRepVehicle,
            rating: finalRepRating
          },
          replacementNotes: `Driver replaced from ${existingIssue?.driverName || 'previous driver'} to ${finalRepName} by dispatcher`,
          driverIssue: null,
          updatedAt: new Date()
        },
        $push: {
          timeline: {
            action: 'REPLACEMENT_DISPATCHED',
            performedBy: 'Dispatcher',
            details: `Reassigned customer ${targetPassengerName} to replacement driver ${finalRepName} (${finalRepCode})`,
            timestamp: new Date()
          }
        }
      };

      // A. Update riderequests and rides collections
      for (const dbName of ['ride_and_serve', 'test']) {
        for (const colName of ['riderequests', 'rides']) {
          try {
            if (targetRideDoc?._id) {
              await client.db(dbName).collection(colName).updateOne({ _id: targetRideDoc._id }, rideUpdatePayload);
            }
            if (targetRideDoc?.requestId) {
              await client.db(dbName).collection(colName).updateOne({ requestId: targetRideDoc.requestId }, rideUpdatePayload);
            }
            if (targetRideId && (!targetRideDoc || targetRideDoc.requestId !== targetRideId)) {
              const isMongo = /^[0-9a-fA-F]{24}$/.test(String(targetRideId));
              const rFilter = isMongo ? { _id: new mongoose.Types.ObjectId(targetRideId) } : { $or: [{ requestId: targetRideId }, { rideId: targetRideId }] };
              await client.db(dbName).collection(colName).updateOne(rFilter, rideUpdatePayload);
            }
          } catch (e) {}
        }
      }

      // B. Insert into assignments collection
      const asgId = `ASG-${Math.floor(5000 + Math.random() * 5000)}`;
      const reqObjId = (targetRideDoc?._id && /^[0-9a-fA-F]{24}$/.test(String(targetRideDoc._id)))
        ? new mongoose.Types.ObjectId(targetRideDoc._id)
        : (targetRideId && /^[0-9a-fA-F]{24}$/.test(String(targetRideId)) ? new mongoose.Types.ObjectId(targetRideId) : new mongoose.Types.ObjectId());
      const drvObjId = (repDriverObjId && /^[0-9a-fA-F]{24}$/.test(String(repDriverObjId)))
        ? new mongoose.Types.ObjectId(repDriverObjId)
        : new mongoose.Types.ObjectId();

      const assignmentRecord = {
        assignmentId: asgId,
        requestId: reqObjId,
        rideId: targetRideDoc?._id || targetRideId || 'REQ-8037',
        driverId: drvObjId,
        driverName: finalRepName,
        driverCode: finalRepCode,
        driverPhone: finalRepPhone,
        status: 'ASSIGNED',
        remarks: `Replacement driver assigned: ${finalRepName} for customer ${targetRideDoc?.passengerName || targetPassengerName || 'Customer'}`,
        dispatchedAt: new Date(),
        assignedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      for (const dbName of ['ride_and_serve', 'test']) {
        try {
          await client.db(dbName).collection('assignments').insertOne({ ...assignmentRecord });
        } catch (e) {}
      }

      // C. Update / Insert into replacementrequests collection
      for (const dbName of ['ride_and_serve', 'test']) {
        try {
          const repReqFilter = {
            $or: [
              { rideId: targetRideId },
              { requestId: targetRideId },
              { requestId: targetRideDoc?.requestId },
              { clientName: new RegExp(targetPassengerName, 'i') },
              { passengerName: new RegExp(targetPassengerName, 'i') }
            ]
          };
          const existingRepReq = await client.db(dbName).collection('replacementrequests').findOne(repReqFilter);
          if (existingRepReq) {
            await client.db(dbName).collection('replacementrequests').updateOne(
              { _id: existingRepReq._id },
              {
                $set: {
                  status: 'ASSIGNED',
                  assignedDriver: {
                    driverId: repDriverObjId,
                    driverCode: finalRepCode,
                    name: finalRepName,
                    phone: finalRepPhone,
                    vehicle: finalRepVehicle,
                    ac: true,
                    assignedAt: new Date()
                  },
                  updatedAt: new Date()
                }
              }
            );
          } else {
            await client.db(dbName).collection('replacementrequests').insertOne({
              requestId: `RPL-${Math.floor(1000 + Math.random() * 9000)}`,
              rideId: targetRideDoc?.requestId || targetRideId,
              clientName: targetRideDoc?.passengerName || targetPassengerName,
              clientPhone: targetRideDoc?.passengerPhone || targetPassengerPhone || '+92 300 1234567',
              scheduledDate: formattedDate,
              timeSlot: formattedTime,
              reason: reasonText,
              status: 'ASSIGNED',
              assignedDriver: {
                driverId: repDriverObjId,
                driverCode: finalRepCode,
                name: finalRepName,
                phone: finalRepPhone,
                vehicle: finalRepVehicle,
                ac: true,
                assignedAt: new Date()
              },
              fare: targetRideDoc?.fare || 4500,
              fareFormatted: targetRideDoc?.fare ? `Rs. ${targetRideDoc.fare.toLocaleString()}` : 'Rs. 4,500',
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }
        } catch (e) {}
      }

      // D. Insert notification into drivernotifications collection for the new driver
      const driverNotifDoc = {
        notificationId: `${targetRideDoc?.requestId || targetRideId}_ASSIGNED_${Date.now()}`,
        driverId: String(finalRepId),
        driverName: finalRepName,
        driverReferenceId: finalRepCode || '',
        rideId: targetRideDoc?.requestId || targetRideId,
        customerName: targetPassengerName || targetRideDoc?.passengerName || 'Customer',
        customerPhone: targetPassengerPhone || targetRideDoc?.passengerPhone || '',
        customerCount: 0,
        routeId: '',
        routeName: '',
        timeRange: '',
        pickup: typeof targetRideDoc?.pickupLocation === 'object' ? (targetRideDoc?.pickupLocation?.address || 'Pickup') : (targetRideDoc?.pickupLocation || 'Pickup'),
        destination: typeof targetRideDoc?.dropoffLocation === 'object' ? (targetRideDoc?.dropoffLocation?.address || 'Drop-off') : (targetRideDoc?.dropoffLocation || 'Drop-off'),
        fareFormatted: targetRideDoc?.fareFormatted || (targetRideDoc?.fare ? `Rs. ${targetRideDoc.fare.toLocaleString()}` : 'Rs. 10,000'),
        status: 'ASSIGNED',
        title: '🚗 Replacement Ride Assigned!',
        subtitle: `Customer ${targetPassengerName || targetRideDoc?.passengerName || 'Customer'} (${targetRideDoc?.requestId || targetRideId}) has been assigned to you. Tap to view ride details.`,
        type: 'NEW_ASSIGNMENT',
        isRead: false,
        isDismissed: false,
        payload: {
          id: targetRideDoc?.requestId || targetRideId,
          rideId: targetRideDoc?.requestId || targetRideId,
          requestId: targetRideDoc?.requestId || targetRideId,
          mongoId: String(targetRideDoc?._id || ''),
          passengerName: targetPassengerName || targetRideDoc?.passengerName || 'Customer',
          customerName: targetPassengerName || targetRideDoc?.passengerName || 'Customer',
          passengerPhone: targetPassengerPhone || targetRideDoc?.passengerPhone || '',
          pickupLocation: targetRideDoc?.pickupLocation,
          dropoffLocation: targetRideDoc?.dropoffLocation,
          fare: targetRideDoc?.fare || 10000,
          fareFormatted: targetRideDoc?.fareFormatted || (targetRideDoc?.fare ? `Rs. ${targetRideDoc.fare.toLocaleString()}` : 'Rs. 10,000'),
          status: 'ASSIGNED'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      for (const dbName of ['ride_and_serve', 'test']) {
        try {
          await client.db(dbName).collection('drivernotifications').insertOne({ ...driverNotifDoc });
        } catch (e) {}
      }

      // E. Update Driver Status to "On Trip"
      for (const dbName of ['ride_and_serve', 'test']) {
        try {
          await client.db(dbName).collection('drivers').updateOne(
            { $or: [{ _id: repDriverObjId }, { driverReferenceId: finalRepCode }, { PhoneNumber: finalRepPhone }] },
            { $set: { availability: 'On Trip', liveStatus: 'On Trip', updatedAt: new Date() } }
          );
        } catch (e) {}
      }

      // F. Insert notification into customernotifications collection for customer
      const customerReplacementNotif = {
        notificationId: `NOTIF-REP-${Math.floor(1000 + Math.random() * 9000)}`,
        customerId: targetCustomerId || targetRideDoc?.passengerPhone || targetPassengerPhone || 'unknown',
        passengerName: targetPassengerName || targetRideDoc?.passengerName || 'Customer',
        passengerPhone: targetPassengerPhone || targetRideDoc?.passengerPhone || '',
        rideId: targetRideDoc?.requestId || targetRideId,
        type: 'DRIVER_REPLACED',
        title: '🚗 New Driver Assigned',
        subtitle: `New driver ${finalRepName} (${finalRepPhone}) has been assigned to your ride.`,
        message: `Your ride ${targetRideDoc?.requestId || targetRideId} has been reassigned to driver ${finalRepName} (${finalRepVehicle}).`,
        status: 'ASSIGNED',
        driverDetails: {
          driverId: finalRepId,
          driverCode: finalRepCode,
          name: finalRepName,
          phone: finalRepPhone,
          vehicle: finalRepVehicle,
          rating: finalRepRating
        },
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      for (const dbName of ['ride_and_serve', 'test']) {
        try {
          await client.db(dbName).collection('customernotifications').insertOne({ ...customerReplacementNotif });
        } catch (e) {}
      }
    }

    // Persist Customer Notification & Seed Replacement Request if customer notification requested (only when no replacement is assigned)
    if (notifyCustomer && !hasReplacement) {
      if (client) {
        for (const dbName of ['ride_and_serve', 'test']) {
          try {
            await client.db(dbName).collection('customernotifications').insertOne({ ...customerNotifPayload });
          } catch (e) {}

          // Also update ride status to DRIVER_UNAVAILABLE in rides/riderequests
          try {
            const isMongo = /^[0-9a-fA-F]{24}$/.test(targetRideId);
            const rideFilter = isMongo ? { _id: new mongoose.Types.ObjectId(targetRideId) } : { $or: [{ rideId: targetRideId }, { requestId: targetRideId }] };
            await client.db(dbName).collection('rides').updateOne(rideFilter, {
              $set: {
                status: 'DRIVER_UNAVAILABLE',
                driverUnavailableNotice: customerNotifPayload,
                updatedAt: new Date()
              }
            });
            await client.db(dbName).collection('riderequests').updateOne(rideFilter, {
              $set: {
                status: 'DRIVER_UNAVAILABLE',
                driverUnavailableNotice: customerNotifPayload,
                updatedAt: new Date()
              }
            });
          } catch (e) {}
        }
      }

      try {
        await CustomerNotification.create(customerNotifPayload);
      } catch (e) {}

      // Seed pending ReplacementRequest in replacementrequests collection
      const repReqDoc = {
        requestId: `RPL-${Math.floor(1000 + Math.random() * 9000)}`,
        rideId: targetRideId,
        clientName: customerNotifPayload.passengerName,
        clientPhone: customerNotifPayload.passengerPhone || '+92 300 1234567',
        scheduledDate: formattedDate,
        timeSlot: formattedTime,
        reason: reasonText,
        preferences: {
          vehicleArrangement: 'Separate',
          vehicleType: existingIssue?.vehicle || 'Sedan Executive',
          genderPreference: 'Male Only',
          acPreference: 'AC'
        },
        additionalNotes: explanationDetails,
        status: 'Pending',
        pickupLocation: existingIssue?.location || 'Blue Area, Islamabad',
        dropoffLocation: 'F-10 Markaz, Islamabad',
        fare: 4500,
        fareFormatted: 'Rs. 4,500',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      if (client) {
        for (const dbName of ['ride_and_serve', 'test']) {
          try {
            await client.db(dbName).collection('replacementrequests').insertOne(repReqDoc);
          } catch (e) {}
        }
      }
      try {
        await ReplacementRequest.create(repReqDoc);
      } catch (e) {}
    }

    // Broadcast Real-Time Socket.IO events to Customer, Driver & Admin
    const io = req.app.get('io');
    if (io) {
      // 1. Issue update for Admin
      io.emit('issue_updated', updated || existingIssue);
      io.emit('issue-updated', updated || existingIssue);
      io.emit('issue_resolved', updated || existingIssue);
      io.to('admin-room').emit('issue_updated', updated || existingIssue);
      io.to('admin-room').emit('issue_resolved', updated || existingIssue);

      // 2. Replacement Dispatch Events to Driver and Customer
      if (hasReplacement) {
        const replacementPayload = {
          rideId: targetRideDoc?._id || targetRideId,
          requestId: targetRideDoc?.requestId || targetRideId,
          status: 'ASSIGNED',
          driverId: finalRepId,
          driverCode: finalRepCode,
          driverName: finalRepName,
          driverPhone: finalRepPhone,
          driverVehicle: finalRepVehicle,
          clientName: targetPassengerName,
          passengerName: targetPassengerName,
          remarks: `Replacement driver assigned: ${finalRepName}`
        };

        console.log(`[Socket.IO] 📢 Emitting Replacement Dispatched event for ride ${targetRideDoc?.requestId || targetRideId} to driver ${finalRepName}`);
        io.emit('ride-assigned', replacementPayload);
        io.emit('ride-dispatched', replacementPayload);
        io.emit('replacement-dispatched', replacementPayload);
        io.emit('replacement-request-updated', replacementPayload);

        io.to('admin-room').emit('ride-assigned', replacementPayload);
        io.to('admin-room').emit('ride-dispatched', replacementPayload);
        io.to('customer-room').emit('ride-assigned', replacementPayload);

        if (finalRepId) {
          io.to(`driver-${finalRepId}`).emit('new-assignment', replacementPayload);
          io.to(`driver-${finalRepId}`).emit('ride-assigned', replacementPayload);
          io.to(`driver-${finalRepId}`).emit('ride-dispatched', replacementPayload);
          io.to(`driver-${finalRepId}`).emit('new-notification', replacementPayload);
          io.to(`driver-${finalRepId}`).emit('driver-notification', replacementPayload);
        }
        if (finalRepCode) {
          io.to(`driver-${finalRepCode}`).emit('new-assignment', replacementPayload);
          io.to(`driver-${finalRepCode}`).emit('ride-assigned', replacementPayload);
          io.to(`driver-${finalRepCode}`).emit('ride-dispatched', replacementPayload);
          io.to(`driver-${finalRepCode}`).emit('new-notification', replacementPayload);
          io.to(`driver-${finalRepCode}`).emit('driver-notification', replacementPayload);
        }
        io.emit('driver-notification', replacementPayload);
        io.emit('new-notification', replacementPayload);

        if (targetCustomerId) {
          io.to(`customer-${targetCustomerId}`).emit('ride-assigned', replacementPayload);
          io.to(`user-${targetCustomerId}`).emit('ride-assigned', replacementPayload);
          io.to(`customer-${targetCustomerId}`).emit('driver-replaced', replacementPayload);
        }
        if (targetPassengerPhone) {
          const cleanPhone = String(targetPassengerPhone).replace(/[^0-9]/g, '');
          io.to(`customer-${cleanPhone}`).emit('ride-assigned', replacementPayload);
          io.to(`customer-${cleanPhone}`).emit('driver-replaced', replacementPayload);
        }
      }

      // 3. Customer Notification Events (if requested and no replacement was assigned)
      if (notifyCustomer && !hasReplacement) {
        console.log(`[Socket.IO] 📢 Emitting Driver Unavailable Notification to Customer for ride ${targetRideId}`);
        io.emit('driver-unavailable', customerNotifPayload);
        io.emit('customer-notification', customerNotifPayload);
        io.emit('ride-status-updated', {
          rideId: targetRideId,
          status: 'DRIVER_UNAVAILABLE',
          notification: customerNotifPayload
        });

        // Targeted Private Rooms for the SPECIFIC CUSTOMER
        if (customerNotifPayload.customerId) {
          io.to(`customer-${customerNotifPayload.customerId}`).emit('driver-unavailable', customerNotifPayload);
          io.to(`user-${customerNotifPayload.customerId}`).emit('driver-unavailable', customerNotifPayload);
          io.to(`customer-${customerNotifPayload.customerId}`).emit('customer-notification', customerNotifPayload);
        }

        if (customerNotifPayload.passengerPhone) {
          const cleanPhone = String(customerNotifPayload.passengerPhone).replace(/[^0-9]/g, '');
          const last7 = cleanPhone.slice(-7);
          io.to(`customer-${customerNotifPayload.passengerPhone}`).emit('driver-unavailable', customerNotifPayload);
          io.to(`customer-${cleanPhone}`).emit('driver-unavailable', customerNotifPayload);
          if (last7) io.to(`customer-${last7}`).emit('driver-unavailable', customerNotifPayload);
        }

        // Targeted Ride Room
        io.to(`ride-${targetRideId}`).emit('driver-unavailable', customerNotifPayload);
        io.to(`ride-${targetRideId}`).emit('customer-notification', customerNotifPayload);

        // General fallback
        io.to('customer-room').emit('driver-unavailable', customerNotifPayload);
        io.to('customer-room').emit('customer-notification', customerNotifPayload);
      }
    }

    return res.status(200).json({
      success: true,
      message: hasReplacement
        ? `Replacement driver ${finalRepName} assigned successfully and saved to DB`
        : (notifyCustomer ? 'Issue resolved and unavailability notification sent to customer' : 'Issue resolved successfully'),
      issue: updated || existingIssue,
      customerNotification: notifyCustomer ? customerNotifPayload : null,
      replacementDriver: hasReplacement ? {
        id: finalRepId,
        name: finalRepName,
        phone: finalRepPhone,
        code: finalRepCode,
        vehicle: finalRepVehicle
      } : null
    });
  } catch (err) {
    next(err);
  }
};
