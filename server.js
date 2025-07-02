const express = require('express');
const path = require('path');
const { BottleBackDatabase } = require('./database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;
if (!process.env.PORT) {
    console.warn('⚠️  Warning: process.env.PORT is not set. Defaulting to 3000. This is fine for local development, but Render will set PORT automatically.');
}
const SECRET = 'your_jwt_secret'; // Use env variable in production

// Middleware
app.use(express.json());
// Serve all static files from the root directory
// Serve static files from the root directory (for Render, __dirname is the project root)
app.use(express.static(__dirname));

// Initialize database
const bottleBackDB = new BottleBackDatabase();

// Serve index.html for root route (works for both local and Render)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API Routes

// Phone number-based registration
app.post('/api/register', async (req, res) => {
    const { name, phoneNumber, password } = req.body;

    if (!name || !phoneNumber || !password) {
        return res.status(400).json({ error: 'Name, phone number, and password are required.' });
    }

    try {
        await bottleBackDB.initialize();

        // Check if user already exists
        const existingUser = await bottleBackDB.db.executeQuery(
            'SELECT * FROM users WHERE phone = ?',
            [phoneNumber]
        );
        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await bottleBackDB.db.executeQuery(
            'INSERT INTO users (full_name, phone, password_hash) VALUES (?, ?, ?)',
            [name, phoneNumber, hashedPassword]
        );

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        console.error('Database Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, password } = req.body;

        if (!name || !password) {
            return res.status(400).json({ error: 'Name and password are required' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        await bottleBackDB.initialize();

        // Create new user
        const result = await bottleBackDB.db.executeQuery(
            'INSERT INTO users (name, password_hash) VALUES (?, ?)',
            [name, hashedPassword]
        );

        // Get the newly created user
        const newUser = await bottleBackDB.db.executeQuery(
            'SELECT * FROM users WHERE user_id = ?',
            [result.insertId]
        );

        // Generate JWT token
        const token = jwt.sign({ user_id: newUser[0].user_id }, SECRET, { expiresIn: '24h' });

        res.status(201).json({
            user: newUser[0],
            token: token
        });
    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).json({ error: 'Failed to create user: ' + error.message });
    }
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

// Add other API routes here
app.get('/api/user/dashboard', auth, async (req, res) => {
    try {
        await bottleBackDB.initialize();
        const user = await bottleBackDB.userModel.getUserByPhone(req.user.phone_number);
        const returns = await bottleBackDB.returnLogModel.getUserReturns(req.user.user_id);
        const transactions = await bottleBackDB.rewardTransactionModel.getUserTransactions(req.user.user_id);

        res.json({
            user,
            returns,
            transactions
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const { phoneNumber, userName, initialBalance } = req.body;

        if (!phoneNumber || !userName) {
            return res.status(400).json({ error: 'Phone number and name are required' });
        }

        await bottleBackDB.initialize();

        // Check if user already exists
        const existingUser = await bottleBackDB.userModel.getUserByPhone(phoneNumber);
        if (existingUser) {
            return res.status(400).json({ error: 'User with this phone number already exists' });
        }

        // Create new user with initial balance
        await bottleBackDB.userModel.createUser(phoneNumber, userName, initialBalance || 0);

        const newUser = await bottleBackDB.userModel.getUserByPhone(phoneNumber);
        res.status(201).json(newUser);
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user: ' + error.message });
    }
});

app.put('/api/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { phoneNumber, userName } = req.body;

        if (!phoneNumber || !userName) {
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
            'SELECT * FROM users WHERE phone_number = ? AND user_id != ?',
            [phoneNumber, userId]
        );
        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'Phone number is already registered by another user' });
        }

        // Update user
        await bottleBackDB.db.executeQuery(
            'UPDATE users SET name = ?, phone_number = ? WHERE user_id = ?',
            [userName, phoneNumber, userId]
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
        'INSERT INTO users (name, phone_number, password_hash) VALUES (?, ?, ?)',
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
        'SELECT * FROM users WHERE phone_number = ?',
        [phone]
    );
    if (!user[0]) return res.status(400).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user[0].password_hash);
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
        phone: user[0].phone_number,
        wallet_balance: user[0].wallet_balance,
        total_returns: user[0].total_returns,
        reward_points: user[0].wallet_balance, // or another field if you track points separately
        recent_returns: returns
    });
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
app.listen(PORT, () => {
    console.log(`🚀 BottleBack India Server running on http://localhost:${PORT}`);
    console.log(`📊 User Management Dashboard: http://localhost:${PORT}`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
});

// Graceful shutdown on Ctrl+C
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server...');
    await bottleBackDB.close();
    process.exit(0);
});

// IMPORTANT: Do not put any shutdown, exit, or close logic outside the SIGINT handler above.
// The server should keep running until you press Ctrl+C in the terminal.

module.exports = app;