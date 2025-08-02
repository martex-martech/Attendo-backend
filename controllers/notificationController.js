
import asyncHandler from 'express-async-handler';
import Notification from '../models/notificationModel.js';

// @desc    Get notifications for the logged-in user
// @route   GET /api/notifications
// @access  Private
const getNotifications = asyncHandler(async (req, res) => {
    let notifications;

    if (req.user.role === 'SUPER_ADMIN') {
        // Super admin sees only notifications sent to them (not those sent to employees)
        notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
    } else {
        // Admin and Employees see notifications assigned to them
        notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
    }

    res.json({ success: true, data: notifications });
});


// @desc    Mark a notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = asyncHandler(async (req, res) => {
    const notification = await Notification.findById(req.params.id);

    // Only the user the notification is assigned to can mark it as read.
    if (notification && notification.user.toString() === req.user._id.toString()) {
        notification.read = true;
        await notification.save();
        res.json({ success: true, message: 'Notification marked as read' });
    } else {
        res.status(404);
        throw new Error('Notification not found or not authorized');
    }
});

// @desc    Mark all notifications as read for the current user
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = asyncHandler(async (req, res) => {
    await Notification.updateMany({ user: req.user._id, read: false }, { $set: { read: true } });
    res.json({ success: true, message: 'All notifications marked as read' });
});


export {
    getNotifications,
    markAsRead,
    markAllAsRead,
};
