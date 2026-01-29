import React, { useState, useEffect } from 'react';
import './BridgeCEO.css';
import ceo_token from '../creatives/Rekt_logo_illustration.png';
import solanaLogo from '../creatives/crypto/solana.png';
import baseLogo from '../creatives/crypto/base.png';
import wormholeLogo from '../creatives/crypto/wormhole.png';

const BridgeCEO = () => {
    const [solanaAmount, setSolanaAmount] = useState('');
    const [baseAmount, setBaseAmount] = useState('');
    const [recipientAddress, setRecipientAddress] = useState('');

    // Simulate bridge calculation (placeholder for actual simulate function)
    useEffect(() => {
        if (solanaAmount && !isNaN(solanaAmount) && parseFloat(solanaAmount) > 0) {
            // TODO: Replace with actual simulate API call
            // For now, assuming 1:1 ratio minus a small fee
            const calculatedAmount = (parseFloat(solanaAmount) * 0.999).toFixed(6);
            setBaseAmount(calculatedAmount);
        } else {
            setBaseAmount('');
        }
    }, [solanaAmount]);

    return (
        <div className="bridge-ceo-card">
            <div className="card-header">
                <div className="header-left">
                    <h2 className="card-title">Bridge $CEO</h2>
                    <div className="bridge-subtitle">Cross-Chain Transfer</div>
                </div>
                <a
                    href="https://wormhole.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="wormhole-bridge-btn"
                >
                    Bridge on <img src={wormholeLogo} alt="Wormhole" className="wormhole-logo" />
                </a>
            </div>
            <div className="card-content">
                <div className="bridge-interface">


                    {/* Input: CEO on Solana */}
                    <div className="swap-input-container">
                        <div className="input-header">
                            <span className="input-label">From</span>
                        </div>
                        <div className="input-box">
                            <input
                                type="text"
                                className="token-input"
                                placeholder="0.0"
                                value={solanaAmount}
                                onChange={(e) => setSolanaAmount(e.target.value)}
                            />
                            <div className="token-selector">
                                <img src={ceo_token} alt="CEO" className="token-icon" style={{ width: '40px', height: '40px' }} />
                                <span className="token-symbol">$CEO</span>
                                <span className="chain-divider">on</span>
                                <img src={solanaLogo} alt="Solana" className="token-icon" style={{ width: '40px', height: '40px' }} />
                                <span className="token-symbol">SOL</span>
                            </div>
                        </div>
                    </div>

                    {/* Swap Arrow */}
                    <div className="swap-arrow-container">
                        <div className="swap-arrow">↓</div>
                    </div>

                    {/* Output: CEO on Base */}
                    <div className="swap-input-container">
                        <div className="input-header">
                            <span className="input-label">To</span>
                            {baseAmount && (
                                <span className="balance">Fee: ~0.1%</span>
                            )}
                        </div>
                        <div className="input-box">
                            <input
                                type="text"
                                className="token-input"
                                placeholder="0.0"
                                value={baseAmount}
                                readOnly
                            />
                            <div className="token-selector">
                                <img src={ceo_token} alt="CEO" className="token-icon" style={{ width: '40px', height: '40px' }} />
                                <span className="token-symbol">$CEO</span>
                                <span className="chain-divider">on</span>
                                <img src={baseLogo} alt="Base" className="token-icon" style={{ width: '36px', height: '36px' }} />
                                <span className="token-symbol">Base</span>
                            </div>
                        </div>
                    </div>

                    {/* Recipient Address */}
                    <div className="recipient-section">
                        <label className="recipient-label">
                            Recipient Base Address
                            <img src={baseLogo} alt="Base" className="recipient-chain-icon" />
                        </label>
                        <input
                            type="text"
                            placeholder="0x..."
                            value={recipientAddress}
                            onChange={(e) => setRecipientAddress(e.target.value)}
                            className="recipient-input"
                        />
                    </div>

                    <button className="bridge-button">
                        Bridge Now (Soon)
                    </button>

                    <p className="bridge-note">
                        Securely transfer $CEO from Solana to Base chain.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BridgeCEO;
