/**
 * agentcash-client.js
 * 
 * Wrapper around AgentCash's StableStudio GPT Image 2 Edit API.
 * Based on the exact StableStudio OpenAPI schema (stablestudio.dev).
 * 
 * Upload flow:
 *   1. POST /api/upload (paid $0.01) → { uploadId, clientToken, pathname }
 *   2. PUT Vercel Blob with Bearer clientToken → { url: "https://...blob..." }
 *   3. POST /api/upload/confirm (SIWX) → confirms the blobUrl
 * 
 * Edit flow:
 *   1. POST /api/generate/gpt-image-2/edit { prompt, images: [url], ... } → { jobId, pollUrl }
 *   2. Poll pollUrl with SIWX → { status: "complete", result: { imageUrl } }
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { API_CONFIG } from '../config/brandify.config.js';
import path from 'path';

/**
 * Call AgentCash CLI to make a paid (or SIWX) API request.
 * Returns parsed JSON response object.
 */
function agentCashFetch(url, data = {}) {
  const dataStr = JSON.stringify(data);
  const escaped = dataStr.replace(/'/g, "'\\''");
  // Correct flags: -m POST -b '<body>' (not --data)
  const cmd = `npx agentcash@latest fetch "${url}" -m POST -b '${escaped}'`;
  
  try {
    const output = execSync(cmd, { 
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      timeout: 60000,
    });
    return JSON.parse(output);
  } catch (err) {
    const msg = (err.stdout || err.stderr || err.message || '').slice(0, 800);
    throw new Error(`AgentCash fetch failed for ${url}: ${msg}`);
  }
}

/**
 * Upload a local image file to StableStudio Vercel Blob.
 * @param {string} imagePath - Absolute local path to the image
 * @returns {string} Public HTTPS blob URL ready for use in edit requests
 */
export async function uploadImageToStableStudio(imagePath) {
  const filename = path.basename(imagePath);
  const ext = path.extname(filename).toLowerCase();
  const contentType = ext === '.png' ? 'image/png'
    : ext === '.gif' ? 'image/gif'
    : ext === '.webp' ? 'image/webp'
    : 'image/jpeg';

  // Step 1: Get upload token ($0.01 via AgentCash)
  const tokenRes = agentCashFetch(`${API_CONFIG.baseUrl}/api/upload`, {
    filename,
    contentType,
  });

  if (!tokenRes?.success) {
    throw new Error(`Upload token request failed: ${JSON.stringify(tokenRes)}`);
  }

  // Response fields per OpenAPI: uploadId, clientToken, pathname
  const uploadData = tokenRes.data || tokenRes;
  const { uploadId, clientToken, pathname } = uploadData;

  if (!clientToken || !pathname) {
    throw new Error(`Missing clientToken/pathname in upload response: ${JSON.stringify(uploadData)}`);
  }

  // Step 2: PUT binary file to Vercel Blob storage
  const vercelBlobUrl = `https://vercel.com/api/blob/?pathname=${encodeURIComponent(pathname)}`;
  const curlCmd = `curl -sL -X PUT "${vercelBlobUrl}" \
    -H "authorization: Bearer ${clientToken}" \
    -H "x-content-type: ${contentType}" \
    -H "x-api-version: 11" \
    --data-binary @"${imagePath}"`;

  let blobUrl;
  try {
    const blobOutput = execSync(curlCmd, { encoding: 'utf8', timeout: 60000 });
    const blobResult = JSON.parse(blobOutput);
    blobUrl = blobResult?.url;
    if (!blobUrl) {
      throw new Error(`No URL in blob response: ${JSON.stringify(blobResult)}`);
    }
  } catch (err) {
    throw new Error(`Vercel Blob upload failed: ${err.message}`);
  }

  // Step 3: Confirm upload with StableStudio (SIWX auth via AgentCash)
  try {
    const confirmRes = agentCashFetch(`${API_CONFIG.baseUrl}/api/upload/confirm`, {
      uploadId,
      blobUrl,
    });
    // Return the confirmed URL (falls back to raw blobUrl if confirm doesn't return one)
    return confirmRes?.data?.upload?.blobUrl
      || confirmRes?.upload?.blobUrl
      || blobUrl;
  } catch {
    // Confirm may fail for SIWX auth reasons but blobUrl is still publicly usable
    return blobUrl;
  }
}

/**
 * Submit a GPT Image 2 edit job.
 * Required fields per schema: prompt (string), images (array of URLs)
 * 
 * @param {string} imageUrl - Public URL of the source image
 * @param {string} prompt - The edit instruction prompt
 * @returns {{ jobId: string, pollUrl: string }}
 */
export function submitEditJob(imageUrl, prompt, endpoint = API_CONFIG.editEndpoint) {
  // Pass the source image as the first image, and the reference logos as subsequent images
  // so the AI knows exactly what the logos look like and can use them directly.
  const allImages = [imageUrl, ...(API_CONFIG.REFERENCE_LOGOS || [])];

  const response = agentCashFetch(
    `${API_CONFIG.baseUrl}${endpoint}`,
    {
      prompt,
      images: allImages,
      quality: 'high',          // 'high' to prevent pixelation/distortion
      size: 'auto',             // preserve original aspect ratio
      output_format: 'png',
      moderation: 'low',
    }
  );

  // agentcash wraps response — try both direct and .data
  const payload = response?.data || response;

  if (!payload?.jobId || !payload?.pollUrl) {
    throw new Error(`Job submission failed — no jobId/pollUrl: ${JSON.stringify(response)}`);
  }

  return { jobId: payload.jobId, pollUrl: payload.pollUrl };
}

/**
 * Poll a StableStudio job URL until it completes or times out.
 * Per StableStudio docs: GPT Image 2 should be polled every 10s.
 * Completed job response: { status: "complete", result: { imageUrl: "..." } }
 * 
 * @param {string} pollUrl - The poll URL returned from job submission
 * @param {string} jobId - For logging only
 * @param {function} onProgress - Called each poll with { attempt, maxAttempts }
 * @returns {{ imageUrl: string, cost: number }}
 */
export async function pollJobUntilComplete(pollUrl, jobId, onProgress = () => {}) {
  const { maxPollAttempts } = API_CONFIG;
  const pollIntervalMs = 10000; // 10s for GPT Image 2

  for (let attempt = 1; attempt <= maxPollAttempts; attempt++) {
    await sleep(pollIntervalMs);
    onProgress({ attempt, maxAttempts: maxPollAttempts, jobId });

    let statusResponse;
    try {
      // Poll endpoint is GET — agentcash defaults to GET when no -m flag
      // Note: do NOT send -m POST here or it 405s
      const pollCmd = `npx agentcash@latest fetch "${pollUrl}"`;
      const pollOut = execSync(pollCmd, {
        encoding: 'utf8',
        maxBuffer: 5 * 1024 * 1024,
        timeout: 60000,
      });
      statusResponse = JSON.parse(pollOut);
    } catch (err) {
      console.warn(`\n  ⚠️  Poll attempt ${attempt} errored (retrying): ${(err.message || '').slice(0, 200)}`);
      continue;
    }

    const job = statusResponse?.data || statusResponse;
    if (!job?.status) continue;

    if (job.status === 'complete' || job.status === 'completed') {
      // Per OpenAPI schema: result at job.result.imageUrl
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
    // else: 'pending' | 'loading' — keep polling
  }

  throw new Error(`Job ${jobId} timed out after ${maxPollAttempts * pollIntervalMs / 1000}s`);
}

/**
 * Download a remote image URL to a local file path using curl.
 * Verifies the downloaded file is large enough to be a real image.
 */
export function downloadImage(imageUrl, outputPath) {
  execSync(`curl -sL "${imageUrl}" -o "${outputPath}"`, { timeout: 60000 });
  const data = readFileSync(outputPath);
  if (data.length < 1000) {
    throw new Error(`Downloaded file is suspiciously small (${data.length} bytes)`);
  }
}

/**
 * Check current AgentCash wallet balance.
 * @returns {number} Balance in USD, or -1 if unknown
 */
export function getBalance() {
  try {
    const output = execSync('npx agentcash@latest balance', {
      encoding: 'utf8',
      timeout: 15000,
    });
    return JSON.parse(output)?.data?.balance ?? 0;
  } catch {
    return -1;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
