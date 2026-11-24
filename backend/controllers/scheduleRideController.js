import mongoose from "mongoose";
import ScheduleRide from "../models/ScheduleRide.js";
import Driver from "../models/Driver.js";
import { sendSuccess, sendError } from "../middleware/responseHandler.js";

// Collections to check in each DB (cover both naming conventions from customer app)
const COLLECTIONS = ["monthlypickanddrop", "schedulerides", "scheduleriderequests", "schedulerequests", "schedule_rides"];
const DBS = ["ride_and_serve", "test"];

const formatScheduleRide = (doc) => {
  if (!doc) return null;
  const d = doc._doc || doc;
  const idStr = String(d._id || "");
  const fareNum = Number(d.fare || d.fareAmount || 0);
  const custName = d.passengerName || d.customerName || d.name || "Passenger";
  const custPhone = d.passengerPhone || d.customerPhone || d.phone || "";
  const custEmail = d.passengerEmail || d.customerEmail || d.email || "";
  const reqId = d.requestId || d.id || `SCH-${idStr.slice(-4).toUpperCase()}`;
  const sType = d.scheduleType || (d.customSchedule ? "Customize" : "Mon - Fri");
  const seats = Number(d.passengersCount ?? d.passengerCount ?? d.seatsNeeded ?? d.customSchedule?.passengersCount ?? 1) || 1;
  const vType = d.vehicleType || d.seatingArrangement || d.vehiclePreference || d.customSchedule?.vehicleType || "Sedan Executive";
  const sTypeSelection = d.serviceType || d.vehicleTypeSelection || d.customSchedule?.serviceType || "Separate";
  const tType = d.tripType || d.customSchedule?.tripType || d.rideType || "One Way";
  const rType = d.requestType || d.category || (String(reqId).startsWith("REQ-") ? "Monthly Pick & Drop" : "Schedule Ride");

  return {
    _id: idStr,
    id: reqId,
    requestId: reqId,
    mongoId: idStr,
    displayId: reqId,
    passengerName: custName,
    customerName: custName,
    passengerPhone: custPhone,
    customerPhone: custPhone,
    passengerEmail: custEmail,
    customerEmail: custEmail,
    passenger: {
      name: custName,
      phone: custPhone,
      email: custEmail,
      gender: d.genderPreference || d.gender || "Male"
    },
    pickupLocation: d.pickupLocation || d.pickup || d.from || "",
    dropoffLocation: d.dropoffLocation || d.dropLocation || d.dropoff || d.to || "",
    startingFrom: d.startingFrom || d.startDate || d.date || "",
    date: d.startingFrom || d.startDate || d.date || "",
    timeToReach: d.timeToReach || d.time || d.scheduleTime || "08:30 AM",
    timeToLeave: d.timeToLeave || "05:00 PM",
    scheduleType: sType,
    scheduleTime: d.scheduleTime || d.timeToReach || "08:30 AM",
    selectedDays: d.selectedDays || d.customSchedule?.selectedDays || [],
    rideType: d.rideType || "One Way",
    tripType: tType,
    vehicleType: vType,
    vehiclePreference: vType,
    seatingArrangement: vType,
    serviceType: sTypeSelection,
    vehicleTypeSelection: sTypeSelection,
    passengersCount: seats,
    seatsNeeded: seats,
    acPreference: d.acPreference || "AC",
    acRequired: d.acPreference !== "Non-AC" && d.acRequired !== false,
    genderPreference: d.genderPreference || "Both",
    fare: fareNum,
    fareFormatted: d.fareFormatted || (fareNum > 0 ? `Rs. ${fareNum.toLocaleString()}` : "Not Set"),
    status: d.status || "Pending Dispatch",
    notes: d.notes || d.additionalNotes || "",
    additionalNotes: d.notes || d.additionalNotes || "",
    customSchedule: d.customSchedule || null,
    returnPickupLocation: d.returnPickupLocation || d.customSchedule?.returnPickupLocation || null,
    returnDropoffLocation: d.returnDropoffLocation || d.customSchedule?.returnDropoffLocation || null,
    returnDate: d.returnDate || d.customSchedule?.returnDate || null,
    returnTime: d.returnTime || d.customSchedule?.returnTime || null,
    requestType: rType,
    category: rType,
    assignedDriverId: d.assignedDriverId || d.driverId || null,
    assignedDriverName: d.assignedDriverName || d.driverName || null,
    assignedDriverPhone: d.assignedDriverPhone || null,
    dispatchedAt: d.dispatchedAt || null,
    createdAt: d.createdAt || (d._id && mongoose.Types.ObjectId.isValid(d._id) ? new mongoose.Types.ObjectId(d._id).getTimestamp() : new Date())
  };
};

