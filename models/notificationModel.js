
import mongoose from 'mongoose';

const notificationSchema = mongoose.Schema({
    user: { // The user to be notified (e.g., the ADMIN)
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    text: { type: String, required: true },
    type: { 
        type: String, 
        required: true,
        enum: ['leave', 'attendance', 'system']
    },
    read: { type: Boolean, required: true, default: false },
    link: { type: String } // Optional link to navigate to, e.g., '/leave-requests'
}, {
    timestamps: true
});

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
