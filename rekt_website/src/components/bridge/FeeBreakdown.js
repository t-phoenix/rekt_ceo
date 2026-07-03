import React from 'react';
import wormholeLogo from '../../creatives/crypto/wormhole.png';

const FeeBreakdown = ({
    solanaAmount,
    status,
    quote,
    estimatedReceive,
    ESTIMATED_BRIDGE_TIME_SECONDS,
    quoteError
}) => {
    if (!((solanaAmount && parseFloat(solanaAmount) > 0) || status === 'quoting')) {
        return null;
    }

    return (
        <div className="bridge-fee-breakdown">
            <div className="fee-row">
                <span className="fee-label">Bridge Protocol</span>
                <span className="fee-value">
                    <img src={wormholeLogo} alt="Wormhole" className="fee-icon" /> Wormhole
                </span>
            </div>
            <div className="fee-row">
                <span className="fee-label">Route</span>
                <span className="fee-value">Solana → Base (Automatic)</span>
            </div>

            {/* Relayer Fee */}
            <div className="fee-row">
                <span className="fee-label">Relayer Fee</span>
                <span className="fee-value">
                    {status === 'quoting' ? (
                        <div className="skeleton-text" style={{ width: '60px', height: '16px', background: '#ffffff20', borderRadius: '4px', animation: 'skeleton-pulse 1.5s infinite' }}></div>
                    ) : (
                        quote?.success && quote.relayerFee ? `${quote.relayerFee} SOL` : '~0.002 SOL (est.)'
                    )}
                </span>
            </div>

            {/* You Receive */}
            <div className="fee-row">
                <span className="fee-label">You Receive</span>
                <span className="fee-value fee-highlight">
                    {status === 'quoting' ? (
                        <div className="skeleton-text" style={{ width: '80px', height: '16px', background: '#ffffff20', borderRadius: '4px', animation: 'skeleton-pulse 1.5s infinite' }}></div>
                    ) : (
                        `≈ ${estimatedReceive || '—'} $CEO`
                    )}
                </span>
            </div>

            {/* Estimated Time */}
            <div className="fee-row">
                <span className="fee-label">⏱ Estimated Time</span>
                <span className="fee-value">~{Math.round(ESTIMATED_BRIDGE_TIME_SECONDS / 60)} minutes</span>
            </div>

            {/* Quote Error */}
            {quoteError && (
                <div className="fee-row fee-error">
                    <span className="fee-label">⚠ Quote Error</span>
                    <span className="fee-value">{quoteError}</span>
                </div>
            )}
        </div>
    );
};

export default FeeBreakdown;
