/**
 * One-off Gemini API connectivity check (run from project root).
 * Usage: node scripts/test-gemini-connection.js
 */
require('dotenv').config();
if (!process.argv.includes('--env-only')) {
  require('dotenv').config({ path: '.env.local', override: true });
}

const { GoogleGenerativeAI } = require('@google/generative-ai');

const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'];

async function tryModel(modelName) {
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: modelName });
  const result = await model.generateContent("Reply with exactly: connected");
  const text = result.response.text();
  return { modelName, text: text.trim().slice(0, 80) };
}

async function main() {
  console.log('GEMINI_KEY_SET:', Boolean(key));
  console.log('GEMINI_KEY_LENGTH:', key.length);

  if (!key) {
    console.error('FAIL: EXPO_PUBLIC_GEMINI_API_KEY is not set in .env or .env.local');
    process.exit(1);
  }

  for (const modelName of modelsToTry) {
    try {
      const result = await tryModel(modelName);
      console.log('PASS:', result.modelName, '->', result.text);
      process.exit(0);
    } catch (err) {
      console.error('FAIL:', modelName, '-', err.message || err);
    }
  }

  process.exit(1);
}

main();
