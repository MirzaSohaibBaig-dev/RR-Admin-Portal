import mongoose from 'mongoose';
import DriverHire from '../models/DriverHire.js';
import { DriverDB, AssignmentDB } from '../models/dbAdapter.js';
import { sendSuccess, sendError } from '../middleware/responseHandler.js';

// Helper to format driver hire record
export const formatDriverHire = (d) => {
  if (!d) return null;
  const rawId = d._id ? String(d._id) : '';
  const reqId = d.requestId || `HDR-${rawId ? rawId.slice(-4).toUpperCase() : Math.floor(1000 + Math.random() * 9000)}`;
  
  let numFare = typeof d.fare === 'number' ? d.fare : Number(String(d.fare || '').replace(/[^0-9.]/g, ''));
  if (isNaN(numFare) || numFare <= 0) numFare = 3500;
  
  const fareFormatted = d.fareFormatted || `Rs. ${numFare.toLocaleString()}`;

  const statusRaw = String(d.status || 'Pending Dispatch').trim();
  const isAssigned = statusRaw.toUpperCase() === 'ASSIGNED' || !!d.assignedDriverId || !!d.assignedDriverName;

  return {
    ...d,
    _id: d._id,
    mongoId: rawId,
    id: reqId,
    requestId: reqId,
    displayId: reqId,
    customerName: d.customerName || 'Customer',
    passengerName: d.customerName || 'Customer',
    customerPhone: d.customerPhone || 'N/A',
    passengerPhone: d.customerPhone || 'N/A',
    phone: d.customerPhone || 'N/A',
    customerEmail: d.customerEmail || '',
    cnic: d.cnic || 'N/A',
    bookingDate: d.bookingDate || (d.createdAt ? new Date(d.createdAt).toISOString().split('T')[0] : 'Today'),
    timeToReach: d.timeToReach || '08:30 AM',
    offTime: d.offTime || '05:00 PM',
    pickupLocation: typeof d.pickupLocation === 'object' ? (d.pickupLocation?.address || 'Pickup Location') : (d.pickupLocation || 'Pickup Location'),
    dropoffLocation: typeof d.dropoffLocation === 'object' ? (d.dropoffLocation?.address || 'Drop-off Location') : (d.dropoffLocation || 'Drop-off Location'),
    fare: numFare,
    fareFormatted: fareFormatted,
    status: isAssigned ? 'ASSIGNED' : 'Pending Dispatch',
    rawStatus: d.status || 'Pending Dispatch',
    assignedDriverId: d.assignedDriverId || null,
    assignedDriverName: d.assignedDriverName || null,
    assignedDriverPhone: d.assignedDriverPhone || null,
    assignedDriverCode: d.assignedDriverCode || null,
    notes: d.notes || '',
    createdAt: d.createdAt || new Date(),
    updatedAt: d.updatedAt || new Date()
  };
};

