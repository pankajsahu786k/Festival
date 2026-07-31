require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); 
const bcrypt = require('bcryptjs');
const Vendor = require('./models/Vendor');
const jwt = require('jsonwebtoken'); 
const Product = require('./models/Product');

const app = express();

// 🚀 Cloud images ke liye limit badhayi hui hai
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Static files serve karne ke liye
app.use(express.static(path.join(__dirname, '../')));

// Live Database Connection
const MONGO_URI = process.env.MONGO_URI; 

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Live MongoDB Atlas Connected Successfully!'))
    .catch((err) => console.log('❌ Database Connection Error: ', err));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../Index.html'));
});

app.get('/api/test', (req, res) => {
    res.json({ message: "SmartShop Live Backend is running perfectly!" });
});

// ==========================================
// 1. VENDOR REGISTRATION & LOGIN APIS
// ==========================================
app.post('/api/vendor/register', async (req, res) => {
    try {
        const { shopName, ownerName, mobileNumber, password } = req.body;

        let existingVendor = await Vendor.findOne({ mobileNumber });
        if (existingVendor) {
            return res.status(400).json({ message: "Yeh mobile number pehle se register hai. Kripya login karein." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const shopSlug = shopName.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

        const newVendor = new Vendor({
            shopName, ownerName, mobileNumber, password: hashedPassword, shopSlug
        });

        await newVendor.save();
        res.status(201).json({ message: "Badhai ho! Aapki dukan successfully register ho gayi.", shopSlug: shopSlug });

    } catch (error) {
        console.error("Registration Error: ", error);
        res.status(500).json({ message: "Server me koi dikkat hai, thodi der baad try karein." });
    }
});

app.post('/api/vendor/login', async (req, res) => {
    try {
        const { mobileNumber, password } = req.body;
        const user = await Vendor.findOne({ mobileNumber });
        
        if (!user) return res.status(400).json({ message: "Yeh number register nahi hai. Pehle account banayein." });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Password galat hai. Kripya dobara try karein." });

        const token = jwt.sign({ id: user._id, role: user.role }, 'smartshop_secret_key', { expiresIn: '7d' });

        res.json({
            message: "Login Successful!",
            token: token,
            role: user.role, 
            shopSlug: user.shopSlug,
            isSetupCompleted: user.isSetupCompleted || false
        });

    } catch (error) {
        console.error("Login Error: ", error);
        res.status(500).json({ message: "Server error, kripya baad me try karein." });
    }
});

app.post('/api/vendor/setup-shop', async (req, res) => {
    try {
        const { shopSlug, category, address, upiId, description } = req.body;
        const updatedVendor = await Vendor.findOneAndUpdate(
            { shopSlug: shopSlug },
            { category, address, upiId, description, isSetupCompleted: true },
            { new: true } 
        );

        if (!updatedVendor) return res.status(404).json({ message: "Vendor nahi mila. Kripya wapas login karein." });
        res.json({ message: "Shop Profile Successfully Setup!", vendor: updatedVendor });

    } catch (error) {
        console.error("Setup Error: ", error);
        res.status(500).json({ message: "Server error, details save nahi ho payi." });
    }
});

app.get('/api/shop/:slug', async (req, res) => {
    try {
        const shop = await Vendor.findOne({ shopSlug: req.params.slug });
        if (!shop) return res.status(404).json({ message: "Dukan nahi mili" });
        res.json({ shopName: shop.shopName, mobileNumber: shop.mobileNumber, category: shop.category });
    } catch (error) {
        console.error("Shop Fetch Error: ", error);
        res.status(500).json({ message: "Server error" });
    }
});

// ==========================================
// 2. PRODUCT APIS
// ==========================================
app.post('/api/products/add', async (req, res) => {
    try {
        const { shopSlug, name, price, category, description, images } = req.body;
        
        if (!images || images.length < 1 || images.length > 5) {
            return res.status(400).json({ message: "Kripya 1 se 5 photos upload karein." });
        }

        const newProduct = new Product({
            shopSlug, name, price, category, description, images
        });

        await newProduct.save();
        res.status(201).json({ message: "Item successfully add ho gaya!", product: newProduct });
    } catch (error) {
        console.error("Add Product Error:", error);
        res.status(500).json({ message: "Server error, item add nahi ho paya." });
    }
});

app.get('/api/products/:shopSlug', async (req, res) => {
    try {
        const products = await Product.find({ shopSlug: req.params.shopSlug }).sort({ createdAt: -1 });
        res.json(products);
    } catch (error) {
        console.error("Fetch Products Error:", error);
        res.status(500).json({ message: "Products fetch nahi ho paaye." });
    }
});

app.put('/api/products/edit/:id', async (req, res) => {
    try {
        const { name, price, category, description, images } = req.body;
        const updateData = { name, price, category, description };
        
        if (images && images.length >= 1 && images.length <= 5) {
            updateData.images = images;
        }

        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json({ message: "Product successfully update ho gaya!", product: updatedProduct });
    } catch (error) {
        console.error("Edit Error:", error);
        res.status(500).json({ message: "Update karne me error aaya." });
    }
});

app.delete('/api/products/delete/:id', async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: "Item successfully delete ho gaya!" });
    } catch (error) {
        res.status(500).json({ message: "Delete karne me error aaya." });
    }
});

// ==========================================
// 👑 3. SUPER ADMIN APIS (NAYE FEATURES)
// ==========================================

// A. Admin Login API (Hardcoded Secret Login)
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    // Aap chaho toh inhe baad mein badal sakte ho
    if (username === 'admin' && password === 'superadmin123') {
        const token = jwt.sign({ role: 'admin' }, 'smartshop_secret_key', { expiresIn: '1d' });
        res.json({ message: "Welcome Boss! Login Successful", token });
    } else {
        res.status(400).json({ message: "Galat Username ya Password!" });
    }
});

// B. Get All Vendors (Poore Bhopal ke dukandaar/brokers)
app.get('/api/admin/vendors', async (req, res) => {
    try {
        const vendors = await Vendor.find().sort({ createdAt: -1 });
        res.json(vendors);
    } catch (error) {
        res.status(500).json({ message: "Vendors fetch karne me error aaya." });
    }
});

// C. Get All Products (System ki saari properties/items)
app.get('/api/admin/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "Products fetch karne me error aaya." });
    }
});

// D. Delete Vendor & Unke saare Products
app.delete('/api/admin/vendor/:id', async (req, res) => {
    try {
        const vendor = await Vendor.findByIdAndDelete(req.params.id);
        if (vendor) {
            // Agar dukandaar delete kiya, toh uske saare items bhi delete ho jayenge
            await Product.deleteMany({ shopSlug: vendor.shopSlug });
        }
        res.json({ message: "Vendor aur uske items safalta purvak delete ho gaye!" });
    } catch (error) {
        res.status(500).json({ message: "Vendor delete karne me error." });
    }
});

// ==========================================
// SERVER START
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});