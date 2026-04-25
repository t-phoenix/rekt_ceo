import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import {
    MdTrendingUp, MdSwapHoriz, MdStorefront, MdDataUsage,
    MdArrowForward, MdArrowBack, MdGroups,
    MdFlashOn, MdArrowDownward, MdHome, MdCelebration, MdDiamond
} from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import './LaunchMechanismInteractive.css';

// Import graphics
import RektLogo from '../../creatives/Rekt_logo_illustration.png';
import UsdcLogo from '../../creatives/crypto/usdc.png';
import WormholeLogo from '../../creatives/crypto/wormhole.png';
import PumpFunLogo from '../../creatives/crypto/pump_fun.png';
import BaseLogo from '../../creatives/crypto/base.png';

const phases = [
    {
        id: 'curve',
        title: 'STAGE 1: THE BONDING CURVE',
        description: 'Organic discovery starts here. No insider deals, no pre-sales. The token launches fairly on a bonding curve. The Dev team buys the first 10% to secure initial liquidity and show commitment.',
        icon: <MdTrendingUp size={24} />
    },
    {
        id: 'bridge',
        title: 'STAGE 2: BRIDGING TO BASE',
        description: 'That initial 10%? We bridge it straight to Base network. Powered by Wormhole, users enjoy a seamless cross-chain experience moving assets to interact with Rekt CEO.',
        icon: <MdSwapHoriz size={24} />
    },
    {
        id: 'market',
        title: 'STAGE 3: MARKET CREATION',
        description: 'The Dev team deposits the bridged Rekt CEO tokens alongside USDC to create a brand new, deep AMM pool on Uniswap V2 (Base). Users can also earn passively by contributing liquidity to the pool!',
        icon: <MdStorefront size={24} />
    },
    {
        id: 'treasury',
        title: 'STAGE 4: TREASURY & NFTS',
        description: 'Users can Mint MEME and Profile NFTs using Rekt CEO tokens. The 100% of collection from these NFT sales will be automatically routed to sustain the community treasury for continuous development.',
        icon: <MdDataUsage size={24} />
    },
    {
        id: 'ecosystem',
        title: 'STAGE 5: THE GRAND VISION',
        description: 'The ultimate mechanism. Bot arbitrage harmonizes prices between Uniswap V2 (Base) and Pump.fun (Solana). Users buy token on Base to spend in the Rekt CEO ecosystem (Make memes, mint NFTs/Community Passes). The Community Treasury leverages this to fund Coordination Stack, IRL Techhouses, Products and more.',
        icon: <MdGroups size={24} />
    }
];

