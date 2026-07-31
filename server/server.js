require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); 

const Vendor = require('./models/Vendor');
const Product = require('./models/Product');
const Order = require('./models/Order'); // 🚀 NAYA ORDER MODEL

const app = express();

app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, '../')));

const MONGO_URI = process.env.MONGO_URI; 

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Live MongoDB Atlas Connected Successfully!'))
    .catch((err) => console.log('❌ Database Connection Error: ', err));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../Index.html'));
});

// ==========================================
// 1. VENDOR REGISTRATION & LOGIN APIS
// ==========================================
app.post('/api/vendor/register', async (req, res) => {
    try {
        const { shopName, ownerName, mobileNumber, password } = req.body;
        let existingVendor = await Vendor.findOne({ mobileNumber });
        if (existingVendor) return res.status(400).json({ message: "Yeh mobile number pehle se register hai." });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const shopSlug = shopName.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

        const newVendor = new Vendor({ shopName, ownerName, mobileNumber, password: hashedPassword, shopSlug });
        await newVendor.save();
        res.status(201).json({ message: "Dukan register ho gayi.", shopSlug: shopSlug });
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});

app.post('/api/vendor/login', async (req, res) => {
    try {
        const { mobileNumber, password } = req.body;
        const user = await Vendor.findOne({ mobileNumber });
        if (!user) return res.status(400).json({ message: "Number register nahi hai." });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Password galat hai." });

        const token = jwt.sign({ id: user._id, role: user.role }, 'smartshop_secret_key', { expiresIn: '7d' });
        res.json({ message: "Login Successful!", token, role: user.role, shopSlug: user.shopSlug, isSetupCompleted: user.isSetupCompleted || false });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

app.post('/api/vendor/setup-shop', async (req, res) => {
    try {
        const { shopSlug, category, address, upiId, description } = req.body;
        const updatedVendor = await Vendor.findOneAndUpdate(
            { shopSlug: shopSlug }, { category, address, upiId, description, isSetupCompleted: true }, { new: true } 
        );
        res.json({ message: "Setup Successful!", vendor: updatedVendor });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

app.get('/api/shop/:slug', async (req, res) => {
    try {
        const shop = await Vendor.findOne({ shopSlug: req.params.slug });
        if (!shop) return res.status(404).json({ message: "Dukan nahi mili" });
        res.json({ shopName: shop.shopName, mobileNumber: shop.mobileNumber, category: shop.category });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// ==========================================
// 2. PRODUCT APIS
// ==========================================
app.post('/api/products/add', async (req, res) => {
    try {
        const { shopSlug, name, price, category, description, images, stockQuantity } = req.body;
        if (!images || images.length < 1) return res.status(400).json({ message: "Photos required." });

        const newProduct = new Product({ shopSlug, name, price, category, description, images, stockQuantity: stockQuantity || 1 });
        await newProduct.save();
        res.status(201).json({ message: "Item add ho gaya!" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

app.get('/api/products/:shopSlug', async (req, res) => {
    try {
        const products = await Product.find({ shopSlug: req.params.shopSlug }).sort({ createdAt: -1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "Error fetching products" });
    }
});

app.put('/api/products/edit/:id', async (req, res) => {
    try {
        const { name, price, category, description, images, stockQuantity } = req.body;
        const updateData = { name, price, category, description, stockQuantity };
        if (images && images.length >= 1) updateData.images = images;
        await Product.findByIdAndUpdate(req.params.id, updateData);
        res.json({ message: "Update successful!" });
    } catch (error) {
        res.status(500).json({ message: "Update error" });
    }
});

app.delete('/api/products/delete/:id', async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: "Deleted!" });
    } catch (error) {
        res.status(500).json({ message: "Delete error" });
    }
});

// ==========================================
// 🚀 3. ORDER MANAGEMENT APIS
// ==========================================

// Create New Order (Customer karta hai)
app.post('/api/orders/new', async (req, res) => {
    try {
        const newOrder = new Order(req.body);
        await newOrder.save();
        res.status(201).json({ message: "Order saved in database!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Order save error" });
    }
});

// Get Shop Orders (Vendor dekhta hai)
app.get('/api/orders/:shopSlug', async (req, res) => {
    try {
        const orders = await Order.find({ shopSlug: req.params.shopSlug }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: "Error fetching orders" });
    }
});

// Complete Order & Deduct Stock (Agent Confirm karta hai)
app.put('/api/orders/complete/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order || order.status !== 'Pending') return res.status(400).json({ message: "Order already processed." });

        // 🚀 Stock automatically reduce ho raha hai
        for (let item of order.items) {
            await Product.findByIdAndUpdate(item.productId, {
                $inc: { stockQuantity: -item.quantity } // Decrement operator
            });
        }

        order.status = 'Completed';
        await order.save();
        res.json({ message: "Order Completed! Stock automatically updated." });
    } catch (error) {
        res.status(500).json({ message: "Error completing order" });
    }
});

// Cancel Order
app.put('/api/orders/cancel/:id', async (req, res) => {
    try {
        await Order.findByIdAndUpdate(req.params.id, { status: 'Cancelled' });
        res.json({ message: "Order Cancelled." });
    } catch (error) {
        res.status(500).json({ message: "Error cancelling order" });
    }
});


// ==========================================
// 4. SUPER ADMIN APIS
// ==========================================
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'superadmin123') {
        const token = jwt.sign({ role: 'admin' }, 'smartshop_secret_key', { expiresIn: '1d' });
        res.json({ message: "Welcome Boss! Login Successful", token });
    } else res.status(400).json({ message: "Galat Username ya Password!" });
});

app.get('/api/admin/vendors', async (req, res) => {
    try { res.json(await Vendor.find().sort({ createdAt: -1 })); } catch (err) { res.status(500).json({message:"Error"}); }
});

app.get('/api/admin/products', async (req, res) => {
    try { res.json(await Product.find().sort({ createdAt: -1 })); } catch (err) { res.status(500).json({message:"Error"}); }
});

app.delete('/api/admin/vendor/:id', async (req, res) => {
    try {
        const vendor = await Vendor.findByIdAndDelete(req.params.id);
        if (vendor) await Product.deleteMany({ shopSlug: vendor.shopSlug });
        res.json({ message: "Deleted!" });
    } catch (err) { res.status(500).json({message:"Error"}); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server is running on port ${PORT}`));