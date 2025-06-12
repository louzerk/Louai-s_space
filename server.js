const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 25726;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, '.')));

// Database configuration
const dbConfig = {
    host: 'crossover.proxy.rlwy.net',  // CORRECT - removed the 'l'
    user: 'root',
    password: 'uPBeRFgNKjncgNzOvTrCJoFMkTsbLldy',
    database: 'railway',
    port: 25726  // Add the port number
};

// Initialize database connection
let db;
async function initializeDatabase() {
    try {
        db = await mysql.createConnection(dbConfig);
        console.log('Connected to MySQL database');

        // Create tables if they don't exist
        await db.execute(`
            CREATE TABLE IF NOT EXISTS visitor_counter (
                id INT AUTO_INCREMENT PRIMARY KEY,
                total_visitors INT NOT NULL DEFAULT 0
            )
        `);

        await db.execute(`
            CREATE TABLE IF NOT EXISTS visitor_ips (
                id VARCHAR(36) PRIMARY KEY,
                ip_address VARCHAR(45) NOT NULL,
                visit_date DATE NOT NULL,
                UNIQUE KEY unique_ip_per_day (ip_address, visit_date)
            )
        `);

        await db.execute(`
            CREATE TABLE IF NOT EXISTS visitor_comments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                comment TEXT NOT NULL,
                is_approved BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Initialize visitor counter if empty
        const [rows] = await db.execute('SELECT COUNT(*) as count FROM visitor_counter');
        if (rows[0].count === 0) {
            await db.execute('INSERT INTO visitor_counter (total_visitors) VALUES (0)');
        }
    } catch (error) {
        console.error('Database initialization failed:', error);
        throw error;
    }
}

// Helper function to get client IP
function getClientIp(req) {
    return req.ip ||
        req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;
}

// Routes

// Get visitor count
app.get('/api/visitors/count', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT total_visitors FROM visitor_counter LIMIT 1');
        res.json({ count: rows[0]?.total_visitors || 0 });
    } catch (error) {
        console.error('Error fetching visitor count:', error);
        res.status(500).json({ error: 'Failed to fetch visitor count' });
    }
});

// Increment visitor count (IP-based)
app.post('/api/visitors/increment', async (req, res) => {
    const clientIp = getClientIp(req);
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    try {
        // Check if this IP has visited today
        const [existing] = await db.execute(
            'SELECT id FROM visitor_ips WHERE ip_address = ? AND visit_date = ?',
            [clientIp, today]
        );

        if (existing.length === 0) {
            // New visit - increment counter and record IP
            await db.beginTransaction();

            try {
                await db.execute(
                    'UPDATE visitor_counter SET total_visitors = total_visitors + 1'
                );

                await db.execute(
                    'INSERT INTO visitor_ips (id, ip_address, visit_date) VALUES (?, ?, ?)',
                    [uuidv4(), clientIp, today]
                );

                await db.commit();
            } catch (transactionError) {
                await db.rollback();
                throw transactionError;
            }
        }

        // Get updated count
        const [rows] = await db.execute('SELECT total_visitors FROM visitor_counter LIMIT 1');
        res.json({ count: rows[0].total_visitors });
    } catch (error) {
        console.error('Error incrementing visitor count:', error);
        res.status(500).json({ error: 'Failed to increment visitor count' });
    }
});

// Get all approved comments
app.get('/api/comments', async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT name, comment, created_at FROM visitor_comments WHERE is_approved = TRUE ORDER BY created_at DESC'
        );

        // Format dates nicely
        const comments = rows.map(comment => ({
            ...comment,
            created_at: new Date(comment.created_at).toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        }));

        res.json(comments);
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

// Add new comment
app.post('/api/comments', async (req, res) => {
    const { name, comment } = req.body;

    if (!name || !comment) {
        return res.status(400).json({ error: 'Name and comment are required' });
    }

    if (name.length > 100) {
        return res.status(400).json({ error: 'Name must be less than 100 characters' });
    }

    try {
        await db.execute(
            'INSERT INTO visitor_comments (name, comment, is_approved) VALUES (?, ?, TRUE)',
            [name.trim(), comment.trim()]
        );

        // Return the newly created comment with formatted date
        const [result] = await db.execute(
            'SELECT name, comment, created_at FROM visitor_comments WHERE id = LAST_INSERT_ID()'
        );

        if (result.length > 0) {
            const newComment = {
                ...result[0],
                created_at: new Date(result[0].created_at).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })
            };
            res.json(newComment);
        } else {
            res.json({ success: true, message: 'Comment added successfully' });
        }
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ error: 'Failed to add comment' });
    }
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, async () => {
    try {
        await initializeDatabase();
        console.log(`Server running on http://localhost:${PORT}`);
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
});

// Graceful shutdown
process.on('SIGINT', async () => {
    if (db) {
        await db.end();
        console.log('Database connection closed');
    }
    process.exit(0);
});