// GET /api/driver-hire - Fetch all driver hire requests
export const getAllDriverHires = async (req, res, next) => {
  try {
    const client = mongoose.connection?.client;
    let rawDocs = [];

    if (client) {
      const docs1 = await client.db('ride_and_serve').collection('driverhirerequests').find({}).sort({ _id: -1 }).toArray().catch(() => []);
      const docs2 = await client.db('test').collection('driverhirerequests').find({}).sort({ _id: -1 }).toArray().catch(() => []);
      
      const idMap = new Map();
      [...(docs1 || []), ...(docs2 || [])].forEach(item => {
        const idKey = String(item._id);
        if (!idMap.has(idKey)) {
          idMap.set(idKey, item);
        }
      });
      rawDocs = Array.from(idMap.values());
    }

    if (rawDocs.length === 0) {
      rawDocs = await DriverHire.find({}).sort({ createdAt: -1 }).lean().catch(() => []);
    }

    const formatted = rawDocs.map(formatDriverHire);
    const pendingCount = formatted.filter(h => h.status === 'Pending Dispatch').length;
    const assignedCount = formatted.filter(h => h.status === 'ASSIGNED').length;

    return res.status(200).json({
      success: true,
      data: formatted,
      count: formatted.length,
      pendingCount,
      assignedCount,
      message: 'Driver hire requests retrieved successfully',
      error: null
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/driver-hire - Create a new driver hire request
export const createDriverHire = async (req, res, next) => {
  try {
    const {
      customerName,
      customerPhone,
      customerEmail,
      cnic,
      bookingDate,
      pickupLocation,
      dropoffLocation,
      timeToReach,
      offTime,
      fare,
      notes
    } = req.body;

    const numFare = Number(fare) || 3500;
    const reqId = `HDR-${Math.floor(1000 + Math.random() * 9000)}`;

    const newHire = {
      requestId: reqId,
      customerName: customerName || 'Customer',
      customerPhone: customerPhone || '',
      customerEmail: customerEmail || '',
      cnic: cnic || '',
      bookingDate: bookingDate || new Date().toISOString().split('T')[0],
      pickupLocation: pickupLocation || 'Pickup Address',
      dropoffLocation: dropoffLocation || '',
      timeToReach: timeToReach || '08:30 AM',
      offTime: offTime || '05:00 PM',
      fare: numFare,
      fareFormatted: `Rs. ${numFare.toLocaleString()}`,
      status: 'Pending Dispatch',
      notes: notes || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const client = mongoose.connection?.client;
    if (client) {
      await client.db('ride_and_serve').collection('driverhirerequests').insertOne({ ...newHire }).catch(() => {});
      await client.db('test').collection('driverhirerequests').insertOne({ ...newHire }).catch(() => {});
    }

    const created = await DriverHire.create(newHire).catch(() => newHire);
    const formatted = formatDriverHire(created);

    const io = req.app.get('io');
    if (io) {
      io.emit('new-driver-hire', formatted);
      io.emit('driver-hire-update', formatted);
      io.to('admin-room').emit('new-driver-hire', formatted);
    }

    return sendSuccess(res, formatted, 'Driver hire request created successfully', 201);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/driver-hire/:id/dispatch - Dispatch driver to hire request
export const dispatchDriverHire = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { driverId, driverName, remarks, fare } = req.body;

    if (!id) {
      return sendError(res, 'Driver Hire Request ID is required', 400);
    }

    let driver = null;
    if (driverId) {
      const isMongoId = /^[0-9a-fA-F]{24}$/.test(driverId);
      driver = await DriverDB.findOne(isMongoId ? { _id: driverId } : { driverId });
    }
    if (!driver && driverName) {
      driver = await DriverDB.findOne({
        $or: [
          { Name: new RegExp(`^${driverName.trim()}$`, 'i') },
          { name: new RegExp(`^${driverName.trim()}$`, 'i') },
          { 'personalInfo.name': new RegExp(`^${driverName.trim()}$`, 'i') }
        ]
      });
    }

    const assignedDriverName = driver?.Name || driverName || driver?.name || driver?.personalInfo?.name || 'Assigned Driver';
    const assignedDriverCode = driver?.driverReferenceId || driver?.driverId || driver?.id || `DRV-${String(driver?._id || driverId).slice(-6).toUpperCase()}`;
    const assignedPhone = driver?.PhoneNumber || driver?.phone || driver?.personalInfo?.phone || '';

    const assignedDriverDetails = {
      driverCode: assignedDriverCode,
      name: assignedDriverName,
      phone: assignedPhone,
      vehicle: driver?.vehicle?.model || driver?.vehicle?.make || 'Dedicated Chauffeur',
      rating: driver?.rating || 4.9
    };

    const updateFields = {
      status: 'ASSIGNED',
      assignedDriverId: driver?._id ? String(driver._id) : (driverId || null),
      driverId: driver?._id ? String(driver._id) : (driverId || null),
      driver: driver?._id || driverId || null,
      assignedDriver: assignedDriverName,
      assignedDriverName: assignedDriverName,
      assignedDriverPhone: assignedPhone,
      assignedDriverCode: assignedDriverCode,
      assignedDriverDetails: assignedDriverDetails,
      fareResponseStatus: 'Accepted',
      fareStatus: 'Accepted',
      dispatchedAt: new Date(),
      updatedAt: new Date()
    };

    if (fare !== undefined && fare !== null) {
      const numFare = Number(fare);
      if (!isNaN(numFare)) {
        updateFields.fare = numFare;
        updateFields.fareFormatted = `Rs. ${numFare.toLocaleString()}`;
      }
    }

    const client = mongoose.connection?.client;
    const isMongo = /^[0-9a-fA-F]{24}$/.test(id);
    const filter = isMongo ? { _id: new mongoose.Types.ObjectId(id) } : { requestId: id };

    let updatedDoc = null;
    if (client) {
      for (const dbName of ['ride_and_serve', 'test']) {
        try {
          const col = client.db(dbName).collection('driverhirerequests');
          await col.updateOne(filter, { $set: updateFields });
          if (!updatedDoc) {
            updatedDoc = await col.findOne(filter);
          }
        } catch (e) {}
      }
    }

    if (!updatedDoc) {
      updatedDoc = await DriverHire.findOneAndUpdate(
        isMongo ? { _id: id } : { requestId: id },
        { $set: updateFields },
        { new: true }
      ).lean();
    }

    const formatted = formatDriverHire(updatedDoc || { _id: id, requestId: id, ...updateFields });

    try {
      await AssignmentDB.create({
        requestId: formatted._id,
        driverId: driver?._id || driverId || null,
        status: 'ASSIGNED',
        remarks: remarks || `Driver hire dispatched to ${assignedDriverName}`
      });
    } catch (e) {}

    // ── Insert notifications into drivernotifications & customernotifications ──
    try {
      const db = mongoose.connection?.db || client?.db('ride_and_serve');
      if (db) {
        // Driver Notification
        await db.collection('drivernotifications').insertOne({
          notificationId: `${formatted.requestId || id}_HDR_ASSIGNED_${Date.now()}`,
          driverId: String(driver?._id || driverId || ''),
          driverName: assignedDriverName,
          driverReferenceId: assignedDriverCode,
          rideId: formatted.requestId || id,
          customerName: formatted.customerName || formatted.passengerName || 'Customer',
          customerPhone: formatted.customerPhone || formatted.passengerPhone || '',
          customerCount: 0,
          routeId: '',
          routeName: '',
          timeRange: `${formatted.timeToReach || '08:30 AM'} - ${formatted.offTime || '05:00 PM'}`,
          pickup: typeof formatted.pickupLocation === 'object' ? (formatted.pickupLocation?.address || 'Pickup') : (formatted.pickupLocation || 'Pickup'),
          destination: typeof formatted.dropoffLocation === 'object' ? (formatted.dropoffLocation?.address || 'Drop-off') : (formatted.dropoffLocation || 'Drop-off'),
          fareFormatted: updateFields.fareFormatted || formatted.fareFormatted || 'Rs. 3,500',
          status: 'ASSIGNED',
          title: '👨‍✈️ New Driver Hire Booking Assigned!',
          subtitle: `Customer ${formatted.customerName || 'Customer'} (${formatted.requestId || id}) has booked you as a driver. Tap to view details.`,
          type: 'NEW_ASSIGNMENT',
          rideType: 'hire',
          isRead: false,
          isDismissed: false,
          payload: {
            id: formatted.requestId || id,
            rideId: formatted.requestId || id,
            requestId: formatted.requestId || id,
            mongoId: String(formatted._id || id),
            passengerName: formatted.customerName,
            customerName: formatted.customerName,
            passengerPhone: formatted.customerPhone,
            customerPhone: formatted.customerPhone,
            pickupLocation: formatted.pickupLocation,
            dropoffLocation: formatted.dropoffLocation,
            bookingDate: formatted.bookingDate,
            timeToReach: formatted.timeToReach,
            offTime: formatted.offTime,
            fare: updateFields.fare || formatted.fare,
            fareFormatted: updateFields.fareFormatted || formatted.fareFormatted,
            status: 'ASSIGNED',
            rideType: 'hire'
          },
          createdAt: new Date(),
          updatedAt: new Date()
        });

        // Customer Notification
        await db.collection('customernotifications').insertOne({
          notificationId: `NOTIF-HDR-${formatted.requestId || id}-${Date.now()}`,
          customerId: String(formatted.customerId || formatted.customerPhone || ''),
          userId: String(formatted.customerId || ''),
          passengerPhone: formatted.customerPhone || '',
          customerPhone: formatted.customerPhone || '',
          passengerName: formatted.customerName || 'Customer',
          customerName: formatted.customerName || 'Customer',
          rideId: formatted.requestId || id,
          requestId: formatted.requestId || id,
          type: 'DRIVER_ASSIGNED',
          title: '👨‍✈️ Dedicated Driver Assigned!',
          subtitle: `Driver ${assignedDriverName} (${assignedPhone}) has been assigned to your driver hire booking.`,
          message: `Your driver hire request ${formatted.requestId || id} is confirmed with driver ${assignedDriverName}.`,
          status: 'ASSIGNED',
          driverDetails: assignedDriverDetails,
          driverName: assignedDriverName,
          driverPhone: assignedPhone,
          driverCode: assignedDriverCode,
          fareFormatted: updateFields.fareFormatted || formatted.fareFormatted || 'Rs. 3,500',
          isRead: false,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        // Update driver availability to 'On Trip'
        if (driver?._id) {
          await db.collection('drivers').updateOne(
            { _id: driver._id },
            { $set: { availability: 'On Trip', liveStatus: 'On Trip', updatedAt: new Date() } }
          );
        }

        // Mirror into riderequests and rides collections so mobile active-rides screens find it
        const mirrorDoc = {
          requestId: formatted.requestId || id,
          rideId: formatted.requestId || id,
          customerId: formatted.customerId,
          customerName: formatted.customerName,
          passengerName: formatted.customerName,
          customerPhone: formatted.customerPhone,
          passengerPhone: formatted.customerPhone,
          pickupLocation: formatted.pickupLocation,
          dropoffLocation: formatted.dropoffLocation,
          destination: formatted.dropoffLocation,
          dropLocation: formatted.dropoffLocation,
          timeToReach: formatted.timeToReach,
          timeToLeave: formatted.offTime,
          offTime: formatted.offTime,
          bookingDate: formatted.bookingDate,
          date: formatted.bookingDate,
          fare: updateFields.fare || formatted.fare,
          fareFormatted: updateFields.fareFormatted || formatted.fareFormatted,
          requestType: 'Hire Driver',
          category: 'Hire Driver',
          tripType: 'Hire Driver',
          status: 'ASSIGNED',
          driver: driver?._id || driverId,
          driverId: driver?._id || driverId,
          assignedDriver: assignedDriverName,
          assignedDriverName: assignedDriverName,
          assignedDriverPhone: assignedPhone,
          assignedDriverCode: assignedDriverCode,
          assignedDriverDetails: assignedDriverDetails,
          updatedAt: new Date()
        };

        for (const colName of ['riderequests', 'rides']) {
          await db.collection(colName).updateOne(
            { requestId: formatted.requestId || id },
            { $set: mirrorDoc },
            { upsert: true }
          ).catch(() => {});
        }
      }
    } catch (notifErr) {
      console.warn('[Driver Hire Dispatch] notification/mirror warning:', notifErr.message);
    }

    const io = req.app.get('io');
    if (io) {
      const payload = {
        requestId: formatted.requestId,
        hireId: formatted._id,
        id: formatted.id,
        rideId: formatted.requestId,
        driverId: driver?._id ? String(driver._id) : driverId,
        driverName: assignedDriverName,
        driverPhone: assignedPhone,
        driverCode: assignedDriverCode,
        assignedDriverDetails: assignedDriverDetails,
        customerName: formatted.customerName,
        customerPhone: formatted.customerPhone,
        passengerName: formatted.customerName,
        passengerPhone: formatted.customerPhone,
        pickupLocation: formatted.pickupLocation,
        dropoffLocation: formatted.dropoffLocation,
        bookingDate: formatted.bookingDate,
        timeToReach: formatted.timeToReach,
        offTime: formatted.offTime,
        fare: formatted.fare,
        fareFormatted: formatted.fareFormatted,
        status: 'ASSIGNED',
        rideType: 'hire',
        hireRequest: formatted
      };

      const driverRooms = [
        driver?._id && `driver-${driver._id}`,
        driverId && `driver-${driverId}`,
        assignedDriverCode && `driver-${assignedDriverCode}`
      ].filter(Boolean);

      const customerRooms = [
        formatted.customerId && `customer-${formatted.customerId}`,
        formatted.customerPhone && `customer-${formatted.customerPhone}`,
        'customer-room'
      ].filter(Boolean);

      driverRooms.forEach(room => {
        io.to(room).emit('new-assignment', payload);
        io.to(room).emit('ride-assigned', payload);
        io.to(room).emit('ride-dispatched', payload);
        io.to(room).emit('new-notification', payload);
        io.to(room).emit('driver-notification', payload);
        io.to(room).emit('driver-hire-dispatched', payload);
        io.to(room).emit('new-driver-hire', payload);
      });

      customerRooms.forEach(room => {
        io.to(room).emit('driver-assigned', payload);
        io.to(room).emit('ride-assigned', payload);
        io.to(room).emit('new-notification', payload);
        io.to(room).emit('customer-notification', payload);
        io.to(room).emit('driver-hire-dispatched', payload);
      });

      io.emit('new-request', payload);
      io.emit('new-assignment', payload);
      io.emit('ride-assigned', payload);
      io.emit('ride-dispatched', payload);
      io.emit('driver-hire-dispatched', payload);
      io.emit('driver-hire-update', payload);
      io.emit('driver-hire-updated', payload);
      io.to('admin-room').emit('driver-hire-update', payload);
    }

    return sendSuccess(res, formatted, `Driver ${assignedDriverName} dispatched successfully`);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/driver-hire/:id - Update hire request details (fare, notes, etc.)
export const updateDriverHire = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fare, fareFormatted, notes, status } = req.body;

    if (!id) {
      return sendError(res, 'Driver Hire Request ID is required', 400);
    }

    const updateFields = { updatedAt: new Date() };
    if (fare !== undefined && fare !== null) {
      const numFare = Number(fare);
      if (!isNaN(numFare)) {
        updateFields.fare = numFare;
        updateFields.fareFormatted = fareFormatted || `Rs. ${numFare.toLocaleString()}`;
      }
    }
    if (notes !== undefined) updateFields.notes = notes;
    if (status !== undefined) updateFields.status = status;

    const client = mongoose.connection?.client;
    const isMongo = /^[0-9a-fA-F]{24}$/.test(id);
    const filter = isMongo ? { _id: new mongoose.Types.ObjectId(id) } : { requestId: id };

    let updatedDoc = null;
    if (client) {
      for (const dbName of ['ride_and_serve', 'test']) {
        try {
          const col = client.db(dbName).collection('driverhirerequests');
          await col.updateOne(filter, { $set: updateFields });
          if (!updatedDoc) {
            updatedDoc = await col.findOne(filter);
          }
        } catch (e) {}
      }
    }

    if (!updatedDoc) {
      updatedDoc = await DriverHire.findOneAndUpdate(
        isMongo ? { _id: id } : { requestId: id },
        { $set: updateFields },
        { new: true }
      ).lean();
    }

    const formatted = formatDriverHire(updatedDoc || { _id: id, ...updateFields });

    const io = req.app.get('io');
    if (io) {
      io.emit('driver-hire-update', { id, ...updateFields, hireRequest: formatted });
      io.emit('driver-hire-updated', { id, ...updateFields, hireRequest: formatted });
      io.to('admin-room').emit('driver-hire-update', { id, ...updateFields, hireRequest: formatted });
    }

    return sendSuccess(res, formatted, 'Driver hire request updated successfully');
  } catch (err) {
    next(err);
  }
};
