import React, { useState, useEffect } from 'react';
import './CurrentTier.css';
import { MdList, MdVisibility } from 'react-icons/md';
import { useTierData } from '../hooks/useNftData';

const CurrentTier = ({ collectionType = 'MEME' }) => {
    const [showAll, setShowAll] = useState(false);
    const [progress, setProgress] = useState(0);

    // Use consolidated hook
    const { tiers, activeTier, totalSupply } = useTierData(collectionType);

    useEffect(() => {
        if (activeTier) {
            const percentage = activeTier.supply > 0
                ? Math.min(100, (activeTier.minted / activeTier.supply) * 100)
                : 100;
            // Delay animation slightly
            setTimeout(() => setProgress(percentage), 100);
        }
    }, [activeTier]);


    if (!activeTier) return null;

    // Helper to determine tier state relative to active tier
    const getTierState = (tier) => {
        if (tier.id === activeTier.id) return 'active';
        if (tier.id < activeTier.id) return 'past';
        return 'future';
    };

    return (
        <div className="current-tier-card">
            <div className="tier-header-row" style={{ alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <h3 className="tier-collection-title">{collectionType} COLLECTION</h3>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '4px', textAlign: 'left' }}>
                        Total Supply: {totalSupply.toLocaleString()}
                    </div>
                </div>
                <button
                    className="toggle-btn"
                    onClick={() => setShowAll(!showAll)}
                >
                    {showAll ? <><MdVisibility /> View Active</> : <><MdList /> View All</>}
                </button>
            </div>

            <div className="tier-content-area">
                {!showAll ? (
                    <div className="single-tier-view">
                        <div className="active-tier-label">Running Tier</div>
                        <div className="active-tier-name">{activeTier.name}</div>

                        {/* New Price Display */}
                        <div className="active-tier-price-container">
                            <span className="active-price-ceo">
                                {activeTier.priceCEO === 0 ? "FREE" : `${activeTier.priceCEO.toLocaleString()} CEO`}
                            </span>
                            <span className="active-price-usd">
                                {activeTier.priceUSD === 0 ? "$0.00" : `~$${activeTier.priceUSD.toFixed(2)}`}
                            </span>
                        </div>

                        {/* Total Supply Display */}
                        <div className="total-supply-display">
                            Tier Supply: {activeTier.supply.toLocaleString()}
                        </div>

                        <div className="progress-section">
                            <div className="progress-bar-bg">
                                <div
                                    className="progress-bar-fill"
                                    style={{ width: `${Math.max(1, progress)}%` }}
                                />
                            </div>
                            <div className="progress-stats">
                                <span>{activeTier.minted.toLocaleString()} / {activeTier.supply.toLocaleString()}</span>
                                <span className="mint-percentage">{progress.toFixed(1)}% Minted</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="all-tiers-view">
                        {tiers.map((tier) => {
                            const state = getTierState(tier);
                            return (
                                <div
                                    key={tier.id}
                                    className={`tier-list-row ${state === 'active' ? 'active' : ''} ${state === 'past' ? 'disabled' : ''}`}
                                >
                                    <div className="tier-list-info">
                                        <div className="tier-list-name">
                                            {tier.name}
                                            {state === 'active' && <span className="current-badge">LIVE</span>}
                                        </div>
                                        <div className="tier-list-supply">
                                            Supply: {tier.supply.toLocaleString()}
                                        </div>
                                    </div>

                                    <div className="tier-list-price">
                                        {state === 'past' ? (
                                            <>
                                                <span className="price-sold">SOLD</span>
                                                <span className="price-usd" style={{ opacity: 0.7 }}>
                                                    {tier.priceUSD === 0 ? "$0.00" : `~$${tier.priceUSD.toFixed(2)}`}
                                                </span>
                                            </>
                                        ) : state === 'future' ? (
                                            <>
                                                <span className="price-usd" style={{ color: 'white', fontWeight: 'bold' }}>
                                                    {tier.priceUSD === 0 ? "$0.00" : `~$${tier.priceUSD.toFixed(2)}`}
                                                </span>
                                                <span className="future-tier-note">Paid in Rekt $CEO</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="price-ceo">
                                                    {tier.priceCEO === 0 ? "Free" : `${tier.priceCEO.toLocaleString()} CEO`}
                                                </span>
                                                <span className="price-usd">
                                                    {tier.priceUSD === 0 ? "$0.00" : `~$${tier.priceUSD.toFixed(2)}`}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CurrentTier;
