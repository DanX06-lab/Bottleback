const { BottleBackDatabase } = require('./database');

async function initializeDatabase() {
    console.log('🚀 Initializing BottleBack India Database...\n');

    const bottleBackDB = new BottleBackDatabase();

    try {
        // Test connection
        console.log('1. Testing database connection...');
        const isConnected = await bottleBackDB.initialize();

        if (!isConnected) {
            console.error('❌ Database connection failed!');
            console.error('Please ensure:');
            console.error('- MySQL server is running');
            console.error('- Database "botalsepaisa_system" exists');
            console.error('- Database credentials are correct in database.js');
            return;
        }

        // Insert sample data
        console.log('\n2. Inserting sample data...');
        await bottleBackDB.sampleData.insertAllSampleData();

        // Verify data insertion
        console.log('\n3. Verifying data insertion...');

        const users = await bottleBackDB.userModel.getAllUsers();
        const companies = await bottleBackDB.companyModel.getAllCompanies();
        const kiosks = await bottleBackDB.kioskModel.getActiveKiosks();

        console.log(`✅ Users: ${users.length}`);
        console.log(`✅ Companies: ${companies.length}`);
        console.log(`✅ Kiosks: ${kiosks.length}`);

        console.log('\n🎉 Database initialization completed successfully!');
        console.log('\n📋 Next steps:');
        console.log('1. Run "npm test" to test all functionality');
        console.log('2. Start building your application');
        console.log('3. Admin login: username="admin", password="admin123"');

    } catch (error) {
        console.error('❌ Error during initialization:', error);
        console.error('\nTroubleshooting:');
        console.error('1. Check MySQL server status');
        console.error('2. Verify database schema is created');
        console.error('3. Check database credentials');
    } finally {
        await bottleBackDB.close();
    }
}

// Run initialization
initializeDatabase().catch(console.error); 