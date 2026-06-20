import { useState, useEffect } from 'react';
import { useAppKit } from '@reown/appkit/react';
import memeApiService from '../services/MemeApiService';
import { MemeApiErrorCode } from '../services/memeApiErrors';
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
}) => {
  const { open: openWalletModal } = useAppKit();
  const [inputMode, setInputMode] = useState('topic');
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');
  const [generatedOptions, setGeneratedOptions] = useState(null);
  const [generationMeta, setGenerationMeta] = useState(null);

  const [llmPresets, setLlmPresets] = useState([]);
  const [selectedLlm, setSelectedLlm] = useState('');
  const [llmModel, setLlmModel] = useState('');
  const [llmsLoading, setLlmsLoading] = useState(false);
  const [llmsError, setLlmsError] = useState(null);

  const [error, setError] = useState(null);
  const [retryAfterMs, setRetryAfterMs] = useState(null);

  const paymentEnabled = Boolean(paymentInfo?.protocol === 'x402');
  const priceLabel = paymentInfo?.price_per_call || '$0.05';
  const needsWallet = paymentEnabled && !isConnected;

  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setRetryAfterMs(null);
    setLlmsLoading(true);
    setLlmsError(null);

    memeApiService
      .fetchAvailableLLMs()
      .then(({ presets, default: defaultId }) => {
        setLlmPresets(presets || []);
        setSelectedLlm(defaultId || presets?.[0]?.id || '');
      })
      .catch(() => {
        setLlmsError('Could not load AI models — using server default.');
      })
      .finally(() => setLlmsLoading(false));
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

    if (paymentEnabled && !isConnected) {
      setError({
        code: MemeApiErrorCode.WALLET_REQUIRED,
        message: `Connect your wallet on Base to pay ${priceLabel} per generation.`,
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

  const resetForm = () => {
    setGeneratedOptions(null);
    setGenerationMeta(null);
    setTopic('');
    setContent('');
    setError(null);
    setRetryAfterMs(null);
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

  const isGenerateDisabled =
    (inputMode === 'topic' && !topic.trim()) ||
    (inputMode === 'content' && !content.trim()) ||
    isLoading ||
    isSwitchingChain ||
    Boolean(retryAfterMs) ||
    llmsLoading;

  if (!isOpen) return null;

  return (
    <div className="ai-modal-overlay" onClick={handleClose}>
      <div className="ai-modal-content ai-modal-content--wide" onClick={(e) => e.stopPropagation()}>
        <div className="ai-modal-header">
          <h2 className="ai-modal-title">
            {generatedOptions ? '✨ Choose Your Favorite' : '✨ AI Meme Generator'}
          </h2>
          <button className="ai-modal-close" onClick={handleClose} type="button">
            ✕
          </button>
        </div>

        {!generatedOptions ? (
          <>
            <div className="ai-modal-body">
              {paymentEnabled && (
                <div className={`ai-payment-banner ${needsWallet ? 'ai-payment-banner--action' : ''}`}>
                  <span className="ai-payment-icon">💳</span>
                  <div className="ai-payment-copy">
                    <strong>{priceLabel} per generation</strong>
                    <span>
                      {needsWallet
                        ? 'Connect your wallet on Base to pay with USDC'
                        : isOnBase
                          ? 'Paid via USDC on Base — wallet will prompt to sign'
                          : 'Switch to Base network when generating'}
                    </span>
                  </div>
                  {needsWallet && (
                    <button
                      type="button"
                      className="story-btn primary ai-connect-btn"
                      onClick={() => openWalletModal()}
                    >
                      Connect Wallet
                    </button>
                  )}
                </div>
              )}

              {error && (
                <div className={`ai-error-banner ai-error-banner--${error.code || 'generic'}`}>
                  <span>{error.message}</span>
                  {error.code === MemeApiErrorCode.WALLET_REQUIRED && (
                    <button
                      type="button"
                      className="ai-error-action"
                      onClick={() => openWalletModal()}
                    >
                      Connect Wallet
                    </button>
                  )}
                  {error.code === MemeApiErrorCode.RATE_LIMITED && retryAfterMs && (
                    <span className="ai-error-countdown">
                      Try again in {formatCountdown(retryAfterMs)}
                    </span>
                  )}
                </div>
              )}

              <div className="ai-modal-input-header">
                <label htmlFor="input-field" className="ai-modal-label">
                  {inputMode === 'topic' ? "What's your meme about?" : 'Enter your content'}
                </label>
                <button
                  type="button"
                  className="ai-toggle-btn"
                  onClick={toggleInputMode}
                  disabled={isLoading}
                  title={`Switch to ${inputMode === 'topic' ? 'content' : 'topic'} mode`}
                >
                  {inputMode === 'topic' ? '📝 Switch to Content' : '💡 Switch to Topic'}
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
                  placeholder="e.g., Just saw Bitcoin hit $100k and my portfolio is still in the red. Story of my life! 📉😭"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={isLoading}
                  rows={3}
                  autoFocus
                />
              )}

              <div className="ai-llm-section">
                <label htmlFor="llm-select" className="ai-modal-label">
                  AI Model
                </label>
                {llmsLoading ? (
                  <p className="ai-modal-hint">Loading models…</p>
                ) : (
                  <>
                    <select
                      id="llm-select"
                      className="ai-modal-select"
                      value={selectedLlm}
                      onChange={(e) => setSelectedLlm(e.target.value)}
                      disabled={isLoading || llmPresets.length === 0}
                    >
                      {llmPresets.length === 0 ? (
                        <option value="">Server default</option>
                      ) : (
                        llmPresets.map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {preset.label} — {TIER_LABELS[preset.tier] || preset.tier}
                          </option>
                        ))
                      )}
                    </select>
                    {llmsError && <p className="ai-modal-hint ai-modal-hint--warn">{llmsError}</p>}
                    {selectedLlm &&
                      llmPresets.find((p) => p.id === selectedLlm)?.description && (
                        <p className="ai-modal-hint">
                          {llmPresets.find((p) => p.id === selectedLlm).description}
                        </p>
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

              <p className="ai-modal-hint">
                {inputMode === 'topic'
                  ? 'Enter a topic or theme and let AI generate viral meme text for you!'
                  : 'Paste your pre-written content (like a Twitter post) and AI will generate meme text from it!'}
              </p>
            </div>

            <div className="ai-modal-footer">
              <button
                type="button"
                className="story-btn secondary"
                onClick={handleClose}
                disabled={isLoading}
                style={{ margin: 0 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="story-btn primary"
                onClick={handleSubmit}
                disabled={isGenerateDisabled}
                style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {isLoading || isSwitchingChain ? (
                  <>
                    <span className="ai-modal-spinner" />
                    {isSwitchingChain ? 'Switching to Base…' : 'Generating…'}
                  </>
                ) : retryAfterMs ? (
                  `Wait ${formatCountdown(retryAfterMs)}`
                ) : paymentEnabled ? (
                  `🚀 Generate (${priceLabel})`
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
              <p className="ai-modal-hint" style={{ marginBottom: '1rem' }}>
                Click on your favorite option to use it in your meme!
              </p>
              <div className="ai-options-grid">
                {generatedOptions.options.map((option, index) => (
                  <div
                    key={index}
                    className="ai-option-card"
                    onClick={() => handleSelectOption(option)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleSelectOption(option)}
                  >
                    <div className="ai-option-rank-badge">#{index + 1}</div>
                    <div className="ai-option-content">
                      <div className="ai-option-meme-preview">
                        <div className="ai-option-top">{option.top_text}</div>
                        <div className="ai-option-bottom">{option.bottom_text}</div>
                      </div>
                      <div className="ai-option-metadata">
                        <div className="ai-option-meta-item">
                          <span className="meta-icon">🎯</span>
                          <span className="meta-value">
                            {(option.ranking_score * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="ai-option-meta-item">
                          <span className="meta-icon">😄</span>
                          <span className="meta-value">
                            {option.humor_pattern_used.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ai-modal-footer">
              <button
                type="button"
                className="story-btn secondary"
                onClick={() => {
                  setGeneratedOptions(null);
                  setGenerationMeta(null);
                }}
                style={{ margin: 0 }}
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
