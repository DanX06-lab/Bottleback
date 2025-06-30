# BottleBack India Database System

A comprehensive database system for BottleBack India - A smart, tech-driven initiative to reduce plastic waste by incentivizing consumers to return used PET bottles.

## 🎯 Project Overview

BottleBack India is an India-specific version of Germany's Pfand system, designed to:
- Reduce plastic waste through incentivized bottle returns
- Create a network of collection points (kirana stores and digital kiosks)
- Provide UPI-based rewards (₹1–₹2 per bottle)
- Track bottle flow, reward disbursement, and logistics
- Support CSR funding and recyclables resale

## 🏗️ Database Schema

The system includes the following core tables:

- **users** - Consumer profiles with wallet balances
- **qr_codes** - Bottle identification and tracking
- **companies** - FMCG brands (Bisleri, Coca-Cola, etc.)
- **kiosks** - Collection points and kirana stores
- **reward_transactions** - UPI payment tracking
- **return_logs** - Bottle return history
- **admins** - System administration
- **location_heatmap** - Collection analytics
- **scheduled_jobs** - Automated tasks

## 🚀 Quick Start

### Prerequisites

1. **Node.js** (v14 or higher)
2. **MySQL** (v8.0 or higher)
3. **MySQL Workbench** (optional, for database management)

### Installation

1. **Clone or download the project files**

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure MySQL database:**
   - Create a MySQL database named `bottleback_system`
   - Update database credentials in `database.js`:
   ```javascript
   const dbConfig = {
       host: 'localhost',
       user: 'your_username',
       password: 'your_password',
       database: 'bottleback_system',
       port: 3306
   };
   ```

4. **Run the database schema:**
   - Execute the SQL commands provided in your database setup
   - Or use the provided schema file

5. **Test the connection:**
   ```bash
   npm test
   ```

## 📊 Sample Data

The system includes sample data for testing:

### Users (10 sample users)
- Rahul Sharma, Priya Patel, Amit Kumar, etc.
- Phone numbers: +919876543210 to +919876543219
- Initial wallet balance: ₹0.00

### Companies (4 major brands)
- Bisleri International Pvt Ltd
- Coca-Cola India
- Parle Agro Pvt Ltd
- PepsiCo India

### Kiosks (5 locations)
- Mumbai Central Station Kiosk
- Delhi Metro Kiosk - Rajiv Chowk
- Bangalore Mall Kiosk
- Chennai Airport Kiosk
- Hyderabad Tech Park Kiosk

### Admin Access
- Username: `admin`
- Password: `admin123`

## 🔧 Usage Examples

### Basic Database Operations

```javascript
const { BottleBackDatabase } = require('./database');

async function example() {
    const db = new BottleBackDatabase();
    await db.initialize();
    
    // Get all users
    const users = await db.userModel.getAllUsers();
    console.log(users);
    
    // Create new user
    const userId = await db.userModel.createUser('+919876543220', 'New User');
    
    // Update wallet balance
    await db.userModel.updateWalletBalance(userId, 2.50);
    
    await db.close();
}
```

### Bottle Return Process

```javascript
// 1. Scan QR code
const qrCode = await db.qrCodeModel.getQRCode('BOTTLE_000001_1234567890');

// 2. Log the return
const returnId = await db.returnLogModel.logReturn(
    userId, 
    qrCode.qr_id, 
    kioskId, 
    1.50 // reward amount
);

// 3. Update user wallet
await db.userModel.updateWalletBalance(userId, 1.50);

// 4. Create transaction record
await db.rewardTransactionModel.createTransaction(
    userId,
    1.50,
    'UPI',
    'Bottle return reward'
);
```

## 🏪 Business Logic

### Reward Structure
- **Consumer reward**: ₹1.00 - ₹2.00 per bottle
- **Kirana store incentive**: ₹0.25 - ₹0.50 per bottle
- **Platform commission**: ₹0.10 - ₹0.25 per bottle

### QR Code System
- Unique QR codes for each bottle
- Company-specific identification
- Fraud prevention through usage tracking
- Real-time scanning validation

### UPI Integration
- Instant reward disbursement
- Transaction tracking
- Payment reconciliation
- Digital wallet management

## 📈 Analytics & Reporting

The system provides comprehensive analytics:

```javascript
// Get return statistics
const stats = await db.returnLogModel.getReturnStats();

// Get user transactions
const transactions = await db.rewardTransactionModel.getUserTransactions(userId);

// Get kiosk performance
const kiosks = await db.kioskModel.getActiveKiosks();
```

## 🔒 Security Features

- **Password hashing** using bcrypt
- **SQL injection prevention** with parameterized queries
- **Connection pooling** for performance
- **Transaction logging** for audit trails
- **Admin role management**

## 🛠️ API Endpoints (Future)

The database system is designed to support RESTful APIs:

- `GET /api/users` - Get all users
- `POST /api/users` - Create new user
- `GET /api/users/:id/transactions` - Get user transactions
- `POST /api/returns` - Log bottle return
- `GET /api/analytics/returns` - Get return statistics
- `POST /api/admin/login` - Admin authentication

## 🚀 Deployment

### Production Setup

1. **Environment Variables:**
   ```bash
   DB_HOST=your-production-host
   DB_USER=your-production-user
   DB_PASSWORD=your-production-password
   DB_NAME=bottleback_system
   ```

2. **Database Optimization:**
   - Enable query caching
   - Configure connection pooling
   - Set up automated backups
   - Monitor performance metrics

3. **Security:**
   - Use SSL connections
   - Implement rate limiting
   - Set up firewall rules
   - Regular security audits

## 📞 Support

For technical support or questions:
- Email: support@bottlebackindia.com
- Documentation: https://docs.bottlebackindia.com
- GitHub Issues: [Project Repository]

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**BottleBack India** - Making recycling rewarding! 🌱♻️ 