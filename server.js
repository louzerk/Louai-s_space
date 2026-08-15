require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 25726;

// --- Security headers ---
app.use(helmet({
    contentSecurityPolicy: false // relaxed here since we embed a Spotify iframe; tighten if you drop the embed
}));

// --- Rate limiting: protects /api/* from spam / abuse ---
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', apiLimiter);

const commentLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many comments submitted. Try again later.' }
});

// Middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cors());
app.use(express.static(path.join(__dirname, '.')));

// --- Database configuration — pulled from environment, never hardcoded ---
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
for (const key of requiredEnvVars) {
    if (!process.env[key]) {
        console.error(`Missing required environment variable: ${key}`);
        process.exit(1);
    }
}

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
};

// Initialize database connection
let db;
async function initializeDatabase() {
    try {
        db = await mysql.createConnection(dbConfig);
        console.log('Connected to MySQL database');

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

        const [rows] = await db.execute('SELECT COUNT(*) as count FROM visitor_counter');
        if (rows[0].count === 0) {
            await db.execute('INSERT INTO visitor_counter (total_visitors) VALUES (0)');
        }
    } catch (error) {
        console.error('Database initialization failed:', error);
        throw error;
    }
}

// Helper: get client IP (trust proxy must be set if behind a load balancer)
function getClientIp(req) {
    return req.ip ||
        req.headers['x-forwarded-for']?.split(',')[0].trim() ||
        req.socket.remoteAddress;
}

// Basic sanitization: strip anything that looks like HTML tags before it ever reaches storage
function stripTags(input) {
    return input.replace(/<[^>]*>/g, '').trim();
}

// --- Routes ---

app.get('/api/visitors/count', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT total_visitors FROM visitor_counter LIMIT 1');
        res.json({ count: rows[0]?.total_visitors || 0 });
    } catch (error) {
        console.error('Error fetching visitor count:', error);
        res.status(500).json({ error: 'Failed to fetch visitor count' });
    }
});

app.post('/api/visitors/increment', async (req, res) => {
    const clientIp = getClientIp(req);
    const today = new Date().toISOString().split('T')[0];

    try {
        const [existing] = await db.execute(
            'SELECT id FROM visitor_ips WHERE ip_address = ? AND visit_date = ?',
            [clientIp, today]
        );

        if (existing.length === 0) {
            await db.beginTransaction();
            try {
                await db.execute('UPDATE visitor_counter SET total_visitors = total_visitors + 1');
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

        const [rows] = await db.execute('SELECT total_visitors FROM visitor_counter LIMIT 1');
        res.json({ count: rows[0].total_visitors });
    } catch (error) {
        console.error('Error incrementing visitor count:', error);
        res.status(500).json({ error: 'Failed to increment visitor count' });
    }
});

app.get('/api/comments', async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT name, comment, created_at FROM visitor_comments WHERE is_approved = TRUE ORDER BY created_at DESC'
        );

        const comments = rows.map(comment => ({
            ...comment,
            created_at: new Date(comment.created_at).toLocaleString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            })
        }));

        res.json(comments);
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

app.post('/api/comments', commentLimiter, async (req, res) => {
    let { name, comment } = req.body;

    if (typeof name !== 'string' || typeof comment !== 'string') {
        return res.status(400).json({ error: 'Name and comment are required' });
    }

    name = stripTags(name);
    comment = stripTags(comment);

    if (!name || !comment) {
        return res.status(400).json({ error: 'Name and comment are required' });
    }
    if (name.length > 100) {
        return res.status(400).json({ error: 'Name must be less than 100 characters' });
    }
    if (comment.length > 1000) {
        return res.status(400).json({ error: 'Comment must be less than 1000 characters' });
    }

    try {
        await db.execute(
            'INSERT INTO visitor_comments (name, comment, is_approved) VALUES (?, ?, TRUE)',
            [name, comment]
        );

        const [result] = await db.execute(
            'SELECT name, comment, created_at FROM visitor_comments WHERE id = LAST_INSERT_ID()'
        );

        if (result.length > 0) {
            const newComment = {
                ...result[0],
                created_at: new Date(result[0].created_at).toLocaleString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
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

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, async () => {
    try {
        await initializeDatabase();
        console.log(`Server running on http://localhost:${PORT}`);
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
});

process.on('SIGINT', async () => {
    if (db) {
        await db.end();
        console.log('Database connection closed');
    }
    process.exit(0);
});