import React, { useState } from 'react';
import './BuyCEOonPump.css';
import ceo_token from '../creatives/Rekt_logo_illustration.png';
import pumpFunLogo from '../creatives/crypto/pump_fun.png';
import solanaLogo from '../creatives/crypto/solana.png';

const BuyCEOonPump = () => {
    const [fromAmount, setFromAmount] = useState('');
    const [toAmount, setToAmount] = useState('');
    const [walletConnected, setWalletConnected] = useState(false);
    const [walletAddress, setWalletAddress] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [transactionStatus, setTransactionStatus] = useState('idle'); // idle, pending, success, error
    const [errorMessage, setErrorMessage] = useState('');

    const PUMP_FUN_URL = 'https://pump.fun';

    // Mock exchange rate (1 SOL = 1000 CEO for demo)
    const EXCHANGE_RATE = 1000;

    const handleFromAmountChange = (e) => {
        const value = e.target.value;
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
            setFromAmount(value);
            setToAmount(value ? (parseFloat(value) * EXCHANGE_RATE).toFixed(2) : '');
        }
    };

    const handleConnectWallet = () => {
        // Mock wallet connection
        setWalletConnected(true);
        setWalletAddress('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU');
    };

    const handleSwap = () => {
        if (!fromAmount || parseFloat(fromAmount) <= 0) {
            return;
        }

        setShowModal(true);
        setTransactionStatus('pending');

        // Simulate transaction
        setTimeout(() => {
            const success = Math.random() > 0.2; // 80% success rate for demo
            if (success) {
                setTransactionStatus('success');
            } else {
                setTransactionStatus('error');
                setErrorMessage('Transaction failed. Please try again.');
            }
        }, 3000);
    };

    const closeModal = () => {
        setShowModal(false);
        setTransactionStatus('idle');
        setErrorMessage('');
        if (transactionStatus === 'success') {
            setFromAmount('');
            setToAmount('');
        }
    };

    const getButtonText = () => {
        if (!walletConnected) return 'Connect Wallet';
        if (!fromAmount || parseFloat(fromAmount) <= 0) return 'Enter Amount';
        return 'Swap';
    };

    const handleButtonClick = () => {
        if (!walletConnected) {
            handleConnectWallet();
        } else if (fromAmount && parseFloat(fromAmount) > 0) {
            handleSwap();
        }
    };

    return (
        <>
            <div className="buy-ceo-pump-card">
                {/* Top Section: Contract Info */}
                <div className="card-header">
                    <h2 className="card-title">Buy $CEO on Pump.fun</h2>
                    <div className="solana-badge">Solana <img src={solanaLogo} alt="Solana" className="pump-fun-logo" /></div>
                </div>

                {/* Divider */}
                <div className="section-divider"></div>

                {/* Swap Interface */}
                <div className="swap-section">
                    <div className="card-header">

                        <h3 className="swap-title">Swap</h3>
                        <div className="contract-actions">
                            <a
                                href={PUMP_FUN_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="trade-link-btn"
                            >
                                Trade on <img src={pumpFunLogo} alt="Pump.fun" className="pump-fun-logo" />
                            </a>
                        </div>
                    </div>

                    {/* From Token */}
                    <div className="swap-input-container">
                        <div className="input-header">
                            <span className="input-label">From</span>
                            {walletConnected && <span className="balance">Balance: 0.00 SOL</span>}
                        </div>
                        <div className="input-box">
                            <input
                                type="text"
                                className="token-input"
                                placeholder="0.0"
                                value={fromAmount}
                                onChange={handleFromAmountChange}
                            />
                            <div className="token-selector">
                                <img
                                    src={solanaLogo}
                                    alt="SOL"
                                    className="token-icon"
                                />
                                <span className="token-symbol">SOL</span>
                            </div>
                        </div>
                    </div>

                    {/* Swap Arrow */}
                    <div className="swap-arrow-container">
                        <div className="swap-arrow">↓</div>
                    </div>

                    {/* To Token */}
                    <div className="swap-input-container">
                        <div className="input-header">
                            <span className="input-label">To</span>
                            {walletConnected && <span className="balance">Balance: 0.00 $CEO</span>}
                        </div>
                        <div className="input-box">
                            <input
                                type="text"
                                className="token-input"
                                placeholder="0.0"
                                value={toAmount}
                                readOnly
                            />
                            <div className="token-selector">
                                <img
                                    src={ceo_token}
                                    alt="CEO"
                                    className="token-icon"
                                />
                                <span className="token-symbol">$CEO</span>
                            </div>
                        </div>
                    </div>

                    {/* Exchange Rate */}
                    {fromAmount && (
                        <div className="exchange-rate">
                            1 SOL ≈ {EXCHANGE_RATE} $CEO
                        </div>
                    )}

                    {/* Action Button */}
                    <button
                        className={`swap-action-btn ${!walletConnected || !fromAmount || parseFloat(fromAmount) <= 0 ? 'disabled' : ''}`}
                        onClick={handleButtonClick}
                    >
                        {getButtonText()}
                    </button>

                    {walletConnected && (
                        <div className="connected-wallet">
                            <span className="wallet-indicator">🟢</span>
                            <span className="wallet-address-short">
                                {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Transaction Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={closeModal}>×</button>

                        {transactionStatus === 'pending' && (
                            <div className="modal-body">
                                <div className="spinner"></div>
                                <h3>Processing Transaction</h3>
                                <p>Please wait while we process your swap...</p>
                                <div className="transaction-details">
                                    <div className="detail-row">
                                        <span>Swapping:</span>
                                        <span>{fromAmount} SOL</span>
                                    </div>
                                    <div className="detail-row">
                                        <span>Receiving:</span>
                                        <span>{toAmount} $CEO</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {transactionStatus === 'success' && (
                            <div className="modal-body success">
                                <div className="success-icon">✓</div>
                                <h3>Transaction Successful!</h3>
                                <p>Your swap has been completed successfully.</p>
                                <div className="transaction-details">
                                    <div className="detail-row">
                                        <span>Swapped:</span>
                                        <span>{fromAmount} SOL</span>
                                    </div>
                                    <div className="detail-row">
                                        <span>Received:</span>
                                        <span>{toAmount} $CEO</span>
                                    </div>
                                </div>
                                <button className="modal-action-btn" onClick={closeModal}>
                                    Close
                                </button>
                            </div>
                        )}

                        {transactionStatus === 'error' && (
                            <div className="modal-body error">
                                <div className="error-icon">✕</div>
                                <h3>Transaction Failed</h3>
                                <p>{errorMessage}</p>
                                <button className="modal-action-btn" onClick={closeModal}>
                                    Try Again
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default BuyCEOonPump;
