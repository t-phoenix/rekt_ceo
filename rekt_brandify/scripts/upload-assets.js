import path from 'path';
import { uploadImageToStableStudio } from './agentcash-client.js';

const ROOT = path.resolve(process.cwd());

const assetsToUpload = [
  path.join(ROOT, 'brand_assets', 'rekt.png'),
  path.join(ROOT, 'brand_assets', 'rekt_stickers', 'Rekt_logo_2D.png'),
  path.join(ROOT, 'brand_assets', 'rekt_stickers', 'Rekt_logo_3D.png'),
  path.join(ROOT, 'brand_assets', 'rekt_stickers', 'happy_glass.png'),
];

async function main() {
  const urls = [];
  for (const assetPath of assetsToUpload) {
    try {
      console.log(`Uploading ${assetPath}...`);
      const url = await uploadImageToStableStudio(assetPath);
      urls.push(url);
      console.log(`✅ Uploaded to: ${url}`);
    } catch (e) {
      console.error(`❌ Failed to upload ${assetPath}:`, e.message);
    }
  }
  
  console.log('\nFINAL URLS:');
  console.log(JSON.stringify(urls, null, 2));
}

main().catch(console.error);
