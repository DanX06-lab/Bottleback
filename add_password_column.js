const { BottleBackDatabase } = require('./database');

async function addPasswordColumn() {
    console.log('🔧 Adding password_hash column to users table...\n');

    const bottleBackDB = new BottleBackDatabase();

    try {
        // Initialize database connection
        await bottleBackDB.initialize();

        // Check if password_hash column already exists
        const columns = await bottleBackDB.db.executeQuery(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'bottleback_system' 
            AND TABLE_NAME = 'users' 
            AND COLUMN_NAME = 'password_hash'
        `);

        if (columns.length > 0) {
            console.log('✅ password_hash column already exists in users table');
            return;
        }

        // Add password_hash column
        await bottleBackDB.db.executeQuery(`
            ALTER TABLE users 
            ADD COLUMN password_hash VARCHAR(255) NULL
        `);

        console.log('✅ Successfully added password_hash column to users table');

        // Update existing users with a default password (for testing)
        const users = await bottleBackDB.userModel.getAllUsers();
        const bcrypt = require('bcrypt');

        for (const user of users) {
            if (!user.password_hash) {
                const defaultPassword = 'password123';
                const hash = await bcrypt.hash(defaultPassword, 10);
                await bottleBackDB.db.executeQuery(
                    'UPDATE users SET password_hash = ? WHERE user_id = ?',
                    [hash, user.user_id]
                );
                console.log(`✅ Set default password for user: ${user.name} (phone: ${user.phone})`);
            }
        }

        console.log('\n🎉 Password column setup completed!');
        console.log('\n📋 Default passwords for existing users:');
        console.log('- Password: password123');
        console.log('- Use phone as username');

    } catch (error) {
        console.error('❌ Error adding password column:', error);
    } finally {
        await bottleBackDB.close();
    }
}

// Run the script
addPasswordColumn().catch(console.error); 