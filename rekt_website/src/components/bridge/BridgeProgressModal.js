import React from 'react';

const BridgeProgressModal = ({
    showModal,
    status,
    closeModal,
    steps,
    currentStep,
    getProgressPercent,
    elapsedSeconds,
    estimatedSeconds,
    formatTime,
    progressMessage,
    solanaTxHash,
    wormholeExplorerUrl,
    solanaAmount,
    estimatedReceive,
    BASE_EXPLORER_URL,
    baseTxHash,
    errorMessage
}) => {
    if (!showModal) return null;

    return (
        <div className="bridge-modal-overlay" onClick={status === 'success' || status === 'error' ? closeModal : undefined}>
            <div className="bridge-modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="bridge-modal-close" onClick={closeModal}>×</button>

                {/* Pending / In Progress States */}
                {['confirming', 'bridging', 'relaying'].includes(status) && (
                    <div className="bridge-modal-body">
                        <div className="bridge-modal-title">
                            {status === 'confirming' && '🔐 Confirm in Wallet'}
                            {status === 'bridging' && '🚀 Submitting Transaction'}
                            {status === 'relaying' && '🌐 Wormhole Relaying'}
                        </div>

                        {/* Step Indicators */}
                        <div className="bridge-steps">
                            {steps.map((step, index) => (
                                <div
                                    key={step.id}
                                    className={`bridge-step ${index < currentStep ? 'completed' : ''} ${index === currentStep ? 'active' : ''}`}
                                >
                                    <div className="bridge-step-indicator">
                                        {index < currentStep ? '✓' : index + 1}
                                    </div>
                                    <div className="bridge-step-label">{step.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Progress Bar */}
                        <div className="bridge-progress-bar">
                            <div
                                className="bridge-progress-fill"
                                style={{ width: `${getProgressPercent()}%` }}
                            />
                        </div>

                        {/* Timer */}
                        <div className="bridge-timer">
                            <div className="bridge-timer-row">
                                <span>Time Elapsed</span>
                                <span className="bridge-timer-value">{formatTime(elapsedSeconds)}</span>
                            </div>
                            <div className="bridge-timer-row">
                                <span>Estimated Time</span>
                                <span className="bridge-timer-value">~{formatTime(estimatedSeconds)}</span>
                            </div>
                        </div>

                        <p className="bridge-progress-message">{progressMessage}</p>

                        {/* Transaction Details */}
                        {solanaTxHash && (
                            <div className="bridge-tx-info">
                                <div className="bridge-tx-row">
                                    <span>Solana TX:</span>
                                    <a
                                        href={`https://solscan.io/tx/${solanaTxHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bridge-tx-link"
                                    >
                                        {solanaTxHash.substring(0, 8)}...{solanaTxHash.substring(solanaTxHash.length - 6)} ↗
                                    </a>
                                </div>
                                {wormholeExplorerUrl && (
                                    <div className="bridge-tx-row">
                                        <span>Track:</span>
                                        <a
                                            href={wormholeExplorerUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bridge-tx-link"
                                        >
                                            Wormhole Explorer ↗
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Success State */}
                {status === 'success' && (
                    <div className="bridge-modal-body bridge-success">
                        <div className="bridge-success-icon">✓</div>
                        <div className="bridge-modal-title">Transaction Submitted!</div>
                        <p className="bridge-success-subtitle">
                            Your $CEO tokens are on their way to Base chain. Check Wormhole Explorer for status.
                        </p>

                        <div className="bridge-result-details">
                            <div className="bridge-result-row">
                                <span>Bridged</span>
                                <span>{solanaAmount} $CEO</span>
                            </div>
                            <div className="bridge-result-row">
                                <span>Received (est.)</span>
                                <span>{estimatedReceive} $CEO</span>
                            </div>
                            <div className="bridge-result-row">
                                <span>Time Taken</span>
                                <span>{formatTime(elapsedSeconds)}</span>
                            </div>
                        </div>

                        <div className="bridge-result-links">
                            {baseTxHash && (
                                <a
                                    href={`${BASE_EXPLORER_URL}/tx/${baseTxHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bridge-explorer-btn"
                                >
                                    View on Basescan ↗
                                </a>
                            )}
                            {solanaTxHash && (
                                <a
                                    href={`https://solscan.io/tx/${solanaTxHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bridge-explorer-btn secondary"
                                >
                                    View Solana TX ↗
                                </a>
                            )}
                            {wormholeExplorerUrl && (
                                <a
                                    href={wormholeExplorerUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bridge-explorer-btn secondary"
                                >
                                    Wormhole Explorer ↗
                                </a>
                            )}
                        </div>

                        <button className="bridge-modal-action-btn" onClick={closeModal}>
                            Done
                        </button>
                    </div>
                )}

                {/* Error State */}
                {status === 'error' && (
                    <div className="bridge-modal-body bridge-error">
                        <div className="bridge-error-icon">✕</div>
                        <div className="bridge-modal-title">Bridge Failed</div>
                        <p className="bridge-error-message">{errorMessage}</p>
                        {solanaTxHash && (
                            <div className="bridge-tx-info">
                                <div className="bridge-tx-row">
                                    <span>Solana TX:</span>
                                    <a
                                        href={`https://solscan.io/tx/${solanaTxHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bridge-tx-link"
                                    >
                                        {solanaTxHash.substring(0, 8)}...↗
                                    </a>
                                </div>
                            </div>
                        )}
                        <button className="bridge-modal-action-btn" onClick={closeModal}>
                            Try Again
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BridgeProgressModal;
