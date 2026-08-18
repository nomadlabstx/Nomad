require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local', override: true });

const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_KEY;

async function main() {
  console.log('Key prefix:', key ? key.slice(0, 8) + '...' : 'MISSING');

  const body = { input: 'Hartford CT', languageCode: 'en' };
  const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.error) {
    console.log('Autocomplete FAIL:', data.error.status, data.error.message);
  } else {
    console.log('Autocomplete OK:', (data.suggestions || []).length, 'suggestions');
  }
}

main().catch(console.error);
