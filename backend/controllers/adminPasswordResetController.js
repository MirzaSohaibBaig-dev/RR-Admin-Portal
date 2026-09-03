import PasswordResetRequest from '../models/PasswordResetRequest.js';
import Driver from '../models/Driver.js';
import { sendSuccess, sendError } from '../middleware/responseHandler.js';

/**
 * GET /admin/password-resets/pending
 * Fetch pending password reset requests with enriched driver/customer names
 */
export const getPendingPasswordResets = async (req, res) => {
  try {
    const requests = await PasswordResetRequest.find({ status: 'Pending' })
      .sort({ createdAt: -1 })
      .lean();

    const enriched = await Promise.all(requests.map(async (r) => {
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

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (err) {
    console.error('[PasswordResetController] Error fetching all:', err.message);
    return sendError(res, err.message, 500);
  }
};

/**
 * PATCH /admin/password-resets/:id/status
 * Approve or Reject a password reset request
 */
export const updatePasswordResetStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
      return sendError(res, 'Invalid status. Must be "Approved" or "Rejected"', 400);
    }

    const resetReq = await PasswordResetRequest.findById(id);
    if (!resetReq) {
      return sendError(res, 'Password reset request not found', 404);
    }

    resetReq.status = status;
    if (remarks) resetReq.adminRemarks = remarks;
    if (status === 'Approved') {
      resetReq.token = `RST-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    }

    await resetReq.save();

    return res.status(200).json({
      success: true,
      message: `Password reset request ${status.toLowerCase()} successfully`,
      data: resetReq
    });
  } catch (err) {
    console.error('[PasswordResetController] Error updating status:', err.message);
    return sendError(res, err.message, 500);
  }
};
