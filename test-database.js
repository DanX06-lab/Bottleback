const { BottleBackDatabase } = require('./database');

async function testDatabase() {
    console.log('🚀 Starting BottleBack Database Test...\n');

    const bottleBackDB = new BottleBackDatabase();

    try {
        // Test database connection
        console.log('1. Testing database connection...');
        const isConnected = await bottleBackDB.initialize();

        if (!isConnected) {
            console.error('❌ Database connection failed. Please check your MySQL configuration.');
            return;
        }

        // Insert sample data
        console.log('\n2. Inserting sample data...');
        await bottleBackDB.sampleData.insertAllSampleData();

        // Test user operations
        console.log('\n3. Testing user operations...');
        const users = await bottleBackDB.userModel.getAllUsers();
        console.log(`📊 Total users in database: ${users.length}`);

        if (users.length > 0) {
            console.log('👥 Sample users:');
            users.slice(0, 3).forEach(user => {
                console.log(`   - ${user.name} (${user.phone}) - Balance: ₹${user.wallet_balance}`);
            });
        }

        // Test company operations
        console.log('\n4. Testing company operations...');
        const companies = await bottleBackDB.companyModel.getAllCompanies();
        console.log(`🏢 Total companies: ${companies.length}`);
        companies.forEach(company => {
            console.log(`   - ${company.name}`);
        });

        // Test kiosk operations
        console.log('\n5. Testing kiosk operations...');
        const kiosks = await bottleBackDB.kioskModel.getActiveKiosks();
        console.log(`🏪 Total active kiosks: ${kiosks.length}`);
        kiosks.forEach(kiosk => {
            console.log(`   - ${kiosk.name} (${kiosk.location})`);
        });

        // Test QR code operations
        console.log('\n6. Testing QR code operations...');
        const qrCodes = await bottleBackDB.qrCodeModel.getQRCode('BOTTLE_000001_' + Date.now().toString().slice(-10));
        console.log('🔍 QR Code search completed');

        // Test admin operations
        console.log('\n7. Testing admin operations...');
        const admin = await bottleBackDB.adminModel.verifyAdmin('admin', 'admin123');
        if (admin) {
            console.log('✅ Admin login successful');
        } else {
            console.log('❌ Admin login failed');
        }

        // Simulate a bottle return transaction
        console.log('\n8. Simulating bottle return transaction...');
        if (users.length > 0 && companies.length > 0 && kiosks.length > 0) {
            const user = users[0];
            const company = companies[0];
            const kiosk = kiosks[0];
            const rewardAmount = 1.50; // ₹1.50 per bottle

            // Create a QR code for testing
            const qrCodeId = await bottleBackDB.qrCodeModel.createQRCode(
                `TEST_QR_${Date.now()}`,
                company.company_id
            );

            // Log the return
            const returnId = await bottleBackDB.returnLogModel.logReturn(
                user.user_id,
                qrCodeId,
                kiosk.kiosk_id,
                rewardAmount
            );

            // Update user wallet
            await bottleBackDB.userModel.updateWalletBalance(user.user_id, rewardAmount);

            // Create reward transaction
            await bottleBackDB.rewardTransactionModel.createTransaction(
                user.user_id,
                rewardAmount,
                'UPI',
                'Bottle return reward'
            );

            console.log(`✅ Bottle return logged successfully!`);
            console.log(`   User: ${user.name}`);
            console.log(`   Reward: ₹${rewardAmount}`);
            console.log(`   Kiosk: ${kiosk.name}`);

            // Get updated user info
            const updatedUser = await bottleBackDB.userModel.getUserByPhone(user.phone);
            console.log(`   Updated balance: ₹${updatedUser.wallet_balance}`);
        }

        // Get return statistics
        console.log('\n9. Getting return statistics...');
        const stats = await bottleBackDB.returnLogModel.getReturnStats();
        console.log(`📈 Return statistics: ${stats.length} days of data`);

        console.log('\n🎉 All database tests completed successfully!');

    } catch (error) {
        console.error('❌ Error during database test:', error);
    } finally {
        // Close database connection
        await bottleBackDB.close();
        console.log('\n🔒 Database connection closed.');
    }
}

// Run the test
testDatabase().catch(console.error); 