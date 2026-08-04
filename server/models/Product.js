const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    shopSlug: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    description: { type: String },
    images: { type: Array, default: [] },
    stockQuantity: { type: Number, default: 1 },
    
    // 🚀 NAYA ANALYTICS DATA YAHAN ADD KIYA HAI
    views: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);