import express from 'express';
import { protectAdmin } from '../middleware/adminAuth.js';
import {
  getDriversRatings,
  getDriverRatingHistory,
  submitDriverRating
} from '../controllers/adminDriverRatingController.js';

const router = express.Router();

router.use(protectAdmin); // All routes protected

router.get('/', getDriversRatings);
router.get('/:driverId/history', getDriverRatingHistory);
router.post('/', submitDriverRating);
router.put('/:driverId', submitDriverRating);

export default router;
