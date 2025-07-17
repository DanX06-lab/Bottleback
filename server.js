const express = require('express');
const cors = require('cors');
const path = require('path');
const { BottleBackDatabase } = require('./database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.SECRET || 'your_jwt_secret';

const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({ origin: allowedOrigins, credentials: false }));
app.use(express.json());
app.use(express.static(__dirname));

const bottleBackDB = new BottleBackDatabase();

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Bottleback', 'index.html'));
});

// --- AUTH MIDDLEWARE ---
function auth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
        req.user = jwt.verify(token, SECRET);
        next();
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
}

// --- USER ROUTES ---
app.get('/api/users', async (req, res) => {
    try {
        await bottleBackDB.initialize();
        const users = await bottleBackDB.userModel.getAllUsers();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const { phone, userName, initialBalance } = req.body;
        if (!phone || !userName) return res.status(400).json({ error: 'Phone and name are required' });

        await bottleBackDB.initialize();
        const existingUser = await bottleBackDB.userModel.getUserByPhone(phone);
        if (existingUser) return res.status(400).json({ error: 'User already exists' });

        await bottleBackDB.userModel.createUser(phone, userName, initialBalance || 0);
        const newUser = await bottleBackDB.userModel.getUserByPhone(phone);
        res.status(201).json(newUser);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create user: ' + error.message });
    }
});

app.put('/api/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { phone, userName } = req.body;
        if (!phone || !userName) return res.status(400).json({ error: 'Phone and name required' });

        await bottleBackDB.initialize();
        const currentUser = await bottleBackDB.db.executeQuery('SELECT * FROM users WHERE user_id = ?', [userId]);
        if (currentUser.length === 0) return res.status(404).json({ error: 'User not found' });

        const existing = await bottleBackDB.db.executeQuery(
            'SELECT * FROM users WHERE phone = ? AND user_id != ?',
            [phone, userId]
        );
        if (existing.length > 0) return res.status(400).json({ error: 'Phone taken by another user' });

        await bottleBackDB.db.executeQuery('UPDATE users SET name = ?, phone = ? WHERE user_id = ?', [userName, phone, userId]);
        const updatedUser = await bottleBackDB.db.executeQuery('SELECT * FROM users WHERE user_id = ?', [userId]);
        res.json(updatedUser[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user: ' + error.message });
    }
});

app.put('/api/users/:id/wallet', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { amount } = req.body;
        if (amount == null) return res.status(400).json({ error: 'Amount required' });

        await bottleBackDB.initialize();
        const user = await bottleBackDB.db.executeQuery('SELECT * FROM users WHERE user_id = ?', [userId]);
        if (user.length === 0) return res.status(404).json({ error: 'User not found' });

        await bottleBackDB.userModel.updateWalletBalance(userId, amount);
        const updatedUser = await bottleBackDB.db.executeQuery('SELECT * FROM users WHERE user_id = ?', [userId]);
        res.json(updatedUser[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update wallet: ' + error.message });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        await bottleBackDB.initialize();
        const user = await bottleBackDB.db.executeQuery('SELECT * FROM users WHERE user_id = ?', [userId]);
        if (user.length === 0) return res.status(404).json({ error: 'User not found' });

        await bottleBackDB.db.executeQuery('DELETE FROM users WHERE user_id = ?', [userId]);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete user: ' + error.message });
    }
});

