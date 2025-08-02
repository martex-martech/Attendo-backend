import express from 'express';
import { getAttendanceStreak } from '../controllers/funController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/streak', protect, getAttendanceStreak);

export default router;
