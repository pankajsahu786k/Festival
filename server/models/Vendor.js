const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
    shopName: { 
        type: String, 
        required: true 
    },
    ownerName: { 
        type: String, 
        required: true 
    },
    mobileNumber: { 
        type: Number, 
        required: true, 
        unique: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    role: { 
        type: String, 
        default: 'vendor' // Isse unified login me aasani hogi (admin ya vendor pehchanne me)
    },
    shopSlug: { 
        type: String, 
        unique: true 
    }, // Dukan ka unique URL, ex: sharma-rakhi-store
    status: { 
        type: String, 
        default: 'pending' // Admin jab approve karega tab 'active' hoga
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('Vendor', vendorSchema);