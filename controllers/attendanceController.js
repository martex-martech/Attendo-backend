
import asyncHandler from 'express-async-handler';
import Attendance from '../models/attendanceModel.js';
import User from '../models/userModel.js';
import Notification from '../models/notificationModel.js';
import CompanySettings from '../models/companySettingsModel.js';
import mongoose from 'mongoose';

const getTodayDateString = () => {
    return new Date().toISOString().split('T')[0];
};

// @desc    Get current attendance status for logged-in user
// @route   GET /api/attendance/status
// @access  Private
const getAttendanceStatus = asyncHandler(async (req, res) => {
    const todayDate = getTodayDateString();
    let attendance = await Attendance.findOne({ user: req.user._id, date: todayDate });
    
    let status, workStartTime = null, breakStartTime = null;

    if (!attendance || !attendance.clockInTime) {
        status = 'CLOCKED_OUT';
    } else if (attendance.clockOutTime) {
        status = 'CLOCKED_OUT';
    } else {
        const activeBreak = attendance.breaks.find(b => !b.end);
        if (activeBreak) {
            status = 'ON_BREAK';
            breakStartTime = activeBreak.start;
            workStartTime = attendance.clockInTime;
        } else {
            status = 'CLOCKED_IN';
            workStartTime = attendance.clockInTime;
        }
    }
    
    // In case of clock out, frontend might need last work start time
    if (status === 'CLOCKED_OUT' && attendance) {
        workStartTime = attendance.clockInTime;
    }

    res.json({ success: true, data: { status, workStartTime, breakStartTime } });
});


// @desc    Handle clock-in, clock-out, break actions
// @route   POST /api/attendance/action
// @access  Private
const handleClockAction = asyncHandler(async (req, res) => {
    const { action } = req.body;
    const userId = req.user._id;
    const todayDate = getTodayDateString();
    const now = new Date();

    let attendance = await Attendance.findOne({ user: userId, date: todayDate });

    if (!attendance) {
        attendance = new Attendance({ user: userId, date: todayDate });
    }

    let responseStatus;

    switch (action) {
        case 'CLOCK_IN':
            if (attendance.clockInTime && !attendance.clockOutTime) {
                res.status(400);
                throw new Error('Already clocked in for today');
            }
            // Allow clock in again if previously clocked out (reset clockOutTime)
            if (attendance.clockInTime && attendance.clockOutTime) {
                attendance.clockOutTime = null;
            }
            attendance.clockInTime = now;
            
            // --- DYNAMIC LATE CHECK ---
            const settings = await CompanySettings.findOne();
            const isHoliday = settings?.holidays.some(h => h.date === todayDate);

            if (isHoliday) {
                attendance.status = 'Present'; // Not late on a holiday
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

                 // Create notifications for late clock-ins, ensuring Super Admin privacy
                if (isLate && req.user.role !== 'SUPER_ADMIN') {
                    const notificationsToSend = [];
                    const superAdmin = await User.findOne({ role: 'SUPER_ADMIN' });
                    if (superAdmin) {
                        notificationsToSend.push({
                            user: superAdmin._id,
                            text: `${req.user.name} (${req.user.role.replace('_', ' ').toLowerCase()}) was marked late.`,
                            type: 'attendance',
                            link: '/Reports'
                        });
                    }
                    if (req.user.role === 'EMPLOYEE') {
                        const admin = await User.findOne({ role: 'ADMIN' });
                        if (admin) {
                            notificationsToSend.push({
                                user: admin._id,
                                text: `${req.user.name} has been marked late.`,
                                type: 'attendance',
                                link: '/Reports'
                            });
                        }
                    }
                    if (notificationsToSend.length > 0) {
                        await Notification.insertMany(notificationsToSend);
                    }
                }
            }

            responseStatus = 'CLOCKED_IN';
            break;

        case 'START_BREAK':
            if (!attendance.clockInTime || attendance.clockOutTime) {
                res.status(400);
                throw new Error('Must be clocked in to start a break');
            }
            if (attendance.breaks.some(b => !b.end)) {
                res.status(400);
                throw new Error('Already on a break');
            }
            attendance.breaks.push({ start: now });
            responseStatus = 'ON_BREAK';
            break;

        case 'END_BREAK':
            const activeBreak = attendance.breaks.find(b => !b.end);
            if (!activeBreak) {
                res.status(400);
                throw new Error('Not on a break');
            }
            activeBreak.end = now;
            activeBreak.duration = activeBreak.end.getTime() - activeBreak.start.getTime();
            responseStatus = 'CLOCKED_IN';
            break;

        case 'CLOCK_OUT':
            if (!attendance.clockInTime || attendance.clockOutTime) {
                res.status(400);
                throw new Error('Not clocked in');
            }
            if (attendance.breaks.some(b => !b.end)) {
                // Auto-end break on clock out
                 const activeBreakOnClockOut = attendance.breaks.find(b => !b.end);
                 activeBreakOnClockOut.end = now;
                 activeBreakOnClockOut.duration = activeBreakOnClockOut.end.getTime() - activeBreakOnClockOut.start.getTime();
            }
            attendance.clockOutTime = now;
            
            // Calculate durations
            attendance.totalBreakDuration = attendance.breaks.reduce((acc, b) => acc + (b.duration || 0), 0);
            attendance.workDuration = attendance.clockOutTime.getTime() - attendance.clockInTime.getTime() - attendance.totalBreakDuration;
            
            const standardWorkDay = 8 * 60 * 60 * 1000; // 8 hours in ms
            if(attendance.workDuration > standardWorkDay) {
                attendance.overtime = attendance.workDuration - standardWorkDay;
            }
            responseStatus = 'CLOCKED_OUT';

            // Reset attendance for allowing new clock in on same day
            // Remove resetting clockInTime and clockOutTime to keep timer running
            // attendance.clockInTime = null;
            // attendance.clockOutTime = null;
            attendance.breaks = [];
            attendance.totalBreakDuration = 0;
            attendance.workDuration = 0;
            attendance.overtime = 0;
            attendance.status = null;

            break;

        default:
            res.status(400);
            throw new Error('Invalid action');
    }
    
    await attendance.save();
    
    const statusData = {
        status: responseStatus,
        workStartTime: attendance.clockInTime,
        breakStartTime: action === 'START_BREAK' ? now : null
    }

    res.json({ success: true, data: statusData });
});

