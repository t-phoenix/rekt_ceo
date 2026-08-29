/**
 * Persists in-progress brandify workflow in sessionStorage so users don't lose
 * paid analysis/generation progress on remounts (devtools resize, tab switch, refresh).
 */

const STORAGE_KEY = 'rekt_brandify_workflow_v1';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function buildBrandifyTemplateKey(templateId, templateSrc) {
  if (templateId) return `id:${templateId}`;
  if (templateSrc) return `src:${templateSrc}`;
  return null;
}

export function loadBrandifyWorkflow(templateKey) {
  if (!templateKey || typeof sessionStorage === 'undefined') return null;

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw);
    if (data.templateKey !== templateKey) return null;
    if (!data.updatedAt || Date.now() - data.updatedAt > MAX_AGE_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export function saveBrandifyWorkflow(payload) {
  if (!payload?.templateKey || typeof sessionStorage === 'undefined') return;

  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...payload,
        updatedAt: Date.now(),
      })
    );
  } catch {
    // Quota or private mode — ignore
  }
}

export function clearBrandifyWorkflow() {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function hasPaidAnalyzeStep(workflow) {
  return Boolean(workflow?.sessionId && workflow?.strategy?.elements?.length);
}

export function hasPaidGenerateStep(workflow) {
  return Boolean(workflow?.generatedImageUrl);
}
