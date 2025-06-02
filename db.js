// backend/config/db.js
console.log('--- db.js module execution started ---'); 
const mysql = require('mysql2/promise'); // Using the promise-based API for mysql2

// Note: require('dotenv').config(); was already called in server.js,
// so process.env variables should be available here.
// If you ever run this file independently or have issues, you might add
// require('dotenv').config({ path: '../.env' }); at the top.

// Create a connection pool using the environment variables
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10, // Maximum number of connections in the pool
    queueLimit: 0 // Maximum number of connection requests to queue (0 = no limit)
});

// Optional: Asynchronously test the connection when this module loads
// and log the status to the console.
async function testDbConnection() {
    try {
        // Get a connection from the pool
        const connection = await pool.getConnection();
        console.log('Successfully connected to the MySQL database (Fresh Start DB Connection).');
        // Release the connection back to the pool
        connection.release();
    } catch (error) {
        console.error('Error connecting to the MySQL database (Fresh Start DB Connection):', error.message);
        // In a real application, you might want to handle this error more gracefully,
        // or even exit the application if the DB connection is critical at startup.
        // For now, we'll just log it.
    }
}

testDbConnection(); // Call the function to test the connection immediately

// Export the pool so it can be used by other parts of our application (e.g., route handlers)
module.exports = pool;