
import asyncHandler from 'express-async-handler';
import Attendance from '../models/attendanceModel.js';
import User from '../models/userModel.js';
import Notification from '../models/notificationModel.js';
import CompanySettings from '../models/companySettingsModel.js';

const getTodayDateString = () => {
    return new Date().toISOString().split('T')[0];
};

// @desc    Handle an attendance scan from hardware
// @route   POST /api/scanner/scan
// @access  Public (protected by API Key)
const handleScan = asyncHandler(async (req, res) => {
    const { employeeId } = req.body;
    const apiKey = req.headers['x-api-key'];

    // 1. Validate API Key
    if (!apiKey || apiKey !== process.env.SCANNER_API_KEY) {
        res.status(401);
        throw new Error('Unauthorized: Invalid API Key.');
    }

    if (!employeeId) {
        res.status(400);
        throw new Error('Bad Request: employeeId is required.');
    }

    // 2. Find User
    const user = await User.findOne({ employeeId });
    if (!user) {
        res.status(404);
        throw new Error(`User with ID ${employeeId} not found.`);
    }

    // 3. Perform Clock-In Action
    const todayDate = getTodayDateString();
    const now = new Date();
    let attendance = await Attendance.findOne({ user: user._id, date: todayDate });

    if (!attendance) {
        attendance = new Attendance({ user: user._id, date: todayDate });
    }

    // Check if already clocked in
    if (attendance.clockInTime) {
        res.status(400).json({ success: false, message: `${user.name} is already clocked in for today.` });
        return;
    }
    
    attendance.clockInTime = now;
    
    // --- DYNAMIC LATE CHECK ---
    const settings = await CompanySettings.findOne();
    const isHoliday = settings?.holidays.some(h => h.date === todayDate);

    if (isHoliday) {
        attendance.status = 'Present';
    } else {
        const workingHours = settings?.workingHours || { clockIn: '09:30', lateGraceMinutes: 15 };
        const dateOverrides = settings?.dateOverrides || [];
        const override = dateOverrides.find(o => o.date === todayDate);
        const clockInRule = override ? override.clockIn : workingHours.clockIn;
        const graceMinutes = workingHours.lateGraceMinutes;
        const [ruleHours, ruleMinutes] = clockInRule.split(':').map(Number);
        const deadline = new Date(now);
        deadline.setHours(ruleHours, ruleMinutes + graceMinutes, 0, 0);
        const isLate = now > deadline;
        attendance.status = isLate ? 'Late' : 'Present';

        if (isLate && user.role !== 'SUPER_ADMIN') {
            const notificationsToSend = [];
            const superAdmin = await User.findOne({ role: 'SUPER_ADMIN' });
            if (superAdmin) {
                notificationsToSend.push({
                    user: superAdmin._id,
                    text: `${user.name} (${user.role.replace('_', ' ').toLowerCase()}) was marked late.`,
                    type: 'attendance',
                    link: '/Reports'
                });
            }
             if (user.role === 'EMPLOYEE') {
                const admin = await User.findOne({ role: 'ADMIN' });
                 if(admin) {
                    notificationsToSend.push({ user: admin._id, text: `${user.name} has been marked late.`, type: 'attendance', link: '/Reports' });
                 }
            }
            if(notificationsToSend.length > 0) await Notification.insertMany(notificationsToSend);
        }
    }
    
    await attendance.save();

    res.status(200).json({ success: true, message: `${user.name} clocked in successfully at ${now.toLocaleTimeString()}.` });
});

export { handleScan };
