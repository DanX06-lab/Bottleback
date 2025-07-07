const express = require('express');
const cors = require('cors');
const path = require('path');
const { BottleBackDatabase } = require('./database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();

app.use(cors({
    origin: 'https://danx06-lab.github.io',
    credentials: false // Set to true only if using cookies/auth headers
}));

const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || 'your_jwt_secret'; // Use env variable in production

// Middleware
app.use(express.json());
// Serve all static files from the root directory
app.use(express.static(__dirname));

// Initialize database
const bottleBackDB = new BottleBackDatabase();

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Bottleback', 'index.html'));
});

// API Routes
app.get('/api/users', async (req, res) => {
    try {
        await bottleBackDB.initialize();
        const users = await bottleBackDB.userModel.getAllUsers();
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Store QR code in database
app.post('/api/store-qr', async (req, res) => {
    try {
        await bottleBackDB.initialize();
        const { qr_code } = req.body;

        // Check if QR code already exists
        const existing = await bottleBackDB.qrCodeModel.getQRCode(qr_code);
        if (existing) {
            return res.status(400).json({
                success: false,
                error: 'QR code already exists in database'
            });
        }

        // Extract timestamp from QR code
        const timestamp = qr_code.split('_')[2]; // Assuming format BOTTLE_000001_timestamp

        // Store QR code in qr_code_values table
        await bottleBackDB.qrCodeModel.createQRCode(qr_code, 1, timestamp); // Using 1 as default company_id

        res.json({
            success: true,
            message: 'QR code stored successfully',
            data: {
                qr_code: qr_code,
                created_at: timestamp,
                status: 'unused'
            }
        });
    } catch (error) {
        console.error('Error storing QR code:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const { phone, userName, initialBalance } = req.body;

        if (!phone || !userName) {
            return res.status(400).json({ error: 'Phone number and name are required' });
        }

        await bottleBackDB.initialize();

        // Check if user already exists
        const existingUser = await bottleBackDB.userModel.getUserByPhone(phone);
        if (existingUser) {
            return res.status(400).json({ error: 'User with this phone number already exists' });
        }

        // Create new user with initial balance
        await bottleBackDB.userModel.createUser(phone, userName, initialBalance || 0);

        const newUser = await bottleBackDB.userModel.getUserByPhone(phone);
        res.status(201).json(newUser);
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user: ' + error.message });
    }
});

app.put('/api/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { phone, userName } = req.body;

        if (!phone || !userName) {
            return res.status(400).json({ error: 'Phone number and name are required' });
        }

        await bottleBackDB.initialize();

        // Get current user
        const currentUser = await bottleBackDB.db.executeQuery('SELECT * FROM users WHERE user_id = ?', [userId]);
        if (currentUser.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if phone number is already taken by another user
        const existingUser = await bottleBackDB.db.executeQuery(
            'SELECT * FROM users WHERE phone = ? AND user_id != ?',
            [phone, userId]
        );
        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'Phone number is already registered by another user' });
        }

        // Update user
        await bottleBackDB.db.executeQuery(
            'UPDATE users SET name = ?, phone = ? WHERE user_id = ?',
            [userName, phone, userId]
        );

        const updatedUser = await bottleBackDB.db.executeQuery('SELECT * FROM users WHERE user_id = ?', [userId]);
        res.json(updatedUser[0]);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user: ' + error.message });
    }
});

// Update user wallet balance
app.put('/api/users/:id/wallet', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { amount } = req.body;

        if (amount === undefined || amount === null) {
            return res.status(400).json({ error: 'Amount is required' });
        }

        await bottleBackDB.initialize();

        // Check if user exists
        const user = await bottleBackDB.db.executeQuery('SELECT * FROM users WHERE user_id = ?', [userId]);
        if (user.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update wallet balance
        await bottleBackDB.userModel.updateWalletBalance(userId, amount);

        const updatedUser = await bottleBackDB.db.executeQuery('SELECT * FROM users WHERE user_id = ?', [userId]);
        res.json(updatedUser[0]);
    } catch (error) {
        console.error('Error updating wallet:', error);
        res.status(500).json({ error: 'Failed to update wallet: ' + error.message });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        await bottleBackDB.initialize();

        // Check if user exists
        const user = await bottleBackDB.db.executeQuery('SELECT * FROM users WHERE user_id = ?', [userId]);
        if (user.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Delete user
        await bottleBackDB.db.executeQuery('DELETE FROM users WHERE user_id = ?', [userId]);

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user: ' + error.message });
    }
});

