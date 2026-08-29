import { useState, useEffect, useCallback } from 'react';
import { MdAutoAwesome, MdClose, MdEdit, MdPalette } from 'react-icons/md';
import AiGenerateModal from './AiGenerateModal';
import BrandifyTabPanel from './BrandifyTabPanel';
import { parseUsdcPrice } from '../hooks/useMemeApiPayment';
import '../styles/aiAssistModal.css';

const TAB_STORAGE_KEY = 'rekt_ai_assist_tab';

function ServiceStatus({ online, loading, label }) {
  if (loading) {
    return (
      <span className="ai-assist-service-status ai-assist-service-status--loading" aria-label={`${label} checking connection`}>
        <span className="ai-assist-service-status-dot" />
        Checking…
      </span>
    );
  }

  return (
    <span
      className={`ai-assist-service-status ${online ? 'ai-assist-service-status--online' : 'ai-assist-service-status--offline'}`}
      aria-label={`${label} ${online ? 'online' : 'offline'}`}
    >
      <span className="ai-assist-service-status-dot" />
      {online ? 'Online' : 'Offline'}
    </span>
  );
}

function MemePreviewStrip({ src, name }) {
  if (!src) return null;

  return (
    <div className="ai-assist-meme-preview">
      <div className="ai-assist-meme-preview-frame">
        <img src={src} alt={name || 'Current meme'} className="ai-assist-meme-preview-img" />
      </div>
      <div className="ai-assist-meme-preview-meta">
        <span className="ai-assist-meme-preview-label">Current meme</span>
        {name && <span className="ai-assist-meme-preview-name">{name}</span>}
      </div>
    </div>
  );
}

