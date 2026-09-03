import express from 'express';
import { protectAdmin } from '../middleware/adminAuth.js';
import {
  getVehicles,
  getPendingVehicles,
  getVerifiedVehicles,
  getRejectedVehicles,
  updateVerificationStatus,
  exportVehicles
} from '../controllers/adminVehicleController.js';

const router = express.Router();

router.use(protectAdmin); // All routes protected

router.get('/', getVehicles);
router.get('/pending', getPendingVehicles);
router.get('/verified', getVerifiedVehicles);
router.get('/rejected', getRejectedVehicles);
router.get('/export', exportVehicles);
router.patch('/:id/verification', updateVerificationStatus);

export default router;
