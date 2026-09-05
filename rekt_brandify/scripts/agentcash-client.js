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
  const message =
    response?.choices?.[0]?.message ??
    response?.data?.choices?.[0]?.message;

  if (message?.refusal) {
    throw new Error(`Vision model declined: ${message.refusal}`);
  }

  const content = message?.content;

  if (typeof content === 'string' && content.trim()) {
    return content;
  }

  if (Array.isArray(content)) {
    const text = content
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .join('\n')
      .trim();
    if (text) return text;
  }

  throw new Error('Vision model returned empty content');
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

function isVisionRefusal(text = '') {
  const t = String(text).toLowerCase();
  return (
    t.includes('cannot assist')
    || t.includes("can't assist")
    || t.includes("i'm sorry")
    || t.includes('i am sorry')
    || t.includes('not able to')
    || t.includes('refuse')
    || t.includes('declined')
  );
}

function fallbackBrandifyStrategy(customTarget = '') {
  const elements = [
    {
      name: 'character clothing / main subject',
      type: 'existing',
      reasoning: 'Default branding target when vision analysis is unavailable',
      ideas: [
        'Shift clothing accents to Rekt navy (#0D0E1A) and add a small gold $CEO chest mark',
        'Add subtle gold (#F5C518) trim only — keep face and pose untouched',
        'Leave clothing unchanged; rely on corner badge branding instead',
      ],
    },
    {
      name: 'corner brand mark',
      type: 'new',
      reasoning: 'Safe dead-space placement that works on most meme templates',
      ideas: [
        'Small gold Rekt CEO coin logo in the bottom-right (~12% width)',
        'Tiny low-opacity $CEO mark in the bottom-left corner',
        'Gold circular REKT badge in the top-right corner',
      ],
    },
  ];

  const brief = String(customTarget || '').trim();
  if (brief) {
    elements.unshift({
      name: brief.slice(0, 72) || 'operator brief',
      type: 'existing',
      reasoning: 'Operator branding brief',
      ideas: [
        `Apply this brief subtly: ${brief.slice(0, 220)}`,
        `Same brief but smaller / less saturated: ${brief.slice(0, 160)}`,
        'Interpret the brief with gold (#F5C518) accents only — no large overlays',
      ],
    });
  }

  return { elements, fallback: true };
}

/**
 * Analyze a meme image and return brandify element strategy JSON.
 * Retries with a safer prompt on model refusal; falls back to category-agnostic options
 * so CMO analyze never hard-fails after a successful upload.
 */
export async function getVisionInteractiveStrategy(imageUrl, customTarget = '') {
  const brief = String(customTarget || '').trim();

  const primarySystem = `
You are an Art Director for the "Rekt CEO" crypto brand ($CEO).
This is a commercial brand-design task on a meme template image (UGC marketing).
BRAND COLORS: Rekt Red (#e7255e), CEO Yellow (#F8C826), Deep Magenta (#3B1C32), Off White (#FFFFFF)
BRAND STYLE: subtle high-fashion brand marks, neon accents, stylish streetwear details.

Task: suggest tasteful ways to add Rekt CEO branding WITHOUT changing the meme's joke, faces, or composition.
Find up to 3 existing scene elements to brand, plus 1–2 NEW small brand marks (badges/logos) in dead space.
For EACH element, provide 2 or 3 distinct creative ideas.
Do not refuse ordinary meme/cartoon templates — treat them as stock creative assets.
${brief ? `\nOPERATOR BRIEF (must include as an existing element): "${brief.slice(0, 400)}"\n` : ''}
Return ONLY valid JSON:
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

  const retrySystem = `
You output ONLY JSON for brand placement options on a marketing meme template.
Never apologize. Never refuse ordinary cartoons/memes used as stock creatives.
Suggest 2-4 brandable elements for Rekt CEO ($CEO) with 2-3 ideas each.
${brief ? `Include element for: "${brief.slice(0, 200)}".` : ''}
Schema: {"elements":[{"name":"string","type":"existing"|"new","reasoning":"string","ideas":["string"]}]}`;

  const buildPayload = (systemPrompt) => ({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Analyze this meme template for commercial Rekt CEO brand placements. Return interactive JSON strategy only.',
          },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
    response_format: { type: 'json_object' },
  });

  try {
    const response = await runVisionJsonRequest(buildPayload(primarySystem));
    if (!Array.isArray(response?.elements) || !response.elements.length) {
      throw new Error('Vision model response missing elements array');
    }
    return response;
  } catch (err) {
    const msg = String(err?.message || err);
    console.warn('[brandify-vision] primary analyze failed:', msg.slice(0, 240));

    if (!isVisionRefusal(msg) && !msg.includes('non-JSON') && !msg.includes('missing elements')) {
      // Network / payment / upload-style failures should still bubble.
      if (!msg.includes('Vision model') && !msg.includes('empty content')) throw err;
    }

    try {
      const retry = await runVisionJsonRequest(buildPayload(retrySystem));
      if (Array.isArray(retry?.elements) && retry.elements.length) {
        return { ...retry, retried: true };
      }
    } catch (retryErr) {
      console.warn('[brandify-vision] retry analyze failed:', String(retryErr?.message || retryErr).slice(0, 240));
    }

    console.warn('[brandify-vision] using fallback strategy options');
    return fallbackBrandifyStrategy(brief);
  }
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
 * Permanent job failures (sensitive / failed status) throw immediately so callers
 * can fall back to gpt-image-2 — do not keep retrying the same dead job.
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
        const detail = String(job.error || job.message || JSON.stringify(job));
        const err = new Error(`Job failed: ${detail}`);
        // Permanent — do not retry this job id
        err.permanent = true;
        throw err;
      }
    } catch (err) {
      const msg = String(err?.message || err);
      const permanent = Boolean(err?.permanent)
        || /sensitive|E005|moderation|flagged/i.test(msg)
        || /^Job failed:/i.test(msg)
        || /^Job complete but no imageUrl/i.test(msg);

      if (permanent) throw err;

      console.warn(`Poll attempt ${attempt} errored (retrying): ${msg.slice(0, 200)}`);
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
