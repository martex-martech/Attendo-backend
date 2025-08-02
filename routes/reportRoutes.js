import express from 'express';
import {
    getReportStats,
    getAttendanceChartData,
    getAttendanceRecords
} from '../controllers/reportController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/stats', protect, admin, getReportStats);
router.get('/attendance-chart', protect, admin, getAttendanceChartData);
router.get('/attendance-records', protect, admin, getAttendanceRecords);


export default router;