/**
 * In-memory (sessionStorage) list of brandify generations for the current browser session.
 * Lets users review and re-apply generations without persisting across sessions.
 */

const SESSION_ID_KEY = 'rekt_brandify_gen_session_id';
const HISTORY_KEY = 'rekt_brandify_generation_history_v1';
const MAX_GENERATIONS = 40;

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
  return `bgen_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function getOrCreateBrandifySessionId() {
  if (typeof sessionStorage === 'undefined') return 'anonymous';
  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = generateId();
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

function loadStore() {
  if (typeof sessionStorage === 'undefined') return { generations: [] };
  const parsed = safeParse(sessionStorage.getItem(HISTORY_KEY), { generations: [] });
  if (!Array.isArray(parsed.generations)) return { generations: [] };
  return parsed;
}

function persistStore(store) {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(store));
  } catch {
    // quota / private mode
  }
}

/**
 * @param {Object} entry
 * @returns {Object} saved generation record
 */
export function saveBrandifyGeneration(entry) {
  const sessionId = getOrCreateBrandifySessionId();

  const record = {
    id: generateId(),
    sessionId,
    brandifySessionId: entry.brandifySessionId || null,
    createdAt: new Date().toISOString(),
    templateId: entry.templateId || null,
    templateName: entry.templateName || 'Custom meme',
    originalImageUrl: entry.originalImageUrl || null,
    generatedImageUrl: entry.generatedImageUrl,
    engineUsed: entry.engineUsed || null,
    appliedToCanvas: Boolean(entry.appliedToCanvas),
    source: entry.source || 'brandify',
  };

  const store = loadStore();
  store.generations = [record, ...store.generations].slice(0, MAX_GENERATIONS);
  persistStore(store);

  return record;
}

export function getAllBrandifyGenerations() {
  return loadStore().generations;
}

export function getSessionBrandifyGenerations(sessionId = getOrCreateBrandifySessionId()) {
  return getAllBrandifyGenerations().filter((g) => g.sessionId === sessionId);
}

export function getTemplateBrandifyGenerations(templateId) {
  if (!templateId) return [];
  return getSessionBrandifyGenerations().filter((g) => g.templateId === templateId);
}

export function markBrandifyGenerationApplied(id) {
  if (!id) return;
  const store = loadStore();
  store.generations = store.generations.map((g) => ({
    ...g,
    appliedToCanvas: g.id === id,
  }));
  persistStore(store);
}

export function markBrandifyGenerationAppliedByUrl(imageUrl) {
  if (!imageUrl) return;
  const store = loadStore();
  store.generations = store.generations.map((g) => ({
    ...g,
    appliedToCanvas: g.generatedImageUrl === imageUrl,
  }));
  persistStore(store);
}

export function removeBrandifyGeneration(id) {
  const store = loadStore();
  store.generations = store.generations.filter((g) => g.id !== id);
  persistStore(store);
}

export function clearSessionBrandifyGenerations() {
  const sessionId = getOrCreateBrandifySessionId();
  const store = loadStore();
  store.generations = store.generations.filter((g) => g.sessionId !== sessionId);
  persistStore(store);
}
