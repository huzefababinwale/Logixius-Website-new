const db = require('./database');

async function testConnection() {
    try {
        console.log('Testing database connection...');
        const [rows] = await db.query('SELECT 1 as val');
        console.log('✅ Connection Successful! Value returned:', rows[0].val);
        process.exit(0);
    } catch (err) {
        console.error('❌ Connection Failed:', err.message);
        process.exit(1);
    }
}

testConnection();
