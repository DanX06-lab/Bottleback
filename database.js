require('dotenv').config(); // Loads .env for local development
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// Database Configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Souvik@0606',
    database: process.env.DB_NAME || 'bottleback_system',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

console.log('Database configuration:', dbConfig);
console.log('Attempting to create pool...');
const pool = mysql.createPool(dbConfig);
console.log('Pool created successfully');

// Table creation SQL
const TABLES = {
    users: `
        CREATE TABLE IF NOT EXISTS users (
            user_id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `,
    companies: `
        CREATE TABLE IF NOT EXISTS companies (
            company_id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            contact_email VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `,
    kiosks: `
        CREATE TABLE IF NOT EXISTS kiosks (
            kiosk_id INT AUTO_INCREMENT PRIMARY KEY,
            company_id INT,
            name VARCHAR(100) NOT NULL,
            location VARCHAR(255) NOT NULL,
            status ENUM('active', 'inactive') DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (company_id) REFERENCES companies(company_id)
        )
    `,
    qr_codes: `
        CREATE TABLE IF NOT EXISTS qr_codes (
            qr_id INT AUTO_INCREMENT PRIMARY KEY,
            qr_code VARCHAR(255) NOT NULL,
            company_id INT,
            is_used BOOLEAN DEFAULT FALSE,
            assigned_to INT,
            kiosk_id INT,
            scanned_at TIMESTAMP,
            FOREIGN KEY (company_id) REFERENCES companies(company_id)
        )
    `,
    reward_transactions: `
        CREATE TABLE IF NOT EXISTS reward_transactions (
            transaction_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            amount DECIMAL(10, 2) NOT NULL,
            method VARCHAR(100) NOT NULL,
            description VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
    `,
    return_logs: `
        CREATE TABLE IF NOT EXISTS return_logs (
            log_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            qr_code_id INT,
            kiosk_id INT,
            returned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            reward_amount DECIMAL(10, 2) NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(user_id),
            FOREIGN KEY (qr_code_id) REFERENCES qr_codes(qr_id),
            FOREIGN KEY (kiosk_id) REFERENCES kiosks(kiosk_id)
        )
    `
};

// Export database configuration
module.exports.dbConfig = dbConfig;

// Database connection class
class DatabaseConnection {
    constructor() {
        this.pool = pool;
    }

    // Initialize database and create tables
    async initialize() {
        try {
            // Get a connection from the pool
            console.log('Attempting to get connection from pool...');
            const connection = await this.pool.getConnection();
            console.log('Got connection:', connection);

            // Check if we can execute a simple query
            console.log('Testing connection with simple query...');
            const [rows] = await connection.execute('SELECT 1 + 1 AS result');
            console.log('Simple query result:', rows[0].result);

            // Drop existing tables in correct order to avoid foreign key constraints
            console.log('Dropping existing tables...');
            await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
            await connection.execute('DROP TABLE IF EXISTS return_logs');
            await connection.execute('DROP TABLE IF EXISTS reward_transactions');
            await connection.execute('DROP TABLE IF EXISTS qr_codes');
            await connection.execute('DROP TABLE IF EXISTS kiosks');
            await connection.execute('DROP TABLE IF EXISTS companies');
            await connection.execute('DROP TABLE IF EXISTS users');
            await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
            console.log('Tables dropped successfully');

            // Create tables in correct order with foreign key dependencies
            console.log('Creating tables...');
            console.log('Creating companies table...');
            await connection.execute(TABLES.companies);
            console.log('Companies table created successfully');
            console.log('Creating users table...');
            await connection.execute(TABLES.users);
            console.log('Users table created successfully');
            console.log('Creating kiosks table...');
            await connection.execute(TABLES.kiosks);
            console.log('Creating qr_codes table...');
            await connection.execute(TABLES.qr_codes);
            console.log('Creating reward_transactions table...');
            await connection.execute(TABLES.reward_transactions);
            console.log('Creating return_logs table...');
            await connection.execute(TABLES.return_logs);
            console.log('All tables created successfully');

            // Verify tables were created
            const tables = await connection.execute('SHOW TABLES');
            console.log('Tables in database:', tables[0].map(t => t.Tables_in_botalsepaisa_system));

            // Verify kiosks table structure
            const columns = await connection.execute('DESCRIBE kiosks');
            console.log('Kiosks table columns:', columns[0]);

            // Release the connection
            connection.release();

            console.log('✅ Database initialized successfully!');
            return true;
        } catch (error) {
            console.error('❌ Error initializing database:', error);
            throw error;
        }
    }

