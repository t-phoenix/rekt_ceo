import { useState, useEffect } from 'react';
import { useAppKit } from '@reown/appkit/react';
import { MemeApiErrorCode } from '../services/memeApiErrors';
import { useLlmPreflight } from '../hooks/useLlmPreflight';
import AiSuggestionHistory from './AiSuggestionHistory';
import './AiGenerateModal.css';

const TIER_LABELS = {
  budget: 'Budget',
  balanced: 'Balanced',
  premium: 'Premium',
};

const AiGenerateModal = ({
  isOpen,
  onClose,
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
  priceLabel = '$0.05',
  templateSrc,
  templateName = 'Template',
  sessionsGrouped,
  currentSessionId,
  historyCount = 0,
  onReuseFromHistory,
  onRemoveGeneration,
  onClearSessionHistory,
  onClearAllHistory,
}) => {
  const { open: openWalletModal } = useAppKit();
  const [modalView, setModalView] = useState('generate');
  const [inputMode, setInputMode] = useState('topic');
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');
  const [generatedOptions, setGeneratedOptions] = useState(null);
  const [generationMeta, setGenerationMeta] = useState(null);
  const [lastTopic, setLastTopic] = useState('');

  const [selectedLlm, setSelectedLlm] = useState('');
  const [llmModel, setLlmModel] = useState('');

  const [error, setError] = useState(null);
  const [retryAfterMs, setRetryAfterMs] = useState(null);

  const {
    verifiedPresets,
    resolvedDefault,
    isChecking: isPreflighting,
    checkError: preflightError,
    recheck: recheckModels,
  } = useLlmPreflight({
    enabled: isOpen,
    initialPresets: llmPresets,
    defaultLlm,
  });

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
    if (!isOpen || llmsLoading || isPreflighting) return;
    if (resolvedDefault) {
      setSelectedLlm(resolvedDefault);
    } else if (verifiedPresets.length > 0) {
      setSelectedLlm(verifiedPresets[0].id);
    }
  }, [isOpen, resolvedDefault, verifiedPresets, llmsLoading, isPreflighting]);

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

  const selectedPreset = verifiedPresets.find((p) => p.id === selectedLlm);

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

    if (selectedLlm === 'openrouter' && !llmModel.trim()) {
      setError({
        code: MemeApiErrorCode.VALIDATION,
        message: 'Enter an OpenRouter model id (e.g. google/gemini-2.5-flash).',
      });
      return;
    }

    setError(null);

    const isTwitterPost = inputMode === 'content';
    const result = await onGenerate(inputValue.trim(), isTwitterPost, {
      llm: selectedLlm || undefined,
      llmModel: selectedLlm === 'openrouter' ? llmModel.trim() : undefined,
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
    setLlmModel('');
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

  const modelsLoading = llmsLoading || connectionStatus === 'loading' || isPreflighting;

  const isGenerateDisabled =
    (inputMode === 'topic' && !topic.trim()) ||
    (inputMode === 'content' && !content.trim()) ||
    isLoading ||
    isSwitchingChain ||
    Boolean(retryAfterMs) ||
    modelsLoading ||
    isApiOffline ||
    verifiedPresets.length === 0;

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

  return (
    <div className="ai-modal-overlay" onClick={handleClose}>
      <div
        className={`ai-modal-content ai-modal-content--wide ${
          showResults ? 'ai-modal-content--options' : ''
        } ${modalView === 'history' ? 'ai-modal-content--history' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ai-modal-header ai-modal-header--slim">
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
          <button className="ai-modal-close" onClick={handleClose} type="button" aria-label="Close">
            ✕
          </button>
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

              {isApiOffline && (
                <div className="ai-inline-status ai-inline-status--offline">
                  <span>{connectionError || 'Meme API offline'}</span>
                  <button type="button" className="ai-error-action" onClick={onRefreshConnection}>
                    Retry
                  </button>
                </div>
              )}

              {preflightError && !isApiOffline && (
                <div className="ai-inline-status ai-inline-status--warn">
                  <span>{preflightError}</span>
                  <button type="button" className="ai-error-action" onClick={recheckModels}>
                    Recheck
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
                <div className="ai-llm-header">
                  <label htmlFor="ai-model-select" className="ai-modal-label">
                    AI Model
                  </label>
                  {!modelsLoading && verifiedPresets.length > 0 && (
                    <span className="ai-llm-ready">
                      {verifiedPresets.length} ready
                    </span>
                  )}
                </div>

                {modelsLoading ? (
                  <div className="ai-model-select-wrap ai-model-select-wrap--loading">
                    <span className="ai-modal-spinner" />
                    <span>Verifying available models…</span>
                  </div>
                ) : verifiedPresets.length === 0 ? (
                  <p className="ai-modal-hint ai-modal-hint--warn">
                    No working models found — check server API keys or retry.
                  </p>
                ) : (
                  <>
                    <div className="ai-model-select-wrap">
                      <select
                        id="ai-model-select"
                        className="ai-model-select"
                        value={selectedLlm}
                        onChange={(e) => setSelectedLlm(e.target.value)}
                        disabled={isLoading}
                      >
                        {verifiedPresets.map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {preset.label}
                            {preset.tier ? ` · ${TIER_LABELS[preset.tier] || preset.tier}` : ''}
                            {preset.supports_vision ? ' · Vision' : ''}
                          </option>
                        ))}
                      </select>
                      <span className="ai-model-select-chevron" aria-hidden="true">▾</span>
                    </div>
                    {selectedPreset?.description && (
                      <p className="ai-modal-hint ai-model-desc">{selectedPreset.description}</p>
                    )}
                  </>
                )}

                {selectedLlm === 'openrouter' && (
                  <input
                    type="text"
                    className="ai-modal-input ai-openrouter-input"
                    placeholder="google/gemini-2.5-flash"
                    value={llmModel}
                    onChange={(e) => setLlmModel(e.target.value)}
                    disabled={isLoading}
                  />
                )}
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
                            😄 {option.humor_pattern_used.replace(/_/g, ' ')}
                          </span>
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
    </div>
  );
};

export default AiGenerateModal;
