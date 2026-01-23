import './MintConfirmModal.css';

const MintConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    imagePreview,
    metadata = {},
    pricing = {},
    type = 'MEME' // 'MEME' or 'PFP'
}) => {
    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm();
    };

    return (
        <div className="mint-confirm-overlay" onClick={onClose}>
            <div className="mint-confirm-content" onClick={(e) => e.stopPropagation()}>
                <div className="mint-confirm-header">
                    <h2 className="mint-confirm-title">
                        {type === 'PFP' ? '🎨 Confirm Your PFP NFT' : '🎭 Confirm Your Meme NFT'}
                    </h2>
                    <button className="mint-confirm-close" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className="mint-confirm-body">
                    {/* Preview Section */}
                    <div className="mint-preview-section">
                        <div className="mint-preview-label">Preview</div>
                        <div className="mint-preview-container">
                            {imagePreview ? (
                                <img
                                    src={imagePreview}
                                    alt={type === 'PFP' ? 'PFP Preview' : 'Meme Preview'}
                                    className="mint-preview-image"
                                />
                            ) : (
                                <div className="mint-preview-placeholder">
                                    No preview available
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Details Section */}
                    <div className="mint-details-section">
                        <div className="mint-details-header">
                            <h3 className="mint-details-title">
                                {type === 'PFP' ? 'PFP Details' : 'Meme Details'}
                            </h3>
                        </div>

                        {/* Pricing Info */}
                        <div className="mint-pricing-card">
                            <div className="mint-pricing-row">
                                <span className="mint-pricing-label">Tier</span>
                                <span className="mint-pricing-value">{pricing.tier || 'Standard'}</span>
                            </div>
                            <div className="mint-pricing-row">
                                <span className="mint-pricing-label">Price (USD)</span>
                                <span className="mint-pricing-value highlight-green">
                                    {pricing.usdPrice || 'Free'}
                                </span>
                            </div>
                            <div className="mint-pricing-row">
                                <span className="mint-pricing-label">Price ($CEO)</span>
                                <span className="mint-pricing-value highlight-yellow">
                                    {pricing.ceoPrice || 'Priceless'}
                                </span>
                            </div>
                        </div>

                        {/* Metadata for PFP */}
                        {type === 'PFP' && metadata.traits && (
                            <div className="mint-metadata-card">
                                <div className="mint-metadata-header">Traits</div>
                                <div className="mint-metadata-grid">
                                    {Object.entries(metadata.traits).map(([key, value]) => (
                                        <div key={key} className="mint-trait-item">
                                            <span className="mint-trait-label">{key}</span>
                                            <span className="mint-trait-value">{value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Supply Info */}
                        <div className="mint-supply-info">
                            <div className="mint-supply-item">
                                <span className="supply-icon">📊</span>
                                <span className="supply-text">
                                    {type === 'PFP'
                                        ? `${pricing.currentSupply || '--'} / ${pricing.totalSupply || '999'} minted`
                                        : `${pricing.currentSupply || '--'} / ${pricing.totalSupply || '10,000'} minted`
                                    }
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mint-confirm-footer">
                    <button
                        className="story-btn secondary"
                        onClick={onClose}
                        style={{ margin: 0 }}
                    >
                        Cancel
                    </button>
                    <button
                        className="story-btn primary"
                        onClick={handleConfirm}
                        style={{ margin: 0 }}
                    >
                        🚀 Confirm Mint
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MintConfirmModal;
