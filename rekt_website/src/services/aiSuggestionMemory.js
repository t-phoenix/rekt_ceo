const SESSION_ID_KEY = 'rekt_ai_suggest_session_id';
const HISTORY_KEY = 'rekt_meme_ai_suggestion_history';
const MAX_GENERATIONS = 60;
const MAX_TOPIC_LENGTH = 500;

function safeParse(json, fallback) {
  if (json == null || json === '') return fallback;
  try {
    const parsed = JSON.parse(json);
    if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return fallback;
    }
    return parsed;
  } catch {
    return fallback;
  }
}

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `gen_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function getOrCreateSessionId() {
  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = generateId();
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

export function loadHistoryStore() {
  const raw = localStorage.getItem(HISTORY_KEY);
  const parsed = safeParse(raw, { generations: [] });
  if (!parsed || !Array.isArray(parsed.generations)) {
    return { generations: [] };
  }
  return parsed;
}

function persistStore(store) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(store));
}

/**
 * Compress template to a small JPEG thumbnail for history cards.
 */
export async function createTemplateThumbnail(src, maxWidth = 220) {
  if (!src) return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const scale = Math.min(1, maxWidth / img.naturalWidth);
        const w = Math.round(img.naturalWidth * scale);
        const h = Math.round(img.naturalHeight * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      } catch {
        resolve(src.length < 50000 ? src : null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * @param {Object} entry
 * @returns {Object} saved generation record
 */
export async function saveGeneration(entry) {
  const sessionId = getOrCreateSessionId();
  const thumbnail = await createTemplateThumbnail(entry.templateSrc);
  const topic = String(entry.topic || '').slice(0, MAX_TOPIC_LENGTH);

  const record = {
    id: generateId(),
    sessionId,
    createdAt: new Date().toISOString(),
    topic,
    inputMode: entry.isTwitterPost ? 'content' : 'topic',
    templateId: entry.templateId || null,
    templateName: entry.templateName || 'Custom template',
    templateSrc:
      entry.templateSrc && !String(entry.templateSrc).startsWith('blob:')
        ? entry.templateSrc
        : null,
    templateThumbnail: thumbnail,
    llm: entry.llm || null,
    llmModel: entry.llmModel || null,
    options: (entry.options || []).map((o) => ({
      top_text: o.top_text,
      bottom_text: o.bottom_text,
      ranking_score: o.ranking_score,
      humor_pattern_used: o.humor_pattern_used,
    })),
    metadata: entry.metadata || null,
  };

  const store = loadHistoryStore();
  store.generations = [record, ...store.generations].slice(0, MAX_GENERATIONS);
  persistStore(store);

  return record;
}

export function getAllGenerations() {
  return loadHistoryStore().generations;
}

export function getSessionGenerations(sessionId = getOrCreateSessionId()) {
  return getAllGenerations().filter((g) => g.sessionId === sessionId);
}

export function getGenerationsGroupedBySession() {
  const generations = getAllGenerations();
  const groups = new Map();

  for (const gen of generations) {
    if (!groups.has(gen.sessionId)) {
      groups.set(gen.sessionId, {
        sessionId: gen.sessionId,
        startedAt: gen.createdAt,
        lastActiveAt: gen.createdAt,
        generations: [],
      });
    }
    const group = groups.get(gen.sessionId);
    group.generations.push(gen);
    if (gen.createdAt < group.startedAt) group.startedAt = gen.createdAt;
    if (gen.createdAt > group.lastActiveAt) group.lastActiveAt = gen.createdAt;
  }

  return Array.from(groups.values()).sort(
    (a, b) => new Date(b.lastActiveAt) - new Date(a.lastActiveAt)
  );
}

export function deleteGeneration(id) {
  const store = loadHistoryStore();
  store.generations = store.generations.filter((g) => g.id !== id);
  persistStore(store);
}

export function clearCurrentSessionHistory() {
  const sessionId = getOrCreateSessionId();
  const store = loadHistoryStore();
  store.generations = store.generations.filter((g) => g.sessionId !== sessionId);
  persistStore(store);
}

export function clearAllHistory() {
  localStorage.removeItem(HISTORY_KEY);
}
