import express from 'express';
import {
  getRequests,
  getPendingRides,
  getRequestStats,
  getRequestById,
  createRequest,
  updateRequest,
  toggleVisibility,
  getDriverRequestsForRide
} from '../controllers/requestController.js';

const router = express.Router();

// Specific routes first
router.get('/pending', getPendingRides);
router.get('/stats', getRequestStats);

// Collection routes
router.route('/')
  .get(getRequests)
  .post(createRequest);

// Single Request routes
router.get('/:id', getRequestById);
router.put('/:id', updateRequest);
router.put('/:id/visibility', toggleVisibility);
router.get('/:id/driver-requests', getDriverRequestsForRide);

export default router;
