import mongoose from 'mongoose';

const breakSchema = mongoose.Schema({
    start: { type: Date, required: true },
    end: { type: Date },
    duration: { type: Number, default: 0 } // in milliseconds
});

const attendanceSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    date: { type: String, required: true }, // YYYY-MM-DD
    clockInTime: { type: Date },
    clockOutTime: { type: Date },
    status: {
        type: String,
        enum: ['Present', 'Late', 'Absent'],
        default: 'Absent'
    },
    workDuration: { type: Number, default: 0 }, // in milliseconds
    overtime: { type: Number, default: 0 }, // in milliseconds
    breaks: [breakSchema],
    totalBreakDuration: { type: Number, default: 0 } // in milliseconds
}, {
    timestamps: true
});

// To ensure one attendance record per user per day
attendanceSchema.index({ user: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;
