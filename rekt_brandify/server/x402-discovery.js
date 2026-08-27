import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

router.get('/.well-known/x402', (req, res) => {
  res.json({
    name: "Rekt CEO Meme Brandifier",
    description: "AI-powered meme template brandification for the Rekt CEO ($CEO) crypto brand. Upload any meme, get AI creative direction, and generate branded versions.",
    endpoints: [
      {
        path: "/api/sessions/start",
        method: "POST",
        price: `$${process.env.X402_PRICE_SESSION_START || '0.19'}`,
        description: "Upload a meme and get AI Creative Director element analysis",
        input: "multipart/form-data with 'image' file and optional 'customTarget' string",
        output: "{ sessionId, imageUrl, strategy: { elements: [...] } }"
      },
      {
        path: "/api/generate",
        method: "POST",
        price: `$${process.env.X402_PRICE_GENERATE || '0.49'}`,
        description: "Generate branded meme from curated element choices",
        input: "{ sessionId, userCuratedChoices: [{ element, idea }] }",
        output: "{ sessionId, generatedImageUrl, engineUsed }"
      },
      {
        path: "/api/sessions/rate",
        method: "POST",
        price: `$${process.env.X402_PRICE_RATE || '0.01'}`,
        description: "Rate a generation",
        input: "{ sessionId, rating: 'Like'|'Dislike'|'Neutral' }",
        output: "{ success, session }"
      }
    ]
  });
});

export default router;
