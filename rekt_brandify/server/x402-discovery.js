import express from 'express';
import dotenv from 'dotenv';
import { buildOpenApiDocument } from './openapi.js';

dotenv.config();

const router = express.Router();

router.get('/.well-known/x402', (_req, res) => {
  const openapi = buildOpenApiDocument();
  const prices = {
    sessionStart: process.env.X402_PRICE_SESSION_START || '0.19',
    generate: process.env.X402_PRICE_GENERATE || '0.49',
    rate: process.env.X402_PRICE_RATE || '0.01',
    captionSuggest: process.env.X402_PRICE_CAPTION_SUGGEST || '0.10',
    captionRate: process.env.X402_PRICE_CAPTION_RATE || '0.01',
  };

  res.json({
    name: 'Rekt CEO Meme Brandifier',
    description: openapi.info.description,
    openapi: '/openapi.json',
    contact: openapi.info.contact,
    endpoints: [
      {
        path: '/api/sessions/start',
        method: 'POST',
        price: `$${prices.sessionStart}`,
        description: 'Upload a meme and get AI Creative Director element analysis',
        input: "multipart/form-data with 'image' file and optional 'customTarget' string",
        output: '{ sessionId, imageUrl, strategy: { elements: [...] } }',
      },
      {
        path: '/api/generate',
        method: 'POST',
        price: `$${prices.generate}`,
        description: 'Generate branded meme from curated element choices',
        input: '{ sessionId, userCuratedChoices: [{ element, idea }] }',
        output: '{ sessionId, generatedImageUrl, engineUsed }',
      },
      {
        path: '/api/sessions/rate',
        method: 'POST',
        price: `$${prices.rate}`,
        description: 'Rate a brandify generation',
        input: "{ sessionId, rating: 'Like'|'Dislike'|'Neutral' }",
        output: '{ success, session }',
      },
      {
        path: '/api/captions/suggest',
        method: 'POST',
        price: `$${prices.captionSuggest}`,
        description: 'Generate top 3 meme captions from template + context',
        input: "multipart/form-data with 'template_image' and 'context' (or 'topic')",
        output: '{ run_id, options: [{ top_text, bottom_text, humor_tag, ranking_score }], metadata }',
      },
      {
        path: '/api/captions/rate',
        method: 'POST',
        price: `$${prices.captionRate}`,
        description: 'Rate a caption suggestion run',
        input: "{ run_id, rating: 'Like'|'Dislike'|'Neutral', optional selected_candidate_id }",
        output: '{ success, run_id, rating }',
      },
    ],
  });
});

export default router;
