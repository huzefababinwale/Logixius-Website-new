const mysql = require('mysql2/promise');
const { spawn, execSync, exec } = require('child_process');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function run() {
    let pool;
    let server;
    let appId;

    try {
        console.log('--- STARTING VERIFICATION ---');

        // 1. DB Connection
        const dbConfig = {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        };
        pool = await mysql.createPool(dbConfig);
        console.log('Database connected.');

        // 2. Clean Data & Setup
        console.log('Cleaning up old test data...');
        await pool.query('DELETE FROM applications WHERE student_id IN (SELECT id FROM students WHERE email="test@student.com" OR mobile_no="1234567890")');
        await pool.query('DELETE FROM certificates WHERE intern_id LIKE "LOGX-7890%"');
        await pool.query('DELETE FROM students WHERE email="test@student.com" OR mobile_no="1234567890"');
        await pool.query('DELETE FROM admins WHERE username="testadmin"');

        // 3. Insert Test Admin
        console.log('Inserting Test Admin...');
        const passHash = await bcrypt.hash('password123', 10);
        await pool.query('INSERT INTO admins (username, password_hash) VALUES (?, ?)', ['testadmin', passHash]);

        // 4. Insert Test Student
        console.log('Inserting Test Student...');
        const [studentResult] = await pool.query(`
            INSERT INTO students (full_name, email, mobile_no, password_hash, gender, college_name, degree, department)
            VALUES ('Test Student', 'test@student.com', '1234567890', ?, 'Male', 'Test College', 'B.Tech', 'CS')
        `, [passHash]);
        const studentId = studentResult.insertId;

        // 5. Insert Pending Application
        console.log('Inserting Pending Application...');
        const [appResult] = await pool.query(`
            INSERT INTO applications (student_id, domain, status, applied_at)
            VALUES (?, 'Web Development', 'PENDING', NOW())
        `, [studentId]);
        appId = appResult.insertId;
        console.log(`Application Created. ID: ${appId}`);

        // 6. Start Server
        console.log('Starting Server in background...');
        const serverPath = path.join(__dirname, '../server.js');
        const cwdPath = path.join(__dirname, '../');
        server = spawn('node', [serverPath], { cwd: cwdPath, stdio: 'pipe' });

        let serverStarted = false;
        server.stdout.on('data', (data) => {
            // console.log(`[SERVER]: ${data}`);
            if (data.toString().includes('Server running')) {
                serverStarted = true;
            }
        });
        server.stderr.on('data', (data) => {
            console.error(`[SERVER ERR]: ${data}`);
        });

        // Wait for server to start
        console.log('Waiting for server...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 7. Login Admin
        console.log('Attempting Admin Login...');
        // We run curl from the current directory (project root presumably), so cookies.txt will be there.
        // We'll use absolute path for cookie jar to be safe.
        const cookieFile = path.join(__dirname, 'cookies.txt');
        if (fs.existsSync(cookieFile)) fs.unlinkSync(cookieFile);

        try {
            execSync(`curl -s -c "${cookieFile}" -X POST -d "username=testadmin&password=password123" http://localhost:3000/admin/login`);
        } catch (e) {
            throw new Error('Login failed (curl error)');
        }

        // Verify login success (cookie file should exist and contain something)
        if (!fs.existsSync(cookieFile)) {
            throw new Error('Login failed: cookie file not created');
        }

        // 8. Approve Application (This triggers the fix verification)
        console.log('Testing Approval (POST /admin/approve)...');
        // Need dummy file
        const dummyPdf = path.join(__dirname, 'dummy.pdf');

        // IMPORTANT: The field name must be "offer_letter" as per my fix
        const approveCmd = `curl -s -b "${cookieFile}" -X POST -F "offer_letter=@${dummyPdf}" http://localhost:3000/admin/approve/${appId}`;
        execSync(approveCmd);

        // 9. Verify Approval in DB
        console.log('Verifying Approval in Database...');
        const [rowsOngoing] = await pool.query('SELECT * FROM applications WHERE id = ?', [appId]);
        const appOngoing = rowsOngoing[0];

        if (appOngoing.status !== 'ONGOING') {
            throw new Error(`Approval Failed. Status is ${appOngoing.status}, expected ONGOING. Note: If it says PENDING, the form field fix might not have worked or server crashed.`);
        }
        if (!appOngoing.intern_id || !appOngoing.start_date) {
            throw new Error('Approval Failed. Intern ID or Start Date missing.');
        }
        console.log('Approval SUCCESS. Status: ONGOING, InternID:', appOngoing.intern_id);

        // 10. Complete Application
        console.log('Testing Completion (POST /admin/complete)...');
        // The field name for complete is "certificate_file"
        const completeCmd = `curl -s -b "${cookieFile}" -X POST -F "certificate_file=@${dummyPdf}" http://localhost:3000/admin/complete/${appId}`;
        execSync(completeCmd);

        // 11. Verify Completion in DB
        console.log('Verifying Completion in Database...');
        const [rowsCompleted] = await pool.query('SELECT * FROM applications WHERE id = ?', [appId]);
        const appCompleted = rowsCompleted[0];

        if (appCompleted.status !== 'COMPLETED') {
            throw new Error(`Completion Failed. Status is ${appCompleted.status}, expected COMPLETED.`);
        }
        if (!appCompleted.completion_date) {
            throw new Error('Completion Failed. Completion Date missing.');
        }
        console.log('Completion SUCCESS. Status: COMPLETED, Date:', appCompleted.completion_date);

        console.log('\n--- ALL VERIFICATIONS PASSED ---');

    } catch (err) {
        console.error('\n!!! TEST FAILED !!!');
        console.error(err);
    } finally {
        if (server) {
            console.log('Stopping server...');
            server.kill();
        }
        if (pool) await pool.end();
        process.exit(0);
    }
}

run();
