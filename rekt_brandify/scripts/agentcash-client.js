/**
 * agentcash-client.js
 *
 * Wrapper around AgentCash's StableStudio GPT Image 2 Edit API.
 * Based on the exact StableStudio OpenAPI schema (stablestudio.dev).
 */

import { readFileSync } from 'fs';
import fetch from 'node-fetch';
import { API_CONFIG } from '../config/brandify.config.js';
import path from 'path';
import { agentCashFetch } from './agentcash-runtime.js';

const VISION_ENDPOINT = 'https://netintel.dev/openai/gpt-4o';
const UPLOAD_TIMEOUT_MS = 120_000;
const VISION_TIMEOUT_MS = 180_000;

function parseVisionStrategyContent(content) {
  if (!content || typeof content !== 'string') {
    throw new Error('Vision model returned empty content');
  }

  const cleaned = content
    .replace(/^```(?:json)?\n?/i, '')
    .replace(/\n?```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error(`Vision model returned non-JSON response: ${cleaned.slice(0, 240)}`);
  }
}

function extractOpenAiContent(response) {
  const content =
    response?.choices?.[0]?.message?.content ??
    response?.data?.choices?.[0]?.message?.content;

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .join('\n')
      .trim();
  }

  throw new Error(`Unexpected vision response shape: ${JSON.stringify(response).slice(0, 400)}`);
}

export async function runVisionJsonRequest(payload, { timeout = VISION_TIMEOUT_MS } = {}) {
  const response = await agentCashFetch(VISION_ENDPOINT, {
    method: 'POST',
    body: payload,
    timeout,
  });
  const content = extractOpenAiContent(response);
  return parseVisionStrategyContent(content);
}

/**
 * Analyze a meme image and return brandify element strategy JSON.
 */
