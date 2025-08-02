

import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';
import Attendance from '../models/attendanceModel.js';

// @desc    Get stats for reports page
// @route   GET /api/reports/stats
// @access  Private/Admin
const getReportStats = asyncHandler(async (req, res) => {
    const today = new Date();
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    const thisMonthAttendance = await Attendance.find({ date: { $gte: thisMonthStart.toISOString().split('T')[0] } });
    const lastMonthAttendance = await Attendance.find({
        date: {
            $gte: lastMonthStart.toISOString().split('T')[0],
            $lte: lastMonthEnd.toISOString().split('T')[0]
        }
    });

    const calculateAvgHours = (records) => {
        if (records.length === 0) return 0;
        const totalMs = records.reduce((sum, r) => sum + r.workDuration, 0);
        return totalMs / records.length / 3600000;
    };
    
    const thisMonthAvg = calculateAvgHours(thisMonthAttendance);
    const lastMonthAvg = calculateAvgHours(lastMonthAttendance);
    
    let trend;
    if (lastMonthAvg > 0) {
        const percentageChange = ((thisMonthAvg - lastMonthAvg) / lastMonthAvg) * 100;
        trend = `${percentageChange >= 0 ? '+' : ''}${percentageChange.toFixed(1)}%`;
    } else if (thisMonthAvg > 0) {
        // If there was no activity last month, but there is this month, it's a full increase.
        trend = '+100.0%';
    } else {
        // No activity this month or last month.
        trend = '+0.0%';
    }
    const trendText = `${trend} vs last month`;


    const totalEmployees = await User.countDocuments({ role: 'EMPLOYEE' });
    const totalOvertime = thisMonthAttendance.reduce((sum, r) => sum + r.overtime, 0) / 3600000;
    const totalLates = thisMonthAttendance.filter(r => r.status === 'Late').length;

    const stats = [
        { icon: 'schedule', title: 'Avg. Working Hours', value: `${thisMonthAvg.toFixed(2)}h`, progress: (thisMonthAvg/9)*100, trend: trendText, iconBgColor: 'bg-blue-300', iconColor: 'text-blue-800' },
        { icon: 'groups', title: 'Total Employees', value: totalEmployees, progress: 100, trend: 'All active employees', iconBgColor: 'bg-green-300', iconColor: 'text-green-800' },
        { icon: 'hourglass_bottom', title: 'Total Overtime', value: `${totalOvertime.toFixed(2)}h`, progress: (totalOvertime/50)*100, trend: 'This month', iconBgColor: 'bg-pink-300', iconColor: 'text-pink-800' },
        { icon: 'running_with_errors', title: 'Total Lates', value: totalLates, progress: (totalLates/30)*100, trend: 'This month', iconBgColor: 'bg-yellow-300', iconColor: 'text-yellow-800' },
    ];
    
    res.json({ success: true, data: stats });
});

// @desc    Get data for attendance chart
// @route   GET /api/reports/attendance-chart
// @access  Private/Admin
const getAttendanceChartData = asyncHandler(async (req, res) => {
    const today = new Date();
    const year = today.getFullYear();
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const monthlyData = await Attendance.aggregate([
        { $match: { date: { $regex: `^${year}` } } },
        {
            $group: {
                _id: { $substr: ["$date", 5, 2] }, // group by month
                present: { $sum: { $cond: [{ $in: ['$status', ['Present', 'Late']] }, 1, 0] } },
                absent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } }
            }
        },
        { $sort: { "_id": 1 } }
    ]);

    const present = Array(12).fill(0);
    const absent = Array(12).fill(0);

    monthlyData.forEach(item => {
        const monthIndex = parseInt(item._id, 10) - 1;
        present[monthIndex] = item.present;
        absent[monthIndex] = item.absent;
    });

    res.json({ success: true, data: { labels, present, absent } });
});

// @desc    Get attendance records for table
// @route   GET /api/reports/attendance-records
// @access  Private/Admin
const getAttendanceRecords = asyncHandler(async (req, res) => {
    // Find users that are not super admins to exclude their records
    const usersForReport = await User.find({ role: { $ne: 'SUPER_ADMIN' } }).select('_id');
    const userIdsForReport = usersForReport.map(u => u._id);
    
    const records = await Attendance.find({ user: { $in: userIdsForReport } })
        .populate('user', 'name avatar role employeeId email department')
        .sort({ date: -1 })
        .limit(100);

    const formattedRecords = records
        .filter(r => r.user) // Filter out records where user is null (deleted)
        .map(r => ({
            _id: r._id,
            employee: r.user,
            date: new Date(r.date).toLocaleDateString(),
            checkIn: r.clockInTime ? new Date(r.clockInTime).toLocaleTimeString() : '-',
            checkOut: r.clockOutTime ? new Date(r.clockOutTime).toLocaleTimeString() : '-',
            status: r.status,
            break: r.totalBreakDuration > 0 ? `${(r.totalBreakDuration / 60000).toFixed(0)} min` : '0 min',
            late: r.status === 'Late' ? 'Yes' : 'No',
            overtime: r.overtime > 0 ? `${(r.overtime / 3600000).toFixed(2)} hrs` : '0 hrs',
            production: r.workDuration > 0 ? r.workDuration / 3600000 : 0,
        }));
    
    res.json({ success: true, data: formattedRecords });
});

export {
    getReportStats,
    getAttendanceChartData,
    getAttendanceRecords
};