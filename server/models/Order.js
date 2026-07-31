const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    shopSlug: { type: String, required: true },
    customerName: { type: String, required: true },
    items: [
        {
            productId: { type: String, required: true },
            name: { type: String, required: true },
            price: { type: Number, required: true },
            quantity: { type: Number, required: true }
        }
    ],
    totalAmount: { type: Number, required: true },
    status: { type: String, default: 'Pending' }, // Status: Pending, Completed, Cancelled
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);