// --- QR STORAGE ---
app.post('/api/store-qr', async (req, res) => {
    try {
        await bottleBackDB.initialize();
        const { qr_code } = req.body;

        const existing = await bottleBackDB.qrCodeModel.getQRCode(qr_code);
        if (existing) return res.status(400).json({ success: false, error: 'QR code already exists' });

        const timestamp = qr_code.split('_')[2];
        await bottleBackDB.qrCodeModel.createQRCode(qr_code, 1, timestamp);

        res.json({
            success: true,
            message: 'QR code stored',
            data: { qr_code, created_at: timestamp, status: 'unused' }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- QR SCAN BY USER ---
app.post('/api/scan-qr', async (req, res) => {
    try {
        await bottleBackDB.initialize();
        const { qrCode, userId } = req.body;
        if (!qrCode || !userId) return res.status(400).json({ success: false, message: 'Missing data' });

        const user = await bottleBackDB.userModel.getUserByPhone(userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const qrCodeData = await bottleBackDB.qrCodeModel.getQRCode(qrCode);
        if (!qrCodeData) return res.status(404).json({ success: false, message: 'Invalid QR' });
        if (qrCodeData.status !== 'unused') return res.status(400).json({ success: false, message: 'Already used' });

        await bottleBackDB.qrCodeModel.markQRCodeAsPending(qrCode, user.user_id, 1);
        await bottleBackDB.returnLogModel.logReturn(user.user_id, qrCodeData.qr_id, 1, 0.00);

        res.json({
            success: true,
            message: 'QR marked as pending',
            data: { qr_code: qrCode, user_id: user.user_id, status: 'pending' }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to process QR' });
    }
});

// --- USER DASHBOARD & LEADERBOARD ENDPOINTS ---

// Leaderboard: GET /api/user/leaderboard (JWT required)
app.get('/api/user/leaderboard', auth, async (req, res) => {
    try {
        await bottleBackDB.initialize();
        // Fetch users with city if available, else fallback to name and upi_earned
        const users = await bottleBackDB.db.executeQuery(
            'SELECT full_name as name, upi_earned, city FROM users ORDER BY upi_earned DESC'
        );
        const leaderboard = users.map((user, i) => ({
            rank: i + 1,
            name: user.name,
            upi_earned: user.upi_earned,
            city: user.city || null
        }));
        res.json(leaderboard);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// User profile: GET /api/user/profile (JWT required)
app.get('/api/user/profile', auth, async (req, res) => {
    try {
        await bottleBackDB.initialize();
        const user = await bottleBackDB.db.executeQuery(
            'SELECT bottles_returned, upi_earned FROM users WHERE user_id = ?',
            [req.user.user_id]
        );
        if (!user.length) return res.status(404).json({ error: 'User not found' });
        res.json({
            bottles_returned: user[0].bottles_returned,
            upi_earned: user[0].upi_earned
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch user stats' });
    }
});

// --- AUTH ---
app.post('/api/auth/signup', async (req, res) => {
    const { name, phone, password } = req.body;
    if (!name || !phone || !password) return res.status(400).json({ error: 'All fields required' });

    await bottleBackDB.initialize();
    const existing = await bottleBackDB.userModel.getUserByPhone(phone);
    if (existing) return res.status(400).json({ error: 'Phone already registered' });

    const hash = await bcrypt.hash(password, 10);
    await bottleBackDB.db.executeQuery('INSERT INTO users (name, phone, password_hash) VALUES (?, ?, ?)', [name, phone, hash]);
    res.json({ message: 'Signup successful' });
});

app.post('/api/auth/login', async (req, res) => {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ error: 'All fields required' });

    await bottleBackDB.initialize();
    const user = await bottleBackDB.db.executeQuery('SELECT * FROM users WHERE phone = ?', [phone]);
    if (!user[0]) return res.status(400).json({ error: 'Invalid credentials' });

    const hash = Buffer.isBuffer(user[0].password_hash) ? user[0].password_hash.toString('utf8') : user[0].password_hash;
    const valid = await bcrypt.compare(password, hash);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ user_id: user[0].user_id, username: user[0].name }, SECRET, { expiresIn: '2h' });
    res.json({ token });
});

// --- VENDOR: Approve Return ---
app.post('/api/vendor/approve-return', async (req, res) => {
    try {
        await bottleBackDB.initialize();
        const { returnId, rewardAmount } = req.body;

        const returnLog = await bottleBackDB.db.executeQuery('SELECT * FROM return_logs WHERE id = ?', [returnId]);
        if (!returnLog.length) return res.status(404).json({ error: 'Return log not found' });

        const qrCodeId = returnLog[0].qr_code_id;
        const userId = returnLog[0].user_id;

        await bottleBackDB.db.executeQuery("UPDATE qr_code_values SET status = 'used' WHERE id = ?", [qrCodeId]);
        await bottleBackDB.db.executeQuery("UPDATE return_logs SET reward_amount = ? WHERE id = ?", [rewardAmount, returnId]);
        await bottleBackDB.userModel.updateWalletBalance(userId, rewardAmount);

        res.json({ success: true, message: 'Return approved and reward credited.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to approve return' });
    }
});

// --- SERVER START ---
const server = app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});

// --- SHUTDOWN HANDLER ---
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    await bottleBackDB.close();
    server.close(() => process.exit(0));
});

module.exports = app;
