require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs'); // Password ko secure (encrypt) karne ke liye
const Vendor = require('./models/Vendor'); // Humara banaya hua Database Model

const app = express();

app.use(cors());
app.use(express.json());

// Live Database Connection
const MONGO_URI = process.env.MONGO_URI; 

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Live MongoDB Atlas Connected Successfully!'))
    .catch((err) => console.log('❌ Database Connection Error: ', err));

// Test API Route (Jo aapne abhi test kiya)
app.get('/api/test', (req, res) => {
    res.json({ message: "SmartShop Live Backend is running perfectly!" });
});

// 🚀 NAYA: Vendor Registration API
app.post('/api/vendor/register', async (req, res) => {
    try {
        const { shopName, ownerName, mobileNumber, password } = req.body;

        // Check karte hain ki kya ye number pehle se register toh nahi hai
        let existingVendor = await Vendor.findOne({ mobileNumber });
        if (existingVendor) {
            return res.status(400).json({ message: "Yeh mobile number pehle se register hai. Kripya login karein." });
        }

        // Password ko secure karna (Hashing)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Shop ka unique URL banana (e.g. "Sharma Store" -> "sharma-store")
        const shopSlug = shopName.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

        // Database me save karne ke liye data tayar karna
        const newVendor = new Vendor({
            shopName,
            ownerName,
            mobileNumber,
            password: hashedPassword,
            shopSlug
        });

        // Data MongoDB me save karna
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});