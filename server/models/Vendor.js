const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
    shopName: { type: String, required: true },
    ownerName: { type: String, required: true },
    mobileNumber: { type: String, required: true },
    password: { type: String, required: true },
    shopSlug: { type: String, required: true },
    role: { type: String, default: 'vendor' },
    
    // 🌟 NAYA FIELD: Store Type (Retail / Food / Service)
    storeType: { type: String, default: '' },
    
    category: { type: String, default: '' },
    address: { type: String, default: '' },
    description: { type: String, default: '' },
    isSetupCompleted: { type: Boolean, default: false },
    isSuspended: { type: Boolean, default: false },
    
    // 📸 NAYA FIELD: Food Dashboard Gallery (Photos save karne ke liye)
    galleryPhotos: [{ type: String }],
    
    // 📍 GPS LOCATION SYSTEM
    location: {
        lat: { type: Number },
        lng: { type: Number }
    },

    shopViews: { type: Number, default: 0 },
    totalTimeSpent: { type: Number, default: 0 },
    totalSessions: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Vendor', vendorSchema);