import { useCallback, useEffect, useRef } from 'react';
import {
  buildBrandifyTemplateKey,
  clearBrandifyWorkflow,
  loadBrandifyWorkflow,
  saveBrandifyWorkflow,
} from '../services/brandifySessionStorage';

/**
 * Hydrate + autosave brandify panel state keyed by meme template.
 */
export function useBrandifyWorkflowPersistence({
  templateId,
  templateSrc,
  state,
  setters,
  showToast,
}) {
  const templateKey = buildBrandifyTemplateKey(templateId, templateSrc);
  const hydratedKeyRef = useRef(null);
  const skipNextSaveRef = useRef(false);

  useEffect(() => {
    if (!templateKey) return;
    if (hydratedKeyRef.current === templateKey) return;

    hydratedKeyRef.current = templateKey;
    const saved = loadBrandifyWorkflow(templateKey);

    skipNextSaveRef.current = true;
    if (saved) {
      setters.setStep(saved.step || 'analyze');
      setters.setCustomTarget(saved.customTarget || '');
      setters.setSessionId(saved.sessionId || null);
      setters.setStrategy(saved.strategy || null);
      setters.setOriginalImageUrl(saved.originalImageUrl || null);
      setters.setSelections(saved.selections || {});
      setters.setCustomIdeas(saved.customIdeas || {});
      setters.setGeneratedImageUrl(saved.generatedImageUrl || null);
      setters.setEngineUsed(saved.engineUsed || null);
      setters.setRatingSubmitted(Boolean(saved.ratingSubmitted));
      setters.setError(null);
      showToast?.('Restored your brandify progress — no extra payment needed.');
      return;
    }

    setters.setStep('analyze');
    setters.setCustomTarget('');
    setters.setSessionId(null);
    setters.setStrategy(null);
    setters.setOriginalImageUrl(null);
    setters.setSelections({});
    setters.setCustomIdeas({});
    setters.setGeneratedImageUrl(null);
    setters.setEngineUsed(null);
    setters.setRatingSubmitted(false);
    setters.setError(null);
  }, [templateKey, setters, showToast]);

  useEffect(() => {
    if (!templateKey || hydratedKeyRef.current !== templateKey) return;

    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    const hasProgress =
      state.step !== 'analyze' ||
      state.sessionId ||
      state.strategy ||
      state.generatedImageUrl ||
      state.customTarget?.trim();

    if (!hasProgress) return;

    saveBrandifyWorkflow({
      templateKey,
      step: state.step,
      customTarget: state.customTarget,
      sessionId: state.sessionId,
      strategy: state.strategy,
      originalImageUrl: state.originalImageUrl,
      selections: state.selections,
      customIdeas: state.customIdeas,
      generatedImageUrl: state.generatedImageUrl,
      engineUsed: state.engineUsed,
      ratingSubmitted: state.ratingSubmitted,
    });
  }, [templateKey, state]);

  const resetWorkflow = useCallback(() => {
    clearBrandifyWorkflow();
    skipNextSaveRef.current = true;
    setters.setStep('analyze');
    setters.setCustomTarget('');
    setters.setSessionId(null);
    setters.setStrategy(null);
    setters.setOriginalImageUrl(null);
    setters.setSelections({});
    setters.setCustomIdeas({});
    setters.setGeneratedImageUrl(null);
    setters.setEngineUsed(null);
    setters.setRatingSubmitted(false);
    setters.setError(null);
  }, [setters]);

  return { templateKey, resetWorkflow };
}
