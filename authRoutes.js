// backend/routes/authRoutes.js

// 1. Import necessary modules
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
// --- UPDATED IMPORT ---
const { protect, admin } = require('../middleware/authMiddleware'); // Import both protect and admin

// 2. Create an Express router instance
const router = express.Router();

// 3. Define the Registration Route (POST /api/auth/register)
router.post('/register', async (req, res) => {
    // ... (your existing registration logic - no changes here)
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Please provide name, email, and password.' });
    }
    const validRoles = ['student', 'admin'];
    const userRole = (role && validRoles.includes(role)) ? role : 'student';
    try {
        const [existingUsers] = await pool.query('SELECT email FROM Users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(409).json({ message: 'User already exists with this email.' });
        }
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        const [result] = await pool.query(
            'INSERT INTO Users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
            [name, email, password_hash, userRole]
        );
        res.status(201).json({
            message: 'User registered successfully!',
            userId: result.insertId,
            name: name,
            email: email,
            role: userRole
        });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

// 4. Define the Login Route (POST /api/auth/login)
router.post('/login', async (req, res) => {
    // ... (your existing login logic - no changes here)
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Please provide both email and password.' });
    }
    try {
        const [users] = await pool.query('SELECT * FROM Users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials. User not found.' });
        }
        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials. Password incorrect.' });
        }
        const payload = {
            user: { id: user.id, email: user.email, name: user.name, role: user.role }
        };
        if (!process.env.JWT_SECRET) {
            console.error('FATAL ERROR: JWT_SECRET is not defined in .env file.');
            return res.status(500).json({ message: 'Server configuration error (JWT).' });
        }
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' },
            (err, token) => {
                if (err) {
                    console.error('JWT Sign Error:', err);
                    return res.status(500).json({ message: 'Error generating token.' });
                }
                res.json({
                    message: 'Login successful!',
                    token: token,
                    user: { id: user.id, name: user.name, email: user.email, role: user.role }
                });
            }
        );
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// 5. Define a Protected Route (GET /api/auth/profile)
router.get('/profile', protect, async (req, res) => {
    // ... (your existing profile route logic - no changes here)
    if (req.user) {
        res.json({
            message: "User profile data",
            user: req.user
        });
    } else {
        res.status(401).json({ message: 'Not authorized, user data not found after token verification.' });
    }
});

// --- NEW ADMIN-ONLY PROTECTED ROUTE ---
// This route uses both 'protect' (to ensure user is logged in)
// and 'admin' (to ensure the logged-in user has the 'admin' role).
router.get('/admin-only', protect, admin, (req, res) => {
    res.json({
        message: 'Welcome, Admin! This is an admin-only area.',
        adminDetails: req.user // req.user is populated by the 'protect' middleware
    });
});
// --- END OF NEW ADMIN-ONLY PROTECTED ROUTE ---

// 6. Export the router
module.exports = router;