
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Attendance from './attendanceModel.js';
import Leave from './leaveModel.js';

const userSchema = mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true, enum: ['ADMIN', 'EMPLOYEE', 'SUPER_ADMIN'], default: 'EMPLOYEE' },
    avatar: { type: String, required: true, default: 'https://i.pravatar.cc/150' },
    employeeId: { type: String, required: true, unique: true },
    department: { type: String, required: true },
    joinedOn: { type: Date, default: Date.now },
    status: { type: String, enum: ['Active', 'Inactive', 'On Leave'], default: 'Active' },
    phone: { type: String },
    reportTo: { type: String, default: 'Admin' },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
}, {
    timestamps: true,
    collection: 'users' // Explicitly set collection name
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Encrypt password using bcrypt before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Cascade delete middleware
userSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
    console.log(`Deleting associated data for user: ${this._id}`);
    await Attendance.deleteMany({ user: this._id });
    await Leave.deleteMany({ user: this._id });
    // Add other related data deletions here (e.g., Payslips)
    next();
});


const User = mongoose.model('User', userSchema);

export default User;