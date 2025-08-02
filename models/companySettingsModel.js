
import mongoose from 'mongoose';

// This schema is designed to hold a single document for global company-wide settings.
const companySettingsSchema = mongoose.Schema({
    leavePolicies: {
        annual: { type: Number, default: 14 },
        medical: { type: Number, default: 6 },
        other: { type: Number, default: 5 },
    },
    workingHours: {
        clockIn: { type: String, default: '09:30' }, // HH:mm format
        lateGraceMinutes: { type: Number, default: 15 },
    },
    dateOverrides: [{
        _id: false,
        date: { type: String, required: true }, // YYYY-MM-DD
        clockIn: { type: String, required: true }, // HH:mm
    }],
    holidays: [{
        _id: false,
        name: { type: String, required: true },
        date: { type: String, required: true }, // YYYY-MM-DD
    }]
}, {
    timestamps: true,
    collection: 'companysettings' // Explicitly set collection name
});

const CompanySettings = mongoose.model('CompanySettings', companySettingsSchema);

export default CompanySettings;
