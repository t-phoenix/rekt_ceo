import { existsSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  uploadImageToStableStudio,
  submitEditJob,
  pollJobUntilComplete,
  downloadImage,
  getBalance,
  runVisionJsonRequest,
} from './agentcash-client.js';
import { SOURCE_BASE, OUTPUT_BASE, LOGS_DIR } from '../config/brandify.config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Parse CLI args
const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
};

const category = getArg('--category');
const filename = getArg('--file');

if (!category || !filename) {
  console.error('❌ Usage: node scripts/brandify-advanced.js --category "<category>" --file "<filename>"');
  process.exit(1);
}

const sourcePath = path.join(ROOT, SOURCE_BASE, category, filename);
const outputDir = path.join(ROOT, OUTPUT_BASE, category);
const outputPath = path.join(outputDir, `advanced-${filename}`);

async function getVisionStrategy(imageUrl) {
  console.log('\n👁️  Asking Creative Director (Vision Agent) for strategy...');
  
  const systemPrompt = `
You are a highly creative Art Director for the "Rekt CEO" crypto brand ($CEO).
Your task is to analyze the meme template provided and determine the most subtle, clever, and natural ways to integrate the Rekt CEO brand without it looking like a cheap superimposed logo.

BRAND COLORS: Rekt Red (#e7255e), CEO Yellow (#F8C826), Deep Magenta (#3B1C32), Off White (#FFFFFF)
BRAND STYLE: High-fashion (like Gucci, Louis Vuitton monograms), subtle typography, neon signs, stylish streetwear. We can use different designs for elements, not a single pattern every time.

Analyze the image and pick 1 to 3 specific elements to edit (e.g., "the character's eyes", "the t-shirt", "the background wall", "a laptop screen").
For example, if it's Pepe, maybe his eyes can reflect the words REKT and CEO, and his shirt can have a monogram.
Return your strategy in pure JSON format:
{
  "elements": [
    {
      "target_element": "What specific part of the image to target",
      "reasoning": "Why this is a great place for brandification",
      "creative_vision": "How this element will look after the edit"
    }
  ],
  "inpaint_prompt": "A highly detailed prompt for an inpainting AI model. Instruct it to leave the rest of the image completely untouched, but modify the target elements according to your vision. Be very specific about colors, textures, and lighting.",
  "report_summary": "A human-readable paragraph summarizing the overall brandification strategy for this image."
}
`;

  const payload = {
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { 
        role: 'user', 
        content: [
          { type: 'text', text: 'Analyze this image and return the JSON strategy.' },
          { type: 'image_url', image_url: { url: imageUrl } }
        ]
      }
    ],
    response_format: { type: 'json_object' }
  };

  try {
    return await runVisionJsonRequest(payload);
  } catch (err) {
    throw new Error(`Vision Agent failed: ${err.message}`);
  }
}

async function main() {
  console.log('\n🚀 Rekt CEO Brandify — Advanced Agentic Pipeline\n');
  
  // Check balance
  const balance = await getBalance();
  if (balance < 0.30) {
    console.error('⚠️  Balance may be too low. Recommended minimum $0.30 per image.');
    process.exit(1);
  }

  if (!existsSync(sourcePath)) {
    console.error(`\n❌ Source file not found: ${sourcePath}`);
    process.exit(1);
  }

  mkdirSync(outputDir, { recursive: true });

  const startTime = Date.now();
  const logEntry = {
    timestamp: new Date().toISOString(),
    category,
    filename,
    mode: 'advanced',
    steps: [],
  };

  try {
    // 1. Upload
    console.log('⬆️  Uploading source image for Vision analysis...');
    const imageUrl = await uploadImageToStableStudio(sourcePath);
    logEntry.uploadedUrl = imageUrl;
    
    // 2. Vision Strategy
    const strategy = await getVisionStrategy(imageUrl);
    console.log(`\n🎯 Brandification Strategy:`);
    strategy.elements.forEach((el, i) => {
      console.log(`  [${i+1}] ${el.target_element}`);
      console.log(`      Reason: ${el.reasoning}`);
      console.log(`      Vision: ${el.creative_vision}`);
    });
    console.log(`\n📝 Inpaint Prompt: ${strategy.inpaint_prompt}\n`);
    logEntry.strategy = strategy;

    // 3. Edit (StableStudio flux-2-pro/edit or gpt-image-2 fallback)
    console.log('🤖 Submitting inpainting job based on Vision strategy...');
    const finalPrompt = strategy.inpaint_prompt + " Ensure the rest of the original meme remains 100% untouched. DO NOT alter the original art style.";
    
    let result;
    try {
      const { jobId, pollUrl } = await submitEditJob(imageUrl, finalPrompt);
      logEntry.jobId = jobId;

      console.log('⏳ Waiting for AI to process (Flux 2 Pro)...');
      result = await pollJobUntilComplete(pollUrl, jobId, ({ attempt }) => {
        process.stdout.write(`\r   Poll attempt ${attempt}...`);
      });
    } catch (err) {
      if (err.message.includes('sensitive') || err.message.includes('E005')) {
        console.log(`\n⚠️  Flux moderation blocked the image. Falling back to GPT-Image-2...`);
        // Import API_CONFIG here dynamically or just hardcode the fallback path if not imported
        const fallbackEndpoint = '/api/generate/gpt-image-2/edit';
        const { jobId, pollUrl } = await submitEditJob(imageUrl, finalPrompt, fallbackEndpoint);
        logEntry.jobId = jobId;
        console.log('⏳ Waiting for AI to process (GPT-Image-2)...');
        result = await pollJobUntilComplete(pollUrl, jobId, ({ attempt }) => {
          process.stdout.write(`\r   Poll attempt ${attempt}...`);
        });
      } else {
        throw err;
      }
    }
    
    // 5. Download
    console.log('\n⬇️  Downloading branded image...');
    await downloadImage(result.imageUrl, outputPath);
    
    console.log(`\n✨ SUCCESS! Advanced branded image saved to:\n   ${outputPath}`);
    
    // 6. Generate Markdown Report
    const reportPath = path.join(outputDir, `advanced-${filename}-report.md`);
    const reportContent = `# Generation Report: ${filename}

## AI Strategy Overview

| Target Element | Reasoning | Creative Vision |
| --- | --- | --- |
${strategy.elements.map(el => `| **${el.target_element}** | ${el.reasoning} | ${el.creative_vision} |`).join('\\n')}

## Final Prompt
\`\`\`text
${finalPrompt}
\`\`\`

## Result
![Branded Image](./advanced-${filename})
`;
    writeFileSync(reportPath, reportContent);
    console.log(`📋 Human-readable generation report saved to:\n   ${reportPath}`);

  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    logEntry.error = err.message;
  }

  mkdirSync(path.join(ROOT, LOGS_DIR), { recursive: true });
  const logFile = path.join(ROOT, LOGS_DIR, `advanced-${Date.now()}.json`);
  writeFileSync(logFile, JSON.stringify(logEntry, null, 2));
}

main().catch(console.error);
