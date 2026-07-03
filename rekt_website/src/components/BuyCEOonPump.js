
import React, { useState } from 'react';
import ComingSoonButton from './ComingSoonButton';
import { Link } from "react-router-dom";
import './BuyCEOonPump.css';
import ceo_token from '../creatives/Rekt_logo_illustration.png';
import pumpFunLogo from '../creatives/crypto/pump_fun.png';
import solanaLogo from '../creatives/crypto/solana.png';
import baseLogo from '../creatives/crypto/base.png';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useSolanaBalances } from '../hooks/useSolanaBalances';
import { usePumpFunData, calculateBuyAmount, usePumpFunSwap } from '../hooks/usePumpFun';
import { PUMP_FUN_FEE_PERCENT } from '../services/pumpFunService';

const BuyCEOonPump = () => {
    const { setVisible } = useWalletModal();
    const { connected } = useWallet();
    const { solBalance, ceoBalance } = useSolanaBalances();
    const [fromAmount, setFromAmount] = useState('');
    const [toAmount, setToAmount] = useState('');
    // const [walletConnected, setWalletConnected] = useState(false); // Removed mock state
    // const [walletAddress, setWalletAddress] = useState(''); // Removed mock state
    const [showModal, setShowModal] = useState(false);
    const [transactionStatus, setTransactionStatus] = useState('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [txDetails, setTxDetails] = useState(null);

    const { mutate: swap } = usePumpFunSwap();

    const PUMP_FUN_URL = 'https://pump.fun';

    // Live Bonding Curve Data
    const { data: bondingCurveData, isLoading: isCurveLoading } = usePumpFunData();

    const handleFromAmountChange = (e) => {
        const value = e.target.value;
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
            setFromAmount(value);
            if (value && bondingCurveData) {
                const simulatedAmount = calculateBuyAmount(parseFloat(value), bondingCurveData);
                setToAmount(simulatedAmount ? simulatedAmount.toFixed(2) : '');
            } else {
                setToAmount('');
            }
        }
    };

    // Update quote when curve data updates if amount is present
    React.useEffect(() => {
        if (fromAmount && bondingCurveData) {
            const simulatedAmount = calculateBuyAmount(parseFloat(fromAmount), bondingCurveData);
            setToAmount(simulatedAmount ? simulatedAmount.toFixed(2) : '');
        }
    }, [bondingCurveData, fromAmount]);

    const handleConnectWallet = () => {
        setVisible(true);
    };

    const handleSwap = () => {
        if (!fromAmount || parseFloat(fromAmount) <= 0 || !bondingCurveData) {
            return;
        }

        setShowModal(true);
        setTransactionStatus('pending');

        const solAmount = parseFloat(fromAmount);
        const tokenAmount = parseFloat(toAmount); // Use the simulated output as target

        swap({
            solAmount,
            tokenAmount,
            bondingCurve: bondingCurveData.bondingCurve,
            slippage: 1 // 1% slippage tolerance (recommended)
        }, {
            onSuccess: (data) => {
                setTransactionStatus('success');
                setTxDetails(data);
                // Refresh balances
                // fetchBalances(); // Assuming we had this exposed or could trigger it
            },
            onError: (error) => {
                console.error("Swap failed", error);
                setTransactionStatus('error');
                setErrorMessage(error.message || 'Transaction failed. Please try again.');
            }
        });
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

    // eslint-disable-next-line no-unused-vars
    const getButtonText = () => {
        if (!connected) return 'Connect Wallet';
        if (!fromAmount || parseFloat(fromAmount) <= 0) return 'Enter Amount';
        return 'Swap';
    };

    // eslint-disable-next-line no-unused-vars
    const handleButtonClick = () => {
        if (!connected) {
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

                    {/* Price Subtitle */}
                    <div className="price-subtitle">
                        {isCurveLoading ? (
                            <span className="price-loading">Loading price...</span>
                        ) : bondingCurveData ? (
                            <span className="price-value">1 SOL ≈ <span className="highlight-price">{calculateBuyAmount(1, bondingCurveData).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span> $CEO</span>
                        ) : (
                            <span className="price-unavailable">Price unavailable</span>
                        )}
                    </div>
                    <div className="header-badges">
                        {/* <div className="solana-badge">Solana <img src={solanaLogo} alt="Solana" className="pump-fun-logo" /></div> */}
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
                        <Link to="/buy-ceo" className="base-buy-button">
                            <span className="base-button-text">Buy On Base</span>
                            <img src={baseLogo} alt="Base" className="base-button-logo" />
                            <div className="base-button-glow"></div>
                        </Link>
                    </div>
                </div>

                {/* Divider */}
                <div className="section-divider"></div>

                {/* Swap Interface */}
                <div className="swap-section">
                    {/* <div className="card-header">
                        <h3 className="swap-title">Swap</h3>
                    </div> */}

                    {/* From Token */}
                    <div className="swap-input-container">
                        <div className="input-header">
                            <span className="input-label">From</span>
                            {connected && <span className="balance">Balance: {solBalance.toFixed(4)} SOL</span>}
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
                                    style={{ width: '40px', height: '40px' }}
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
                            {connected && <span className="balance">Balance: {ceoBalance.toLocaleString()} $CEO</span>}
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
                                    style={{ width: '40px', height: '40px' }}
                                />
                                <span className="token-symbol">$CEO</span>
                            </div>
                        </div>
                    </div>

                    {/* Fee & Rate Breakdown */}
                    {fromAmount && parseFloat(fromAmount) > 0 && (
                        <div className="transaction-info">
                            <div className="info-row">
                                <span>Rate</span>
                                <span>1 SOL ≈ {bondingCurveData ? calculateBuyAmount(1, bondingCurveData).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '...'} CEO</span>
                            </div>
                            <div className="info-row">
                                <span>Platform Fee ({(PUMP_FUN_FEE_PERCENT * 100).toFixed(2)}%)</span>
                                <span>{(parseFloat(fromAmount) * PUMP_FUN_FEE_PERCENT).toFixed(4)} SOL</span>
                            </div>
                            <div className="info-row">
                                <span>Minimum Received</span>
                                <span>{toAmount} CEO</span>
                            </div>
                        </div>
                    )}



                    {/* Action Button */}
                    {/* PRODUCTION TODO: Remove <ComingSoonButton> below and uncomment the original button when deploying with production token */}
                    <ComingSoonButton className="swap-action-btn disabled" style={{ width: '100%' }} />
                    {/* <button
                        className={`swap-action-btn ${!connected || !fromAmount || parseFloat(fromAmount) <= 0 ? 'disabled' : ''}`}
                        onClick={handleButtonClick}
                    >
                        {getButtonText()}
                    </button> */}

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

                        {transactionStatus === 'success' && txDetails && (
                            <div className="modal-body success">
                                <div className="success-icon">✓</div>
                                <h3>Transaction Successful!</h3>
                                <p>Your swap has been completed successfully.</p>
                                <div className="transaction-details">
                                    <div className="detail-row">
                                        <span>Swapped:</span>
                                        <span>{txDetails.solCost} SOL</span>
                                    </div>
                                    <div className="detail-row">
                                        <span>Min Received:</span>
                                        <span>{txDetails.tokenAmount.toFixed(2)} $CEO</span>
                                    </div>
                                    <div className="detail-row">
                                        <span>Platform Fee:</span>
                                        <span>{(txDetails.solCost * PUMP_FUN_FEE_PERCENT).toFixed(4)} SOL</span>
                                    </div>
                                    <div className="detail-row">
                                        <a
                                            href={`https://solscan.io/tx/${txDetails.signature}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="explorer-link"
                                            style={{ color: '#F8C826', textDecoration: 'none', fontWeight: 'bold', display: 'block', marginTop: '10px' }}
                                        >
                                            View on Solscan ↗
                                        </a>
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
