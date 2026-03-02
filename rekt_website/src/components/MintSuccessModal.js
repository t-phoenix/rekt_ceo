/*global BigInt*/
import { useEffect, useState } from 'react';
import { useChainId, useWalletClient } from 'wagmi';
import { getTransactionReceipt } from 'wagmi/actions';
import { config } from '../config/walletConfig';
import './MintSuccessModal.css';

const MintSuccessModal = ({
    isOpen,
    onClose,
    imagePreview,
    type = 'MEME', // 'MEME' or 'PFP'
    onSocialShare,
    mintResult
}) => {
    const chainId = useChainId();
    const { data: walletClient } = useWalletClient();

    // Helper to get right explorer
    const getExplorerUrl = (hash) => {
        if (chainId === 8453) return `https://basescan.org/tx/${hash}`;
        return `https://sepolia.etherscan.io/tx/${hash}`; // Default fallback
    };
    const [showConfetti, setShowConfetti] = useState(false);
    const [isAddingToWallet, setIsAddingToWallet] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShowConfetti(true);
            // Keep confetti for 5 seconds
            const timer = setTimeout(() => setShowConfetti(false), 50000);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleShare = (platform) => {
        if (onSocialShare) {
            onSocialShare(platform);
        }
    };

    const handleAddNFTToWallet = async () => {
        if (!mintResult?.txHash || mintResult?.tokenId === undefined) return;

        try {
            setIsAddingToWallet(true);

            if (!walletClient) {
                alert("Wallet not connected.");
                return;
            }

            // Fetch the transaction receipt
            const receipt = await getTransactionReceipt(config, {
                hash: mintResult.txHash
            });

            if (!receipt || !receipt.logs) {
                alert("Could not fetch transaction receipt details.");
                return;
            }

            let collectionAddress = null;

            // Find the Transfer event for this tokenId
            for (const log of receipt.logs) {
                console.log("Log: ", log);
                // ERC721 Transfer log: topic0 = 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
                if (
                    log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' &&
                    log.topics.length === 4
                ) {
                    const logTokenId = BigInt(log.topics[3]).toString();
                    if (logTokenId === String(mintResult.tokenId)) {
                        collectionAddress = log.address;
                        break;
                    }
                }
            }

            if (!collectionAddress) {
                alert("Collection address not found in transaction logs.");
                return;
            }

            // Request to add NFT to wallet
            await walletClient.request({
                method: 'wallet_watchAsset',
                params: {
                    type: 'ERC721', // Support varies by wallet extension, but it's proper standard
                    options: {
                        address: collectionAddress,
                        tokenId: String(mintResult.tokenId),
                    },
                },
            });

        } catch (error) {
            console.error("Error adding NFT to wallet:", error);
        } finally {
            setIsAddingToWallet(false);
        }
    };

    return (
        <div className="mint-success-overlay" onClick={(e) => e.stopPropagation()}>
            <div className="mint-success-content" onClick={(e) => e.stopPropagation()}>
                {/* Confetti Animation */}
                {showConfetti && (
                    <div className="confetti-container">
                        {[...Array(50)].map((_, i) => (
                            <div
                                key={i}
                                className="confetti-piece"
                                style={{
                                    left: `${Math.random() * 100}%`,
                                    animationDelay: `${Math.random() * 3}s`,
                                    backgroundColor: ['#F8C826', '#D81E5B', '#D7B8F3', '#51A3A3'][Math.floor(Math.random() * 4)]
                                }}
                            />
                        ))}
                    </div>
                )}

                {/* Close Button */}
                <button className="mint-success-close" onClick={onClose}>
                    ✕
                </button>

                {/* Success Header */}
                <div className="mint-success-header">
                    {/* <div className="success-icon-container">
                        <div className="success-icon">🎉</div>
                    </div> */}
                    <h2 className="mint-success-title">
                        {type === 'PFP' ? 'PFP Minted Successfully!' : 'Meme Minted Successfully!'}
                    </h2>
                    <p className="mint-success-subtitle">
                        You're officially a CEO of {type === 'PFP' ? 'style' : 'memes'}! 🚀
                    </p>
                </div>

                {/* NFT Preview with Animated Frame */}
                <div className="mint-success-preview">
                    <div className="animated-frame">
                        <div className="frame-corner frame-tl"></div>
                        <div className="frame-corner frame-tr"></div>
                        <div className="frame-corner frame-bl"></div>
                        <div className="frame-corner frame-br"></div>

                        <div className="frame-glow"></div>

                        {imagePreview ? (
                            <img
                                src={imagePreview}
                                alt={type === 'PFP' ? 'Minted PFP' : 'Minted Meme'}
                                className="mint-success-image"
                            />
                        ) : (
                            <div className="mint-success-placeholder">
                                Your {type === 'PFP' ? 'PFP' : 'Meme'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Transaction Details */}
                {mintResult && (
                    <div className="mint-transaction-details" style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#fff' }}>Transaction Details</h4>

                        {mintResult.tokenId !== undefined && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>NFT ID:</span>
                                <span style={{ color: '#fff', fontWeight: 'bold' }}>#{mintResult.tokenId}</span>
                            </div>
                        )}

                        {mintResult.amountSpent !== undefined && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Amount Spent:</span>
                                <span style={{ color: '#fff', fontWeight: 'bold' }}>{mintResult.amountSpent} CEO</span>
                            </div>
                        )}

                        {mintResult.txHash && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Transaction:</span>
                                <a
                                    href={getExplorerUrl(mintResult.txHash)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: 'var(--color-yellow)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                    {mintResult.txHash.slice(0, 6)}...{mintResult.txHash.slice(-4)}
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                </a>
                            </div>
                        )}

                        {(mintResult.txHash && mintResult.tokenId !== undefined && walletClient) && (
                            <button
                                onClick={handleAddNFTToWallet}
                                disabled={isAddingToWallet}
                                className="story-btn secondary"
                                style={{
                                    width: '100%',
                                    marginTop: '12px',
                                    padding: '8px 12px',
                                    fontSize: '0.9rem',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                {isAddingToWallet ? 'Adding...' : '🦊 Add NFT to Wallet'}
                            </button>
                        )}
                    </div>
                )}

                {/* Social Share Section */}
                <div className="mint-success-share">
                    <h3 className="share-title">Share Your Achievement! 🌟</h3>
                    <p className="share-subtitle">Let the world know you're a REKT CEO</p>

                    <div className="social-share-grid">
                        <button
                            className="social-share-button twitter"
                            onClick={() => handleShare('twitter')}
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                            <span>Twitter</span>
                        </button>

                        <button
                            className="social-share-button instagram"
                            onClick={() => handleShare('instagram')}
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                            </svg>
                            <span>Instagram</span>
                        </button>

                        <button
                            className="social-share-button farcaster"
                            onClick={() => handleShare('farcaster')}
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.5 3h-17A1.5 1.5 0 002 4.5v15A1.5 1.5 0 003.5 21h17a1.5 1.5 0 001.5-1.5v-15A1.5 1.5 0 0020.5 3zM8 17H6V9h2v8zm7 0h-2l-3-4v4H8V9h2l3 4V9h2v8zm5 0h-2V9h2v8z" />
                            </svg>
                            <span>Farcaster</span>
                        </button>

                        <button
                            className="social-share-button reddit"
                            onClick={() => handleShare('reddit')}
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
                            </svg>
                            <span>Reddit</span>
                        </button>

                        <button
                            className="social-share-button oxppl"
                            onClick={() => handleShare('oxppl')}
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                            </svg>
                            <span>0xppl</span>
                        </button>

                        <button
                            className="social-share-button download"
                            onClick={() => handleShare('download')}
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                            </svg>
                            <span>Download</span>
                        </button>
                    </div>
                </div>

                {/* Close Button at Bottom */}
                {/* <div className="mint-success-footer">
                    <button className="story-btn primary close-modal-btn" onClick={onClose}>
                        Close & Continue Creating 🎨
                    </button>
                </div> */}
            </div>
        </div>
    );
};

export default MintSuccessModal;
