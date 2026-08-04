require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); 
const bcrypt = require('bcryptjs');
const Vendor = require('./models/Vendor');
const jwt = require('jsonwebtoken'); 
const Product = require('./models/Product');
const Order = require('./models/Order');

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
            shopName, ownerName, mobileNumber, password: hashedPassword, shopSlug, role: 'vendor'
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

        if (user.isSuspended) {
            return res.status(403).json({ message: "🚫 Aapka account Admin dwara Suspend kar diya gaya hai! Kripya support se sampark karein." });
        }

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
        const shop = await Vendor.findOne({ shopSlug: req.params.slug, role: 'vendor' });
        if (!shop) return res.status(404).json({ message: "Dukan nahi mili" });

        if (shop.isSuspended) {
            return res.status(403).json({ message: "Yeh dukan abhi temporary band (Suspended) hai." });
        }

        res.json({ shopName: shop.shopName, mobileNumber: shop.mobileNumber, category: shop.category });
    } catch (error) {
        console.error("Shop Fetch Error: ", error);
        res.status(500).json({ message: "Server error" });
    }
});

// ==========================================
// 🚀 1.5 AGENT MANAGEMENT APIS
// ==========================================

app.post('/api/vendor/add-agent', async (req, res) => {
    try {
        // 🛠️ YEH LINE ERROR KO FIX KAREGI: Database ka purana lock hata degi
        try { await mongoose.connection.collection('vendors').dropIndex('shopSlug_1'); } catch(e) {}

        const { shopSlug, agentName, mobileNumber, password } = req.body;
        let existingUser = await Vendor.findOne({ mobileNumber });
        if (existingUser) return res.status(400).json({ message: "Yeh mobile number pehle se used hai." });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newAgent = new Vendor({
            shopName: "Agent Account", 
            ownerName: agentName, 
            mobileNumber, 
            password: hashedPassword, 
            shopSlug, 
            role: 'agent', 
            isSetupCompleted: true
        });

        await newAgent.save();
        res.status(201).json({ message: "✅ Agent successfully add ho gaya!" });
    } catch (error) {
        console.error("Add Agent Error: ", error);
        res.status(500).json({ message: "Server Error: " + error.message });
    }
});

app.get('/api/vendor/agents/:shopSlug', async (req, res) => {
    try {
        const agents = await Vendor.find({ shopSlug: req.params.shopSlug, role: 'agent' }).sort({ createdAt: -1 });
        res.json(agents);
    } catch (error) {
        res.status(500).json({ message: "Error fetching agents" });
    }
});

app.delete('/api/vendor/agent/:id', async (req, res) => {
    try {
        await Vendor.findByIdAndDelete(req.params.id);
        res.json({ message: "Agent successfully deleted!" });
    } catch (error) {
        res.status(500).json({ message: "Delete karne me error aaya." });
    }
});

// ==========================================
// 2. PRODUCT APIS
// ==========================================
app.post('/api/products/add', async (req, res) => {
    try {
        const { shopSlug, name, price, category, description, images, stockQuantity } = req.body;
        
        if (!images || images.length < 1 || images.length > 5) {
            return res.status(400).json({ message: "Kripya 1 se 5 photos upload karein." });
        }

        const newProduct = new Product({
            shopSlug, name, price, category, description, images, stockQuantity: stockQuantity || 1
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
        const { name, price, category, description, images, stockQuantity } = req.body;
        const updateData = { name, price, category, description, stockQuantity };
        
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
// 3. ORDER MANAGEMENT APIS
// ==========================================
app.post('/api/orders/new', async (req, res) => {
    try {
        const newOrder = new Order(req.body);
        await newOrder.save();
        res.status(201).json({ message: "Order saved in database!" });
    } catch (error) {
        res.status(500).json({ message: "Order save error" });
    }
});

app.get('/api/orders/:shopSlug', async (req, res) => {
    try {
        const orders = await Order.find({ shopSlug: req.params.shopSlug }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: "Error fetching orders" });
    }
});

app.put('/api/orders/complete/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order || order.status !== 'Pending') return res.status(400).json({ message: "Order pehle hi process ho chuka hai." });

        for (let item of order.items) {
            await Product.findByIdAndUpdate(item.productId, { $inc: { stockQuantity: -item.quantity } });
        }

        order.status = 'Completed';
        await order.save();
        res.json({ message: "✅ Order Completed! Stock automatically minus ho gaya." });
    } catch (error) {
        res.status(500).json({ message: "Error completing order" });
    }
});

app.put('/api/orders/cancel/:id', async (req, res) => {
    try {
        await Order.findByIdAndUpdate(req.params.id, { status: 'Cancelled' });
        res.json({ message: "❌ Order Cancelled." });
    } catch (error) {
        res.status(500).json({ message: "Error cancelling order" });
    }
});

// ==========================================
// 👑 4. SUPER ADMIN APIS
// ==========================================
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'superadmin123') {
        const token = jwt.sign({ role: 'admin' }, 'smartshop_secret_key', { expiresIn: '1d' });
        res.json({ message: "Welcome Boss! Login Successful", token });
    } else {
        res.status(400).json({ message: "Galat Username ya Password!" });
    }
});

