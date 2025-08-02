

import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';
import Leave from '../models/leaveModel.js';
import Attendance from '../models/attendanceModel.js';
import Notification from '../models/notificationModel.js';

// @desc    Get stats for admin dashboard
// @route   GET /api/dashboard/admin
// @access  Private/Admin
const getAdminDashboardStats = asyncHandler(async (req, res) => {
    const employeeQuery = { role: 'EMPLOYEE' };

    // Get all employee IDs for filtering other collections
    const employeeIds = await User.find(employeeQuery).select('_id');
    const employeeIdArray = employeeIds.map(e => e._id);

    const totalEmployees = await User.countDocuments(employeeQuery);

    const todayDate = new Date().toISOString().split('T')[0];
    
    // Correctly count attendance only for employees
    const attendanceTodayCount = await Attendance.countDocuments({ 
        date: todayDate, 
        status: { $ne: 'Absent' },
        user: { $in: employeeIdArray }
    });

    // Correctly count on leave only for employees
    const onLeaveCount = await User.countDocuments({ ...employeeQuery, status: 'On Leave' });
    
    // Correctly count pending requests only for employees
    const pendingRequestsCount = await Leave.countDocuments({ 
        status: 'Pending',
        user: { $in: employeeIdArray }
    });

    const departments = await User.aggregate([
        { $match: { role: 'EMPLOYEE' } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $project: { name: '$_id', count: 1, _id: 0 } },
        { $sort: { count: -1 } }
    ]);
    const totalDeptEmployees = departments.reduce((sum, dept) => sum + dept.count, 0);
    const departmentsWithPercentage = departments.map(d => ({ ...d, percentage: totalDeptEmployees > 0 ? (d.count / totalDeptEmployees) * 100 : 0 }));


    const employeeStatus = {
        total: totalEmployees,
        types: [
            { name: 'Fulltime', value: totalEmployees, percentage: 100 },
        ]
    };

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const punctualityStats = await Attendance.aggregate([
        { $match: { date: { $gte: thirtyDaysAgoStr }, status: { $ne: 'Absent' }, user: { $in: employeeIdArray } } },
        {
            $group: {
                _id: '$user',
                lateCount: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
                avgBreakDuration: { $avg: '$totalBreakDuration' }
            }
        },
        { $sort: { lateCount: 1, avgBreakDuration: 1 } },
        { $limit: 1 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'userDetails' } },
        { $unwind: '$userDetails' },
        {
            $project: {
                _id: 0,
                name: '$userDetails.name',
                avatar: '$userDetails.avatar',
                role: '$userDetails.role',
                lates: '$lateCount',
                avgBreak: { $round: [{ $divide: ['$avgBreakDuration', 60000] }, 0] }
            }
        }
    ]);

    let mostPunctual;
    if (punctualityStats.length > 0) {
        mostPunctual = punctualityStats[0];
    } else {
        const anyEmployee = await User.findOne({ role: 'EMPLOYEE' });
        mostPunctual = {
            name: anyEmployee ? anyEmployee.name : 'N/A',
            avatar: anyEmployee ? anyEmployee.avatar : 'https://i.pravatar.cc/150',
            role: anyEmployee ? anyEmployee.role : 'Employee',
            lates: 0,
            avgBreak: 0,
        };
    }

    // Get all employee and admin IDs for the feed, excluding super admins
    const usersForFeed = await User.find({ role: { $in: ['ADMIN', 'EMPLOYEE'] } }).select('_id');
    const usersForFeedIds = usersForFeed.map(u => u._id);

    const recentClockIns = await Attendance.find({ date: todayDate, user: { $in: usersForFeedIds } })
        .sort({ clockInTime: -1 })
        .limit(5)
        .populate('user', 'name role avatar');
    
    const clockInOuts = recentClockIns
        .filter(a => a.user)
        .map(a => ({
            name: a.user.name,
            avatar: a.user.avatar,
            role: a.user.role,
            time: new Date(a.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' }),
            status: a.clockOutTime ? 'out' : 'in',
        }));

    const totalPresent = await Attendance.countDocuments({ date: todayDate, status: 'Present', user: { $in: employeeIdArray } });
    const totalLate = await Attendance.countDocuments({ date: todayDate, status: 'Late', user: { $in: employeeIdArray } });
    const totalAbsent = totalEmployees - (totalPresent + totalLate);
    const totalToday = totalEmployees;
    
    const attendanceOverview = {
        total: totalToday,
        stats: [
            { status: 'Present', percentage: totalToday > 0 ? (totalPresent/totalToday) * 100 : 0, color: 'text-green-500' },
            { status: 'Late', percentage: totalToday > 0 ? (totalLate/totalToday) * 100 : 0, color: 'text-yellow-500' },
            { status: 'Absent', percentage: totalToday > 0 ? (totalAbsent/totalToday) * 100 : 0, color: 'text-red-500' },
        ].filter(s => s.percentage > 0)
    };
    
    res.json({
        success: true,
        data: {
            totalEmployees,
            attendanceTodayCount,
            onLeaveCount,
            pendingRequestsCount,
            departments: departmentsWithPercentage,
            employeeStatus,
            mostPunctual,
            clockInOuts,
            attendanceOverview
        }
    });
});


// @desc    Get stats for super admin dashboard
// @route   GET /api/dashboard/super-admin
// @access  Private/SuperAdmin
const getSuperAdminDashboardStats = asyncHandler(async (req, res) => {
    const totalAdmins = await User.countDocuments({ role: 'ADMIN' });
    const totalEmployees = await User.countDocuments({ role: 'EMPLOYEE' });
    
    const todayDate = new Date().toISOString().split('T')[0];
    const attendanceTodayCount = await Attendance.countDocuments({ date: todayDate, status: { $ne: 'Absent' } });
    
    const pendingRequestsCount = await Leave.countDocuments({ status: 'Pending' });

    // Activity feed from all notifications
    const activities = await Notification.find({}).sort({ createdAt: -1 }).limit(7);

    res.json({
        success: true,
        data: {
            totalAdmins,
            totalEmployees,
            attendanceTodayCount,
            pendingRequestsCount,
            activities,
        }
    });
});

export { getAdminDashboardStats, getSuperAdminDashboardStats };
