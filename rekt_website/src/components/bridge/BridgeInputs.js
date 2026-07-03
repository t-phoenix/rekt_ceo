import React from 'react';
import ceo_token from '../../creatives/Rekt_logo_illustration.png';
import solanaLogo from '../../creatives/crypto/solana.png';
import baseLogo from '../../creatives/crypto/base.png';

const BridgeInputs = ({
    solanaAmount,
    handleAmountChange,
    connected,
    ceoBalance,
    handleMaxClick,
    handleHalfClick,
    estimatedReceive
}) => {
    return (
        <>
            {/* Input: CEO on Solana */}
            <div className="swap-input-container">
                <div className="input-header">
                    <span className="input-label">From</span>
                    {connected && (
                        <span className="balance">
                            Balance: {ceoBalance.toLocaleString()} $CEO
                        </span>
                    )}
                </div>
                <div className="input-box">
                    <input
                        type="text"
                        className="token-input"
                        placeholder="0.0"
                        value={solanaAmount}
                        onChange={handleAmountChange}
                    />
                    <div className="token-selector-with-max">
                        {connected && ceoBalance > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <button className="max-btn" onClick={handleHalfClick}>50%</button>
                                <button className="max-btn" onClick={handleMaxClick}>MAX</button>
                            </div>
                        )}
                        <div className="token-selector">
                            <img src={ceo_token} alt="CEO" className="token-icon" style={{ width: '40px', height: '40px' }} />
                            <span className="token-symbol">$CEO</span>
                            <span className="chain-divider">on</span>
                            <img src={solanaLogo} alt="Solana" className="token-icon" style={{ width: '40px', height: '40px' }} />
                        </div>
                    </div>
                </div>
                {connected && parseFloat(solanaAmount) > ceoBalance && (
                    <div className="input-error">Insufficient $CEO balance</div>
                )}
            </div>

            {/* Swap Arrow */}
            <div className="swap-arrow-container">
                <div className="swap-arrow">↓</div>
            </div>

            {/* Output: CEO on Base */}
            <div className="swap-input-container">
                <div className="input-header">
                    <span className="input-label">To (Base)</span>
                    {estimatedReceive && (
                        <span className="balance">≈ receive amount</span>
                    )}
                </div>
                <div className="input-box">
                    <input
                        type="text"
                        className="token-input"
                        placeholder="0.0"
                        value={estimatedReceive}
                        readOnly
                    />
                    <div className="token-selector">
                        <img src={ceo_token} alt="CEO" className="token-icon" style={{ width: '40px', height: '40px' }} />
                        <span className="token-symbol">$CEO</span>
                        <span className="chain-divider">on</span>
                        <img src={baseLogo} alt="Base" className="token-icon" style={{ width: '36px', height: '36px' }} />
                    </div>
                </div>
            </div>
        </>
    );
};

export default BridgeInputs;
