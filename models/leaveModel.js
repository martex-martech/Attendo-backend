import mongoose from 'mongoose';

const leaveSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    leaveType: {
        type: String,
        required: true,
        enum: ['Annual Leave', 'Medical Leave', 'Other']
    },
    from: { type: Date, required: true },
    to: { type: Date, required: true },
    days: { type: Number, required: true },
    reason: { type: String, required: true },
    status: {
        type: String,
        required: true,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    }
}, {
    timestamps: true
});

const Leave = mongoose.model('Leave', leaveSchema);

export default Leave;
