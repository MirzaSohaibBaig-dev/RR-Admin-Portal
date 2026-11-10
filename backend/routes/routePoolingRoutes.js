import express from 'express';
import {
  getRouteBatches,
  dispatchRouteBatch,
  getDriverRouteBatches,
  getRouteBatchById
} from '../controllers/routePoolingController.js';

const router = express.Router();

// GET /api/routes/batches - Fetch all clustered route batches with max 5 capacity
router.get('/batches', getRouteBatches);

// GET /api/routes/active - Fetch all active route batches
router.get('/active', getRouteBatches);

// POST /api/routes/batch-dispatch - Dispatch an entire batch (up to 5 rides) to a driver
router.post('/batch-dispatch', dispatchRouteBatch);

// GET /api/routes/driver/:driverId - Fetch assigned route batch for a driver (for mobile/driver view)
router.get('/driver/:driverId', getDriverRouteBatches);

// GET /api/routes/:batchId - Fetch single route batch by ID
router.get('/:batchId', getRouteBatchById);

export default router;
