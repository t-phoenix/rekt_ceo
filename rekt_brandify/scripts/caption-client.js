import { agentCashFetch } from './agentcash-runtime.js';

const TEXT_ENDPOINT = 'https://netintel.dev/openai/gpt-4o';
const VISION_ENDPOINT = 'https://netintel.dev/openai/gpt-4o';
const TEXT_TIMEOUT_MS = 120_000;
const VISION_TIMEOUT_MS = 180_000;
const DEFAULT_MODEL = 'gpt-4o';

function parseJsonContent(content) {
  if (!content || typeof content !== 'string') {
    throw new Error('LLM returned empty content');
  }

  const cleaned = content
    .replace(/^```(?:json)?\n?/i, '')
    .replace(/\n?```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error(`LLM returned non-JSON: ${cleaned.slice(0, 240)}`);
  }
}

function extractOpenAiContent(response) {
  const message =
    response?.choices?.[0]?.message ??
    response?.data?.choices?.[0]?.message;

  if (message?.refusal) {
    throw new Error(`LLM declined: ${message.refusal}`);
  }

  const content = message?.content;

  if (typeof content === 'string' && content.trim()) return content;

  if (Array.isArray(content)) {
    const text = content
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .join('\n')
      .trim();
    if (text) return text;
  }

  throw new Error('LLM returned empty content');
}

async function callOpenAiJson({ system, user, imageUrl, model = DEFAULT_MODEL, timeout = TEXT_TIMEOUT_MS }) {
  const userContent = imageUrl
    ? [
        { type: 'text', text: user },
        { type: 'image_url', image_url: { url: imageUrl } },
      ]
    : user;

  const payload = {
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userContent },
    ],
    response_format: { type: 'json_object' },
  };

  const endpoint = imageUrl ? VISION_ENDPOINT : TEXT_ENDPOINT;
  const response = await agentCashFetch(endpoint, {
    method: 'POST',
    body: payload,
    timeout: imageUrl ? VISION_TIMEOUT_MS : timeout,
  });

  const content = extractOpenAiContent(response);
  return { parsed: parseJsonContent(content), model };
}

export async function decodeTemplate({ imageUrl, category, templateId }) {
  const {
    TEMPLATE_DECODE_SYSTEM,
    buildTemplateDecodeUserPrompt,
  } = await import('../server/prompts/caption-pipeline.js');

  const { parsed, model } = await callOpenAiJson({
    system: TEMPLATE_DECODE_SYSTEM,
    user: buildTemplateDecodeUserPrompt({ category, templateId }),
    imageUrl,
  });

  return { output: parsed, model };
}

export async function extractContext({ context, contextType, audience }) {
  const {
    CONTEXT_EXTRACT_SYSTEM,
    buildContextExtractUserPrompt,
  } = await import('../server/prompts/caption-pipeline.js');

  const { parsed, model } = await callOpenAiJson({
    system: CONTEXT_EXTRACT_SYSTEM,
    user: buildContextExtractUserPrompt({ context, contextType, audience }),
  });

  return { output: parsed, model };
}

export async function generateCaptionStorm({
  templateDecode,
  contextExtract,
  intensity,
  humorPalette,
  audience,
  count,
}) {
  const {
    CAPTION_STORM_SYSTEM,
    buildCaptionStormUserPrompt,
  } = await import('../server/prompts/caption-pipeline.js');

  const { parsed, model } = await callOpenAiJson({
    system: CAPTION_STORM_SYSTEM,
    user: buildCaptionStormUserPrompt({
      templateDecode,
      contextExtract,
      intensity,
      humorPalette,
      audience,
      count,
    }),
  });

  return { output: parsed, model };
}

export async function judgeCaptions({ templateDecode, contextExtract, candidates }) {
  const {
    JUDGE_SYSTEM,
    buildJudgeUserPrompt,
  } = await import('../server/prompts/caption-pipeline.js');

  const { parsed, model } = await callOpenAiJson({
    system: JUDGE_SYSTEM,
    user: buildJudgeUserPrompt({ templateDecode, contextExtract, candidates }),
  });

  return { output: parsed, model };
}
