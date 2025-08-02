
import mongoose from 'mongoose';

// This schema is designed to hold a single document for global settings.
const settingsSchema = mongoose.Schema({
    companyName: {
        type: String,
        required: true,
        default: 'Martex Inc.'
    },
    companyLogo: {
        type: String
    },
    // Add other global settings here
}, {
    timestamps: true
});

const Settings = mongoose.model('Settings', settingsSchema);

export default Settings;
