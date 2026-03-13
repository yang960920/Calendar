const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
    await client.connect();

    const r = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='Task' ORDER BY ordinal_position`);
    console.log('Task columns:', r.rows.map(x => x.column_name).join(', '));

    const u = await client.query('SELECT id, name, role FROM "User"');
    console.log('Users:', JSON.stringify(u.rows));

    const p = await client.query('SELECT id, name FROM "Project"');
    console.log('Projects:', JSON.stringify(p.rows));

    await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
