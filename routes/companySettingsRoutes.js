
import express from 'express';
import { getCompanySettings, updateCompanySettings } from '../controllers/companySettingsController.js';
import { protect, superAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Settings can only be accessed and modified by Super Admins
router.route('/').get(protect, superAdmin, getCompanySettings).put(protect, superAdmin, updateCompanySettings);

export default router;