export default function LaunchMechanismInteractive() {
    const [currentPhase, setCurrentPhase] = useState(0);
    const illustrationRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Smooth fade-in animation for illustration on phase change
        if (illustrationRef.current) {
            gsap.fromTo(
                illustrationRef.current.children,
                { opacity: 0, y: 15, filter: 'blur(4px)' },
                { opacity: 1, y: 0, filter: 'blur(0px)', stagger: 0.1, duration: 0.6, ease: 'power3.out' }
            );
        }
    }, [currentPhase]);

    const nextPhase = () => setCurrentPhase(p => Math.min(p + 1, phases.length - 1));
    const prevPhase = () => setCurrentPhase(p => Math.max(p - 1, 0));

    const renderIllustration = () => {
        switch (currentPhase) {
            case 0:
                return (
                    <div className="illo-curve">
                        <svg viewBox="0 0 400 200" className="curve-svg">
                            <path d="M 20 180 Q 200 180 380 20" fill="none" stroke="var(--color-yellow)" strokeWidth="4" className="curve-path" />
                            <circle cx="92" cy="148" r="8" fill="var(--color-red)" className="curve-point" />
                            {/* Adjusted y position of text to not clip with the line */}
                            <text x="50" y="125" fill="var(--color-offwhite)" className="curve-text">🤖 Team buys 10%</text>

                            <circle cx="280" cy="70" r="8" fill="var(--color-blue)" className="curve-point" />
                            <text x="255" y="55" fill="var(--color-offwhite)" className="curve-text">Community</text>
                        </svg>
                    </div>
                );
            case 1:
                return (
                    <div className="illo-bridge">
                        <div className="network-box solana">SOLANA</div>
                        <div className="bridge-path">
                            <div className="token-packet">10%</div>
                            <div className="nexus-node">
                                <img src={WormholeLogo} alt="Wormhole" className="wormhole-icon" /> Wormhole
                            </div>
                        </div>
                        <div className="network-box base">BASE (EVM)</div>
                    </div>
                );
            case 2:
                return (
                    <div className="illo-market">
                        <div className="pool-container">
                            <div className="pool-header">UNISWAP V2 POOL (BASE)</div>
                            <div className="pool-dev-action text-yellow">Dev deposits CEO + USDC</div>
                            <div className="pool-body">
                                <div className="token-side ceo">
                                    <div className="token-icon"><img src={RektLogo} alt="CEO" /></div>
                                </div>
                                <div className="pool-sync"><MdSwapHoriz size={32} /></div>
                                <div className="token-side usdc">
                                    <div className="token-icon"><img src={UsdcLogo} alt="USDC" /></div>
                                </div>
                            </div>
                            <div className="pool-dev-action text-blue">Users earn passive income</div>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="illo-treasury">
                        <div className="treasury-flow">
                            <div className="t-col">
                                <div className="t-box user-box">
                                    <div className="t-title">USER SPENDS</div>
                                    <div className="t-val">$CEO Tokens</div>
                                </div>
                            </div>

                            <div className="t-arrow-wrap"><MdArrowForward size={32} /></div>

                            <div className="t-col-split">
                                <div className="branch-line top"></div>
                                <div className="branch-line bottom"></div>
                                <div className="branch-connect">
                                    <a href="/memes" className="t-box nft-box clickable">
                                        <div className="t-title">MINT MEME</div>
                                        <div className="t-val text-yellow">/memes</div>
                                    </a>
                                </div>
                                <div className="branch-connect">
                                    <a href="/pfp" className="t-box nft-box clickable">
                                        <div className="t-title">MINT PFP</div>
                                        <div className="t-val text-yellow">/pfp</div>
                                    </a>
                                </div>
                            </div>

                            <div className="t-arrow-wrap"><MdArrowForward size={32} /></div>

                            <div className="t-col">
                                <div className="t-box vault-box">
                                    <div className="t-title">TREASURY</div>
                                    <div className="t-val">Sustains Dev</div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div className="illo-grand">
                        <div className="world-nodes">
                            <div className="wnode sol">
                                <img src={PumpFunLogo} alt="Pump.fun" className="node-logo" />
                                Pump.fun (Solana)
                            </div>
                            <div className="warbitrage">
                                <MdFlashOn size={22} className="pulse-icon" /> Community Enabled
                            </div>
                            <div className="wnode base">
                                <img src={BaseLogo} alt="Base" className="node-logo" />
                                Uniswap V2 (Base)
                            </div>
                        </div>
                        <div className="world-down-arrow">
                            <MdArrowDownward size={20} />
                            <span>Value Flow</span>
                            <MdArrowDownward size={20} />
                        </div>
                        <div className="world-perks">
                            <div className="perk">
                                <div className="perk-icon-wrapper red"><MdHome size={28} /></div>
                                IRL Techhouse
                            </div>
                            <div className="perk">
                                <div className="perk-icon-wrapper yellow"><MdCelebration size={28} /></div>
                                Exclusive Parties
                            </div>
                            <div className="perk">
                                <div className="perk-icon-wrapper blue"><MdDiamond size={28} /></div>
                                Priority Access
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="launch-mechanism-interactive" id="launch-mechanism">
            <div className="lmi-header">
                <h2 className="section-title">THE LAUNCH MECHANISM</h2>
                <p className="lmi-subtitle">How $CEO was born. Zero bullshit. 100% transparency.</p>
            </div>

            <div className="lmi-container">
                {/* Visual Area */}
                <div className="lmi-visuals">
                    <div className="lmi-illustration" ref={illustrationRef}>
                        {renderIllustration()}
                    </div>

                    {/* Stepper Progress */}
                    <div className="lmi-progress">
                        {phases.map((_, idx) => (
                            <div
                                key={idx}
                                className={`progress-dot ${idx === currentPhase ? 'active' : ''} ${idx < currentPhase ? 'completed' : ''}`}
                                onClick={() => setCurrentPhase(idx)}
                            ></div>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="lmi-content-panel">
                    <div className="phase-indicator">
                        {phases[currentPhase].icon}
                        <span>PHASE {currentPhase + 1} OF {phases.length}</span>
                    </div>

                    <h3 className="phase-title">{phases[currentPhase].title}</h3>
                    <p className="phase-desc">{phases[currentPhase].description}</p>

                    <div className="lmi-controls">
                        <button
                            className="nav-btn-game"
                            onClick={prevPhase}
                            disabled={currentPhase === 0}
                        >
                            <MdArrowBack /> PREV
                        </button>
                        <button
                            className="nav-btn-game primary"
                            onClick={nextPhase}
                            disabled={currentPhase === phases.length - 1}
                        >
                            NEXT <MdArrowForward />
                        </button>
                    </div>

                    {/* Extra CTAs dependent on phase */}
                    <div className="lmi-cta-box">
                        {currentPhase === 0 && (
                            <button className="nav-btn-game cta" onClick={() => navigate('/#buy-ceo')}>BUY ON PUMP FUN</button>
                        )}
                        {currentPhase === 1 && (
                            <button className="nav-btn-game cta" onClick={() => navigate('/#buy-ceo')}>BRIDGE USING WORMHOLE</button>
                        )}
                        {currentPhase === 2 && (
                            <button className="nav-btn-game cta" onClick={() => navigate('/buy-ceo')}>BUY $CEO</button>
                        )}
                        {currentPhase === 3 && (
                            <button className="nav-btn-game cta" onClick={() => navigate('/memes')}>MAKE MEMES</button>
                        )}
                        {currentPhase === 4 && (
                            <button className="nav-btn-game cta" onClick={() => navigate('/#rektonomics')}>EXPLORE REKTONOMICS</button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
