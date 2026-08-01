const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
    shopName: { type: String, required: true },
    ownerName: { type: String, required: true },
    mobileNumber: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    shopSlug: { type: String, required: true, unique: true },
    role: { type: String, default: 'vendor' },
    category: { type: String, default: '' },
    address: { type: String, default: '' },
    upiId: { type: String, default: '' },
    description: { type: String, default: '' },
    isSetupCompleted: { type: Boolean, default: false },
    isSuspended: { type: Boolean, default: false }, // 🚀 NAYA: Account Suspend karne ka control
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Vendor', vendorSchema);