export async function getVisionInteractiveStrategy(imageUrl, customTarget = '') {
  const systemPrompt = `
You are a highly creative Art Director for the "Rekt CEO" crypto brand ($CEO).
BRAND COLORS: Rekt Red (#e7255e), CEO Yellow (#F8C826), Deep Magenta (#3B1C32), Off White (#FFFFFF)
BRAND STYLE: High-fashion (like Gucci, Louis Vuitton monograms), neon signs, stylish streetwear.

Analyze the image and find up to 3 existing elements to brandify.
Also, suggest 1 or 2 NEW elements to superimpose/add.
For EACH element, provide 2 or 3 distinct, highly creative ideas on how to brandify it.
${customTarget ? `\nCRITICAL INSTRUCTION: The user specifically requested to brandify: "${customTarget}". You MUST include this exact element in your 'elements' array as an 'existing' element and provide creative ideas for it.\n` : ''}
Return ONLY valid JSON in this exact shape:
{
  "elements": [
    {
      "name": "Short name",
      "type": "existing",
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
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
    response_format: { type: 'json_object' },
  };

  const response = await runVisionJsonRequest(payload);

  if (!Array.isArray(response?.elements)) {
    throw new Error('Vision model response missing elements array');
  }

  return response;
}

/**
 * Upload a local image file to StableStudio Vercel Blob.
 * @param {string} imagePath - Absolute local path to the image
 * @returns {Promise<string>} Public HTTPS blob URL ready for use in edit requests
 */
export async function uploadImageToStableStudio(imagePath) {
  const filename = path.basename(imagePath);
  const ext = path.extname(filename).toLowerCase();
  const contentType = ext === '.png' ? 'image/png'
    : ext === '.gif' ? 'image/gif'
    : ext === '.webp' ? 'image/webp'
    : 'image/jpeg';

  const tokenRes = await agentCashFetch(`${API_CONFIG.baseUrl}/api/upload`, {
    body: { filename, contentType },
    timeout: UPLOAD_TIMEOUT_MS,
  });

  const uploadData = tokenRes?.data || tokenRes;
  const { uploadId, clientToken, pathname } = uploadData;

  if (!clientToken || !pathname) {
    throw new Error(`Missing clientToken/pathname in upload response: ${JSON.stringify(uploadData)}`);
  }

  const vercelBlobUrl = `https://vercel.com/api/blob/?pathname=${encodeURIComponent(pathname)}`;
  const fileBuffer = readFileSync(imagePath);

  const blobResponse = await fetch(vercelBlobUrl, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${clientToken}`,
      'x-content-type': contentType,
      'x-api-version': '11',
    },
    body: fileBuffer,
    signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
  });

  if (!blobResponse.ok) {
    const errText = await blobResponse.text().catch(() => '');
    throw new Error(`Vercel Blob upload failed (${blobResponse.status}): ${errText.slice(0, 300)}`);
  }

  const blobResult = await blobResponse.json();
  const blobUrl = blobResult?.url;
  if (!blobUrl) {
    throw new Error(`No URL in blob response: ${JSON.stringify(blobResult)}`);
  }

  try {
    const confirmRes = await agentCashFetch(`${API_CONFIG.baseUrl}/api/upload/confirm`, {
      body: { uploadId, blobUrl },
      timeout: 60_000,
    });
    return confirmRes?.data?.upload?.blobUrl
      || confirmRes?.upload?.blobUrl
      || blobUrl;
  } catch {
    return blobUrl;
  }
}

/**
 * Submit a GPT Image 2 edit job.
 */
export async function submitEditJob(imageUrl, prompt, endpoint = API_CONFIG.editEndpoint) {
  const allImages = [imageUrl, ...(API_CONFIG.REFERENCE_LOGOS || [])];

  const response = await agentCashFetch(`${API_CONFIG.baseUrl}${endpoint}`, {
    body: {
      prompt,
      images: allImages,
      quality: 'high',
      size: 'auto',
      output_format: 'png',
      moderation: 'low',
    },
    timeout: UPLOAD_TIMEOUT_MS,
  });

  const payload = response?.data || response;

  if (!payload?.jobId || !payload?.pollUrl) {
    throw new Error(`Job submission failed — no jobId/pollUrl: ${JSON.stringify(response)}`);
  }

  return { jobId: payload.jobId, pollUrl: payload.pollUrl };
}

/**
 * Poll a StableStudio job URL until it completes or times out.
 */
export async function pollJobUntilComplete(pollUrl, jobId, onProgress = () => {}) {
  const { maxPollAttempts } = API_CONFIG;
  const pollIntervalMs = 10000;

  for (let attempt = 1; attempt <= maxPollAttempts; attempt += 1) {
    await sleep(pollIntervalMs);
    onProgress({ attempt, maxAttempts: maxPollAttempts, jobId });

    try {
      const statusResponse = await agentCashFetch(pollUrl, {
        method: 'GET',
        timeout: 60_000,
      });

      const job = statusResponse?.data || statusResponse;
      if (!job?.status) continue;

      if (job.status === 'complete' || job.status === 'completed') {
        const resultUrl = job.result?.imageUrl
          || job.result?.videoUrl
          || job.imageUrl
          || job.resultUrl;

        if (!resultUrl) {
          throw new Error(`Job complete but no imageUrl found: ${JSON.stringify(job)}`);
        }

        return { imageUrl: resultUrl, cost: job.cost || 0 };
      }

      if (job.status === 'failed' || job.status === 'error') {
        throw new Error(`Job failed: ${job.error || job.message || JSON.stringify(job)}`);
      }
    } catch (err) {
      console.warn(`Poll attempt ${attempt} errored (retrying): ${(err.message || '').slice(0, 200)}`);
    }
  }

  throw new Error(`Job ${jobId} timed out after ${maxPollAttempts * pollIntervalMs / 1000}s`);
}

export async function downloadImage(imageUrl, outputPath) {
  const response = await fetch(imageUrl, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) {
    throw new Error(`Download failed (${response.status}) for ${imageUrl}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 1000) {
    throw new Error(`Downloaded file is suspiciously small (${buffer.length} bytes)`);
  }
  const { writeFileSync } = await import('fs');
  writeFileSync(outputPath, buffer);
}

export async function getBalance() {
  try {
    const { createRequire } = await import('module');
    const { spawnSync } = await import('child_process');
    const req = createRequire(import.meta.url);
    const cli = path.join(path.dirname(req.resolve('agentcash/package.json')), 'dist/esm/index.js');
    const output = spawnSync(process.execPath, [cli, 'balance'], {
      encoding: 'utf8',
      timeout: 20_000,
    });
    if (output.status !== 0) return -1;
    const parsed = JSON.parse(output.stdout);
    return parsed?.data?.balance ?? 0;
  } catch {
    return -1;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