const AiAssistModal = ({
  isOpen,
  onClose,
  initialTab = 'text',
  // Text tab props
  onGenerate,
  isTextLoading,
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
  textPriceLabel,
  templateSrc,
  templateName,
  sessionsGrouped,
  currentSessionId,
  historyCount,
  onReuseFromHistory,
  onRemoveGeneration,
  onClearSessionHistory,
  onClearAllHistory,
  onTextApplied,
  // Brandify tab props
  templateId,
  templateCategory,
  templateFilename,
  exportCanvas,
  brandifyPrices,
  brandifyPaymentInfo,
  brandifyOnline,
  brandifyError,
  brandifyConnectionStatus,
  onRefreshBrandify,
  brandifyPaidFetch,
  brandifyEnsurePaymentReady,
  brandifyUsdcBalance,
  brandifyIsBalanceLoading,
  brandifyHasSufficientUsdc,
  brandifyShortAddress,
  onBrandifyApply,
  onGenerationComplete,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [textAppliedOnce, setTextAppliedOnce] = useState(false);

  const textOnline = connectionStatus === 'online';
  const textLoading = connectionStatus === 'loading' || connectionStatus === 'idle';
  const brandifyStatus = brandifyConnectionStatus || (brandifyOnline ? 'online' : 'offline');
  const brandifyLoading = brandifyStatus === 'loading' || brandifyStatus === 'idle';
  const brandifyIsOnline = brandifyStatus === 'online';

  useEffect(() => {
    if (!isOpen) return;
    const stored = sessionStorage.getItem(TAB_STORAGE_KEY);
    setActiveTab(initialTab || stored || 'text');
    setTextAppliedOnce(false);
  }, [isOpen, initialTab]);

  const switchTab = useCallback((tab) => {
    setActiveTab(tab);
    sessionStorage.setItem(TAB_STORAGE_KEY, tab);
  }, []);

  const handleClose = () => {
    onClose();
  };

  const handleTextClose = (selectedOption) => {
    if (selectedOption?.topText && selectedOption?.bottomText) {
      onTextApplied?.(selectedOption);
      setTextAppliedOnce(true);
    } else {
      handleClose();
    }
  };

  const brandifyTotalLabel = brandifyPrices
    ? `$${(
        parseUsdcPrice(brandifyPrices.sessionStart) +
        parseUsdcPrice(brandifyPrices.generate) +
        parseUsdcPrice(brandifyPrices.rate)
      ).toFixed(2)}`
    : '$0.69';

  if (!isOpen) return null;

  return (
    <div className="ai-assist-overlay" onClick={handleClose}>
      <div
        className={`ai-assist-modal ${activeTab === 'text' ? 'ai-assist-modal--text' : 'ai-assist-modal--brandify'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ai-assist-header">
          <div className="ai-assist-header-copy">
            <div className="ai-assist-title-row">
              <MdAutoAwesome className="ai-assist-title-icon" aria-hidden="true" />
              <h2 className="ai-assist-title">AI Assist</h2>
            </div>
            <p className="ai-assist-subtitle">Generate captions or brandify your meme</p>
          </div>
          <button type="button" className="ai-assist-close" onClick={handleClose} aria-label="Close">
            <MdClose size={20} />
          </button>
        </div>

        <div className="ai-assist-nav" role="tablist" aria-label="AI Assist services">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'text'}
            className={`ai-assist-nav-btn ${activeTab === 'text' ? 'active' : ''}`}
            onClick={() => switchTab('text')}
          >
            <span className="ai-assist-nav-btn-main">
              <MdEdit className="ai-assist-nav-icon" aria-hidden="true" />
              <span className="ai-assist-nav-label">Text</span>
            </span>
            <span className="ai-assist-nav-meta">
              <span className="ai-assist-nav-price">{textPriceLabel || '$0.05'}</span>
              <ServiceStatus online={textOnline} loading={textLoading} label="Text service" />
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'brandify'}
            className={`ai-assist-nav-btn ${activeTab === 'brandify' ? 'active' : ''}`}
            onClick={() => switchTab('brandify')}
          >
            <span className="ai-assist-nav-btn-main">
              <MdPalette className="ai-assist-nav-icon" aria-hidden="true" />
              <span className="ai-assist-nav-label">Brandify</span>
            </span>
            <span className="ai-assist-nav-meta">
              <span className="ai-assist-nav-price">{brandifyTotalLabel}</span>
              <ServiceStatus online={brandifyIsOnline} loading={brandifyLoading} label="Brandify service" />
            </span>
          </button>
        </div>

        <MemePreviewStrip src={templateSrc} name={templateName} />

        <div className="ai-assist-body">
          <div className="ai-assist-tab-panel" hidden={activeTab !== 'text'}>
            <div className="ai-assist-text-embed">
              {textAppliedOnce && (
                <div className="ai-assist-cross-flow">
                  <span>Captions applied!</span>
                  <button type="button" className="ai-assist-cross-flow-btn" onClick={() => switchTab('brandify')}>
                    Brandify this meme →
                  </button>
                </div>
              )}
              <AiGenerateModal
                embedded
                isOpen={isOpen && activeTab === 'text'}
                onClose={handleTextClose}
                onGenerate={onGenerate}
                isLoading={isTextLoading}
                isConnected={isConnected}
                isOnBase={isOnBase}
                isSwitchingChain={isSwitchingChain}
                paymentInfo={paymentInfo}
                connectionStatus={connectionStatus}
                connectionError={connectionError}
                llmPresets={llmPresets}
                defaultLlm={defaultLlm}
                llmsLoading={llmsLoading}
                onRefreshConnection={onRefreshConnection}
                usdcBalance={usdcBalance}
                isBalanceLoading={isBalanceLoading}
                hasSufficientUsdc={hasSufficientUsdc}
                shortAddress={shortAddress}
                onSwitchToBase={onSwitchToBase}
                priceLabel={textPriceLabel}
                templateSrc={templateSrc}
                templateName={templateName}
                sessionsGrouped={sessionsGrouped}
                currentSessionId={currentSessionId}
                historyCount={historyCount}
                onReuseFromHistory={onReuseFromHistory}
                onRemoveGeneration={onRemoveGeneration}
                onClearSessionHistory={onClearSessionHistory}
                onClearAllHistory={onClearAllHistory}
                hideConnectionBanner
              />
            </div>
          </div>
          <div className="ai-assist-tab-panel" hidden={activeTab !== 'brandify'}>
            <BrandifyTabPanel
              templateSrc={templateSrc}
              templateName={templateName}
              templateId={templateId}
              templateCategory={templateCategory}
              templateFilename={templateFilename}
              exportCanvas={exportCanvas}
              brandifyPrices={brandifyPrices}
              brandifyPaymentInfo={brandifyPaymentInfo}
              brandifyOnline={brandifyIsOnline}
              brandifyError={brandifyError}
              onRefreshBrandify={onRefreshBrandify}
              paidFetch={brandifyPaidFetch}
              ensurePaymentReady={brandifyEnsurePaymentReady}
              isConnected={isConnected}
              isOnBase={isOnBase}
              isSwitchingChain={isSwitchingChain}
              usdcBalance={brandifyUsdcBalance ?? usdcBalance}
              isBalanceLoading={brandifyIsBalanceLoading ?? isBalanceLoading}
              hasSufficientUsdc={brandifyHasSufficientUsdc ?? hasSufficientUsdc}
              shortAddress={brandifyShortAddress ?? shortAddress}
              onSwitchToBase={onSwitchToBase}
              onApplyToCanvas={(url) => {
                onBrandifyApply?.(url);
                handleClose();
              }}
              onSwitchToText={() => switchTab('text')}
              onGenerationComplete={onGenerationComplete}
              showToast={showToast}
              hideConnectionBanner
              hideMemePreview
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiAssistModal;
