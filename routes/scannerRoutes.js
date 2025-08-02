
import express from 'express';
import { handleScan } from '../controllers/scannerController.js';

const router = express.Router();

// This endpoint is intended to be hit by the ID scanner hardware.
router.post('/scan', handleScan);

export default router;
