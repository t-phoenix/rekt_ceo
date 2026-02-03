import React, { useMemo, useState } from 'react';
import { useNexus } from '../../config/NexusProvider';
import './UnifiedBalance.css';

const UnifiedBalance = () => {
    const { nexusSDK, unifiedBalance: contextUnifiedBalance } = useNexus();
    const [viewMode, setViewMode] = useState('token'); // 'token' | 'chain'
    const [expandedTokens, setExpandedTokens] = useState({});

    // Toggle expand state for a token
    const toggleExpand = (symbol) => {
        setExpandedTokens(prev => ({
            ...prev,
            [symbol]: !prev[symbol]
        }));
    };

    // Organize data based on view mode
    const { tokenData, chainData } = useMemo(() => {
        if (!contextUnifiedBalance) return { tokenData: [], chainData: [] };

        const tokens = contextUnifiedBalance.filter(asset =>
            parseFloat(asset.balance) > 0 || (asset.usdValue && asset.usdValue > 0.01)
        );

        // Group by Chain
        const chains = {};
        tokens.forEach(asset => {
            if (asset.breakdown) {
                asset.breakdown.forEach(chainItem => {
                    const chainId = chainItem.chain?.id || chainItem.chainId;
                    const chainName = chainItem.chain?.name || `Chain ${chainId}`;

                    if (!chains[chainName]) {
                        chains[chainName] = [];
                    }

                    if (parseFloat(chainItem.balance) > 0) {
                        chains[chainName].push({
                            symbol: asset.symbol,
                            balance: chainItem.balance,
                            usdValue: chainItem.usdValue // Assuming breakdown also has price, if not we might need to calculate
                        });
                    }
                });
            } else {
                // Fallback if no breakdown, just show as "Unknown Chain"
                if (!chains['Unknown Chain']) chains['Unknown Chain'] = [];
                chains['Unknown Chain'].push(asset);
            }
        });

        return {
            tokenData: tokens, // Array of assets with breakdown
            chainData: Object.entries(chains).sort((a, b) => a[0].localeCompare(b[0])) // [ [ChainName, Assets[]], ... ]
        };
    }, [contextUnifiedBalance]);

    if (!nexusSDK) return null;

    if (!contextUnifiedBalance) {
        return (
            <div className="unified-balance-container">
                <div className="unified-balance-loading">
                    <div className="spinner"></div>
                    <span>Loading unified balances...</span>
                </div>
            </div>
        );
    }

    if (tokenData.length === 0) {
        return (
            <div className="unified-balance-container">
                <div className="unified-balance-empty">No balances found</div>
            </div>
        );
    }

    const formatAmount = (val) => {
        const num = parseFloat(val);
        if (num === 0) return '0';
        if (num < 0.0001) return '<0.0001';
        return num.toFixed(4);
    };

    return (
        <div className="unified-balance-container">
            {/* View Toggles */}
            <div className="view-toggles">
                <button
                    className={`view-toggle-btn ${viewMode === 'token' ? 'active' : ''}`}
                    onClick={() => setViewMode('token')}
                >
                    By Token
                </button>
                <button
                    className={`view-toggle-btn ${viewMode === 'chain' ? 'active' : ''}`}
                    onClick={() => setViewMode('chain')}
                >
                    By Chain
                </button>
            </div>

            <div className="balance-scroll-area">
                {/* Token View */}
                {viewMode === 'token' && (
                    <div className="token-list">
                        {tokenData.map((asset, idx) => {
                            const isExpanded = expandedTokens[asset.symbol];
                            const hasBreakdown = asset.breakdown && asset.breakdown.length > 0;

                            return (
                                <div key={asset.symbol + idx} className="token-group">
                                    <div
                                        className="token-header"
                                        onClick={() => hasBreakdown && toggleExpand(asset.symbol)}
                                    >
                                        <div className="token-symbol-wrapper">
                                            {hasBreakdown && (
                                                <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                                            )}
                                            <span style={{ color: 'white', fontWeight: 'bold' }}>{asset.symbol}</span>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div className="amount-text" style={{ color: 'var(--color-yellow)' }}>
                                                {formatAmount(asset.balance)}
                                            </div>
                                            {asset.usdValue && (
                                                <div className="usd-text">≈ ${asset.usdValue.toFixed(2)}</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Breakdown */}
                                    {isExpanded && hasBreakdown && (
                                        <div className="token-breakdown">
                                            {asset.breakdown.map((item, i) => (
                                                parseFloat(item.balance) > 0 && (
                                                    <div key={i} className="breakdown-item">
                                                        <span className="chain-name">
                                                            {item.chain?.name || `Chain ${item.chain?.id}`}
                                                        </span>
                                                        <span className="amount-text" style={{ fontSize: '11px' }}>
                                                            {formatAmount(item.balance)}
                                                        </span>
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Chain View */}
                {viewMode === 'chain' && (
                    <div className="chain-list">
                        {chainData.map(([chainName, assets]) => (
                            <div key={chainName} className="chain-group">
                                <div className="chain-header-title">{chainName}</div>
                                <div className="chain-assets-list">
                                    {assets.map((asset, i) => (
                                        <div key={i} className="chain-asset-item">
                                            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{asset.symbol}</span>
                                            <div style={{ textAlign: 'right' }}>
                                                <div className="amount-text" style={{ fontSize: '12px', color: 'var(--color-yellow)' }}>
                                                    {formatAmount(asset.balance)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UnifiedBalance;
