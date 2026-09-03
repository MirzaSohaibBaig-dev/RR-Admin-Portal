import express from 'express';
import { protectAdmin } from '../middleware/adminAuth.js';
import {
  getPendingPasswordResets,
  getAllPasswordResets,
  updatePasswordResetStatus
} from '../controllers/adminPasswordResetController.js';

const router = express.Router();

router.use(protectAdmin); // All routes require admin token

router.get('/pending', getPendingPasswordResets);
router.get('/', getAllPasswordResets);
router.patch('/:id/status', updatePasswordResetStatus);

export default router;
