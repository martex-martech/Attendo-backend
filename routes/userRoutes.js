
import express from 'express';
import {
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    bulkCreateUsers,
    updateUserProfile,
    changePassword
} from '../controllers/userController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// --- Admin & Super Admin Routes ---
router.route('/').get(protect, admin, getUsers).post(protect, admin, createUser);
router.route('/bulk').post(protect, admin, bulkCreateUsers);

// --- Employee/User Routes (Specific) ---
router.route('/profile').put(protect, updateUserProfile);
router.route('/profile/change-password').put(protect, changePassword);

// --- Admin & Super Admin Parameterized Route (must be last) ---
router.route('/:id').put(protect, admin, updateUser).delete(protect, admin, deleteUser);

export default router;
