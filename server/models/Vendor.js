const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
    shopName: { type: String, required: true },
    ownerName: { type: String, required: true },
    mobileNumber: { type: String, required: true },
    password: { type: String, required: true },
    shopSlug: { type: String, required: true },
    role: { type: String, default: 'vendor' },
    category: { type: String, default: '' },
    address: { type: String, default: '' },
    description: { type: String, default: '' },
    isSetupCompleted: { type: Boolean, default: false },
    isSuspended: { type: Boolean, default: false },
    
    // 📍 NAYA GPS LOCATION SYSTEM
    location: {
        lat: { type: Number },
        lng: { type: Number }
    },

    shopViews: { type: Number, default: 0 },
    totalTimeSpent: { type: Number, default: 0 },
    totalSessions: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Vendor', vendorSchema);