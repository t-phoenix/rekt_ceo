import { existsSync, mkdirSync, writeFileSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import inquirer from 'inquirer';
import {
  uploadImageToStableStudio,
  submitEditJob,
  pollJobUntilComplete,
  downloadImage,
  getBalance,
} from './agentcash-client.js';
import { SOURCE_BASE, OUTPUT_BASE, LOGS_DIR } from '../config/brandify.config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function getRandomImage(baseDir) {
  const categories = readdirSync(baseDir).filter(f => statSync(path.join(baseDir, f)).isDirectory());
  if (categories.length === 0) throw new Error("No categories found in source folder");
  const randomCategory = categories[Math.floor(Math.random() * categories.length)];
  const catPath = path.join(baseDir, randomCategory);
  
  const files = readdirSync(catPath).filter(f => f.match(/\.(jpg|jpeg|png)$/i));
  if (files.length === 0) throw new Error(`No images found in category ${randomCategory}`);
  
  const randomFile = files[Math.floor(Math.random() * files.length)];
  return { category: randomCategory, filename: randomFile, path: path.join(catPath, randomFile) };
}

async function getVisionInteractiveStrategy(imageUrl, customTarget = '') {
  console.log('\n👁️  Asking Creative Director (Vision Agent) for interactive strategy...');
  
  const systemPrompt = `
You are a highly creative Art Director for the "Rekt CEO" crypto brand ($CEO).
BRAND COLORS: Rekt Red (#e7255e), CEO Yellow (#F8C826), Deep Magenta (#3B1C32), Off White (#FFFFFF)
BRAND STYLE: High-fashion (like Gucci, Louis Vuitton monograms), subtle typography, neon signs, stylish streetwear.

Analyze the image and find up to 3 existing elements to brandify (e.g. eyes, shirt, background wall).
Also, suggest 1 or 2 NEW elements to superimpose/add (e.g. Rekt CEO glasses, a cap, a neon sign, a gold chain).
For EACH element, provide 2 or 3 distinct, highly creative ideas on how to brandify it.
${customTarget ? `\nCRITICAL INSTRUCTION: The user specifically requested to brandify: "${customTarget}". You MUST include this exact element in your 'elements' array as an 'existing' element and provide creative ideas for it.\n` : ''}
Return in pure JSON format:
{
  "elements": [
    {
      "name": "Short name of element (e.g. The character's eyes)",
      "type": "existing" | "new",
      "reasoning": "Why this is a good idea",
      "ideas": [
        "Idea 1 description...",
        "Idea 2 description...",
        "Idea 3 description..."
      ]
    }
  ]
}
`;

  const payload = {
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { 
        role: 'user', 
        content: [
          { type: 'text', text: 'Analyze this image and return the interactive JSON strategy.' },
          { type: 'image_url', image_url: { url: imageUrl } }
        ]
      }
    ],
    response_format: { type: 'json_object' }
  };

  const dataStr = JSON.stringify(payload).replace(/'/g, "'\\''");
  const cmd = `npx agentcash@latest fetch "https://netintel.dev/openai/gpt-4o" -m POST -b '${dataStr}'`;
  
  try {
    const output = execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    const response = JSON.parse(output);
    const content = response.data?.choices?.[0]?.message?.content || response.choices?.[0]?.message?.content;
    if (!content) throw new Error("Invalid response format from Vision model");
    const cleanedContent = content.replace(/^```(json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    return JSON.parse(cleanedContent);
  } catch (err) {
    throw new Error(`Vision Agent failed: ${err.message}`);
  }
}

async function main() {
  console.log('\n🚀 Rekt CEO Brandify — INTERACTIVE Agentic Pipeline\n');
  
  const balance = getBalance();
  if (balance < 0.30) {
    console.error('⚠️  Balance may be too low. Recommended minimum $0.30 per image.');
  }

  // 1. Pick Image
  const { category, filename, path: sourcePath } = getRandomImage(path.join(ROOT, SOURCE_BASE));
  console.log(`🎲 Selected Random Meme: [${category}] ${filename}`);

  const { customTarget } = await inquirer.prompt([
    {
      type: 'input',
      name: 'customTarget',
      message: 'Target a specific element in the meme? (Leave blank to skip):',
    }
  ]);

  const outputDir = path.join(ROOT, OUTPUT_BASE, category);
  mkdirSync(outputDir, { recursive: true });
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    category,
    filename,
    mode: 'interactive',
    customTarget: customTarget || null,
    userSelections: []
  };

  try {
    // 2. Upload
    console.log('⬆️  Uploading source image for Vision analysis...');
    const imageUrl = await uploadImageToStableStudio(sourcePath);
    logEntry.uploadedUrl = imageUrl;

    // 3. Get Interactive Strategy
    const strategy = await getVisionInteractiveStrategy(imageUrl, customTarget);
    logEntry.visionStrategy = strategy;

    // 4. Inquirer: Select Elements
    const elementChoices = strategy.elements.map(el => ({
      name: `[${el.type.toUpperCase()}] ${el.name} - ${el.reasoning}`,
      value: el,
      checked: true
    }));

    const { selectedElements } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedElements',
        message: 'Which elements would you like to brandify/add?',
        choices: elementChoices,
        validate: (answer) => answer.length > 0 ? true : 'You must select at least one element.'
      }
    ]);

    // 5. Inquirer: Pick Ideas
    const finalInpaintPrompts = [];
    for (const el of selectedElements) {
      console.log(`\n🎨 Curating: ${el.name}`);
      const ideaChoices = el.ideas.map((idea, index) => ({
        name: idea,
        value: idea
      }));
      ideaChoices.push({ name: '✍️  Custom idea...', value: 'custom' });

      const { chosenIdea } = await inquirer.prompt([
        {
          type: 'list',
          name: 'chosenIdea',
          message: `How should we brandify ${el.name}?`,
          choices: ideaChoices
        }
      ]);

      let finalIdea = chosenIdea;
      if (chosenIdea === 'custom') {
        const { customIdea } = await inquirer.prompt([
          {
            type: 'input',
            name: 'customIdea',
            message: 'Enter your custom brandification idea:',
            validate: (input) => input.trim().length > 0 ? true : 'Please enter an idea.'
          }
        ]);
        finalIdea = customIdea;
      }

      finalInpaintPrompts.push(`For ${el.name}: ${finalIdea}`);
      logEntry.userSelections.push({ element: el.name, idea: finalIdea });
    }

    // Compile prompt
    const compiledPrompt = finalInpaintPrompts.join(' ') + " Ensure the rest of the original meme remains 100% untouched. DO NOT alter the original art style.";
    logEntry.finalPrompt = compiledPrompt;
    console.log(`\n📝 Compiled Inpaint Prompt: ${compiledPrompt}\n`);

    // 6. Generate
    console.log('🤖 Submitting inpainting job based on curated strategy...');
    let result;
    try {
      const { jobId, pollUrl } = submitEditJob(imageUrl, compiledPrompt);
      logEntry.jobId = jobId;

      console.log('⏳ Waiting for AI to process (Flux 2 Pro)...');
      result = await pollJobUntilComplete(pollUrl, jobId, ({ attempt }) => {
        process.stdout.write(`\r   Poll attempt ${attempt}...`);
      });
    } catch (err) {
      if (err.message.includes('sensitive') || err.message.includes('E005')) {
        console.log(`\n⚠️  Flux moderation blocked the image. Falling back to GPT-Image-2...`);
        const fallbackEndpoint = '/api/generate/gpt-image-2/edit';
        const { jobId, pollUrl } = submitEditJob(imageUrl, compiledPrompt, fallbackEndpoint);
        logEntry.jobId = jobId;
        console.log('⏳ Waiting for AI to process (GPT-Image-2)...');
        result = await pollJobUntilComplete(pollUrl, jobId, ({ attempt }) => {
          process.stdout.write(`\r   Poll attempt ${attempt}...`);
        });
      } else {
        throw err;
      }
    }

    const outputPath = path.join(outputDir, `interactive-${filename}`);
    console.log('\n⬇️  Downloading branded image...');
    downloadImage(result.imageUrl, outputPath);
    console.log(`\n✨ SUCCESS! Interactive branded image saved to:\n   ${outputPath}`);

    // 7. Feedback
    const { rating } = await inquirer.prompt([
      {
        type: 'list',
        name: 'rating',
        message: 'How do you rate this generation?',
        choices: ['👍 Like', '👎 Dislike', '🤷 Neutral']
      }
    ]);
    logEntry.rating = rating;

  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    logEntry.error = err.message;
  }

  // 8. Save session
  mkdirSync(path.join(ROOT, LOGS_DIR), { recursive: true });
  const logFile = path.join(ROOT, LOGS_DIR, `interactive-${Date.now()}.json`);
  writeFileSync(logFile, JSON.stringify(logEntry, null, 2));
  console.log(`\n💾 Session data saved to ${logFile}`);
}

main().catch(console.error);
