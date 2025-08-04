import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import leaveRoutes from './routes/leaveRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import companySettingsRoutes from './routes/companySettingsRoutes.js';
import scannerRoutes from './routes/scannerRoutes.js';
import funRoutes from './routes/funRoutes.js';

dotenv.config();
connectDB();

const app = express();

// ✅ Must be first middleware — handle CORS
const allowedOrigins = ['https://attendo-eta.vercel.app', 'https://attendo-eta.vercel.app/'];

app.use(cors({
  origin: ['https://attendo-eta.vercel.app', 'https://attendo-eta.vercel.app/', 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['set-cookie']
}));

// ✅ Handle preflight OPTIONS requests for all routes
app.options('*', cors());

// ✅ Handle preflight OPTIONS requests globally
app.options('*', cors());

// ✅ Parse incoming JSON body
app.use(express.json());

// ✅ Serve static files (optional)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Test Route
app.get('/', (req, res) => {
  res.send('Backend running...');
});

// ✅ API Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/leaves', leaveRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/reports', reportRoutes);
app.use('/notifications', notificationRoutes);
app.use('/scanner', scannerRoutes);
app.use('/fun', funRoutes);
app.use('/company-settings', companySettingsRoutes);
app.use('/settings', settingsRoutes);

// ✅ Error Handling
app.use(notFound);
app.use(errorHandler);

// ✅ Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
