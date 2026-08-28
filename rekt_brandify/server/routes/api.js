import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { 
  uploadImageToStableStudio, 
  submitEditJob, 
  pollJobUntilComplete,
  getVisionInteractiveStrategy,
} from '../../scripts/agentcash-client.js';
import Session from '../models/Session.js';

const router = express.Router();
const upload = multer({ dest: 'server/uploads/' });

// GET public brandified variations for a meme template
router.get('/templates/:templateId/variations', async (req, res) => {
  try {
    const { templateId } = req.params;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    const filter = {
      templateId,
      isPublic: true,
      generatedImageUrl: { $ne: null },
      error: null,
    };

    const [items, total] = await Promise.all([
      Session.find(filter)
        .sort({ timestamp: -1 })
        .skip(offset)
        .limit(limit)
        .select('sessionId generatedImageUrl originalImageUrl userRating timestamp publishedAt')
        .lean(),
      Session.countDocuments(filter),
    ]);

    res.json({ templateId, total, items });
  } catch (err) {
    console.error('Variations fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 1. START SESSION (Upload Image & Get Vision Strategy)
router.post('/sessions/start', upload.single('image'), async (req, res) => {
  try {
    const { customTarget, templateId, category, templateFilename } = req.body || {};
    
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
      templateId: templateId || null,
      category: category || null,
      templateFilename: templateFilename || null,
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
      const { jobId, pollUrl } = await submitEditJob(session.originalImageUrl, compiledPrompt);
      session.jobId = jobId;
      await session.save();
      result = await pollJobUntilComplete(pollUrl, jobId, () => {});
    } catch (err) {
      if (err.message.includes('sensitive') || err.message.includes('E005')) {
        console.log('Fallback to GPT-Image-2');
        engineUsed = 'gpt-image-2';
        const fallbackEndpoint = '/api/generate/gpt-image-2/edit';
        const { jobId, pollUrl } = await submitEditJob(session.originalImageUrl, compiledPrompt, fallbackEndpoint);
        session.jobId = jobId;
        await session.save();
        result = await pollJobUntilComplete(pollUrl, jobId, () => {});
      } else {
        throw err;
      }
    }

    session.engineUsed = engineUsed;
    session.generatedImageUrl = result.imageUrl;
    session.isPublic = true;
    session.publishedAt = new Date();
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
