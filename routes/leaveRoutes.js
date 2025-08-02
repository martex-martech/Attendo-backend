
import express from 'express';
import {
    getLeaveRequests,
    createLeaveRequest,
    adminCreateLeaveRequest,
    updateLeaveStatus,
    getMyLeaveRequests,
    getLeaveStats,
    getLeaveBalance,
    getEmployeeLeaveBalance
} from '../controllers/leaveController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// --- Employee specific GET routes ---
router.get('/my-requests', protect, getMyLeaveRequests);
router.get('/stats', protect, getLeaveStats);
router.get('/balance', protect, getLeaveBalance);

// --- Admin specific routes ---
router.get('/', protect, admin, getLeaveRequests);
router.post('/admin', protect, admin, adminCreateLeaveRequest);
router.get('/balance/:userId', protect, admin, getEmployeeLeaveBalance);


// --- General POST route for employees ---
router.post('/', protect, createLeaveRequest);

// --- Parameterized routes (must be last) ---
router.put('/:id/status', protect, admin, updateLeaveStatus);

export default router;