    // Get connection from pool
    async getConnection() {
        return this.pool.getConnection();
    }

    // Test database connection
    async testConnection() {
        try {
            const connection = await this.pool.getConnection();
            console.log('✅ Database connected successfully!');
            connection.release();
            return true;
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            return false;
        }
    }

    // Get connection from pool
    async getConnection() {
        return await this.pool.getConnection();
    }

    // Execute query with parameters
    async executeQuery(query, params = []) {
        try {
            const connection = await this.getConnection();
            try {
                const [rows] = await connection.execute(query, params);
                return rows;
            } finally {
                connection.release();
            }
        } catch (error) {
            console.error('Query execution error:', error);
            throw error;
        }
    }

    // Close all connections
    async closeConnection() {
        await this.pool.end();
        console.log('Database connections closed.');
    }
}

// User Model
class UserModel {
    constructor(db) {
        this.db = db;
    }

    // Create new user
    async createUser(phoneNumber, name, wallet_balance = 0, total_returns = 0) {
        const query = `
            INSERT INTO users (name, password_hash) 
            VALUES (?, ?)
        `;
        const result = await this.db.executeQuery(query, [phoneNumber, name, wallet_balance, total_returns]);
        return result.insertId;
    }

    // Get user by phone number
    async getUserByPhone(phone) {
        const query = 'SELECT * FROM users WHERE phone = ?';
        const users = await this.db.executeQuery(query, [phone]);
        return users[0];
    }

    // Update user wallet balance
    async updateWalletBalance(userId, amount) {
        const query = `
            UPDATE users 
            SET wallet_balance = wallet_balance + ?, 
                total_returns = total_returns + 1 
            WHERE user_id = ?
        `;
        return await this.db.executeQuery(query, [amount, userId]);
    }

    // Get all users
    async getAllUsers() {
        const query = 'SELECT * FROM users ORDER BY user_id ASC';
        return await this.db.executeQuery(query);
    }
}

// QR Code Model
class QRCodeModel {
    constructor(db) {
        this.db = db;
    }

    // Create new QR code
    async createQRCode(qrCode, companyId) {
        const query = `
            INSERT INTO qr_codes (qr_code, company_id) 
            VALUES (?, ?)
        `;
        const result = await this.db.executeQuery(query, [qrCode, companyId]);
        return result.insertId;
    }

    // Mark QR code as used
    async markQRCodeAsUsed(qrId, userId, kioskId) {
        const query = `
            UPDATE qr_codes 
            SET is_used = TRUE, 
                assigned_to = ?, 
                kiosk_id = ?, 
                scanned_at = NOW() 
            WHERE qr_id = ?
        `;
        return await this.db.executeQuery(query, [userId, kioskId, qrId]);
    }

    // Get QR code details
    async getQRCode(qrCode) {
        const query = 'SELECT * FROM qr_codes WHERE qr_code = ?';
        const codes = await this.db.executeQuery(query, [qrCode]);
        return codes[0];
    }
}

// Company Model
class CompanyModel {
    constructor(db) {
        this.db = db;
    }

    // Create new company
    async createCompany(name, contactEmail) {
        const query = `
            INSERT INTO companies (name, contact_email) 
            VALUES (?, ?)
        `;
        const result = await this.db.executeQuery(query, [name, contactEmail]);
        return result.insertId;
    }

    // Get all companies
    async getAllCompanies() {
        const query = 'SELECT * FROM companies ORDER BY name';
        return await this.db.executeQuery(query);
    }
}

// Kiosk Model
class KioskModel {
    constructor(db) {
        this.db = db;
    }

    // Create new kiosk
    async createKiosk(name, location, companyId) {
        const query = `
            INSERT INTO kiosks (name, location, company_id, status) 
            VALUES (?, ?, ?, 'active')
        `;
        const result = await this.db.executeQuery(query, [name, location, companyId]);
        return result.insertId;
    }

    // Get all active kiosks
    async getActiveKiosks() {
        const query = 'SELECT * FROM kiosks WHERE status = "active"';
        return await this.db.executeQuery(query);
    }
}

// Reward Transaction Model
class RewardTransactionModel {
    constructor(db) {
        this.db = db;
    }

