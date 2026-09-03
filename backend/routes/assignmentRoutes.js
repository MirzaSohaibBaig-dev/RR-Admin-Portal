import express from 'express';
import {
  createAssignment,
  getAssignments
} from '../controllers/assignmentController.js';

const router = express.Router();

router.route('/')
  .post(createAssignment)
  .get(getAssignments);

export default router;