// @desc    Get attendance history for logged-in user
// @route   GET /api/attendance/history
// @access  Private
const getAttendanceHistory = asyncHandler(async (req, res) => {
    const history = await Attendance.find({ user: req.user._id }).sort({ date: -1 }).limit(30);

    const formattedHistory = history.map(h => {
        const formatTime = (date) => date ? new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
        const hours = h.workDuration > 0 ? (h.workDuration / 3600000).toFixed(2) + ' hrs' : '-';
        
        // Fix for timezone issue: append T00:00:00 to interpret date in server's local timezone
        const date = new Date(h.date + 'T00:00:00').toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

        return {
            date: date,
            clockIn: formatTime(h.clockInTime),
            clockOut: formatTime(h.clockOutTime),
            hours: hours,
            status: h.status,
        };
    });

    res.json({ success: true, data: formattedHistory });
});

// @desc    Get hour stats for logged-in user
// @route   GET /api/attendance/hours
// @access  Private
const getHourStats = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // Today
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    
    // Week
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Monday as start of week
    weekStart.setHours(0,0,0,0);

    // Month
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const records = await Attendance.find({ 
        user: userId, 
        date: { $gte: monthStart.toISOString().split('T')[0] } 
    });

    const calculateStats = (records) => {
        return records.reduce((acc, rec) => {
            acc.worked += rec.workDuration;
            acc.overtime += rec.overtime;
            return acc;
        }, { worked: 0, overtime: 0 });
    };

    const toHours = (ms) => ms / 3600000;

    const monthStatsRaw = calculateStats(records);
    const weekStatsRaw = calculateStats(records.filter(r => new Date(r.date) >= weekStart));
    const todayStatsRaw = calculateStats(records.filter(r => new Date(r.date) >= todayStart));
    
    const stats = {
        today: { worked: toHours(todayStatsRaw.worked), overtime: toHours(todayStatsRaw.overtime) },
        week: { worked: toHours(weekStatsRaw.worked), overtime: toHours(weekStatsRaw.overtime) },
        month: { worked: toHours(monthStatsRaw.worked), overtime: toHours(monthStatsRaw.overtime) },
    };

    res.json({ success: true, data: stats });
});

export {
    getAttendanceStatus,
    handleClockAction,
    getAttendanceHistory,
    getHourStats
};
