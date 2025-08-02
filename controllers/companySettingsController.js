
import asyncHandler from 'express-async-handler';
import CompanySettings from '../models/companySettingsModel.js';

// @desc    Get company settings
// @route   GET /api/settings/company
// @access  Private/SuperAdmin
const getCompanySettings = asyncHandler(async (req, res) => {
    // There should only be one settings document
    let settings = await CompanySettings.findOne();
    if (!settings) {
        settings = await CompanySettings.create({});
    }
    res.json({ success: true, data: settings });
});

// @desc    Update company settings
// @route   PUT /api/settings/company
// @access  Private/SuperAdmin
const updateCompanySettings = asyncHandler(async (req, res) => {
    let settings = await CompanySettings.findOne();
    if (!settings) {
        settings = new CompanySettings();
    }
    
    // Update fields from request body, providing defaults from existing settings if not provided
    settings.leavePolicies = req.body.leavePolicies || settings.leavePolicies;
    settings.workingHours = req.body.workingHours || settings.workingHours;
    settings.dateOverrides = req.body.dateOverrides; // Array should be fully replaced
    settings.holidays = req.body.holidays; // Array should be fully replaced

    const updatedSettings = await settings.save();
    res.json({ success: true, data: updatedSettings });
});

export {
    getCompanySettings,
    updateCompanySettings,
};
