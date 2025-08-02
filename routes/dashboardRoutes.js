import express from 'express';
import { getAdminDashboardStats, getSuperAdminDashboardStats } from '../controllers/dashboardController.js';
import { protect, admin, superAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/admin', protect, admin, getAdminDashboardStats);
router.get('/super-admin', protect, superAdmin, getSuperAdminDashboardStats);

export default router;