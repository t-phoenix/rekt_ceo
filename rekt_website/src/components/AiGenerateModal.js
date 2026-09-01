import { useState, useEffect } from 'react';
import { useAppKit } from '@reown/appkit/react';
import { MemeApiErrorCode } from '../services/memeApiErrors';
import AiSuggestionHistory from './AiSuggestionHistory';
import './AiGenerateModal.css';

const INTENSITY_OPTIONS = [
  { value: 'mild', label: 'Mild — playful nudge' },
  { value: 'medium', label: 'Medium — classic CT banter' },
  { value: 'savage', label: 'Savage — full send' },
];

const AiGenerateModal = ({
  isOpen,
  onClose,
  embedded = false,
  onGenerate,
  isLoading,
  isConnected,
  isOnBase,
  isSwitchingChain,
  paymentInfo,
  connectionStatus,
  connectionError,
  llmPresets,
  defaultLlm,
  llmsLoading,
  onRefreshConnection,
  usdcBalance,
  isBalanceLoading,
  hasSufficientUsdc,
  shortAddress,
  onSwitchToBase,
  priceLabel = '$0.10',
  templateSrc,
  templateName = 'Template',
  sessionsGrouped,
  currentSessionId,
  historyCount = 0,
  onReuseFromHistory,
  onRemoveGeneration,
  onClearSessionHistory,
  onClearAllHistory,
  hideConnectionBanner = false,
}) => {
  const { open: openWalletModal } = useAppKit();
  const [modalView, setModalView] = useState('generate');
  const [inputMode, setInputMode] = useState('topic');
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');
  const [generatedOptions, setGeneratedOptions] = useState(null);
  const [generationMeta, setGenerationMeta] = useState(null);
  const [lastTopic, setLastTopic] = useState('');

  const [intensity, setIntensity] = useState('medium');

  const [error, setError] = useState(null);
  const [retryAfterMs, setRetryAfterMs] = useState(null);

  const paymentEnabled = Boolean(paymentInfo?.protocol === 'x402');
  const needsWallet = paymentEnabled && !isConnected;
  const needsBaseSwitch = paymentEnabled && isConnected && !isOnBase;
  const needsUsdc = paymentEnabled && isConnected && isOnBase && hasSufficientUsdc === false;
  const isApiOffline = connectionStatus === 'offline';

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setRetryAfterMs(null);
    setModalView('generate');
  }, [isOpen]);

  useEffect(() => {
    if (!retryAfterMs || retryAfterMs <= 0) return undefined;

    const timer = setInterval(() => {
      setRetryAfterMs((prev) => {
        if (prev <= 1000) return null;
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [retryAfterMs]);

  const handleSubmit = async () => {
    const inputValue = inputMode === 'topic' ? topic : content;
    if (!inputValue.trim()) return;

    if (isApiOffline) {
      setError({
        code: MemeApiErrorCode.NETWORK,
        message: connectionError || 'Meme API is offline. Try refreshing the connection.',
      });
      return;
    }

    if (paymentEnabled && !isConnected) {
      setError({
        code: MemeApiErrorCode.WALLET_REQUIRED,
        message: `Connect your wallet on Base to pay ${priceLabel} in USDC.`,
      });
      return;
    }

    if (needsBaseSwitch) {
      setError({
        code: MemeApiErrorCode.WRONG_CHAIN,
        message: 'Switch to Base network to pay with USDC.',
      });
      return;
    }

    if (needsUsdc) {
      setError({
        code: MemeApiErrorCode.PAYMENT_FAILED,
        message: `Insufficient USDC on Base. You need at least ${priceLabel}.`,
      });
      return;
    }

    setError(null);

    const isTwitterPost = inputMode === 'content';
    const result = await onGenerate(inputValue.trim(), isTwitterPost, {
      intensity,
    });

    if (result?.error) {
      setError(result.error);
      if (result.error.retryAfterMs) {
        setRetryAfterMs(result.error.retryAfterMs);
      }
      return;
    }

    if (result?.options) {
      setGeneratedOptions(result);
      setGenerationMeta(result.metadata || null);
      setLastTopic(inputValue.trim());
      setModalView('results');
    }
  };

  const handleSelectOption = (option) => {
    onClose({
      topText: option.top_text,
      bottomText: option.bottom_text,
      metadata: option,
    });
    resetForm();
  };

  const handleReuseFromHistory = (option, generation) => {
    onReuseFromHistory(option, generation);
    resetForm();
  };

  const resetForm = () => {
    setGeneratedOptions(null);
    setGenerationMeta(null);
    setLastTopic('');
    setTopic('');
    setContent('');
    setError(null);
    setRetryAfterMs(null);
    setModalView('generate');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && inputMode === 'topic' && topic.trim() && !isLoading && !retryAfterMs) {
      handleSubmit();
    }
  };

  const toggleInputMode = () => {
    setInputMode((prev) => (prev === 'topic' ? 'content' : 'topic'));
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const formatCountdown = (ms) => {
    const totalSec = Math.ceil(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
  };

  const formatUsdc = (value) => {
    if (value === null || value === undefined) return '—';
    if (value >= 1) return value.toFixed(2);
    return value.toFixed(4);
  };

  const isGenerateDisabled =
    (inputMode === 'topic' && !topic.trim()) ||
    (inputMode === 'content' && !content.trim()) ||
    isLoading ||
    isSwitchingChain ||
    Boolean(retryAfterMs) ||
    connectionStatus === 'loading' ||
    isApiOffline;

  if (!isOpen) return null;

  const showResults = modalView === 'results' && generatedOptions;

  const renderPaymentStrip = () => {
    if (!paymentEnabled) return null;

    return (
      <div
        className={`ai-pay-strip ${needsWallet || needsBaseSwitch || needsUsdc ? 'ai-pay-strip--warn' : ''}`}
      >
        <div className="ai-pay-strip-row ai-pay-strip-row--primary">
          <span className="ai-pay-strip-dot" />
          <span>Pay with USDC on Base · {priceLabel}</span>
          <span className="ai-pay-strip-sep">·</span>
          <span className="ai-pay-strip-muted">x402 micropayment per AI generation</span>
        </div>
        <div className="ai-pay-strip-row ai-pay-strip-row--wallet">
          {needsWallet ? (
            <>
              <span className="ai-pay-strip-muted">Wallet not connected</span>
              <button type="button" className="ai-pay-strip-action" onClick={() => openWalletModal()}>
                Connect
              </button>
            </>
          ) : (
            <>
              <span className="ai-pay-strip-addr">{shortAddress}</span>
              <span className="ai-pay-strip-sep">·</span>
              <span className="ai-pay-strip-balance">
                Balance: {isBalanceLoading ? '…' : `${formatUsdc(usdcBalance)} USDC`}
              </span>
              {needsBaseSwitch && (
                <button
                  type="button"
                  className="ai-pay-strip-action"
                  onClick={onSwitchToBase}
                  disabled={isSwitchingChain}
                >
                  {isSwitchingChain ? 'Switching…' : 'Switch to Base'}
                </button>
              )}
              {needsUsdc && !needsBaseSwitch && (
                <span className="ai-pay-strip-warn">Need {priceLabel}+</span>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const modalInner = (
    <div
      className={`ai-modal-content ai-modal-content--wide ${
        showResults ? 'ai-modal-content--options' : ''
      } ${modalView === 'history' ? 'ai-modal-content--history' : ''} ${embedded ? 'ai-modal-content--embedded' : ''}`}
      onClick={embedded ? undefined : (e) => e.stopPropagation()}
    >
      <div className={`ai-modal-header ai-modal-header--slim ${embedded ? 'ai-modal-header--embedded' : ''}`}>
        <div className="ai-modal-tabs">
          <button
            type="button"
            className={`ai-modal-tab ${modalView === 'generate' || showResults ? 'active' : ''}`}
            onClick={() => {
              if (showResults) setModalView('results');
              else setModalView('generate');
            }}
          >
            ✨ Generate
          </button>
          <button
            type="button"
            className={`ai-modal-tab ${modalView === 'history' ? 'active' : ''}`}
            onClick={() => setModalView('history')}
          >
            📚 History{historyCount > 0 ? ` (${historyCount})` : ''}
          </button>
        </div>
        {!embedded && (
          <button className="ai-modal-close" onClick={handleClose} type="button" aria-label="Close">
            ✕
          </button>
        )}
      </div>

        {modalView === 'history' ? (
          <div className="ai-modal-body ai-history-body">
            <AiSuggestionHistory
              sessionsGrouped={sessionsGrouped}
              currentSessionId={currentSessionId}
              onReuseOption={handleReuseFromHistory}
              onRemoveGeneration={onRemoveGeneration}
              onClearSession={onClearSessionHistory}
              onClearAll={onClearAllHistory}
            />
          </div>
        ) : !showResults ? (
          <>
            <div className="ai-modal-body">
              {renderPaymentStrip()}

              {isApiOffline && !hideConnectionBanner && (
                <div className="ai-inline-status ai-inline-status--offline">
                  <span>{connectionError || 'Meme API offline'}</span>
                  <button type="button" className="ai-error-action" onClick={onRefreshConnection}>
                    Retry
                  </button>
                </div>
              )}

              {isApiOffline && hideConnectionBanner && (
                <div className="ai-assist-tab-offline-note">
                  <span>Text service is offline.</span>
                  <button type="button" className="ai-error-action" onClick={onRefreshConnection}>
                    Retry connection
                  </button>
                </div>
              )}

              {error && (
                <div className={`ai-error-banner ai-error-banner--${error.code || 'generic'}`}>
                  <span>{error.message}</span>
                  {error.code === MemeApiErrorCode.WALLET_REQUIRED && (
                    <button type="button" className="ai-error-action" onClick={() => openWalletModal()}>
                      Connect Wallet
                    </button>
                  )}
                  {error.code === MemeApiErrorCode.WRONG_CHAIN && (
                    <button type="button" className="ai-error-action" onClick={onSwitchToBase}>
                      Switch to Base
                    </button>
                  )}
                  {error.code === MemeApiErrorCode.RATE_LIMITED && retryAfterMs && (
                    <span className="ai-error-countdown">Try again in {formatCountdown(retryAfterMs)}</span>
                  )}
                </div>
              )}

              <div className="ai-modal-input-header">
                <label htmlFor="input-field" className="ai-modal-label">
                  {inputMode === 'topic' ? "What's your meme about?" : 'Enter your content'}
                </label>
                <button type="button" className="ai-toggle-btn" onClick={toggleInputMode} disabled={isLoading}>
                  {inputMode === 'topic' ? '📝 Content' : '💡 Topic'}
                </button>
              </div>

              {inputMode === 'topic' ? (
                <input
                  id="input-field"
                  type="text"
                  className="ai-modal-input"
                  placeholder="e.g., crypto market crash, NFT hype, diamond hands..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  autoFocus
                />
              ) : (
                <textarea
                  id="input-field"
                  className="ai-modal-textarea"
                  placeholder="Paste a tweet or post and AI will turn it into meme text…"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={isLoading}
                  rows={3}
                  autoFocus
                />
              )}

              <div className="ai-llm-section">
                <label htmlFor="ai-intensity-select" className="ai-modal-label">
                  Roast intensity
                </label>
                <div className="ai-model-select-wrap">
                  <select
                    id="ai-intensity-select"
                    className="ai-model-select"
                    value={intensity}
                    onChange={(e) => setIntensity(e.target.value)}
                    disabled={isLoading}
                  >
                    {INTENSITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <span className="ai-model-select-chevron" aria-hidden="true">▾</span>
                </div>
                <p className="ai-modal-hint ai-model-desc">
                  AI drafts 10 captions, judges them, and returns the top 3.
                </p>
              </div>
            </div>

            <div className="ai-modal-footer">
              <button type="button" className="story-btn secondary" onClick={handleClose} disabled={isLoading}>
                Cancel
              </button>
              <button
                type="button"
                className="story-btn primary ai-generate-btn"
                onClick={handleSubmit}
                disabled={isGenerateDisabled}
              >
                {isLoading || isSwitchingChain ? (
                  <>
                    <span className="ai-modal-spinner" />
                    {isSwitchingChain ? 'Switching to Base…' : 'Generating…'}
                  </>
                ) : retryAfterMs ? (
                  `Wait ${formatCountdown(retryAfterMs)}`
                ) : paymentEnabled ? (
                  <>🚀 Generate · {priceLabel} USDC</>
                ) : (
                  '🚀 Generate Text'
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="ai-modal-body ai-options-body">
              {generationMeta?.llm && (
                <p className="ai-model-used">
                  Generated with {generationMeta.llm.model}
                  {generationMeta.llm.vision_fallback && ' (vision via fallback model)'}
                </p>
              )}

              <div className="ai-results-split">
                <aside className="ai-results-template-panel">
                  <p className="ai-results-panel-label">Template</p>
                  <div className="ai-results-template-frame">
                    {templateSrc && (
                      <img src={templateSrc} alt={templateName} className="ai-results-template-img" />
                    )}
                  </div>
                  <p className="ai-results-template-name">{templateName}</p>
                  {lastTopic && (
                    <p className="ai-results-topic" title={lastTopic}>
                      <span className="ai-results-topic-label">Topic</span>
                      {lastTopic}
                    </p>
                  )}
                </aside>

                <div className="ai-results-options-panel">
                  <p className="ai-results-panel-label">Pick a caption</p>
                  <div className="ai-options-list">
                    {generatedOptions.options.map((option, index) => (
                      <button
                        key={index}
                        type="button"
                        className="ai-option-card ai-option-card--text"
                        onClick={() => handleSelectOption(option)}
                      >
                        <span className="ai-option-rank-badge">#{index + 1}</span>
                        <div className="ai-option-text-block">
                          <div className="ai-option-line ai-option-line--top">{option.top_text}</div>
                          <div className="ai-option-line ai-option-line--bottom">{option.bottom_text}</div>
                        </div>
                        <div className="ai-option-metadata ai-option-metadata--inline">
                          <span className="ai-option-meta-item">
                            🎯 {(option.ranking_score * 100).toFixed(0)}%
                          </span>
                          <span className="ai-option-meta-item">
                            😄 {(option.humor_pattern_used || option.humor_tag || 'meme').replace(/_/g, ' ')}
                          </span>
                          {option.intensity && (
                            <span className="ai-option-meta-item">
                              🔥 {option.intensity}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="ai-modal-footer">
              <button
                type="button"
                className="story-btn secondary"
                onClick={() => {
                  setGeneratedOptions(null);
                  setGenerationMeta(null);
                  setModalView('generate');
                }}
              >
                ← Back
              </button>
            </div>
          </>
        )}
      </div>
  );

  if (embedded) return modalInner;

  return (
    <div className="ai-modal-overlay" onClick={handleClose}>
      {modalInner}
    </div>
  );
};

export default AiGenerateModal;
