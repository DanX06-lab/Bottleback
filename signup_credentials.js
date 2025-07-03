const express = require('express');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
app.use(express.json());

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create a MySQL connection pool
const pool = mysql.createPool(dbConfig);


// Route: Register New User
app.post('/api/register', async (req, res) => {
  const { name, phoneNumber, password } = req.body;

  if (!name || !phoneNumber || !password)
    return res.status(400).json({ error: 'Name, phone number, and password are required.' });

  try {
    await sql.connect(dbConfig);

    // Check if user already exists
    const checkUser = await sql.query`SELECT * FROM [users] WHERE phone_number = ${phoneNumber}`;
    if (checkUser.recordset.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await sql.query`
      INSERT INTO [users] (name, phone_number, password)
      VALUES (${name}, ${phoneNumber}, ${hashedPassword})
    `;

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Database Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await sql.close();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
