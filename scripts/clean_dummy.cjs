const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
    await client.connect();

    // 순서가 중요: FK 제약 때문에 자식 → 부모 순으로 삭제
    console.log('더미 데이터 정리 중...');
    await client.query('DELETE FROM "SubTaskComment"');
    await client.query('DELETE FROM "ActivityLog"');
    await client.query('DELETE FROM "SubTask"');
    await client.query('DELETE FROM "Attachment"');
    await client.query('DELETE FROM "Task"');
    await client.query('DELETE FROM "Project"');
    console.log('기존 더미 데이터 삭제 완료');

    await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
