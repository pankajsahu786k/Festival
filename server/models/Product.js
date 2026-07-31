const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    shopSlug: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, default: 'General' },
    description: { type: String, default: '' },
    images: [{ type: String }],
    stockQuantity: { type: Number, default: 1 }, // 🚀 NAYA: Inventory Track Karne Ke Liye
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', productSchema);