require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // Naya: HTML files ka path dhoondhne ke liye
const bcrypt = require('bcryptjs');
const Vendor = require('./models/Vendor');
const jwt = require('jsonwebtoken'); // Naya line

const app = express();

app.use(cors());
app.use(express.json());

// 🚀 NAYA: Express ko batayein ki root folder ki static files (Index.html, signup.html, demo.mp4) serve kare
app.use(express.static(path.join(__dirname, '../')));

// Live Database Connection
const MONGO_URI = process.env.MONGO_URI; 

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Live MongoDB Atlas Connected Successfully!'))
    .catch((err) => console.log('❌ Database Connection Error: ', err));

// 🚀 NAYA: Direct Link kholne par Index.html open karne ka route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../Index.html'));
});

// Test API Route
app.get('/api/test', (req, res) => {
    res.json({ message: "SmartShop Live Backend is running perfectly!" });
});

// Vendor Registration API Route
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
            shopName,
            ownerName,
            mobileNumber,
            password: hashedPassword,
            shopSlug
        });

        await newVendor.save();
        
        res.status(201).json({ 
            message: "Badhai ho! Aapki dukan successfully register ho gayi.", 
            shopSlug: shopSlug 
        });

    } catch (error) {
        console.error("Registration Error: ", error);
        res.status(500).json({ message: "Server me koi dikkat hai, thodi der baad try karein." });
    }
});
// 🚀 NAYA: Unified Login API (Vendor & Admin)
app.post('/api/vendor/login', async (req, res) => {
    try {
        const { mobileNumber, password } = req.body;

        // 1. Check karte hain ki kya ye number database me hai ya nahi
        const user = await Vendor.findOne({ mobileNumber });
        if (!user) {
            return res.status(400).json({ message: "Yeh number register nahi hai. Pehle account banayein." });
        }

        // 2. Password match karte hain (User ka type kiya hua vs Database ka secured password)
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Password galat hai. Kripya dobara try karein." });
        }

        // 3. Login successful hone par ek secure "Token" banate hain
        // Yeh token browser yaad rakhega taaki user ko baar-baar login na karna pade
        const token = jwt.sign(
            { id: user._id, role: user.role }, 
            'smartshop_secret_key', // Ise baad me .env me daalenge
            { expiresIn: '7d' } // 7 din tak login rahega
        );

        // 4. Frontend ko success message aur user ka role bhejna
        res.json({
            message: "Login Successful!",
            token: token,
            role: user.role, // "vendor" ya "admin"
            shopSlug: user.shopSlug
        });

    } catch (error) {
        console.error("Login Error: ", error);
        res.status(500).json({ message: "Server me error hai, kripya baad me try karein." });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});