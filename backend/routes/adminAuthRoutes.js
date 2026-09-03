import express from 'express';
import { loginAdmin, getMe, registerAdmin } from '../controllers/adminAuthController.js';
import { protectAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

router.post('/login', loginAdmin);
router.post('/register', registerAdmin);
router.get('/me', protectAdmin, getMe);

export default router;
