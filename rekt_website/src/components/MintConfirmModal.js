import React, { useState, useEffect } from 'react';
import { useMint } from '../hooks/useMint';
import MintProgressModal from './MintProgressModal';
import './MintConfirmModal.css';

const MintConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    imagePreview,
    pricing = {},
    type = 'MEME', // 'MEME' or 'PFP'
    userData,
    isConnected,
    token,
    attributes = [],
}) => {
    const useMintInterface = useMint(token, pricing);
    const { hasPendingMint } = useMintInterface;
    const [showProgress, setShowProgress] = useState(false);

    useEffect(() => {
        if (hasPendingMint) setShowProgress(true);
    }, [hasPendingMint]);

    if (!isOpen) return null;

    if (showProgress) {
        return (
            <MintProgressModal
                isOpen={isOpen}
                onClose={() => { onClose(); setShowProgress(false); }}
                onConfirm={onConfirm}
                useMintInterface={useMintInterface}
                type={type}
                imagePreview={imagePreview}
                pricing={pricing}
                isConnected={isConnected}
                attributes={attributes}
            />
        );
    }

    const renderMintButton = () => {
        if (!isConnected) {
            return (
                <button className="story-btn primary disabled" disabled style={{ margin: 0, opacity: 0.5 }}>
                    Connect Wallet to Mint
                </button>
            );
        }

        return (
            <button className="story-btn primary" onClick={() => setShowProgress(true)} style={{ margin: 0 }}>
                🚀 Confirm & Proceed
            </button>
        );
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

                        {/* Attributes for PFP and MEME */}
                        {attributes && attributes.length > 0 && (
                            <div className="mint-attributes-card">
                                <div className="mint-attributes-header">{type === 'PFP' ? 'Traits' : 'Attributes'}</div>
                                <div className="mint-attributes-grid">
                                    {attributes.map(({ trait_type, value }) => (
                                        <div key={trait_type} className="mint-trait-item">
                                            <span className="mint-trait-label">{trait_type}</span>
                                            <span className="mint-trait-value" style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}



                        {/* User Data Info */}
                        {isConnected && userData && (
                            <div className="flex flex-column items-start gap-2 justify-between w-full mt-4 mb-1 px-1">
                                <div className="flex flex-row items-center">
                                    <span className="text-sm font-medium text-gray-400">Your Balance: </span>
                                    <span className="text-md font-bold text-white !ml-0.5">{parseFloat(userData.ceoBalance?.balance || 0).toLocaleString()} CEO</span>
                                </div>
                                <div className="flex flex-row items-center">
                                    <span className="text-sm font-medium text-gray-400">{type === 'PFP' ? 'PFPs Owned:' : 'Memes Owned:'} </span>
                                    <span className="text-md font-bold text-white !ml-0.5">{userData.mintInfo?.[type.toLowerCase()]?.mintCount || 0} / {userData.mintInfo?.[type.toLowerCase()]?.maxMint || 0}</span>
                                </div>
                            </div>
                        )}
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
                    {renderMintButton()}
                </div>
            </div>
        </div>
    );
};

export default MintConfirmModal;
