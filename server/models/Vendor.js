const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
    shopName: { type: String, required: true },
    ownerName: { type: String, required: true },
    mobileNumber: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    shopSlug: { type: String, required: true },
    role: { type: String, default: 'vendor' },
    
    // 🚀 Extra Details ke liye
    category: { type: String, default: '' },      // e.g. Festival, Grocery, Real Estate, Clothes
    address: { type: String, default: '' },       // Full Address / Area
    upiId: { type: String, default: '' },         // Payment lene ke liye UPI ID
    description: { type: String, default: '' },   // Shop Description
    isSetupCompleted: { type: Boolean, default: false }, // Setup poora hua ya nahi

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Vendor', vendorSchema);