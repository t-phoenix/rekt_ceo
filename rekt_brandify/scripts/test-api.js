import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Blob } from 'buffer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_URL = 'http://localhost:3001/api';

async function testApi() {
  console.log('🧪 Starting API Test...');
  
  // 1. Find a test image
  const imgPath = path.resolve(__dirname, '../../rekt_website/src/creatives/memes/Horny/Donald 1.jpg');
  if (!fs.existsSync(imgPath)) {
    throw new Error(`Test image not found at ${imgPath}`);
  }

  // 2. Start Session (Upload + Vision)
  console.log('⬆️  Testing POST /api/sessions/start...');
  
  const buffer = fs.readFileSync(imgPath);
  const blob = new Blob([buffer], { type: 'image/jpeg' });
  const form = new FormData();
  form.append('image', blob, 'Donald 1.jpg');
  form.append('customTarget', 'the background sky');

  const startRes = await fetch(`${API_URL}/sessions/start`, {
    method: 'POST',
    body: form
  });

  if (!startRes.ok) throw new Error(await startRes.text());
  const startData = await startRes.json();
  
  console.log('✅ Session started successfully!');
  console.log('Session ID:', startData.sessionId);
  console.log('Uploaded Image URL:', startData.imageUrl);
  console.log('Vision Strategy Elements Count:', startData.strategy.elements.length);

  // 3. Generate Branded Image
  console.log('\n🤖 Testing POST /api/generate...');
  const generateRes = await fetch(`${API_URL}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: startData.sessionId,
      userCuratedChoices: [
        { element: 'the background sky', idea: 'Make it a bright Rekt CEO neon sign' }
      ]
    })
  });

  if (!generateRes.ok) throw new Error(await generateRes.text());
  const generateData = await generateRes.json();
  console.log('✅ Generation successful!');
  console.log('Generated Image URL:', generateData.generatedImageUrl);
  console.log('Engine Used:', generateData.engineUsed);

  // 4. Rate Session
  console.log('\n⭐ Testing POST /api/sessions/rate...');
  const rateRes = await fetch(`${API_URL}/sessions/rate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: startData.sessionId,
      rating: 'Like'
    })
  });

  if (!rateRes.ok) throw new Error(await rateRes.text());
  const rateData = await rateRes.json();
  console.log('✅ Rating successful! Database updated.');
  
  console.log('\n🎉 All API endpoints working perfectly!');
}

testApi().catch(console.error);
