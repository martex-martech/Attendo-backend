import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';

// @desc    Get users based on role and requester's permissions
// @route   GET /api/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
    let query = {};
    const requesterRole = req.user.role;
    const requestedRole = req.query.role; // e.g., 'ADMIN' or 'ALL_EMPLOYEES'

    if (requesterRole === 'SUPER_ADMIN') {
        if (requestedRole === 'ADMIN') {
            query = { role: 'ADMIN' };
        } else { // Default for Super Admin is to get both Admins and Employees
            query = { role: { $in: ['ADMIN', 'EMPLOYEE'] } };
        }
    } else if (requesterRole === 'ADMIN') {
        // Admins can only get employees
        query = { role: 'EMPLOYEE' };
    }

    const users = await User.find(query).select('-password');
    res.json({ success: true, data: users });
});

// @desc    Create a user
// @route   POST /api/users
// @access  Private/Admin
const createUser = asyncHandler(async (req, res) => {
    const { name, email, role, department, phone, employeeId } = req.body;
    
    // A default password for admin-created users
    const password = 'password123';

    // Prevent regular admins from creating other admins
    if (req.user.role === 'ADMIN' && role === 'ADMIN') {
        res.status(403);
        throw new Error('Not authorized to create Admin users.');
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    const user = await User.create({
        name,
        email,
        password,
        role,
        department,
        phone,
        employeeId,
        avatar: `https://i.pravatar.cc/150?u=${email}`
    });

    if (user) {
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});

// @desc    Update a user
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (user) {
        // Prevent modification of SUPER_ADMIN accounts via this route
        if (user.role === 'SUPER_ADMIN') {
            res.status(403);
            throw new Error('Cannot modify a Super Admin account via this route.');
        }

        // Prevent an ADMIN from modifying another ADMIN
        if (req.user.role === 'ADMIN' && user.role === 'ADMIN') {
            res.status(403);
            throw new Error('Admins are not authorized to modify other admin accounts.');
        }

        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        user.role = req.body.role || user.role;
        user.department = req.body.department || user.department;
        user.status = req.body.status || user.status;
        user.phone = req.body.phone || user.phone;
        user.employeeId = req.body.employeeId || user.employeeId;

        const updatedUser = await user.save();
        res.json({ success: true, data: updatedUser });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

// @desc    Delete a user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
         // Prevent deletion of SUPER_ADMIN accounts
        if (user.role === 'SUPER_ADMIN') {
            res.status(403);
            throw new Error('Cannot delete a Super Admin account.');
        }
        await user.deleteOne();
        res.json({ message: 'User removed' });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

// @desc    Bulk create users
// @route   POST /api/users/bulk
// @access  Private/Admin
const bulkCreateUsers = asyncHandler(async (req, res) => {
    const { employees } = req.body;
    if (!employees || !Array.isArray(employees)) {
        res.status(400);
        throw new Error('Invalid employee data provided');
    }

    const createdUsers = [];
    const errors = [];

    // Use a loop with User.create to ensure the 'pre-save' hook for password hashing is triggered.
    // insertMany would bypass this, leaving passwords unhashed.
    for (const emp of employees) {
        try {
            const userExists = await User.findOne({ email: emp.email });
            if (userExists) {
                errors.push({ email: emp.email, reason: 'User already exists' });
                continue;
            }
            const newUser = {
                ...emp,
                password: 'password123', // Default password
                avatar: `https://i.pravatar.cc/150?u=${emp.email}`
            };
            const createdUser = await User.create(newUser);
            createdUsers.push(createdUser);
        } catch (error) {
            errors.push({ email: emp.email, reason: error.message });
        }
    }

    if (errors.length > 0) {
        res.status(207).json({
            message: `Bulk operation completed with ${errors.length} errors.`,
            createdCount: createdUsers.length,
            failedCount: errors.length,
            errors
        });
    } else {
        res.status(201).json({
            message: `${createdUsers.length} users created successfully.`,
            data: createdUsers
        });
    }
});

// @desc    Update user profile (by the user themselves)
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        user.phone = req.body.phone || user.phone;
        
        const updatedUser = await user.save();
        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

// @desc    Change user password
// @route   PUT /api/users/profile/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (user && (await user.matchPassword(oldPassword))) {
        user.password = newPassword;
        await user.save();
        res.json({ message: 'Password updated successfully' });
    } else {
        res.status(401);
        throw new Error('Invalid old password');
    }
});

export {
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    bulkCreateUsers,
    updateUserProfile,
    changePassword,
};
