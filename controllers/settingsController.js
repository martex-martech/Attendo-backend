
import asyncHandler from 'express-async-handler';
import Settings from '../models/settingsModel.js';

// @desc    Get application settings
// @route   GET /api/settings
// @access  Private/Admin
const getSettings = asyncHandler(async (req, res) => {
    // There should only be one settings document
    const settings = await Settings.findOne();
    if (settings) {
        res.json({ success: true, data: settings });
    } else {
        // If no settings exist, create a default one
        const defaultSettings = await Settings.create({});
        res.json({ success: true, data: defaultSettings });
    }
});

// @desc    Update application settings
// @route   PUT /api/settings
// @access  Private/Admin
const updateSettings = asyncHandler(async (req, res) => {
    const { companyName, companyLogo } = req.body;

    let settings = await Settings.findOne();

    if (settings) {
        settings.companyName = companyName || settings.companyName;
        settings.companyLogo = companyLogo || settings.companyLogo;
        const updatedSettings = await settings.save();
        res.json({ success: true, data: updatedSettings });
    } else {
        const newSettings = await Settings.create({ companyName, companyLogo });
        res.status(201).json({ success: true, data: newSettings });
    }
});

export {
    getSettings,
    updateSettings
};
