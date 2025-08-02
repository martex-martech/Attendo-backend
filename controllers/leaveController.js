
import asyncHandler from 'express-async-handler';
import Leave from '../models/leaveModel.js';
import User from '../models/userModel.js';
import Notification from '../models/notificationModel.js';
import CompanySettings from '../models/companySettingsModel.js';


// @desc    Get all leave requests
// @route   GET /api/leaves
// @access  Private/Admin
const getLeaveRequests = asyncHandler(async (req, res) => {
    const leaves = await Leave.find({}).populate('user', 'name role avatar employeeId email department');
    // Filter out requests where the user has been deleted
    const validLeaves = leaves.filter(leave => leave.user);
    res.json({ success: true, data: validLeaves });
});

// @desc    Create a leave request (by employee)
// @route   POST /api/leaves
// @access  Private
const createLeaveRequest = asyncHandler(async (req, res) => {
    const { leaveType, from, to, days, reason } = req.body;
    const leave = new Leave({
        user: req.user._id,
        leaveType,
        from,
        to,
        days,
        reason
    });
    const createdLeave = await leave.save();

    // Create notifications for admin and super admin
    const notificationsToSend = [];
    const admin = await User.findOne({ role: 'ADMIN' });
    const superAdmin = await User.findOne({ role: 'SUPER_ADMIN' });

    if (admin) {
        notificationsToSend.push({
            user: admin._id,
            text: `New leave request from ${req.user.name}.`,
            type: 'leave',
            link: '/Leave Requests'
        });
    }

    if (superAdmin) {
        notificationsToSend.push({
            user: superAdmin._id,
            text: `New leave request from ${req.user.name}.`,
            type: 'leave',
            link: '/Leave Requests'
        });
    }

    if (notificationsToSend.length > 0) {
        await Notification.insertMany(notificationsToSend);
    }


    res.status(201).json(createdLeave);
});

// @desc    Create a leave request (by admin for an employee)
// @route   POST /api/leaves/admin
// @access  Private/Admin
const adminCreateLeaveRequest = asyncHandler(async (req, res) => {
    const { user, leaveType, from, to, days, reason } = req.body;
    const leave = new Leave({
        user, // user is the employee's ID
        leaveType,
        from,
        to,
        days,
        reason,
        status: 'Approved' // Admin-added leaves are auto-approved
    });
    const createdLeave = await leave.save();
    res.status(201).json(createdLeave);
});

// @desc    Update leave request status
// @route   PUT /api/leaves/:id/status
// @access  Private/Admin
const updateLeaveStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const leave = await Leave.findById(req.params.id);

    if (leave) {
        leave.status = status;
        const updatedLeave = await leave.save();
        
        const notificationsToSend = [];

        // Notify the employee
        notificationsToSend.push({
            user: leave.user,
            text: `Your leave request for ${leave.days} day(s) from ${new Date(leave.from).toLocaleDateString()} has been ${status.toLowerCase()}.`,
            type: 'leave',
            link: '/Leave Request' // Correct link for employee
        });

        // Notify the Super Admin
        const superAdmin = await User.findOne({ role: 'SUPER_ADMIN' });
        if (superAdmin) {
            const employee = await User.findById(leave.user);
            notificationsToSend.push({
                user: superAdmin._id,
                text: `Leave request for ${employee ? employee.name : 'an employee'} was ${status.toLowerCase()} by an admin.`,
                type: 'leave',
                link: '/Leave Requests'
            });
        }
        
        await Notification.insertMany(notificationsToSend);


        res.json(updatedLeave);
    } else {
        res.status(404);
        throw new Error('Leave request not found');
    }
});

// @desc    Get leave requests for the logged-in user
// @route   GET /api/leaves/my-requests
// @access  Private
const getMyLeaveRequests = asyncHandler(async (req, res) => {
    const leaves = await Leave.find({ user: req.user._id });
    res.json({ success: true, data: leaves });
});