    // Create reward transaction
    async createTransaction(userId, amount, method, description) {
        const query = `
            INSERT INTO reward_transactions (user_id, amount, method, description) 
            VALUES (?, ?, ?, ?)
        `;
        const result = await this.db.executeQuery(query, [userId, amount, method, description]);
        return result.insertId;
    }

    // Get user transactions
    async getUserTransactions(userId) {
        const query = `
            SELECT * FROM reward_transactions 
            WHERE user_id = ? 
            ORDER BY created_at DESC
        `;
        return await this.db.executeQuery(query, [userId]);
    }
}

// Return Log Model
class ReturnLogModel {
    constructor(db) {
        this.db = db;
    }

    // Log bottle return
    async logReturn(userId, qrCodeId, kioskId, rewardAmount) {
        const query = `
            INSERT INTO return_logs (user_id, qr_code_id, kiosk_id, returned_at, reward_amount) 
            VALUES (?, ?, ?, NOW(), ?)
        `;
        const result = await this.db.executeQuery(query, [userId, qrCodeId, kioskId, rewardAmount]);
        return result.insertId;
    }

    // Get return statistics
    async getReturnStats() {
        const query = `
            SELECT 
                COUNT(*) as total_returns,
                SUM(reward_amount) as total_rewards,
                DATE(returned_at) as return_date
            FROM return_logs 
            GROUP BY DATE(returned_at)
            ORDER BY return_date DESC
        `;
        return await this.db.executeQuery(query);
    }
}

// Admin Model
class AdminModel {
    constructor(db) {
        this.db = db;
    }

    // Create admin user
    async createAdmin(username, password, role = 'admin') {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = `
            INSERT INTO admins (username, password_hash, role) 
            VALUES (?, ?, ?)
        `;
        const result = await this.db.executeQuery(query, [username, hashedPassword, role]);
        return result.insertId;
    }

    // Verify admin login
    async verifyAdmin(username, password) {
        const query = 'SELECT * FROM admins WHERE username = ?';
        const admins = await this.db.executeQuery(query, [username]);

        if (admins.length === 0) return null;

        const admin = admins[0];
        const isValid = await bcrypt.compare(password, admin.password_hash);

        if (isValid) {
            // Update last login
            await this.db.executeQuery(
                'UPDATE admins SET last_login = NOW() WHERE admin_id = ?',
                [admin.admin_id]
            );
            return admin;
        }

        return null;
    }
}

// Sample Data Insertion
class SampleData {
    constructor(db) {
        this.db = db;
        this.userModel = new UserModel(db);
        this.companyModel = new CompanyModel(db);
        this.kioskModel = new KioskModel(db);
        this.qrCodeModel = new QRCodeModel(db);
        this.adminModel = new AdminModel(db);
    }

    // Insert sample companies
    async insertSampleCompanies() {
        const sampleCompanies = [
            { name: 'Coca-Cola', contact_email: 'contact@cocacola.com' },
            { name: 'PepsiCo', contact_email: 'contact@pepsico.com' },
            { name: 'Tata Steel', contact_email: 'contact@tatasteel.com' }
        ];

        for (const company of sampleCompanies) {
            await this.companyModel.createCompany(company.name, company.contact_email);
        }
        console.log('✅ Sample companies inserted');
    }

    // Insert sample kiosks
    async insertSampleKiosks() {
        const companies = await this.companyModel.getAllCompanies();
        const kiosks = [
            { name: 'Mumbai Central Station Kiosk', location: 'Mumbai Central Railway Station, Mumbai' },
            { name: 'Delhi Metro Kiosk - Rajiv Chowk', location: 'Rajiv Chowk Metro Station, Delhi' },
            { name: 'Bangalore Mall Kiosk', location: 'Phoenix MarketCity, Bangalore' },
            { name: 'Chennai Airport Kiosk', location: 'Chennai International Airport, Chennai' },
            { name: 'Hyderabad Tech Park Kiosk', location: 'HITEC City, Hyderabad' }
        ];

        for (const kiosk of kiosks) {
            // Assign each kiosk to a different company
            const companyId = companies[Math.floor(Math.random() * companies.length)].company_id;
            await this.kioskModel.createKiosk(kiosk.name, kiosk.location, companyId);
        }
        console.log('✅ Sample kiosks inserted');
    }

