require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function main() {
    console.log('API Key:', (process.env.GEMINI_API_KEY || '').substring(0, 15) + '...');

    const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-latest'];

    for (const name of models) {
        console.log(`\nTesting ${name}...`);
        try {
            const model = genAI.getGenerativeModel({ model: name });
            const result = await model.generateContent('Reply with just "OK" in Korean');
            console.log(`✅ ${name}: ${result.response.text().trim()}`);
            return; // Success, stop
        } catch (e) {
            console.log(`❌ ${name}: ${e.status || ''} ${(e.message || '').substring(0, 80)}`);
        }
    }
}

main();
