import express from 'express';
import {
    getAttendanceStatus,
    handleClockAction,
    getAttendanceHistory,
    getHourStats
} from '../controllers/attendanceController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/status', protect, getAttendanceStatus);
router.post('/action', protect, handleClockAction);
router.get('/history', protect, getAttendanceHistory);
router.get('/hours', protect, getHourStats);

export default router;