// GET /api/schedule-rides
export const getAllScheduleRides = async (req, res, next) => {
  try {
    const client = mongoose.connection?.client;
    const allDocs = [];
    const seenIds = new Set();

    if (client) {
      for (const dbName of DBS) {
        for (const colName of COLLECTIONS) {
          try {
            const docs = await client.db(dbName).collection(colName)
              .find({}).sort({ createdAt: -1 }).limit(100).toArray();
            for (const doc of docs) {
              const id = String(doc._id);
              if (!seenIds.has(id)) { seenIds.add(id); allDocs.push(doc); }
            }
          } catch (e) {}
        }
      }
    }

    // Also query via Mongoose model as fallback
    try {
      const mongooseDocs = await ScheduleRide.find({}).sort({ createdAt: -1 }).limit(100).lean();
      for (const doc of mongooseDocs) {
        const id = String(doc._id);
        if (!seenIds.has(id)) { seenIds.add(id); allDocs.push(doc); }
      }
    } catch (e) {}

    // Sort all combined documents so newest requests always appear first
    allDocs.sort((a, b) => {
      const getTs = (doc) => {
        if (doc.createdAt) {
          const d = new Date(doc.createdAt);
          if (!isNaN(d.getTime())) return d.getTime();
        }
        if (doc._id) {
          try {
            const d = new mongoose.Types.ObjectId(doc._id).getTimestamp();
            if (!isNaN(d.getTime())) return d.getTime();
          } catch (e) {}
        }
        return 0;
      };
      return getTs(b) - getTs(a);
    });

    const formatted = allDocs.map(formatScheduleRide).filter(Boolean);
    return sendSuccess(res, formatted, `${formatted.length} schedule ride(s) found`);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/schedule-rides/:id/dispatch
export const dispatchScheduleRide = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { driverId, driverName, fare } = req.body;

    if (!id) return sendError(res, "Schedule Ride ID is required", 400);

    // ── 1. Resolve full driver document ─────────────────────────────────────
    let driverDoc = null;
    if (driverId) {
      const isMongoDrv = /^[0-9a-fA-F]{24}$/.test(driverId);
      driverDoc = await Driver.findOne(isMongoDrv ? { _id: driverId } : { driverId }).lean().catch(() => null);
    }
    const assignedDriverName   = driverDoc?.Name || driverDoc?.name || driverName || "Assigned Driver";
    const assignedDriverCode   = driverDoc?.driverReferenceId || driverDoc?.driverId || "";
    const assignedDriverPhone  = driverDoc?.PhoneNumber || driverDoc?.phone || "";
    const assignedDriverMongo  = driverDoc?._id ? String(driverDoc._id) : (driverId || "");

    const updateFields = {
      status: "ASSIGNED",
      assignedDriverId: assignedDriverMongo || driverId || null,
      assignedDriverName: assignedDriverName,
      assignedDriverCode: assignedDriverCode,
      assignedDriverPhone: assignedDriverPhone,
      dispatchedAt: new Date(),
      updatedAt: new Date()
    };

    if (fare !== undefined && fare !== null) {
      const numFare = Number(fare);
      if (!isNaN(numFare) && numFare > 0) {
        updateFields.fare = numFare;
        updateFields.fareFormatted = `Rs. ${numFare.toLocaleString()}`;
      }
    }

    const isMongo = /^[0-9a-fA-F]{24}$/.test(id);
    const filter = isMongo ? { _id: new mongoose.Types.ObjectId(id) } : { requestId: id };

    const client = mongoose.connection?.client;
    let updatedDoc = null;

    if (client) {
      for (const dbName of DBS) {
        for (const colName of COLLECTIONS) {
          try {
            const col = client.db(dbName).collection(colName);
            const result = await col.updateOne(filter, { $set: updateFields });
            if (result.matchedCount > 0 && !updatedDoc) {
              updatedDoc = await col.findOne(filter);
            }
          } catch (e) {}
        }
      }
    }

    if (!updatedDoc) {
      updatedDoc = await ScheduleRide.findOneAndUpdate(
        isMongo ? { _id: id } : { requestId: id },
        { $set: updateFields },
        { new: true, upsert: false }
      ).lean();
    }

    const formatted = formatScheduleRide(updatedDoc || { _id: id, requestId: id, ...updateFields });

    // ── 2. Persist notification in drivernotifications collection ────────────
    try {
      const db = mongoose.connection?.db;
      if (db) {
        await db.collection("drivernotifications").insertOne({
          notificationId: `${formatted.requestId || id}_SCH_ASSIGNED_${Date.now()}`,
          driverId: assignedDriverMongo || driverId || "",
          driverName: assignedDriverName,
          driverReferenceId: assignedDriverCode,
          rideId: formatted.requestId || id,
          customerName: formatted.passengerName || "Customer",
          customerPhone: formatted.passengerPhone || "",
          customerCount: 0,
          routeId: "",
          routeName: "",
          timeRange: formatted.timeToReach || "",
          pickup: typeof formatted.pickupLocation === "object"
            ? (formatted.pickupLocation?.address || "Pickup")
            : (formatted.pickupLocation || "Pickup"),
          destination: typeof formatted.dropoffLocation === "object"
            ? (formatted.dropoffLocation?.address || "Drop-off")
            : (formatted.dropoffLocation || "Drop-off"),
          fareFormatted: updateFields.fareFormatted || formatted.fareFormatted || "Not Set",
          status: "ASSIGNED",
          title: "🗓️ New Monthly Pickup Assigned!",
          subtitle: `Customer ${formatted.passengerName || "Customer"} (${formatted.requestId || id}) has been assigned to you. Tap to view ride details.`,
          type: "NEW_ASSIGNMENT",
          rideType: "schedule",
          isRead: false,
          isDismissed: false,
          payload: {
            id: formatted.requestId || id,
            rideId: formatted.requestId || id,
            requestId: formatted.requestId || id,
            mongoId: formatted._id || id,
            passengerName: formatted.passengerName,
            customerName: formatted.passengerName,
            passengerPhone: formatted.passengerPhone,
            pickupLocation: formatted.pickupLocation,
            dropoffLocation: formatted.dropoffLocation,
            fare: updateFields.fare || formatted.fare,
            fareFormatted: updateFields.fareFormatted || formatted.fareFormatted,
            status: "ASSIGNED",
            rideType: "schedule"
          },
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    } catch (e) {
      console.warn("[Schedule Dispatch] drivernotifications insert error (non-fatal):", e.message);
    }

    // ── 3. Socket.IO – notify driver app + admin dashboard ──────────────────
    const io = req.app.get("io");
    if (io) {
      const socketPayload = {
        ...formatted,
        driverId: assignedDriverMongo || driverId,
        driverName: assignedDriverName,
        driverCode: assignedDriverCode,
        driverPhone: assignedDriverPhone,
        status: "ASSIGNED",
        rideType: "schedule"
      };

      // Targeted driver room – all event names the driver app may listen to
      const driverRooms = [
        assignedDriverMongo && `driver-${assignedDriverMongo}`,
        driverId && assignedDriverMongo !== driverId && `driver-${driverId}`,
        assignedDriverCode && `driver-${assignedDriverCode}`
      ].filter(Boolean);

      driverRooms.forEach(room => {
        io.to(room).emit("new-assignment",    socketPayload);
        io.to(room).emit("ride-assigned",     socketPayload);
        io.to(room).emit("ride-dispatched",   socketPayload);
        io.to(room).emit("new-notification",  socketPayload);
        io.to(room).emit("driver-notification", socketPayload);
        io.to(room).emit("schedule-ride-dispatched", socketPayload);
      });

      // Global broadcast (catches drivers not yet in a named room)
      io.emit("new-assignment",           socketPayload);
      io.emit("ride-assigned",            socketPayload);
      io.emit("schedule-ride-dispatched", socketPayload);
      io.emit("schedule-ride-updated",    socketPayload);
      io.emit("new-notification",         socketPayload);
      io.emit("driver-notification",      socketPayload);

      // Admin dashboard
      io.to("admin-room").emit("schedule-ride-dispatched", socketPayload);
      io.to("admin-room").emit("schedule-ride-updated",    socketPayload);
      io.to("admin-room").emit("ride-updated",             socketPayload);
    }

    return sendSuccess(res, formatted, `Driver ${assignedDriverName} dispatched to schedule ride`);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/schedule-rides/:id
export const updateScheduleRide = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fare, fareFormatted, status, notes } = req.body;

    if (!id) return sendError(res, "Schedule Ride ID is required", 400);

    const updateFields = { updatedAt: new Date() };
    if (fare !== undefined && fare !== null) {
      const numFare = Number(fare);
      if (!isNaN(numFare)) {
        updateFields.fare = numFare;
        updateFields.fareFormatted = fareFormatted || `Rs. ${numFare.toLocaleString()}`;
      }
    }
    if (status !== undefined) updateFields.status = status;
    if (notes !== undefined) updateFields.notes = notes;

    const isMongo = /^[0-9a-fA-F]{24}$/.test(id);
    const filter = isMongo ? { _id: new mongoose.Types.ObjectId(id) } : { requestId: id };

    const client = mongoose.connection?.client;
    let updatedDoc = null;

    if (client) {
      for (const dbName of DBS) {
        for (const colName of COLLECTIONS) {
          try {
            const col = client.db(dbName).collection(colName);
            const result = await col.updateOne(filter, { $set: updateFields });
            if (result.matchedCount > 0 && !updatedDoc) {
              updatedDoc = await col.findOne(filter);
            }
          } catch (e) {}
        }
      }
    }

    if (!updatedDoc) {
      updatedDoc = await ScheduleRide.findOneAndUpdate(
        isMongo ? { _id: id } : { requestId: id },
        { $set: updateFields },
        { new: true }
      ).lean();
    }

    const formatted = formatScheduleRide(updatedDoc || { _id: id, ...updateFields });

    const io = req.app.get("io");
    if (io) {
      io.emit("schedule-ride-updated", { id, ...updateFields, scheduleRide: formatted });
      if (updateFields.fare !== undefined) {
        io.emit("fare_updated", { rideId: id, newFare: updateFields.fare, newFareFormatted: updateFields.fareFormatted, rideType: "Schedule Ride" });
      }
      io.to("admin-room").emit("schedule-ride-updated", { id, ...updateFields, scheduleRide: formatted });
    }

    return sendSuccess(res, formatted, "Schedule ride updated successfully");
  } catch (err) {
    next(err);
  }
};

