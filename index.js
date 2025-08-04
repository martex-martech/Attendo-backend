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
const allowedOrigins = ['https://attendo-eta.vercel.app'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/scanner', scannerRoutes);
app.use('/api/fun', funRoutes);
app.use('/api/company-settings', companySettingsRoutes);
app.use('/api/settings', settingsRoutes);

// ✅ Error Handling
app.use(notFound);
app.use(errorHandler);

// ✅ Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