app.get('/api/admin/vendors', async (req, res) => {
    try {
        const vendors = await Vendor.find({ role: 'vendor' }).sort({ createdAt: -1 });
        res.json(vendors);
    } catch (error) {
        res.status(500).json({ message: "Vendors fetch karne me error aaya." });
    }
});

app.get('/api/admin/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "Products fetch karne me error aaya." });
    }
});

app.put('/api/admin/vendor/toggle-status/:id', async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) return res.status(404).json({ message: "Vendor nahi mila." });
        
        vendor.isSuspended = !vendor.isSuspended; 
        await vendor.save();
        
        const statusMsg = vendor.isSuspended ? "Suspend (Band)" : "Resume (Chalu)";
        res.json({ message: `Success! Dukandaar ka account ab ${statusMsg} ho gaya hai.` });
    } catch (err) { res.status(500).json({message:"Error updating status."}); }
});

app.delete('/api/admin/vendor/:id', async (req, res) => {
    try {
        const vendor = await Vendor.findByIdAndDelete(req.params.id);
        if (vendor) {
            await Product.deleteMany({ shopSlug: vendor.shopSlug });
            await Vendor.deleteMany({ shopSlug: vendor.shopSlug, role: 'agent' });
        }
        res.json({ message: "Vendor aur uske items safalta purvak delete ho gaye!" });
    } catch (error) {
        res.status(500).json({ message: "Vendor delete karne me error." });
    }
});
// ==========================================
// 📈 5. ANALYTICS & TRACKING APIS
// ==========================================

// 1. Customer ka Time Spent Track karna (Jab wo dukan band kare tab chalega)
app.post('/api/analytics/track-time', async (req, res) => {
    try {
        const { shopSlug, timeSpentSeconds } = req.body;
        // Hum Vendor data me total time aur total visitors count karenge
        await Vendor.findOneAndUpdate(
            { shopSlug: shopSlug },
            { 
                $inc: { 
                    totalTimeSpent: timeSpentSeconds, 
                    totalSessions: 1 
                } 
            }
        );
        res.json({ message: "Time tracked" });
    } catch (error) {
        res.status(500).json({ message: "Tracking error" });
    }
});

// 2. Product View Track karna (Jab customer kisi item par click kare)
app.post('/api/analytics/track-product', async (req, res) => {
    try {
        const { productId } = req.body;
        await Product.findByIdAndUpdate(productId, { $inc: { views: 1 } });
        res.json({ message: "Product view tracked" });
    } catch (error) {
        res.status(500).json({ message: "Tracking error" });
    }
});

// 3. Admin ke liye Analytics Data bhejna
app.get('/api/analytics/dashboard/:shopSlug', async (req, res) => {
    try {
        const slug = req.params.shopSlug;
        const vendor = await Vendor.findOne({ shopSlug: slug });
        const products = await Product.find({ shopSlug: slug }).sort({ views: -1 }); // Sabse zyada view wale upar
        const orders = await Order.find({ shopSlug: slug });

        if(!vendor) return res.status(404).json({ message: "Shop not found" });

        // Calculations
        const totalOrders = orders.length;
        const successfulOrders = orders.filter(o => o.status === 'Completed').length;
        const conversionRate = totalOrders > 0 ? Math.round((successfulOrders / totalOrders) * 100) : 0;
        
        const avgTimeSeconds = vendor.totalSessions > 0 ? Math.round(vendor.totalTimeSpent / vendor.totalSessions) : 0;
        const avgTimeFormatted = `${Math.floor(avgTimeSeconds / 60)}m ${avgTimeSeconds % 60}s`;

        res.json({
            views: vendor.shopViews || 0,
            avgTimeSpent: avgTimeFormatted,
            totalOrders,
            successfulOrders,
            conversionRate: `${conversionRate}%`,
            trendingProducts: products.slice(0, 5) // Top 5 trending products
        });

    } catch (error) {
        res.status(500).json({ message: "Analytics fetch error" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});