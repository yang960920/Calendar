const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function main() {
    await client.connect();
    const res = await client.query('SELECT id, name, "departmentId" FROM "User"');
    console.log("Users in NeonDB:");
    console.table(res.rows);
    await client.end();
}

main().catch(console.error);
