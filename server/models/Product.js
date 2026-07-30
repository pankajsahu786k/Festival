const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    shopSlug: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, default: 'General' },
    description: { type: String, default: '' },
    images: [{ type: String }], // 🚀 Multiple photos array (3 to 5 images Base64/URLs)
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', productSchema);