// backend/middleware/authMiddleware.js

const jwt = require('jsonwebtoken');
// dotenv.config() should have been called in server.js

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            if (!process.env.JWT_SECRET) {
                console.error('Middleware Error: JWT_SECRET is not defined.');
                return res.status(500).json({ message: 'Server configuration error.' });
            }
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded.user; // Attach user info from token to request object
            next();
        } catch (error) {
            console.error('Token verification failed:', error.message);
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ message: 'Not authorized, token failed (invalid signature).' });
            } else if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Not authorized, token expired.' });
            }
            return res.status(401).json({ message: 'Not authorized, token verification issue.' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token provided or incorrect format.' });
    }
};

// --- NEW ADMIN MIDDLEWARE ---
const admin = (req, res, next) => {
    // This middleware should run AFTER the 'protect' middleware,
    // so req.user should be populated.
    if (req.user && req.user.role === 'admin') {
        next(); // User is an admin, proceed to the next handler
    } else {
        // User is not an admin or req.user is not set (though protect should handle the latter)
        res.status(403).json({ message: 'Not authorized as an admin.' });
        // 403 Forbidden is more appropriate here than 401 Unauthorized,
        // as the user might be authenticated but not authorized for this specific resource.
    }
};
// --- END OF NEW ADMIN MIDDLEWARE ---

// Update module.exports to include both middlewares
module.exports = { protect, admin };