// @desc    Get leave stats for the logged-in user
// @route   GET /api/leaves/stats
// @access  Private
const getLeaveStats = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    
    // Fetch dynamic leave policies
    let settings = await CompanySettings.findOne();
    if (!settings) settings = {}; // Use defaults if no settings doc
    const leavePolicies = settings.leavePolicies || { annual: 14, medical: 6, other: 5 };

    const totalAllowed = leavePolicies.annual + leavePolicies.medical + leavePolicies.other;
    
    const leaves = await Leave.find({ user: userId });
    
    const taken = leaves
        .filter(l => l.status === 'Approved')
        .reduce((acc, l) => acc + l.days, 0);
        
    const pending = leaves
        .filter(l => l.status === 'Pending')
        .reduce((acc, l) => acc + l.days, 0);

    const breakdown = [
        { type: 'Annual Leave', total: leavePolicies.annual, taken: leaves.filter(l => l.leaveType === 'Annual Leave' && l.status === 'Approved').reduce((acc, l) => acc + l.days, 0), color: 'bg-blue-500' },
        { type: 'Medical Leave', total: leavePolicies.medical, taken: leaves.filter(l => l.leaveType === 'Medical Leave' && l.status === 'Approved').reduce((acc, l) => acc + l.days, 0), color: 'bg-green-500' },
        { type: 'Other', total: leavePolicies.other, taken: leaves.filter(l => l.leaveType === 'Other' && l.status === 'Approved').reduce((acc, l) => acc + l.days, 0), color: 'bg-yellow-500' },
    ];
    
    res.json({
        success: true,
        data: {
            totalAllowed,
            taken,
            pending,
            available: totalAllowed - taken,
            breakdown
        }
    });
});

// @desc    Get leave balance for the logged-in user
// @route   GET /api/leaves/balance
// @access  Private
const getLeaveBalance = asyncHandler(async (req, res) => {
    // Fetch dynamic leave policies
    let settings = await CompanySettings.findOne();
    if (!settings) settings = {}; // Use defaults if no settings doc
    const leavePolicies = settings.leavePolicies || { annual: 14, medical: 6, other: 5 };

    const leaves = await Leave.find({ user: req.user._id, status: 'Approved' });
    const annualUsed = leaves.filter(l => l.leaveType === 'Annual Leave').reduce((sum, l) => sum + l.days, 0);
    const medicalUsed = leaves.filter(l => l.leaveType === 'Medical Leave').reduce((sum, l) => sum + l.days, 0);
    const otherUsed = leaves.filter(l => l.leaveType === 'Other').reduce((sum, l) => sum + l.days, 0);

    const balance = [
        { type: 'Annual Leave', total: leavePolicies.annual, used: annualUsed, color: 'bg-blue-500' },
        { type: 'Medical Leave', total: leavePolicies.medical, used: medicalUsed, color: 'bg-green-500' },
        { type: 'Other', total: leavePolicies.other, used: otherUsed, color: 'bg-yellow-500' },
    ];
    res.json({ success: true, data: balance });
});

// @desc    Get leave balance for a specific employee (by admin)
// @route   GET /api/leaves/balance/:userId
// @access  Private/Admin
const getEmployeeLeaveBalance = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    let settings = await CompanySettings.findOne();
    if (!settings) settings = {};
    const leavePolicies = settings.leavePolicies || { annual: 14, medical: 6, other: 5 };

    const leaves = await Leave.find({ user: userId, status: 'Approved' });
    const annualUsed = leaves.filter(l => l.leaveType === 'Annual Leave').reduce((sum, l) => sum + l.days, 0);
    const medicalUsed = leaves.filter(l => l.leaveType === 'Medical Leave').reduce((sum, l) => sum + l.days, 0);
    const otherUsed = leaves.filter(l => l.leaveType === 'Other').reduce((sum, l) => sum + l.days, 0);

    const balance = [
        { type: 'Annual Leave', total: leavePolicies.annual, used: annualUsed, color: 'bg-blue-500' },
        { type: 'Medical Leave', total: leavePolicies.medical, used: medicalUsed, color: 'bg-green-500' },
        { type: 'Other', total: leavePolicies.other, used: otherUsed, color: 'bg-yellow-500' },
    ];
    res.json({ success: true, data: balance });
});


export {
    getLeaveRequests,
    createLeaveRequest,
    adminCreateLeaveRequest,
    updateLeaveStatus,
    getMyLeaveRequests,
    getLeaveStats,
    getLeaveBalance,
    getEmployeeLeaveBalance,
};