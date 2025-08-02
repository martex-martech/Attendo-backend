
import express from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Settings can be read by any authenticated user, but only updated by admin or super admin
router.route('/').get(protect, getSettings).put(protect, admin, updateSettings);

export default router;