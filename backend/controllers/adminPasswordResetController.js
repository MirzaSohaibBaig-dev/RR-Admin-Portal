import PasswordResetRequest from '../models/PasswordResetRequest.js';
import Driver from '../models/Driver.js';
import { sendSuccess, sendError } from '../middleware/responseHandler.js';

// Helper to enrich password reset items with driver names and phone numbers
const enrichRequests = async (requests) => {
  return await Promise.all(requests.map(async (r) => {
    let name = r.name || r.userName || '';
    let phone = r.phoneNumber || r.phone || '';
    let email = r.email || '';

    if (r.driver) {
      try {
        const d = await Driver.findById(r.driver).select('Name PhoneNumber Email').lean();
        if (d) {
          name = d.Name || name;
          phone = d.PhoneNumber || phone;
          email = d.Email || email;
        }
      } catch (e) {}
    } else if (r.phoneNumber || r.email) {
      try {
        const query = r.phoneNumber ? { PhoneNumber: r.phoneNumber } : { Email: r.email };
        const d = await Driver.findOne(query).select('Name PhoneNumber Email').lean();
        if (d) {
          name = d.Name || name;
          phone = d.PhoneNumber || phone;
          email = d.Email || email;
        }
      } catch (e) {}
    }

    return {
      ...r,
      name: name || (r.userType === 'Driver' ? 'Driver Account' : 'Customer Account'),
      phone: phone || (r.email && !r.email.includes('@') ? r.email : ''),
      email: email || r.email || phone,
      userType: r.userType || (r.driver ? 'Driver' : 'Customer')
    };
  }));
};

/**
 * GET /admin/password-resets/pending
 * Fetch pending password reset requests
 */
export const getPendingPasswordResets = async (req, res) => {
  try {
    const requests = await PasswordResetRequest.find({ status: 'Pending' })
      .sort({ createdAt: -1 })
      .lean();

    const enriched = await enrichRequests(requests);

    return res.status(200).json({
      success: true,
      count: enriched.length,
      requests: enriched
    });
  } catch (err) {
    console.error('[PasswordResetController] Error fetching pending:', err.message);
    return sendError(res, err.message, 500);
  }
};

/**
 * GET /admin/password-resets
 * Fetch all password reset requests (Pending, Approved, Rejected)
 */
export const getAllPasswordResets = async (req, res) => {
  try {
    const { status, userType } = req.query;
    const filter = {};
    if (status && status !== 'All') filter.status = status;
    if (userType && userType !== 'All') filter.userType = userType;

    const requests = await PasswordResetRequest.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    const enriched = await enrichRequests(requests);

    return res.status(200).json({
      success: true,
      count: enriched.length,
      requests: enriched
    });
  } catch (err) {
    console.error('[PasswordResetController] Error fetching all:', err.message);
    return sendError(res, err.message, 500);
  }
};

/**
 * PATCH /admin/password-resets/:id/status
 * Approve or Reject a password reset request (direct MongoDB atomic update)
 */
export const updatePasswordResetStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
      return sendError(res, 'Invalid status. Must be "Approved" or "Rejected"', 400);
    }

    const updateDoc = {
      status,
      updatedAt: new Date()
    };

    if (remarks) updateDoc.adminRemarks = remarks;

    if (status === 'Approved') {
      const generatedToken = `RST-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      updateDoc.token = generatedToken;
      updateDoc.resetToken = generatedToken;
      updateDoc.approvedAt = new Date();
    } else if (status === 'Rejected') {
      updateDoc.rejectedAt = new Date();
    }

    const updated = await PasswordResetRequest.findByIdAndUpdate(
      id,
      {
        $set: updateDoc,
        $push: {
          statusHistory: {
            status,
            changedAt: new Date(),
            changedBy: req.admin?._id || 'admin',
            changedByModel: 'Admin',
            note: `Password reset request marked as ${status}`
          }
        }
      },
      { new: true, lean: true }
    );

    if (!updated) {
      return sendError(res, 'Password reset request not found in database', 404);
    }

    return res.status(200).json({
      success: true,
      message: `Password reset request ${status.toLowerCase()} successfully`,
      data: updated
    });
  } catch (err) {
    console.error('[PasswordResetController] Error updating status:', err.message);
    return sendError(res, err.message, 500);
  }
};
