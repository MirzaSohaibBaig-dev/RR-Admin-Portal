import express from 'express';
import {
  getDrivers,
  getDriverStats,
  getAvailableDrivers,
  getDriverById,
  createDriver,
  approveDriver,
  rejectDriver
} from '../controllers/driverController.js';

const router = express.Router();

// Specific routes first to avoid conflict with :id param
router.get('/stats', getDriverStats);
router.get('/available', getAvailableDrivers);

// Collection routes
router.route('/')
  .get(getDrivers)
  .post(createDriver);

// Single Driver routes
router.get('/:id', getDriverById);
router.put('/:id/approve', approveDriver);
router.put('/:id/reject', rejectDriver);

export default router;
