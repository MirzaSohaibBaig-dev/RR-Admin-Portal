import PasswordResetRequest from '../models/PasswordResetRequest.js';
import { sendSuccess, sendError } from '../middleware/responseHandler.js';

/**
 * GET /admin/password-resets/pending
 * Fetch pending password reset requests
 */
export const getPendingPasswordResets = async (req, res) => {
  try {
    const requests = await PasswordResetRequest.find({ status: 'Pending' })
      .sort({ createdAt: -1 })
      .lean();

    // If database is empty, provide default mock requests for instant testing
    if (!requests || requests.length === 0) {
      const mockCount = await PasswordResetRequest.countDocuments();
      if (mockCount === 0) {
        const seeded = await PasswordResetRequest.insertMany([
          {
            email: 'customer@example.com',
            userType: 'Customer',
            status: 'Pending',
            createdAt: new Date()
          },
          {
            email: 'salma.driver@rrdispatcher.com',
            userType: 'Driver',
            status: 'Pending',
            createdAt: new Date(Date.now() - 3600000)
          },
          {
            email: 'kamran.khan@gmail.com',
            userType: 'Customer',
            status: 'Pending',
            createdAt: new Date(Date.now() - 7200000)
          }
        ]);
        return res.status(200).json({
          success: true,
          count: seeded.length,
          requests: seeded
        });
      }
    }

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests
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
      // Generate standard mock reset token for app handoff
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
