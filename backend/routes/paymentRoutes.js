import express from 'express';
import mongoose from 'mongoose';
import { sendSuccess, sendError } from '../middleware/responseHandler.js';

const router = express.Router();

/**
 * GET /api/payments/admin/all
 * Fetch all payments with customer details and proof images
 */
router.get('/admin/all', async (req, res, next) => {
  try {
    const client = mongoose.connection?.client;
    if (!client) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const db = client.db('ride_and_serve');
    const payments = await db.collection('payments').find({}).sort({ createdAt: -1 }).toArray();

    // Fetch customer details to enrich customerName and customerPhone
    const enriched = await Promise.all(
      payments.map(async (p) => {
        let custName = p.customerName || '';
        let custPhone = p.customerPhone || '';

        if ((!custName || !custPhone) && p.customerId) {
          try {
            const isMongo = /^[0-9a-fA-F]{24}$/.test(String(p.customerId));
            const filter = isMongo ? { _id: new mongoose.Types.ObjectId(p.customerId) } : { _id: p.customerId };
            const cust = await db.collection('customers').findOne(filter);
            if (cust) {
              custName = custName || cust.fullName || cust.name || 'Customer';
              custPhone = custPhone || cust.PhoneNumber || cust.phone || '';
            }
          } catch (e) {}
        }

        // Also check riderequests if customer info still missing
        if ((!custName || !custPhone) && p.rideId) {
          try {
            const ride = await db.collection('riderequests').findOne({
              $or: [{ requestId: p.rideId }, { rideId: p.rideId }]
            });
            if (ride) {
              custName = custName || ride.passengerName || ride.customerName || '';
              custPhone = custPhone || ride.passengerPhone || ride.phone || '';
            }
          } catch (e) {}
        }

        return {
          _id: p._id,
          id: p._id,
          customerId: p.customerId,
          customerName: custName || 'Customer',
          customerPhone: custPhone || 'N/A',
          rideId: p.rideId || 'N/A',
          fare: p.fare || (typeof p.amount === 'number' ? `Rs. ${p.amount.toLocaleString()}` : 'Rs. 0'),
          amount: typeof p.amount === 'number' ? p.amount : (Number(String(p.fare || '').replace(/\D/g, '')) || 0),
          paymentProofUrl: p.paymentProofUrl || p.proofUrl || p.screenshotUrl || '',
          paymentProofId: p.paymentProofId || '',
          status: (p.status || 'PENDING VERIFICATION').toUpperCase(),
          adminRemarks: p.adminRemarks || p.rejectionReason || '',
          chargeType: p.chargeType || (String(p.fare).includes('500') ? 'Rs. 500 Charge' : (String(p.fare).includes('25') ? 'Rs. 25,000 Charge' : 'Ride Fare')),
          createdAt: p.createdAt || new Date().toISOString(),
          updatedAt: p.updatedAt || new Date().toISOString()
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: enriched.length,
      data: enriched
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/payments/admin/:id/status or PUT /api/payments/admin/:id/status
 * Update payment verification status
 */
const updatePaymentStatusHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, adminRemarks, rejectionReason } = req.body;

    if (!id) {
      return sendError(res, 'Payment ID is required', 400);
    }

    const client = mongoose.connection?.client;
    if (!client) {
      return sendError(res, 'Database connection not ready', 500);
    }

    const db = client.db('ride_and_serve');
    const isMongo = /^[0-9a-fA-F]{24}$/.test(String(id));
    const filter = isMongo ? { _id: new mongoose.Types.ObjectId(id) } : { _id: id };

    const updateFields = {
      updatedAt: new Date()
    };
    if (status) updateFields.status = status.toUpperCase();
    if (adminRemarks !== undefined) updateFields.adminRemarks = adminRemarks;
    if (rejectionReason !== undefined) updateFields.adminRemarks = rejectionReason;

    const result = await db.collection('payments').findOneAndUpdate(
      filter,
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    // Create a notification record in DB for the App Developer to fetch
    const paymentDoc = result;
    if (paymentDoc) {
      let driverId = paymentDoc.driverId;
      
      // If driverId is not directly on payment, try fetching from riderequests
      if (!driverId && paymentDoc.rideId) {
        try {
          const ride = await db.collection('riderequests').findOne({
            $or: [{ requestId: paymentDoc.rideId }, { rideId: paymentDoc.rideId }]
          });
          if (ride && ride.driverId) {
            driverId = ride.driverId;
          }
        } catch (e) {}
      }

      const notification = {
        title: 'Payment Status Updated',
        message: `Your payment for ride ${paymentDoc.rideId || ''} is now ${updateFields.status}. ${updateFields.adminRemarks ? 'Remarks: ' + updateFields.adminRemarks : ''}`,
        type: 'PAYMENT_UPDATE',
        status: updateFields.status,
        paymentId: paymentDoc._id,
        customerId: paymentDoc.customerId || null,
        driverId: driverId || null,
        rideId: paymentDoc.rideId || null,
        isRead: false,
        createdAt: new Date()
      };
      
      await db.collection('notifications').insertOne(notification);
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('payment-status-updated', { id, status: updateFields.status, updated: result });
      io.to('admin-room').emit('payment-status-updated', { id, status: updateFields.status, updated: result });
    }

    return sendSuccess(res, result, `Payment status updated to ${updateFields.status}`);
  } catch (err) {
    next(err);
  }
};

router.patch('/admin/:id/status', updatePaymentStatusHandler);
router.put('/admin/:id/status', updatePaymentStatusHandler);
router.patch('/:id', updatePaymentStatusHandler);

export default router;
