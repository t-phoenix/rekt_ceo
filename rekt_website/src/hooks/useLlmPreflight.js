import { useState, useEffect, useCallback, useRef } from 'react';
import memeApiService from '../services/MemeApiService';

const FAILED_MODELS_KEY = 'rekt_meme_ai_failed_llms';

function loadFailedModels() {
  try {
    const raw = sessionStorage.getItem(FAILED_MODELS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function markLlmFailed(modelId) {
  if (!modelId) return;
  const failed = loadFailedModels();
  failed[modelId] = Date.now();
  sessionStorage.setItem(FAILED_MODELS_KEY, JSON.stringify(failed));
}

export function clearLlmFailure(modelId) {
  if (!modelId) return;
  const failed = loadFailedModels();
  delete failed[modelId];
  sessionStorage.setItem(FAILED_MODELS_KEY, JSON.stringify(failed));
}

function filterWorkingPresets(presets) {
  const failed = loadFailedModels();
  return (presets || []).filter((p) => !failed[p.id]);
}

function pickDefault(presets, serverDefault) {
  if (serverDefault && presets.some((p) => p.id === serverDefault)) {
    return serverDefault;
  }
  return presets[0]?.id || '';
}

/**
 * Re-validates server LLM presets when the AI modal opens.
 * Filters out models that failed in this browser session.
 */
export function useLlmPreflight({ enabled, initialPresets = [], defaultLlm = '' }) {
  const [verifiedPresets, setVerifiedPresets] = useState(() =>
    filterWorkingPresets(initialPresets)
  );
  const [resolvedDefault, setResolvedDefault] = useState(defaultLlm);
  const [isChecking, setIsChecking] = useState(false);
  const [checkError, setCheckError] = useState(null);
  const runId = useRef(0);

  const runPreflight = useCallback(async () => {
    const id = ++runId.current;
    setIsChecking(true);
    setCheckError(null);

    try {
      const [healthRes, llms] = await Promise.all([
        fetch(`${memeApiService.baseUrl}/api/meme/health`).then((r) =>
          r.ok ? r.json() : null
        ),
        memeApiService.fetchAvailableLLMs(),
      ]);

      if (id !== runId.current) return;

      if (!healthRes?.llm_available) {
        setCheckError('AI models are temporarily unavailable on the server.');
        setVerifiedPresets([]);
        setResolvedDefault('');
        return;
      }

      const presets = filterWorkingPresets(llms.presets || []);
      setVerifiedPresets(presets);
      setResolvedDefault(pickDefault(presets, llms.default));
    } catch (err) {
      if (id !== runId.current) return;
      setCheckError(err?.message || 'Could not verify AI models.');
      const fallback = filterWorkingPresets(initialPresets);
      setVerifiedPresets(fallback);
      setResolvedDefault(pickDefault(fallback, defaultLlm));
    } finally {
      if (id === runId.current) setIsChecking(false);
    }
  }, [initialPresets, defaultLlm]);

  useEffect(() => {
    if (!enabled) return;
    runPreflight();
  }, [enabled, runPreflight]);

  useEffect(() => {
    if (!enabled || isChecking) return;
    const filtered = filterWorkingPresets(initialPresets);
    if (filtered.length > 0 && verifiedPresets.length === 0) {
      setVerifiedPresets(filtered);
      setResolvedDefault(pickDefault(filtered, defaultLlm));
    }
  }, [enabled, initialPresets, defaultLlm, isChecking, verifiedPresets.length]);

  return {
    verifiedPresets,
    resolvedDefault,
    isChecking,
    checkError,
    recheck: runPreflight,
  };
}
