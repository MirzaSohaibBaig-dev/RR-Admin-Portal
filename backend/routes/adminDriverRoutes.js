import express from 'express';
import { protectAdmin } from '../middleware/adminAuth.js';
import {
  getDrivers,
  getPendingDrivers,
  getVerifiedDrivers,
  getRejectedDrivers,
  updateVerificationStatus,
  updateDriverProfile,
  exportDrivers
} from '../controllers/adminDriverController.js';

const router = express.Router();

router.use(protectAdmin); // All routes protected

router.get('/', getDrivers);
router.get('/pending', getPendingDrivers);
router.get('/verified', getVerifiedDrivers);
router.get('/rejected', getRejectedDrivers);
router.get('/export', exportDrivers);
router.patch('/:id/verification', updateVerificationStatus);
router.put('/:id', updateDriverProfile);
router.patch('/:id', updateDriverProfile);

export default router;