    // Insert sample users
    async insertSampleUsers() {
        const users = [
            { phoneNumber: '+919876543210', name: 'Rahul Sharma', wallet_balance: 15.50, total_returns: 8 },
            { phoneNumber: '+919876543211', name: 'Priya Patel', wallet_balance: 8.25, total_returns: 4 },
            { phoneNumber: '+919876543212', name: 'Amit Kumar', wallet_balance: 22.75, total_returns: 12 },
            { phoneNumber: '+919876543213', name: 'Neha Singh', wallet_balance: 5.00, total_returns: 2 },
            { phoneNumber: '+919876543214', name: 'Vikram Malhotra', wallet_balance: 18.75, total_returns: 9 },
            { phoneNumber: '+919876543215', name: 'Anjali Desai', wallet_balance: 12.50, total_returns: 6 },
            { phoneNumber: '+919876543216', name: 'Rajesh Gupta', wallet_balance: 30.00, total_returns: 15 },
            { phoneNumber: '+919876543217', name: 'Sneha Iyer', wallet_balance: 7.25, total_returns: 3 },
            { phoneNumber: '+919876543218', name: 'Karan Mehta', wallet_balance: 25.50, total_returns: 13 },
            { phoneNumber: '+919876543219', name: 'Pooja Reddy', wallet_balance: 9.75, total_returns: 5 }
        ];

        for (const user of users) {
            await this.userModel.createUser(user.phoneNumber, user.name, user.wallet_balance, user.total_returns);
        }
        console.log('✅ Sample users inserted with balances and returns');
    }

    // Insert sample QR codes
    async insertSampleQRCodes() {
        const companies = await this.companyModel.getAllCompanies();

        for (let i = 0; i < 50; i++) {
            const companyId = companies[i % companies.length].company_id;
            const qrCode = `BOTTLE_${String(i + 1).padStart(6, '0')}_${Date.now()}`;
            await this.qrCodeModel.createQRCode(qrCode, companyId);
        }
        console.log('✅ Sample QR codes inserted');
    }

    // Insert sample admin
    async insertSampleAdmin() {
        await this.adminModel.createAdmin('admin', 'admin123', 'super_admin');
        console.log('✅ Sample admin inserted (username: admin, password: admin123)');
    }

    // Insert all sample data
    async insertAllSampleData() {
        try {
            await this.insertSampleCompanies();
            await this.insertSampleKiosks();
            await this.insertSampleUsers();
            await this.insertSampleQRCodes();
            await this.insertSampleAdmin();
            console.log('🎉 All sample data inserted successfully!');
        } catch (error) {
            console.error('Error inserting sample data:', error);
        }
    }
}

// Main database class that combines everything
class BottleBackDatabase {
    constructor() {
        this.db = new DatabaseConnection();
        this.userModel = new UserModel(this.db);
        this.qrCodeModel = new QRCodeModel(this.db);
        this.companyModel = new CompanyModel(this.db);
        this.kioskModel = new KioskModel(this.db);
        this.rewardTransactionModel = new RewardTransactionModel(this.db);
        this.returnLogModel = new ReturnLogModel(this.db);
        this.adminModel = new AdminModel(this.db);
        this.sampleData = new SampleData(this.db);
    }

    // Initialize database with sample data
    async initialize() {
        const isConnected = await this.db.testConnection();
        if (isConnected) {
            console.log('🚀 BottleBack Database initialized successfully!');
            return true;
        }
        return false;
    }

    // Close database connection
    async close() {
        await this.db.closeConnection();
    }
}

// Export the main class and individual models
module.exports = {
    BottleBackDatabase,
    DatabaseConnection,
    UserModel,
    QRCodeModel,
    CompanyModel,
    KioskModel,
    RewardTransactionModel,
    ReturnLogModel,
    AdminModel,
    SampleData
};

// Example usage (uncomment to run)
/*
const { BottleBackDatabase } = require('./database');

async function main() {
    const bottleBackDB = new BottleBackDatabase();
    
    // Initialize database
    await bottleBackDB.initialize();
    
    // Insert sample data
    await bottleBackDB.sampleData.insertAllSampleData();
    
    // Example: Get all users
    const users = await bottleBackDB.userModel.getAllUsers();
    console.log('Users:', users);
    
    // Close connection
    await bottleBackDB.close();
}

main().catch(console.error);
*/
