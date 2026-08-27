import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { execSync } from 'child_process';
import { 
  uploadImageToStableStudio, 
  submitEditJob, 
  pollJobUntilComplete 
} from '../../scripts/agentcash-client.js';
import Session from '../models/Session.js';

const router = express.Router();
const upload = multer({ dest: 'server/uploads/' });

// --- VISION AGENT LOGIC ---
async function getVisionInteractiveStrategy(imageUrl, customTarget = '') {
  const systemPrompt = `
You are a highly creative Art Director for the "Rekt CEO" crypto brand ($CEO).
BRAND COLORS: Rekt Red (#e7255e), CEO Yellow (#F8C826), Deep Magenta (#3B1C32), Off White (#FFFFFF)
BRAND STYLE: High-fashion (like Gucci, Louis Vuitton monograms), neon signs, stylish streetwear.

Analyze the image and find up to 3 existing elements to brandify.
Also, suggest 1 or 2 NEW elements to superimpose/add.
For EACH element, provide 2 or 3 distinct, highly creative ideas on how to brandify it.
${customTarget ? `\nCRITICAL INSTRUCTION: The user specifically requested to brandify: "${customTarget}". You MUST include this exact element in your 'elements' array as an 'existing' element and provide creative ideas for it.\n` : ''}
Return in pure JSON format:
{
  "elements": [
    {
      "name": "Short name",
      "type": "existing" | "new",
      "reasoning": "Why this is a good idea",
      "ideas": ["Idea 1", "Idea 2", "Idea 3"]
    }
  ]
}`;

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
    const cleanedContent = content.replace(/^```(json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    return JSON.parse(cleanedContent);
  } catch (err) {
    throw new Error(`Vision Agent failed: ${err.message}`);
  }
}

// 1. START SESSION (Upload Image & Get Vision Strategy)
router.post('/sessions/start', upload.single('image'), async (req, res) => {
  try {
    const { customTarget } = req.body || {};
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const sessionId = uuidv4();
    const filePath = req.file.path;

    // 1a. Upload to StableStudio via AgentCash
    const imageUrl = await uploadImageToStableStudio(filePath);

    // 1b. Create Session in DB
    const session = new Session({
      sessionId,
      originalImageUrl: imageUrl,
      userCustomTarget: customTarget || null,
    });
    await session.save();

    // 1c. Get AI Strategy
    const strategy = await getVisionInteractiveStrategy(imageUrl, customTarget);
    
    // Save strategy to DB
    session.aiVisionRaw = strategy;
    await session.save();

    res.json({ sessionId, imageUrl, strategy });
  } catch (err) {
    console.error('Session start error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. GENERATE BRANDED IMAGE
router.post('/generate', async (req, res) => {
  try {
    const { sessionId, userCuratedChoices } = req.body;

    const session = await Session.findOne({ sessionId });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Compile prompt
    const prompts = userCuratedChoices.map(c => `For ${c.element}: ${c.idea}`);
    const compiledPrompt = prompts.join(' ') + " Ensure the rest of the original meme remains 100% untouched. DO NOT alter the original art style.";
    
    session.userCuratedChoices = userCuratedChoices;
    session.compiledPrompt = compiledPrompt;
    await session.save();

    // Submit Job
    let engineUsed = 'flux-2-pro';
    let result;
    try {
      const { jobId, pollUrl } = submitEditJob(session.originalImageUrl, compiledPrompt);
      session.jobId = jobId;
      await session.save();
      result = await pollJobUntilComplete(pollUrl, jobId, () => {});
    } catch (err) {
      if (err.message.includes('sensitive') || err.message.includes('E005')) {
        console.log('Fallback to GPT-Image-2');
        engineUsed = 'gpt-image-2';
        const fallbackEndpoint = '/api/generate/gpt-image-2/edit';
        const { jobId, pollUrl } = submitEditJob(session.originalImageUrl, compiledPrompt, fallbackEndpoint);
        session.jobId = jobId;
        await session.save();
        result = await pollJobUntilComplete(pollUrl, jobId, () => {});
      } else {
        throw err;
      }
    }

    session.engineUsed = engineUsed;
    session.generatedImageUrl = result.imageUrl;
    await session.save();

    res.json({ 
      sessionId, 
      generatedImageUrl: result.imageUrl, 
      engineUsed 
    });

  } catch (err) {
    console.error('Generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. RATE SESSION
router.post('/sessions/rate', async (req, res) => {
  try {
    const { sessionId, rating } = req.body;
    const session = await Session.findOneAndUpdate(
      { sessionId }, 
      { userRating: rating }, 
      { new: true }
    );
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ success: true, session });
  } catch (err) {
    console.error('Rating error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
