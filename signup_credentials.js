const express = require('express');
const bcrypt = require('bcrypt');
const sql = require('mysql2/promise');
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
