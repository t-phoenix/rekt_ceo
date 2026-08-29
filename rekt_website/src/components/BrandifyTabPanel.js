import { useState, useCallback, useMemo } from 'react';
import {
  MdAnalytics,
  MdBrush,
  MdCheckCircle,
  MdDownload,
  MdEdit,
  MdShare,
  MdSkipNext,
  MdTextFields,
  MdThumbDown,
  MdThumbUp,
} from 'react-icons/md';
import { useAppKit } from '@reown/appkit/react';
import brandifyApiService from '../services/BrandifyApiService';
import { getMemeApiUserMessage, MemeApiErrorCode } from '../services/memeApiErrors';
import { useBrandifyWorkflowPersistence } from '../hooks/useBrandifyWorkflowPersistence';
import { clearBrandifyWorkflow } from '../services/brandifySessionStorage';

const CUSTOM_IDEA = '__custom__';

const STEPS = [
  { id: 'analyze', label: 'Analyze', icon: MdAnalytics, priceKey: 'sessionStart', fallback: '$0.19' },
  { id: 'customize', label: 'Customize', icon: MdBrush, priceKey: null, fallback: 'Free' },
  { id: 'result', label: 'Result', icon: MdCheckCircle, priceKey: 'generate', fallback: '$0.49' },
];

function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

