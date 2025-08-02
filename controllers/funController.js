import asyncHandler from 'express-async-handler';
import Attendance from '../models/attendanceModel.js';

// @desc    Get current attendance streak for the logged-in user
// @route   GET /api/fun/streak
// @access  Private
const getAttendanceStreak = asyncHandler(async (req, res) => {
    const records = await Attendance.find({ user: req.user._id }).sort({ date: -1 });
    let streak = 0;
    let lastDate = null;
    for (const record of records) {
        if (record.status === 'Present') {
            if (!lastDate) {
                lastDate = new Date(record.date);
                streak = 1;
            } else {
                const currentDate = new Date(record.date);
                lastDate.setDate(lastDate.getDate() - 1);
                if (
                    currentDate.getFullYear() === lastDate.getFullYear() &&
                    currentDate.getMonth() === lastDate.getMonth() &&
                    currentDate.getDate() === lastDate.getDate()
                ) {
                    streak++;
                    lastDate = currentDate;
                } else {
                    break;
                }
            }
        } else {
            break;
        }
    }
    res.json({ success: true, streak });
});

export { getAttendanceStreak };
