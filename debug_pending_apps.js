const db = require('./database');

async function debugPendingApps() {
    try {
        console.log('🔍 Checking database for Pending Applications...');

        // 1. Check raw applications table
        const [allApps] = await db.query('SELECT * FROM applications');
        console.log(`📊 Total Applications in DB: ${allApps.length}`);
        if (allApps.length > 0) {
            console.log('Latest 3 Applications:', allApps.slice(0, 3));
        }

        // 2. Check Pending Applications with correct Status
        const [pendingOnly] = await db.query("SELECT * FROM applications WHERE status = 'PENDING'");
        console.log(`⏱️  Applications with Status='PENDING': ${pendingOnly.length}`);

        // 3. Run the specific Dashboard Query
        console.log('🚀 Running Dashboard Query (JOIN students)...');
        const [dashboardRows] = await db.query(`
            SELECT a.*, 
                   s.full_name, s.email, s.mobile_no, 
                   s.gender, s.college_name, s.degree, s.department
            FROM applications a 
            JOIN students s ON a.student_id = s.id 
            WHERE a.status = 'PENDING' 
            ORDER BY a.applied_at DESC
        `);

        console.log(`✅ Dashboard Query returned ${dashboardRows.length} rows.`);
        if (dashboardRows.length > 0) {
            console.log('First Row Data:', dashboardRows[0]);
        } else {
            console.log('⚠️  No pending applications found via Dashboard Query.');
            if (pendingOnly.length > 0) {
                console.log('❗ Mismatch: There ARE pending applications, but the JOIN failed. Check student_id integrity.');
            }
        }

        process.exit(0);

    } catch (err) {
        console.error('❌ Database Error:', err);
        process.exit(1);
    }
}

debugPendingApps();
