import { useCallback, useMemo, useSyncExternalStore } from 'react';
import {
  clearAllHistory,
  clearCurrentSessionHistory,
  deleteGeneration,
  getAllGenerations,
  getGenerationsGroupedBySession,
  getOrCreateSessionId,
  getSessionGenerations,
  saveGeneration,
} from '../services/aiSuggestionMemory';

const HISTORY_KEY = 'rekt_meme_ai_suggestion_history';
const listeners = new Set();

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((l) => l());
}

function getSnapshot() {
  return localStorage.getItem(HISTORY_KEY) || '';
}

export function useAiSuggestionMemory() {
  const historyRevision = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const sessionId = useMemo(() => getOrCreateSessionId(), []);

  const sessionGenerations = useMemo(
    () => getSessionGenerations(sessionId),
    [sessionId, historyRevision]
  );

  const allGenerations = useMemo(() => getAllGenerations(), [historyRevision]);

  const sessionsGrouped = useMemo(
    () => getGenerationsGroupedBySession(),
    [historyRevision]
  );

  const persistGeneration = useCallback(async (entry) => {
    const record = await saveGeneration(entry);
    notify();
    return record;
  }, []);

  const removeGeneration = useCallback((id) => {
    deleteGeneration(id);
    notify();
  }, []);

  const clearSession = useCallback(() => {
    clearCurrentSessionHistory();
    notify();
  }, []);

  const clearAll = useCallback(() => {
    clearAllHistory();
    notify();
  }, []);

  return {
    sessionId,
    sessionGenerations,
    allGenerations,
    sessionsGrouped,
    saveGeneration: persistGeneration,
    removeGeneration,
    clearSession,
    clearAll,
  };
}
