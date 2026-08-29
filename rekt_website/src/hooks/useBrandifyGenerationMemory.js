import { useCallback, useMemo, useSyncExternalStore } from 'react';
import {
  clearSessionBrandifyGenerations,
  getAllBrandifyGenerations,
  getOrCreateBrandifySessionId,
  getSessionBrandifyGenerations,
  getTemplateBrandifyGenerations,
  markBrandifyGenerationApplied,
  markBrandifyGenerationAppliedByUrl,
  removeBrandifyGeneration,
  saveBrandifyGeneration,
} from '../services/brandifyGenerationMemory';

const HISTORY_KEY = 'rekt_brandify_generation_history_v1';
const listeners = new Set();

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((l) => l());
}

function getSnapshot() {
  return sessionStorage.getItem(HISTORY_KEY) || '';
}

export function useBrandifyGenerationMemory(templateId) {
  const historyRevision = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  void historyRevision;

  const sessionId = useMemo(() => getOrCreateBrandifySessionId(), []);
  const sessionGenerations = getSessionBrandifyGenerations(sessionId);
  const allGenerations = getAllBrandifyGenerations();
  const templateGenerations = useMemo(
    () => getTemplateBrandifyGenerations(templateId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [templateId, historyRevision]
  );

  const saveGeneration = useCallback((entry) => {
    const record = saveBrandifyGeneration(entry);
    notify();
    return record;
  }, []);

  const markApplied = useCallback((id) => {
    markBrandifyGenerationApplied(id);
    notify();
  }, []);

  const markAppliedByUrl = useCallback((url) => {
    markBrandifyGenerationAppliedByUrl(url);
    notify();
  }, []);

  const removeGeneration = useCallback((id) => {
    removeBrandifyGeneration(id);
    notify();
  }, []);

  const clearSession = useCallback(() => {
    clearSessionBrandifyGenerations();
    notify();
  }, []);

  return {
    sessionId,
    sessionGenerations,
    templateGenerations,
    allGenerations,
    saveGeneration,
    markApplied,
    markAppliedByUrl,
    removeGeneration,
    clearSession,
  };
}
