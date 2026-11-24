import mongoose from 'mongoose';
import { DriverDB, RideDB, RequestDB, AssignmentDB, formatRideRecord } from '../models/dbAdapter.js';
import { sendSuccess, sendError } from '../middleware/responseHandler.js';

const MAX_PASSENGERS_PER_BATCH = 5;

/**
 * Normalizes location string for flexible fuzzy hub matching
 */
const normalizeLoc = (str) => {
  return (str || '')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Extracts recognized city or major hub from address
 */
const getLocHub = (locStr) => {
  if (!locStr) return 'Unspecified';
  const s = normalizeLoc(locStr);

  // Check city specific keywords first
  if (s.includes('karachi')) {
    if (s.includes('saddar')) return 'Karachi Saddar';
    if (s.includes('airport') || s.includes('shahrah e faisal')) return 'Karachi Airport';
    return 'Karachi';
  }
  if (s.includes('saddar') || s.includes('kamran chowk') || s.includes('marir choke') || s.includes('qasim market') || s.includes('kashmir road')) {
    return 'Saddar Rawalpindi';
  }
  if (s.includes('murree') || s.includes('mall road') || s.includes('sunny bank') || s.includes('bhara kahu')) {
    return 'Murree Corridor';
  }
  if (s.includes('chaklala') || s.includes('scheme 3') || s.includes('commercial market')) {
    return 'Chaklala Scheme 3';
  }
  if (s.includes('g 9') || s.includes('g 11') || s.includes('g 13') || s.includes('f 11') || s.includes('f 10') || s.includes('blue area') || s.includes('islamabad') || s.includes('giga mall')) {
    return 'Islamabad Metropolitan';
  }
  if (s.includes('rawalpindi') || s.includes('old city') || s.includes('arya mohallah')) {
    return 'Rawalpindi City';
  }
  if (s.includes('lahore') || s.includes('fort') || s.includes('gulberg')) {
    return 'Lahore';
  }
  if (s.includes('peshawar') || s.includes('nothia')) {
    return 'Peshawar';
  }

  // Fallback to first significant phrase
  const parts = locStr.split(',');
  return parts[0].trim() || 'General Route';
};

/**
 * Compares two locations or routes to evaluate route match score (0 to 100)
 */
const calculateRouteMatchScore = (rideFrom, rideTo, driverPreferredRoute) => {
  if (!driverPreferredRoute) return 30; // base score if driver has no strict route

  let drvStart = '';
  let drvEnd = '';

  if (typeof driverPreferredRoute === 'object' && !Array.isArray(driverPreferredRoute)) {
    drvStart = normalizeLoc(driverPreferredRoute.startPoint || driverPreferredRoute.start || '');
    drvEnd = normalizeLoc(driverPreferredRoute.endPoint || driverPreferredRoute.end || '');
  } else if (typeof driverPreferredRoute === 'string') {
    const parts = driverPreferredRoute.split(/[-➔>]/);
    drvStart = normalizeLoc(parts[0] || '');
    drvEnd = normalizeLoc(parts[1] || parts[0] || '');
  }

  const rideStart = normalizeLoc(rideFrom);
  const rideEnd = normalizeLoc(rideTo);

  let score = 0;
  let startMatched = false;
  let endMatched = false;

  // Exact start hub or keyword match
  if (drvStart && (rideStart.includes(drvStart) || drvStart.includes(rideStart))) {
    score += 50;
    startMatched = true;
  } else if (drvStart && drvStart.split(' ').some(w => w.length > 3 && rideStart.includes(w))) {
    score += 45;
    startMatched = true;
  }

  // Exact end hub or keyword match
  if (drvEnd && (rideEnd.includes(drvEnd) || drvEnd.includes(rideEnd))) {
    score += 50;
    endMatched = true;
  } else if (drvEnd && drvEnd.split(' ').some(w => w.length > 3 && rideEnd.includes(w))) {
    score += 45;
    endMatched = true;
  }

  if (startMatched && endMatched) {
    score = 100;
  }

  return Math.min(score, 100);
};

/**
 * Persists and synchronizes all active route batches to MongoDB:
 * 1. `routebatches` - dedicated collection for complete batch metadata
 * 2. `routes` - standard route corridors
 * 3. `suggestedroutes` - route schema used by Driver App
 * 4. `riderequests` - tags each pooled ride with routeBatchId and status
 */
export async function persistRouteBatchesToDB(db, batches) {
  if (!db || !Array.isArray(batches) || batches.length === 0) return;

  try {
    for (const b of batches) {
      const batchDoc = {
        batchId: b.batchId,
        batchIndex: b.batchIndex,
        totalBatchesForRoute: b.totalBatchesForRoute,
        routeName: b.routeName,
        fromHub: b.fromHub,
        toHub: b.toHub,
        passengerCount: b.passengerCount,
        maxCapacity: b.maxCapacity || 5,
        seatsAvailable: b.seatsAvailable,
        isFull: b.isFull,
        totalFare: b.customers?.reduce((acc, c) => acc + (Number(String(c.fare).replace(/[^0-9]/g, '')) || 0), 0) || 0,
        totalFareFormatted: b.totalFareFormatted,
        status: b.status,
        assignedDriver: b.assignedDriver || null,
        customerIds: b.customers?.map(c => String(c.requestId || c._id)) || [],
        customers: b.customers || [],
        updatedAt: new Date()
      };

      // 1. Save / Upsert in `routebatches` collection
      await db.collection('routebatches').updateOne(
        { batchId: b.batchId },
        { 
          $set: batchDoc,
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true }
      ).catch(() => {});

      // 2. Sync to `routes` collection (general routes)
      await db.collection('routes').updateOne(
        { routeId: b.batchId },
        {
          $set: {
            routeId: b.batchId,
            routeName: b.routeName,
            origin: b.fromHub,
            destination: b.toHub,
            pickupLocation: b.fromHub,
            dropoffLocation: b.toHub,
            passengersCount: b.passengerCount,
            capacity: b.maxCapacity || 5,
            status: b.status,
            assignedDriver: b.assignedDriver,
            rides: b.customerIds,
            updatedAt: new Date()
          },
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true }
      ).catch(() => {});

      // 3. Sync to `suggestedroutes` collection (used by Driver App)
      await db.collection('suggestedroutes').updateOne(
        { routeId: b.batchId },
        {
          $set: {
            routeId: b.batchId,
            routeName: b.routeName,
            pickupPoint: b.fromHub,
            dropoffPoint: b.toHub,
            timeRange: '08:00 AM - 10:00 AM',
            customerCount: b.passengerCount,
            customers: b.customers?.map(c => ({
              requestId: c.requestId || String(c._id),
              customerId: c.customerId || null,
              customerName: c.passengerName || c.customerName || 'Customer',
              phone: c.passengerPhone || c.customerPhone || '',
              email: c.passengerEmail || '',
              pickupLocation: c.pickupLocation || '',
              dropoffLocation: c.dropoffLocation || '',
              time: c.timeToReach || c.startingFrom || '08:30 AM',
              fare: Number(String(c.fare).replace(/[^0-9]/g, '')) || 9500,
              fareFormatted: c.fareFormatted || `Rs. ${c.fare}`,
              vehicleType: c.vehicleType || 'Sedan Executive',
              status: c.status || 'Pending Acceptance'
            })) || [],
            driverId: b.assignedDriver?.id || b.assignedDriver?._id || null,
            driverName: b.assignedDriver?.name || null,
            status: b.status,
            isPreferred: true,
            updatedAt: new Date()
          },
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true }
      ).catch(() => {});

      // 4. Update each pooled ride request in `riderequests` with routeBatch info
      if (Array.isArray(b.customers)) {
        for (const c of b.customers) {
          const cId = c._id;
          const rId = c.requestId;
          const filter = cId ? { _id: new mongoose.Types.ObjectId(cId) } : { requestId: rId };
          await db.collection('riderequests').updateOne(
            filter,
            {
              $set: {
                routeBatchId: b.batchId,
                routeName: b.routeName,
                originHub: b.fromHub,
                destinationHub: b.toHub,
                isPooled: true,
                poolStatus: b.status,
                routeBatchCapacity: b.maxCapacity || 5,
                routeBatchSeatsAvailable: b.seatsAvailable,
                routeBatchPassengerCount: b.passengerCount
              }
            }
          ).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.warn('[RoutePooling] Error persisting batches to DB:', err.message);
  }
}

// =========================================================================
// @desc    Get all Route Batches (Clusters of Rides max 5 + Matched Drivers)
// @route   GET /api/routes/batches
// =========================================================================
export const getRouteBatches = async (req, res, next) => {
  try {
    const client = mongoose.connection?.client;
    const db = client ? client.db('ride_and_serve') : null;

    // 1. Fetch all Rides (from riderequests, monthlypickanddrop, schedulerides, and rides collection)
    let rawRides = [];
    if (db) {
      const dbMonthly = await db.collection('monthlypickanddrop').find({}).sort({ createdAt: -1 }).toArray().catch(() => []);
      const dbSchedule = await db.collection('schedulerides').find({}).sort({ createdAt: -1 }).toArray().catch(() => []);
      const dbRides = await db.collection('riderequests').find({}).sort({ createdAt: -1 }).toArray().catch(() => []);
      const dbRides2 = await db.collection('rides').find({}).sort({ createdAt: -1 }).toArray().catch(() => []);
      
      const seenMap = new Map();
      [...dbMonthly, ...dbSchedule, ...dbRides, ...dbRides2].forEach(r => {
        const key = String(r.requestId || r._id || r.id);
        if (!seenMap.has(key)) {
          seenMap.set(key, r);
        }
      });
      rawRides = Array.from(seenMap.values());
    } else {
      const dbRides = await RideDB.find({}, { createdAt: -1 }, 0, 100);
      const dbReqs = await RequestDB.find({}, { createdAt: -1 }, 0, 100);
      rawRides = [...dbRides, ...dbReqs];
    }

    // 2. Fetch Drivers and their Preferred Routes
    let allDrivers = [];
    if (db) {
      allDrivers = await db.collection('drivers').find({}).toArray().catch(() => []);
    } else {
      allDrivers = await DriverDB.find({}, { createdAt: -1 }, 0, 100);
    }

    // Also fetch standalone preferredroutes collection if available
    let standaloneRoutes = [];
    if (db) {
      standaloneRoutes = await db.collection('preferredroutes').find({}).toArray().catch(() => []);
    }

    // Map drivers with their normalized preferred route
    const mappedDrivers = allDrivers.map(d => {
      const driverIdStr = String(d._id);
      let pRoute = d.preferredRoutes;

      // Check standalone preferredroutes if driver.preferredRoutes is undefined
      if (!pRoute && standaloneRoutes.length > 0) {
        const foundStandalone = standaloneRoutes.find(pr => String(pr.driver) === driverIdStr || String(pr.createdBy) === driverIdStr);
        if (foundStandalone) {
          pRoute = {
            startPoint: foundStandalone.startLocation?.address || 'Islamabad',
            endPoint: foundStandalone.endLocation?.address || 'Rawalpindi',
            time: foundStandalone.preferredTime || '08:00 AM'
          };
        }
      }

      const driverCode = d.driverReferenceId || d.driverId || `DRV-${driverIdStr.slice(-6).toUpperCase()}`;
      const driverName = d.Name || d.name || 'Driver';
      const driverPhone = d.PhoneNumber || d.phone || '';
      const driverVehicle = d.vehicleDetails ? `${d.vehicleDetails.make || ''} ${d.vehicleDetails.model || ''}`.trim() : (d.vehicleType || 'Sedan Executive');
      const driverRating = d.rating || 4.8;
      const liveStatus = d.status === 'APPROVED' || d.verificationStatus === 'Verified' ? (d.liveStatus || 'Available') : 'Offline';

      return {
        _id: d._id,
        driverId: d._id,
        driverCode,
        name: driverName,
        phone: driverPhone,
        vehicle: driverVehicle,
        rating: driverRating,
        status: liveStatus,
        preferredRoute: pRoute
      };
    });

    // 3. Normalize rides and deduplicate by requestId / _id
    const seenRideIds = new Set();
    const normalizedRides = [];

    rawRides.forEach(r => {
      const key = String(r.requestId || r.rideId || r._id);
      if (!seenRideIds.has(key)) {
        seenRideIds.add(key);
        const formatted = formatRideRecord(r) || {};
        const pPickup = r.pickupLocation || r.pickup || formatted.pickupLocation || '';
        const pDropoff = r.dropoffLocation || r.dropoff || formatted.dropoffLocation || '';
        const rawStatus = (r.status || formatted.status || 'Pending Dispatch').toString().trim();

        normalizedRides.push({
          ...r,
          ...formatted,
          _id: r._id,
          requestId: r.requestId || key,
          pickupLocation: pPickup,
          dropoffLocation: pDropoff,
          passengerName: r.passengerName || formatted.passengerName || 'Customer',
          passengerPhone: r.passengerPhone || formatted.passengerPhone || '',
          fare: formatted.fare || r.fare || 9500,
          fareFormatted: formatted.fareFormatted || `Rs. ${(r.fare || 9500).toLocaleString()}`,
          status: rawStatus,
          isAssigned: Boolean(r.assignedDriver || r.driverId || r.assignedDriverName || rawStatus.toUpperCase() === 'ASSIGNED'),
          assignedDriverName: r.assignedDriverName || r.assignedDriver || formatted.assignedDriver || null,
          assignedDriverCode: r.assignedDriverCode || formatted.assignedDriverCode || null,
          assignedDriverPhone: r.assignedDriverPhone || formatted.assignedDriverPhone || null,
          routeBatchId: r.routeBatchId || null
        });
      }
    });

    // 4. Cluster rides into Route Corridors
    // We group rides by Origin Hub + Destination Hub
    const clustersMap = new Map();

    normalizedRides.forEach(ride => {
      const fromHub = getLocHub(ride.pickupLocation);
      const toHub = getLocHub(ride.dropoffLocation);
      const clusterKey = `${fromHub} ➔ ${toHub}`;

      if (!clustersMap.has(clusterKey)) {
        clustersMap.set(clusterKey, {
          clusterKey,
          fromHub,
          toHub,
          allRides: []
        });
      }
      clustersMap.get(clusterKey).allRides.push(ride);
    });

    // 5. Build BATCHES (Maximum 5 passengers per batch rule)
    const batches = [];
    let batchCounter = 1;

    for (const [clusterKey, clusterData] of clustersMap.entries()) {
      const rides = clusterData.allRides;

      // Chunk rides into groups of max 5
      for (let i = 0; i < rides.length; i += MAX_PASSENGERS_PER_BATCH) {
        const batchRides = rides.slice(i, i + MAX_PASSENGERS_PER_BATCH);
        const batchNum = Math.floor(i / MAX_PASSENGERS_PER_BATCH) + 1;
        const totalBatchesForRoute = Math.ceil(rides.length / MAX_PASSENGERS_PER_BATCH);

        const batchId = `BATCH-${clusterData.fromHub.slice(0, 3).toUpperCase()}-${clusterData.toHub.slice(0, 3).toUpperCase()}-${String(batchCounter).padStart(2, '0')}`;
        batchCounter++;

        // Calculate batch totals
        let totalFare = 0;
        let isBatchFullyAssigned = true;
        let commonAssignedDriver = null;

        batchRides.forEach(r => {
          const numFare = Number(String(r.fare).replace(/[^0-9]/g, '')) || 9500;
          totalFare += numFare;
          if (!r.isAssigned) {
            isBatchFullyAssigned = false;
          } else if (!commonAssignedDriver && r.assignedDriverName) {
            commonAssignedDriver = {
              name: r.assignedDriverName,
              code: r.assignedDriverCode,
              phone: r.assignedDriverPhone
            };
          }
        });

        // Find matching drivers for this route
        const scoredDrivers = mappedDrivers.map(drv => {
          let bestScore = 0;
          // Test match with the first ride of the batch or cluster hubs
          bestScore = calculateRouteMatchScore(clusterData.fromHub, clusterData.toHub, drv.preferredRoute);
          return {
            ...drv,
            matchScore: bestScore,
            isExactRouteMatch: bestScore >= 70,
            isPartialRouteMatch: bestScore >= 40 && bestScore < 70
          };
        }).sort((a, b) => b.matchScore - a.matchScore);

        batches.push({
          batchId,
          batchIndex: batchNum,
          totalBatchesForRoute,
          routeName: clusterKey,
          fromHub: clusterData.fromHub,
          toHub: clusterData.toHub,
          passengerCount: batchRides.length,
          maxCapacity: MAX_PASSENGERS_PER_BATCH,
          seatsAvailable: Math.max(0, MAX_PASSENGERS_PER_BATCH - batchRides.length),
          isFull: batchRides.length >= MAX_PASSENGERS_PER_BATCH,
          totalFareFormatted: `Rs. ${totalFare.toLocaleString()}`,
          status: isBatchFullyAssigned ? 'Dispatched' : (batchRides.some(r => r.isAssigned) ? 'Partially Dispatched' : 'Ready for Dispatch'),
          assignedDriver: commonAssignedDriver,
          customers: batchRides,
          matchingDrivers: scoredDrivers
        });
      }
    }

    // Sort batches: Active ready batches first, then by customer count descending
    batches.sort((a, b) => {
      if (a.status === 'Ready for Dispatch' && b.status !== 'Ready for Dispatch') return -1;
      if (b.status === 'Ready for Dispatch' && a.status !== 'Ready for Dispatch') return 1;
      return b.passengerCount - a.passengerCount;
    });

    // Persist all generated route batches and tags to MongoDB (routebatches, routes, suggestedroutes, riderequests)
    if (db) {
      await persistRouteBatchesToDB(db, batches);
    }

    return sendSuccess(res, {
      batches,
      totalBatches: batches.length,
      maxCapacityPerBatch: MAX_PASSENGERS_PER_BATCH,
      totalDrivers: mappedDrivers.length
    }, 'Route batches retrieved successfully');

  } catch (err) {
    next(err);
  }
};

// =========================================================================
// @desc    Dispatch an entire Route Batch (Up to 5 Customers) to a Driver
// @route   POST /api/routes/batch-dispatch
// =========================================================================
export const dispatchRouteBatch = async (req, res, next) => {
  try {
    const { batchId, rideIds, driverId, remarks } = req.body;

    if (!rideIds || !Array.isArray(rideIds) || rideIds.length === 0) {
      return sendError(res, 'At least 1 rideId must be provided in rideIds array', 400);
    }

    if (rideIds.length > MAX_PASSENGERS_PER_BATCH) {
      return sendError(res, `Cannot dispatch more than ${MAX_PASSENGERS_PER_BATCH} customers in a single route batch`, 400);
    }

    if (!driverId) {
      return sendError(res, 'driverId is required for route dispatch', 400);
    }

    const client = mongoose.connection?.client;
    const db = client ? client.db('ride_and_serve') : null;

    // 1. Find Driver
    const isMongoId = driverId.toString().match(/^[0-9a-fA-F]{24}$/);
    let driver = null;

    if (db) {
      driver = isMongoId 
        ? await db.collection('drivers').findOne({ _id: new mongoose.Types.ObjectId(driverId) })
        : await db.collection('drivers').findOne({ $or: [{ driverReferenceId: driverId }, { driverId: driverId }] });
    }

    if (!driver) {
      driver = await DriverDB.findById(driverId);
    }

    if (!driver) {
      return sendError(res, `Driver not found with id: ${driverId}`, 404);
    }

    const assignedDriverName = driver.Name || driver.name || 'Assigned Driver';
    const assignedDriverCode = driver.driverReferenceId || driver.driverId || `DRV-${String(driver._id).slice(-6).toUpperCase()}`;
    const assignedPhone = driver.PhoneNumber || driver.phone || '+92 300 0000000';
    const assignedVehicle = driver.vehicleDetails 
      ? `${driver.vehicleDetails.make || ''} ${driver.vehicleDetails.model || ''}`.trim()
      : (driver.vehicleType || 'Sedan Executive');
    const assignedRating = driver.rating || 4.8;

    const updatePayload = {
      status: 'ASSIGNED',
      driver: driver._id,
      driverId: driver._id,
      assignedDriver: assignedDriverName,
      assignedDriverName: assignedDriverName,
      assignedDriverPhone: assignedPhone,
      assignedDriverCode: assignedDriverCode,
      assignedDriverDetails: {
        driverCode: assignedDriverCode,
        name: assignedDriverName,
        phone: assignedPhone,
        vehicle: assignedVehicle,
        rating: assignedRating
      },
      routeBatchId: batchId || `BATCH-${Date.now().toString().slice(-4)}`,
      updatedAt: new Date()
    };

    // 2. Perform updates across riderequests, rides, and requests collections
    const updatedRidesList = [];

    for (const rId of rideIds) {
      const isIdMongo = rId.toString().match(/^[0-9a-fA-F]{24}$/);
      const queryFilter = isIdMongo
        ? { $or: [{ _id: new mongoose.Types.ObjectId(rId) }, { requestId: rId }, { rideId: rId }] }
        : { $or: [{ requestId: rId }, { rideId: rId }] };

      if (db) {
        await db.collection('riderequests').updateMany(queryFilter, { $set: updatePayload });
        await db.collection('monthlypickanddrop').updateMany(queryFilter, { $set: updatePayload });
        await db.collection('schedulerides').updateMany(queryFilter, { $set: updatePayload });
        await db.collection('rides').updateMany(queryFilter, { $set: updatePayload });
        await db.collection('requests').updateMany(queryFilter, { $set: updatePayload });

        // Record assignment in assignments collection
        await db.collection('assignments').insertOne({
          requestId: rId,
          driverId: driver._id,
          driverCode: assignedDriverCode,
          status: 'ASSIGNED',
          batchId: batchId || updatePayload.routeBatchId,
          remarks: remarks || `Route batch dispatched to ${assignedDriverName} (${assignedDriverCode})`,
          createdAt: new Date()
        }).catch(() => {});
      }

      updatedRidesList.push({
        rideId: rId,
        status: 'ASSIGNED',
        assignedDriver: assignedDriverName
      });
    }

    // 3. Update Driver availability to 'On Trip'
    if (db) {
      await db.collection('drivers').updateOne(
        { _id: driver._id },
        { $set: { availability: 'On Trip', liveStatus: 'On Trip', updatedAt: new Date() } }
      );

      // 4. Update routebatches, routes, and suggestedroutes collections in DB
      const targetBatchId = batchId || updatePayload.routeBatchId;
      await db.collection('routebatches').updateOne(
        { batchId: targetBatchId },
        {
          $set: {
            status: 'Dispatched',
            assignedDriver: {
              id: driver._id,
              name: assignedDriverName,
              code: assignedDriverCode,
              phone: assignedPhone,
              vehicle: assignedVehicle
            },
            dispatchedAt: new Date(),
            updatedAt: new Date()
          }
        }
      ).catch(() => {});

      await db.collection('suggestedroutes').updateOne(
        { routeId: targetBatchId },
        {
          $set: {
            status: 'Dispatched',
            driverId: driver._id,
            driverName: assignedDriverName,
            acceptedAt: new Date(),
            updatedAt: new Date()
          }
        }
      ).catch(() => {});

      await db.collection('routes').updateOne(
        { routeId: targetBatchId },
        {
          $set: {
            status: 'Dispatched',
            assignedDriver: {
              id: driver._id,
              name: assignedDriverName,
              code: assignedDriverCode,
              phone: assignedPhone
            },
            updatedAt: new Date()
          }
        }
      ).catch(() => {});

      // 5. Insert notification in `drivernotifications` so Driver Mobile App receives it in DB
      await db.collection('drivernotifications').insertOne({
        notificationId: `NOTIF-${targetBatchId}-${Date.now().toString().slice(-4)}`,
        driverId: String(driver._id),
        driverName: assignedDriverName,
        driverReferenceId: assignedDriverCode,
        title: '🚐 New Route Pool Assigned!',
        subtitle: `You have been dispatched to route ${targetBatchId} with ${rideIds.length} passenger(s).`,
        type: 'ROUTE_BATCH_ASSIGNED',
        status: 'ASSIGNED',
        routeId: targetBatchId,
        customerCount: rideIds.length,
        payload: {
          batchId: targetBatchId,
          rideIds,
          driverId: driver._id,
          driverName: assignedDriverName,
          driverCode: assignedDriverCode,
          status: 'ASSIGNED'
        },
        isRead: false,
        isDismissed: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }).catch(() => {});

      // 6. Insert notification in `customernotifications` for each pooled customer
      for (const rId of rideIds) {
        const isRIdMongo = rId.toString().match(/^[0-9a-fA-F]{24}$/);
        const rideDoc = await db.collection('riderequests').findOne({
          $or: [
            isRIdMongo ? { _id: new mongoose.Types.ObjectId(rId) } : null,
            { requestId: rId }
          ].filter(Boolean)
        }).catch(() => null);

        if (rideDoc) {
          const custId = rideDoc.customerId || rideDoc.customer || null;
          await db.collection('customernotifications').insertOne({
            notificationId: `NOTIF-${rId}-${Date.now().toString().slice(-4)}`,
            userId: custId,
            customerId: custId,
            rideId: rId,
            requestId: rId,
            type: 'DRIVER_ASSIGNED',
            title: '🚐 Driver Assigned to your Route Pool!',
            subtitle: `Driver ${assignedDriverName} (${assignedVehicle}) has been assigned to your pooled ride.`,
            status: 'ASSIGNED',
            driverName: assignedDriverName,
            driverPhone: assignedPhone,
            driverCode: assignedDriverCode,
            driverVehicle: assignedVehicle,
            isRead: false,
            createdAt: new Date(),
            updatedAt: new Date()
          }).catch(() => {});
        }
      }
    }

    // 4. Socket.IO Real-time broadcasts
    const io = req.app.get('io');
    if (io) {
      const socketPayload = {
        batchId: batchId || updatePayload.routeBatchId,
        driverId: driver._id,
        driverCode: assignedDriverCode,
        driverName: assignedDriverName,
        driverPhone: assignedPhone,
        rideIds,
        passengersCount: rideIds.length,
        status: 'ASSIGNED',
        timestamp: new Date()
      };

      // Notify the specific driver's mobile app room
      io.to(`driver-${driver._id}`).emit('route-batch-assigned', socketPayload);
      io.to(`driver-${assignedDriverCode}`).emit('route-batch-assigned', socketPayload);

      // Notify Admin Portal room
      io.to('admin-room').emit('route-batch-dispatched', socketPayload);

      // Global emits
      io.emit('batch-dispatched', socketPayload);
      io.emit('ride-assigned', socketPayload);
    }

    return sendSuccess(res, {
      batchId: batchId || updatePayload.routeBatchId,
      dispatchedCustomersCount: rideIds.length,
      driver: {
        _id: driver._id,
        name: assignedDriverName,
        code: assignedDriverCode,
        phone: assignedPhone,
        vehicle: assignedVehicle
      },
      updatedRides: updatedRidesList
    }, `Successfully dispatched ${rideIds.length} customers on route batch to ${assignedDriverName}`);

  } catch (err) {
    next(err);
  }
};

// =========================================================================
// @desc    Get active Route Batch and Customers (Max 5) for a specific driver
// @route   GET /api/routes/driver/:driverId
// =========================================================================
export const getDriverRouteBatches = async (req, res, next) => {
  try {
    const { driverId } = req.params;
    const client = mongoose.connection?.client;
    const db = client ? client.db('ride_and_serve') : null;

    if (!driverId) {
      return sendError(res, 'driverId is required', 400);
    }

    const isMongoId = driverId.toString().match(/^[0-9a-fA-F]{24}$/);
    let driver = null;

    if (db) {
      driver = isMongoId 
        ? await db.collection('drivers').findOne({ _id: new mongoose.Types.ObjectId(driverId) })
        : await db.collection('drivers').findOne({ $or: [{ driverReferenceId: driverId }, { driverId: driverId }] });
    }

    if (!driver) {
      driver = await DriverDB.findById(driverId);
    }

    if (!driver) {
      return sendError(res, `Driver not found: ${driverId}`, 404);
    }

    const drvCode = driver.driverReferenceId || driver.driverId;
    const drvName = driver.Name || driver.name;

    // Query rides assigned to this driver
    let assignedRides = [];
    if (db) {
      assignedRides = await db.collection('riderequests').find({
        $or: [
          { driver: driver._id },
          { driverId: driver._id },
          { assignedDriverId: driver._id },
          { assignedDriverCode: drvCode },
          { 'assignedDriverDetails.driverCode': drvCode },
          { assignedDriver: drvName },
          { assignedDriverName: drvName }
        ]
      }).sort({ updatedAt: -1 }).limit(MAX_PASSENGERS_PER_BATCH).toArray().catch(() => []);
    }

    // Format rides
    const formattedRides = assignedRides.map(formatRideRecord);

    return sendSuccess(res, {
      driver: {
        _id: driver._id,
        name: drvName,
        code: drvCode,
        preferredRoute: driver.preferredRoutes
      },
      activeCustomers: formattedRides,
      customersCount: formattedRides.length,
      maxCapacity: MAX_PASSENGERS_PER_BATCH,
      isAtFullCapacity: formattedRides.length >= MAX_PASSENGERS_PER_BATCH
    }, 'Driver route rides retrieved successfully');

  } catch (err) {
    next(err);
  }
};

// =========================================================================
// @desc    Get single Route Batch by ID from DB (routebatches / suggestedroutes)
// @route   GET /api/routes/:batchId
// =========================================================================
export const getRouteBatchById = async (req, res, next) => {
  try {
    const { batchId } = req.params;
    const client = mongoose.connection?.client;
    const db = client ? client.db('ride_and_serve') : null;

    if (!db) {
      return sendError(res, 'Database connection unavailable', 500);
    }

    let batch = await db.collection('routebatches').findOne({ batchId });
    if (!batch) {
      batch = await db.collection('suggestedroutes').findOne({ routeId: batchId });
    }
    if (!batch) {
      batch = await db.collection('routes').findOne({ routeId: batchId });
    }

    if (!batch) {
      return sendError(res, `Route batch not found: ${batchId}`, 404);
    }

    return sendSuccess(res, batch, 'Route batch retrieved successfully');
  } catch (err) {
    next(err);
  }
};
