const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
    await client.connect();

    const tables = ['Department', 'User', 'Project', 'Task', 'SubTask', 'Attachment', 'ActivityLog'];

    for (const table of tables) {
        try {
            const res = await client.query(`SELECT COUNT(*) as cnt FROM "${table}"`);
            console.log(`${table}: ${res.rows[0].cnt}`);
        } catch (e) {
            console.log(`${table}: ERROR - ${e.message.split('\n')[0]}`);
        }
    }

    console.log('---');
    // 최근 Task 5건
    try {
        const tasks = await client.query('SELECT id, title, status FROM "Task" LIMIT 5');
        console.log('Recent Tasks:');
        tasks.rows.forEach(r => console.log(`  ${r.id} | ${r.title} | ${r.status}`));
    } catch (e) {
        console.log('Task query error:', e.message.split('\n')[0]);
    }

    await client.end();
}

main().catch(console.error);
