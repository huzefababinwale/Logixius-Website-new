/**
 * Run this script ONCE to create all tables in your Aiven database.
 * Usage: node setup_db.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function setupDatabase() {
    let connection;
    try {
        console.log('🔄 Connecting to Aiven MySQL...');
        console.log(`   Host: ${process.env.DB_HOST}`);
        console.log(`   Port: ${process.env.DB_PORT}`);
        console.log(`   Database: ${process.env.DB_NAME}`);

        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            ssl: {
                rejectUnauthorized: false
            }
        });

        console.log('✅ Connected to Aiven MySQL!\n');

        // Create Admins Table
        console.log('📦 Creating admins table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS admins (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   ✅ admins table created.');

        // Create Certificates Table
        console.log('📦 Creating certificates table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS certificates (
                id INT AUTO_INCREMENT PRIMARY KEY,
                intern_id VARCHAR(50) NOT NULL UNIQUE,
                student_name VARCHAR(100) NOT NULL,
                domain VARCHAR(100) NOT NULL,
                start_date DATE,
                end_date DATE,
                duration VARCHAR(50),
                issue_date DATE DEFAULT (CURRENT_DATE),
                qr_code_path TEXT,
                certificate_file_path VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   ✅ certificates table created.');

        // Create Students Table
        console.log('📦 Creating students table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS students (
                id INT AUTO_INCREMENT PRIMARY KEY,
                full_name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE,
                mobile_no VARCHAR(15) NOT NULL UNIQUE,
                gender VARCHAR(10),
                college_name VARCHAR(150),
                degree VARCHAR(100),
                department VARCHAR(100),
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   ✅ students table created.');

        // Create Applications Table
        console.log('📦 Creating applications table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS applications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                domain VARCHAR(100) NOT NULL,
                status ENUM('PENDING', 'ONGOING', 'COMPLETED', 'REJECTED') DEFAULT 'PENDING',
                intern_id VARCHAR(50),
                offer_letter_path VARCHAR(255),
                certificate_path VARCHAR(255),
                start_date DATE,
                completion_date DATE,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
            )
        `);
        console.log('   ✅ applications table created.');

        // Insert Default Admin
        const bcrypt = require('bcrypt');
        const adminPassword = 'admin123';
        const hash = await bcrypt.hash(adminPassword, 10);

        console.log('\n👤 Creating default admin user...');
        await connection.execute(`
            INSERT IGNORE INTO admins (username, password_hash) VALUES (?, ?)
        `, ['admin', hash]);
        console.log('   ✅ Default admin created (username: admin, password: admin123)');

        console.log('\n🎉 Database setup complete! All tables are ready.');
        console.log('   You can now start your server with: node server.js');

    } catch (err) {
        console.error('\n❌ Error:', err.message);
    } finally {
        if (connection) await connection.end();
    }
}

setupDatabase();
