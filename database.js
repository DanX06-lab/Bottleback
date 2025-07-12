require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

// Database Configuration
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Database connection class
class DatabaseConnection {
    constructor() {
        this.pool = pool;
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
            const [rows] = await this.pool.execute(query, params);
            return rows;
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
    async createUser(phoneNumber, name, wallet_balance = 0, bottles_returned = 0) {
        const query = `
            INSERT INTO users (phone_number, name, wallet_balance, bottles_returned) 
            VALUES (?, ?, ?, ?)
        `;
        const result = await this.db.executeQuery(query, [phoneNumber, name, wallet_balance, bottles_returned]);
        return result.insertId;
    }

    // Get user by phone number
    async getUserByPhone(phoneNumber) {
        const query = 'SELECT * FROM users WHERE phone_number = ?';
        const users = await this.db.executeQuery(query, [phoneNumber]);
        return users[0];
    }

    // Update user wallet balance
    async updateWalletBalance(userId, amount) {
        const query = `
            UPDATE users 
            SET wallet_balance = wallet_balance + ?, 
                bottles_returned = bottles_returned + 1 
            WHERE user_id = ?
        `;
        return await this.db.executeQuery(query, [amount, userId]);
    }

    // Get all users
    async getAllUsers() {
        const query = 'SELECT * FROM users ORDER BY user_id ASC';
        return await this.db.executeQuery(query);
    }

    // Store QR code for user
    async storeQRCode(phoneNumber, qrCode) {
        const query = `
            UPDATE users 
            SET qr_code_value = ? 
            WHERE phone_number = ?
        `;
        return await this.db.executeQuery(query, [qrCode, phoneNumber]);
    }

    // Get user by QR code
    async getUserByQRCode(qrCode) {
        const query = 'SELECT * FROM users WHERE qr_code_value = ?';
        const users = await this.db.executeQuery(query, [qrCode]);
        return users[0];
    }
}

// QR Code Model
class QRCodeModel {
    constructor(db) {
        this.db = db;
    }

    // Create new QR code
    async createQRCode(qrCode, companyId, timestamp) {
        const query = `
            INSERT INTO qr_code_values (qr_code_value, company_id, created_at, status)
            VALUES (?, ?, FROM_UNIXTIME(?), 'unused')
        `;
        const result = await this.db.executeQuery(query, [qrCode, companyId, timestamp]);
        return result.insertId;
    }

    // Mark QR code as used
    async markQRCodeAsUsed(qrCode, userId, kioskId) {
        const query = `
            UPDATE qr_code_values 
            SET status = 'used',
                assigned_to_user_id = ?,
                kiosk_id = ?,
                used_at = NOW()
            WHERE qr_code_value = ?
        `;
        return await this.db.executeQuery(query, [userId, kioskId, qrCode]);
    }

    // Get QR code details
    async getQRCode(qrCode) {
        const query = 'SELECT * FROM qr_code_values WHERE qr_code_value = ?';
        const codes = await this.db.executeQuery(query, [qrCode]);
        return codes[0];
    }

    // Get all unused QR codes
    async getUnusedQRCodes() {
        const query = 'SELECT * FROM qr_code_values WHERE status = "unused" ORDER BY created_at DESC';
        return await this.db.executeQuery(query);
    }
}

// Company Model
class CompanyModel {
    constructor(db) {
        this.db = db;
    }

    // Create new company
    async createCompany(name, contactEmail, logoUrl) {
        const query = `
            INSERT INTO companies (name, contact_email, logo_url) 
            VALUES (?, ?, ?)
        `;
        const result = await this.db.executeQuery(query, [name, contactEmail, logoUrl]);
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
    async createKiosk(name, location) {
        const query = `
            INSERT INTO kiosks (name, location) 
            VALUES (?, ?)
        `;
        const result = await this.db.executeQuery(query, [name, location]);
        return result.insertId;
    }

    // Get all active kiosks
    async getActiveKiosks() {
        const query = 'SELECT * FROM kiosks WHERE is_active = TRUE';
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
        const companies = [
            { name: 'Bisleri International Pvt Ltd', contactEmail: 'csr@bisleri.com', logoUrl: 'https://bisleri.com/logo.png' },
            { name: 'Coca-Cola India', contactEmail: 'sustainability@coca-cola.in', logoUrl: 'https://coca-cola.in/logo.png' },
            { name: 'Parle Agro Pvt Ltd', contactEmail: 'csr@parleagro.com', logoUrl: 'https://parleagro.com/logo.png' },
            { name: 'PepsiCo India', contactEmail: 'csr@pepsico.in', logoUrl: 'https://pepsico.in/logo.png' }
        ];

        for (const company of companies) {
            await this.companyModel.createCompany(company.name, company.contactEmail, company.logoUrl);
        }
        console.log('✅ Sample companies inserted');
    }

    // Insert sample kiosks
    async insertSampleKiosks() {
        const kiosks = [
            { name: 'Mumbai Central Station Kiosk', location: 'Mumbai Central Railway Station, Mumbai' },
            { name: 'Delhi Metro Kiosk - Rajiv Chowk', location: 'Rajiv Chowk Metro Station, Delhi' },
            { name: 'Bangalore Mall Kiosk', location: 'Phoenix MarketCity, Bangalore' },
            { name: 'Chennai Airport Kiosk', location: 'Chennai International Airport, Chennai' },
            { name: 'Hyderabad Tech Park Kiosk', location: 'HITEC City, Hyderabad' }
        ];

        for (const kiosk of kiosks) {
            await this.kioskModel.createKiosk(kiosk.name, kiosk.location);
        }
        console.log('✅ Sample kiosks inserted');
    }

    // Insert sample users
    async insertSampleUsers() {
        const users = [
            { phoneNumber: '+919876543210', name: 'Rahul Sharma', wallet_balance: 15.50, bottles_returned: 8 },
            { phoneNumber: '+919876543211', name: 'Priya Patel', wallet_balance: 8.25, bottles_returned: 4 },
            { phoneNumber: '+919876543212', name: 'Amit Kumar', wallet_balance: 22.75, bottles_returned: 12 },
            { phoneNumber: '+919876543213', name: 'Neha Singh', wallet_balance: 5.00, bottles_returned: 2 },
            { phoneNumber: '+919876543214', name: 'Vikram Malhotra', wallet_balance: 18.75, bottles_returned: 9 },
            { phoneNumber: '+919876543215', name: 'Anjali Desai', wallet_balance: 12.50, bottles_returned: 6 },
            { phoneNumber: '+919876543216', name: 'Rajesh Gupta', wallet_balance: 30.00, bottles_returned: 15 },
            { phoneNumber: '+919876543217', name: 'Sneha Iyer', wallet_balance: 7.25, bottles_returned: 3 },
            { phoneNumber: '+919876543218', name: 'Karan Mehta', wallet_balance: 25.50, bottles_returned: 13 },
            { phoneNumber: '+919876543219', name: 'Pooja Reddy', wallet_balance: 9.75, bottles_returned: 5 }
        ];

        for (const user of users) {
            await this.userModel.createUser(user.phoneNumber, user.name, user.wallet_balance, user.bottles_returned);
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