const BrandifyTabPanel = ({
  templateSrc,
  templateName,
  templateId,
  templateCategory,
  templateFilename,
  exportCanvas,
  brandifyPrices,
  brandifyPaymentInfo,
  brandifyOnline,
  brandifyError,
  onRefreshBrandify,
  paidFetch,
  ensurePaymentReady,
  isConnected,
  isOnBase,
  isSwitchingChain,
  usdcBalance,
  isBalanceLoading,
  hasSufficientUsdc,
  shortAddress,
  onSwitchToBase,
  onApplyToCanvas,
  onSwitchToText,
  onGenerationComplete,
  showToast,
  hideConnectionBanner = false,
  hideMemePreview = false,
}) => {
  const { open: openWalletModal } = useAppKit();

  const [step, setStep] = useState('analyze');
  const [customTarget, setCustomTarget] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [strategy, setStrategy] = useState(null);
  const [originalImageUrl, setOriginalImageUrl] = useState(null);
  const [selections, setSelections] = useState({});
  const [customIdeas, setCustomIdeas] = useState({});
  const [generatedImageUrl, setGeneratedImageUrl] = useState(null);
  const [engineUsed, setEngineUsed] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const workflowSetters = useMemo(
    () => ({
      setStep,
      setCustomTarget,
      setSessionId,
      setStrategy,
      setOriginalImageUrl,
      setSelections,
      setCustomIdeas,
      setGeneratedImageUrl,
      setEngineUsed,
      setRatingSubmitted,
      setError,
    }),
    []
  );

  const workflowState = useMemo(
    () => ({
      step,
      customTarget,
      sessionId,
      strategy,
      originalImageUrl,
      selections,
      customIdeas,
      generatedImageUrl,
      engineUsed,
      ratingSubmitted,
    }),
    [
      step,
      customTarget,
      sessionId,
      strategy,
      originalImageUrl,
      selections,
      customIdeas,
      generatedImageUrl,
      engineUsed,
      ratingSubmitted,
    ]
  );

  const { resetWorkflow } = useBrandifyWorkflowPersistence({
    templateId,
    templateSrc,
    state: workflowState,
    setters: workflowSetters,
    showToast,
  });

  const paymentEnabled = Boolean(brandifyPaymentInfo?.protocol === 'x402');
  const hasExistingAnalysis = Boolean(sessionId && strategy?.elements?.length);

  const formatUsdc = (value) => {
    if (value === null || value === undefined) return '—';
    if (value >= 1) return value.toFixed(2);
    return value.toFixed(4);
  };

  const runPaymentCheck = useCallback(async (price) => {
    if (!paymentEnabled) return true;
    if (!isConnected || !paidFetch) {
      setError({ code: MemeApiErrorCode.WALLET_REQUIRED, message: 'Connect your wallet on Base to pay.' });
      return false;
    }
    if (!isOnBase) {
      setError({ code: MemeApiErrorCode.WRONG_CHAIN, message: 'Switch to Base network to pay with USDC.' });
      return false;
    }
    try {
      await ensurePaymentReady(price);
      return true;
    } catch (err) {
      setError({ code: err.code || MemeApiErrorCode.PAYMENT_FAILED, message: getMemeApiUserMessage(err) });
      return false;
    }
  }, [paymentEnabled, isConnected, paidFetch, isOnBase, ensurePaymentReady]);

  const resolveAnalyzeImageFile = useCallback(async () => {
    if (exportCanvas) {
      try {
        const dataUrl = await withTimeout(
          exportCanvas(),
          15000,
          'Canvas export timed out — using template image instead.'
        );
        if (dataUrl) {
          const blob = dataUrlToBlob(dataUrl);
          return new File([blob], 'meme-canvas.png', { type: 'image/png' });
        }
      } catch (exportErr) {
        console.warn('Canvas export failed, falling back to template image:', exportErr);
      }
    }

    if (templateSrc) {
      const res = await fetch(templateSrc);
      if (!res.ok) {
        throw new Error(`Could not load meme image (${res.status})`);
      }
      const blob = await res.blob();
      return new File([blob], 'template.jpg', { type: blob.type || 'image/jpeg' });
    }

    throw new Error('Select or upload a meme first.');
  }, [exportCanvas, templateSrc]);

  const handleAnalyze = async () => {
    if (!brandifyOnline) {
      setError({ message: brandifyError || 'Brandify API offline — try again.' });
      return;
    }

    if (hasExistingAnalysis) {
      setError(null);
      setStep('customize');
      showToast?.('Continuing your existing analysis — no additional charge.');
      return;
    }

    setError(null);
    const ok = await runPaymentCheck(brandifyPrices?.sessionStart);
    if (!ok) return;

    setIsLoading(true);
    try {
      const file = await resolveAnalyzeImageFile();

      const fetchFn = paymentEnabled && paidFetch ? paidFetch : fetch;
      const result = await brandifyApiService.startSession(file, {
        customTarget: customTarget.trim() || undefined,
        templateId: templateId || undefined,
        category: templateCategory || undefined,
        templateFilename: templateFilename || undefined,
        fetchFn,
      });

      setSessionId(result.sessionId);
      setOriginalImageUrl(result.imageUrl);
      setStrategy(result.strategy);

      if (!result.strategy?.elements?.length) {
        setError({ message: 'No brandable elements found — try a different meme or add a custom target.' });
        return;
      }

      const initial = {};
      result.strategy.elements.forEach((el) => {
        initial[el.name] = el.ideas?.[0] || '';
      });
      setSelections(initial);
      setStep('customize');
    } catch (err) {
      setError({ message: getMemeApiUserMessage(err) });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    const userCuratedChoices = Object.entries(selections)
      .map(([element, idea]) => {
        if (idea === CUSTOM_IDEA) {
          const custom = customIdeas[element]?.trim();
          return custom ? { element, idea: custom } : null;
        }
        return idea?.trim() ? { element, idea: idea.trim() } : null;
      })
      .filter(Boolean);

    if (userCuratedChoices.length === 0) {
      setError({ message: 'Pick at least one brandify idea.' });
      return;
    }

    setError(null);
    const ok = await runPaymentCheck(brandifyPrices?.generate);
    if (!ok) return;

    setIsLoading(true);
    try {
      const fetchFn = paymentEnabled && paidFetch ? paidFetch : fetch;
      const result = await brandifyApiService.generateBranded(sessionId, userCuratedChoices, { fetchFn });
      setGeneratedImageUrl(result.generatedImageUrl);
      setEngineUsed(result.engineUsed);
      setStep('result');
      onGenerationComplete?.();
    } catch (err) {
      setError({ message: getMemeApiUserMessage(err) });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRate = async (rating) => {
    if (ratingSubmitted) return;

    if (paymentEnabled) {
      const ok = await runPaymentCheck(brandifyPrices?.rate);
      if (!ok) return;
    }

    try {
      const fetchFn = paymentEnabled && paidFetch ? paidFetch : fetch;
      await brandifyApiService.rateSession(sessionId, rating, { fetchFn });
      setRatingSubmitted(true);
    } catch (err) {
      showToast?.(getMemeApiUserMessage(err));
    }
  };

  const handleApply = () => {
    if (!generatedImageUrl) return;
    clearBrandifyWorkflow();
    onApplyToCanvas(generatedImageUrl);
    showToast?.('Branded meme applied to canvas!');
  };

  const handleDownload = async () => {
    if (!generatedImageUrl) return;
    try {
      const res = await fetch(generatedImageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rekt-brandified-${sessionId || 'meme'}.png`;
      a.click();
      URL.revokeObjectURL(url);
      showToast?.('Download started');
    } catch {
      showToast?.('Could not download image');
    }
  };

  const handleShare = async () => {
    if (!generatedImageUrl) return;
    try {
      await navigator.clipboard.writeText(generatedImageUrl);
      showToast?.('Image URL copied to clipboard');
    } catch {
      showToast?.('Could not copy URL');
    }
  };

  const handleSkipRating = () => {
    setRatingSubmitted(true);
    handleApply();
  };

  const renderWalletBar = () => {
    if (!paymentEnabled) return null;

    return (
      <div className="ai-assist-wallet-bar">
        <div className="ai-assist-wallet-row">
          <span className="ai-assist-wallet-dot" />
          <span>Pay with USDC on Base</span>
        </div>
        <div className="ai-assist-wallet-row">
          {!isConnected ? (
            <button type="button" className="ai-assist-wallet-action" onClick={() => openWalletModal()}>
              Connect wallet
            </button>
          ) : (
            <>
              <span>{shortAddress}</span>
              <span>·</span>
              <span>{isBalanceLoading ? '…' : `${formatUsdc(usdcBalance)} USDC`}</span>
              {!isOnBase && (
                <button type="button" className="ai-assist-wallet-action" onClick={onSwitchToBase} disabled={isSwitchingChain}>
                  {isSwitchingChain ? 'Switching…' : 'Switch to Base'}
                </button>
              )}
              {isOnBase && hasSufficientUsdc === false && (
                <span className="ai-assist-wallet-warn">Insufficient USDC</span>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const currentStepIndex = STEPS.findIndex((s) => s.id === step);

  const renderStepper = () => (
    <div className="brandify-stepper" aria-label="Brandify workflow">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const price = s.priceKey ? brandifyPrices?.[s.priceKey] || s.fallback : s.fallback;
        return (
          <div
            key={s.id}
            className={`brandify-step ${step === s.id ? 'active' : ''} ${currentStepIndex > i ? 'done' : ''}`}
          >
            <span className="brandify-step-icon-wrap">
              <Icon className="brandify-step-icon" aria-hidden="true" />
            </span>
            <span className="brandify-step-copy">
              <span className="brandify-step-label">{s.label}</span>
              <span className="brandify-step-price">{price}</span>
            </span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="brandify-tab-panel">
      {renderStepper()}

      {!brandifyOnline && !hideConnectionBanner && (
        <div className="ai-inline-status ai-inline-status--offline">
          <span>{brandifyError || 'Brandify API offline'}</span>
          <button type="button" className="ai-error-action" onClick={onRefreshBrandify}>Retry</button>
        </div>
      )}

      {!brandifyOnline && hideConnectionBanner && (
        <div className="ai-assist-tab-offline-note">
          <span>Brandify service is offline.</span>
          <button type="button" className="ai-error-action" onClick={onRefreshBrandify}>
            Retry connection
          </button>
        </div>
      )}

      {error && (
        <div className="ai-error-banner">
          <span>{error.message}</span>
          {error.code === MemeApiErrorCode.WALLET_REQUIRED && (
            <button type="button" className="ai-error-action" onClick={() => openWalletModal()}>Connect</button>
          )}
          {error.code === MemeApiErrorCode.WRONG_CHAIN && (
            <button type="button" className="ai-error-action" onClick={onSwitchToBase}>Switch to Base</button>
          )}
        </div>
      )}

      {step === 'analyze' && (
        <div className="brandify-step-content">
          <p className="brandify-hint">AI analyzes your meme and suggests brand placement ideas for Rekt CEO.</p>
          {hasExistingAnalysis && (
            <div className="brandify-resume-banner">
              <p>You already paid for analysis on this meme. Continue where you left off or start fresh.</p>
              <div className="brandify-resume-actions">
                <button
                  type="button"
                  className="brandify-btn brandify-btn--primary"
                  onClick={() => {
                    if (generatedImageUrl) setStep('result');
                    else if (strategy?.elements?.length) setStep('customize');
                  }}
                >
                  Continue brandify
                </button>
                <button type="button" className="brandify-btn brandify-btn--ghost" onClick={resetWorkflow}>
                  Start fresh
                </button>
              </div>
            </div>
          )}
          {!hideMemePreview && templateSrc && (
            <div className="brandify-preview-wrap">
              <img src={templateSrc} alt={templateName} className="brandify-preview-img" />
            </div>
          )}
          <label className="ai-modal-label" htmlFor="custom-target">Custom target (optional)</label>
          <input
            id="custom-target"
            className="ai-modal-input"
            placeholder="e.g. the coffee cup, background sign…"
            value={customTarget}
            onChange={(e) => setCustomTarget(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="button"
            className="story-btn primary brandify-action-btn"
            onClick={handleAnalyze}
            disabled={isLoading || !brandifyOnline}
          >
            {isLoading ? (
              <><span className="ai-modal-spinner" /> Analyzing… (up to 60s)</>
            ) : hasExistingAnalysis ? (
              <>Continue · already analyzed</>
            ) : paymentEnabled ? (
              <>Pay & Analyze · {brandifyPrices?.sessionStart || '$0.19'}</>
            ) : (
              <>Analyze</>
            )}
          </button>
        </div>
      )}

      {step === 'customize' && strategy?.elements && (
        <div className="brandify-step-content">
          <p className="brandify-hint">
            Pick a suggested idea for each element, or write your own custom design.
          </p>
          <div className="brandify-elements">
            {strategy.elements.map((el) => {
              const isCustomSelected = selections[el.name] === CUSTOM_IDEA;
              return (
              <div key={el.name} className="brandify-element-card">
                <div className="brandify-element-header">
                  <strong>{el.name}</strong>
                  <span className="brandify-element-type">{el.type}</span>
                </div>
                {el.reasoning && <p className="brandify-element-reason">{el.reasoning}</p>}
                <div className="brandify-ideas">
                  {(el.ideas || []).map((idea) => (
                    <label
                      key={idea}
                      className={`brandify-idea-option ${selections[el.name] === idea ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name={`idea-${el.name}`}
                        checked={selections[el.name] === idea}
                        onChange={() => setSelections((prev) => ({ ...prev, [el.name]: idea }))}
                      />
                      <span className="brandify-idea-text">{idea}</span>
                    </label>
                  ))}
                  <label
                    className={`brandify-idea-option brandify-idea-option--custom ${isCustomSelected ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name={`idea-${el.name}`}
                      checked={isCustomSelected}
                      onChange={() => setSelections((prev) => ({ ...prev, [el.name]: CUSTOM_IDEA }))}
                    />
                    <div className="brandify-idea-copy">
                      <span className="brandify-idea-custom-label">
                        <MdEdit aria-hidden="true" /> Write your own design
                      </span>
                      {isCustomSelected && (
                        <textarea
                          className="brandify-custom-input"
                          placeholder="Describe exactly how you want this element branded…"
                          value={customIdeas[el.name] || ''}
                          onChange={(e) => setCustomIdeas((prev) => ({ ...prev, [el.name]: e.target.value }))}
                          rows={3}
                        />
                      )}
                    </div>
                  </label>
                </div>
              </div>
            );
            })}
          </div>
          <div className="brandify-step-actions brandify-step-actions--split">
            <button type="button" className="brandify-btn brandify-btn--ghost" onClick={() => setStep('analyze')} disabled={isLoading}>
              ← Back
            </button>
            <button type="button" className="brandify-btn brandify-btn--primary" onClick={handleGenerate} disabled={isLoading}>
              {isLoading ? (
                <><span className="ai-modal-spinner" /> Generating…</>
              ) : paymentEnabled ? (
                <>Pay & Generate · {brandifyPrices?.generate || '$0.49'}</>
              ) : (
                <>Generate branded meme</>
              )}
            </button>
          </div>
        </div>
      )}

      {step === 'result' && generatedImageUrl && (
        <div className="brandify-step-content">
          <div className="brandify-comparison">
            <div className="brandify-comparison-item">
              <span className="brandify-comparison-label">Original</span>
              <img src={originalImageUrl || templateSrc} alt="Original" />
            </div>
            <div className="brandify-comparison-arrow">→</div>
            <div className="brandify-comparison-item">
              <span className="brandify-comparison-label">Branded</span>
              <img src={generatedImageUrl} alt="Branded" />
            </div>
          </div>
          {engineUsed && <p className="brandify-engine">Generated with {engineUsed}</p>}

          {!ratingSubmitted && (
            <div className="brandify-rating">
              <p className="brandify-hint">
                Rate this generation
                {paymentEnabled ? ` (${brandifyPrices?.rate || '$0.01'})` : ''}
              </p>
              <div className="brandify-rating-grid">
                <button type="button" className="brandify-btn brandify-btn--chip" onClick={() => handleRate('Like')}>
                  <MdThumbUp aria-hidden="true" /> Like
                </button>
                <button type="button" className="brandify-btn brandify-btn--chip" onClick={() => handleRate('Neutral')}>
                  Neutral
                </button>
                <button type="button" className="brandify-btn brandify-btn--chip" onClick={() => handleRate('Dislike')}>
                  <MdThumbDown aria-hidden="true" /> Dislike
                </button>
              </div>
            </div>
          )}

          <div className="brandify-result-actions">
            <button type="button" className="brandify-btn brandify-btn--chip" onClick={handleDownload}>
              <MdDownload aria-hidden="true" /> Download PNG
            </button>
            <button type="button" className="brandify-btn brandify-btn--chip" onClick={handleShare}>
              <MdShare aria-hidden="true" /> Share URL
            </button>
            {ratingSubmitted ? (
              <button type="button" className="brandify-btn brandify-btn--primary brandify-btn--wide" onClick={handleApply}>
                <MdCheckCircle aria-hidden="true" /> Apply to canvas
              </button>
            ) : (
              <button type="button" className="brandify-btn brandify-btn--chip brandify-btn--wide" onClick={handleSkipRating}>
                <MdSkipNext aria-hidden="true" /> Skip rating & apply
              </button>
            )}
            {onSwitchToText && (
              <button
                type="button"
                className="brandify-btn brandify-btn--accent brandify-btn--wide"
                onClick={() => { handleApply(); onSwitchToText(); }}
              >
                <MdTextFields aria-hidden="true" /> Add captions
              </button>
            )}
          </div>
        </div>
      )}

      {renderWalletBar()}
    </div>
  );
};

export default BrandifyTabPanel;