// Get user statistics
app.get('/api/stats', async (req, res) => {
    try {
        await bottleBackDB.initialize();

        const stats = await bottleBackDB.db.executeQuery(`
            SELECT 
                COUNT(*) as total_users,
                SUM(total_returns) as total_returns,
                SUM(wallet_balance) as total_rewards
            FROM users
        `);

        res.json(stats[0]);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// User Signup
app.post('/api/auth/signup', async (req, res) => {
    const { name, phone, password } = req.body;
    if (!name || !phone || !password) return res.status(400).json({ error: 'All fields required' });

    await bottleBackDB.initialize();
    const existing = await bottleBackDB.userModel.getUserByPhone(phone);
    if (existing) return res.status(400).json({ error: 'Phone already registered' });

    const hash = await bcrypt.hash(password, 10);
    // Save password_hash in a new column in users table (add this column if not present)
    await bottleBackDB.db.executeQuery(
        'INSERT INTO users (name, phone, password_hash) VALUES (?, ?, ?)',
        [name, phone, hash]
    );
    res.json({ message: 'Signup successful' });
});

// User Login
app.post('/api/auth/login', async (req, res) => {
    console.log('LOGIN BODY:', req.body);
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ error: 'All fields required' });

    await bottleBackDB.initialize();
    const user = await bottleBackDB.db.executeQuery(
        'SELECT * FROM users WHERE phone = ?',
        [phone]
    );
    if (!user[0]) return res.status(400).json({ error: 'Invalid credentials' });

    console.log('password:', password, typeof password);
    let hash = user[0].password_hash;
    if (Buffer.isBuffer(hash)) {
        hash = hash.toString('utf8');
    }
    console.log('hash after conversion:', hash, typeof hash);
    if (typeof password !== 'string' || typeof hash !== 'string') {
        return res.status(500).json({ error: 'Server error: password or hash not set correctly' });
    }
    const valid = await bcrypt.compare(password, hash);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

    // Create JWT
    const token = jwt.sign({ user_id: user[0].user_id, username: user[0].name }, SECRET, { expiresIn: '2h' });
    res.json({ token });
});

// Middleware to check JWT
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

// User Dashboard Data
app.get('/api/user/dashboard', auth, async (req, res) => {
    await bottleBackDB.initialize();
    const user = await bottleBackDB.db.executeQuery('SELECT * FROM users WHERE user_id = ?', [req.user.user_id]);
    if (!user[0]) return res.status(404).json({ error: 'User not found' });

    // Fetch recent returns (last 5)
    const returns = await bottleBackDB.db.executeQuery(
        'SELECT * FROM return_logs WHERE user_id = ? ORDER BY returned_at DESC LIMIT 5',
        [req.user.user_id]
    );

    res.json({
        name: user[0].name,
        phone: user[0].phone,
        wallet_balance: user[0].wallet_balance,
        total_returns: user[0].total_returns,
        reward_points: user[0].wallet_balance, // or another field if you track points separately
        recent_returns: returns
    });
});

// Leaderboard endpoint
// GET  /api/user/leaderboard

// Top recycler endpoint
// GET /api/leaderboard/top
app.get('/api/leaderboard/top', async (req, res) => {
    try {
        await bottleBackDB.initialize();
        const users = await bottleBackDB.db.executeQuery(
            'SELECT user_id, full_name, total_points, city FROM users ORDER BY total_points DESC LIMIT 1'
        );
        if (!users.length) {
            return res.status(404).json({ error: 'No users found' });
        }
        const topUser = users[0];
        res.json({
            user_id: topUser.user_id,
            name: topUser.full_name,
            total_points: topUser.total_points,
            city: topUser.city
        });
    } catch (error) {
        console.error('Error fetching top user:', error);
        res.status(500).json({ error: 'Failed to fetch top user' });
    }
});
app.get('/api/user/leaderboard', auth, async (req, res) => {
    try {
        // 1. Make sure DB is ready
        await bottleBackDB.initialize();

        // 2. Pull every user, highest points first
        const users = await bottleBackDB.db.executeQuery(
            'SELECT user_id, total_points, city FROM users ORDER BY total_points DESC'
        );

        const userId = req.user.user_id;
        let rank = null;
        let userPoints = null;
        let userCity = null;

        // 3. Locate the current user in the list
        for (let i = 0; i < users.length; i++) {
            if (users[i].user_id === userId) {
                rank = i + 1;
                userPoints = users[i].total_points;
                userCity = users[i].city;
                break;
            }
        }

        // 4. Work out the next milestone, if any
        const milestones = [100, 250, 500, 1000];  // customise as you like
        const nextMilestone =
            userPoints !== null ? milestones.find((m) => m > userPoints) ?? null : null;

        // 5. Send the response
        res.json({
            rank,
            total_points: userPoints,
            city: userCity,
            next_milestone: nextMilestone
        });
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// Scan QR code and add reward to user wallet
app.post('/api/scan-qr', async (req, res) => {
    try {
        await bottleBackDB.initialize();
        const { qrCode, userId } = req.body;

        if (!qrCode || !userId) {
            return res.status(400).json({
                success: false,
                message: 'QR code and user ID are required'
            });
        }

        // Check if user exists
        const user = await bottleBackDB.userModel.getUserByPhone(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if QR code exists and is unused
        const qrCodeData = await bottleBackDB.qrCodeModel.getQRCode(qrCode);
        if (!qrCodeData) {
            return res.status(404).json({
                success: false,
                message: 'Invalid QR code'
            });
        }

        if (qrCodeData.status === 'used') {
            return res.status(400).json({
                success: false,
                message: 'QR code has already been used'
            });
        }

        // Mark QR code as used
        await bottleBackDB.qrCodeModel.markQRCodeAsUsed(qrCode, user.user_id, 1); // Using kiosk_id 1 as default

        // Add ₹1 to user's wallet
        await bottleBackDB.userModel.updateWalletBalance(user.user_id, 1.00);

        // Log the return
        await bottleBackDB.returnLogModel.logReturn(user.user_id, qrCodeData.qr_id, 1, 1.00);

        // Create reward transaction
        await bottleBackDB.rewardTransactionModel.createTransaction(
            user.user_id,
            1.00,
            'QR_SCAN',
            'Bottle return reward'
        );

        res.json({
            success: true,
            message: '1 rs added to your wallet',
            data: {
                qr_code: qrCode,
                user_id: user.user_id,
                reward_amount: 1.00,
                new_balance: user.wallet_balance + 1.00
            }
        });
    } catch (error) {
        console.error('Error scanning QR code:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process QR code'
        });
    }
});


// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`🚀 BottleBack India Server running on http://localhost:${PORT}`);
    console.log(`📊 User Management Dashboard: http://localhost:${PORT}`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
});

// Graceful shutdown: only on SIGINT
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server...');
    await bottleBackDB.close();
    server.close(() => {
        process.exit(0);
    });
});

module.exports = app; 