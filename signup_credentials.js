const express = require('express');
const bcrypt = require('bcrypt');
const sql = require('mysql2/promise');
require('dotenv').config();

const app = express();
app.use(express.json());

// CORS configuration to allow local dev and github pages
const cors = require('cors');
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ],
  credentials: true
}));

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'Souvik@0606',
  database: 'bottleback_system',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Registration endpoint for localhost
app.post('/api/register', async (req, res) => {
  const { name, phoneNumber, password } = req.body;
  if (!name || !phoneNumber || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  try {
    const connection = await sql.createConnection(dbConfig);
    // Check if user already exists
    const [existing] = await connection.execute('SELECT * FROM users WHERE phone = ?', [phoneNumber]);
    if (existing.length > 0) {
      await connection.end();
      return res.status(409).json({ error: 'User already exists.' });
    }
    // Hash password
    const hash = await bcrypt.hash(password, 10);
    // Insert user
    await connection.execute(
      'INSERT INTO users (name, phone, password_hash) VALUES (?, ?, ?)',
      [name, phoneNumber, hash]
    );
    await connection.end();
    res.json({ message: 'Signup successful!' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed.' });
  }
});



// Route: Register New User
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ error: 'Name, email, and password are required.' });

  try {
    await sql.connect(dbConfig);

    // Check if user already exists
    const checkUser = await sql.query`SELECT * FROM [user] WHERE email = ${email}`;
    if (checkUser.recordset.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await sql.query`
      INSERT INTO [user] (name, email, password)
      VALUES (${name}, ${email}, ${hashedPassword})
    `;

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Database Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await sql.close();
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
