import React, { useState } from 'react';
import { useAccount, useDisconnect, useSwitchChain } from 'wagmi';
import { useNexus } from '../config/NexusProvider';
import UnifiedBalance from './nexus/UnifiedBalance';
import baseLogo from "../creatives/crypto/base.png";
import { FaEthereum, FaLink, FaChevronDown, FaLayerGroup } from 'react-icons/fa';
import "./WalletDropdown.css";

const WalletDropdown = ({ onClose }) => {
    const { chain, connector, isConnected } = useAccount();
    const { disconnect } = useDisconnect();
    const { switchChain } = useSwitchChain();
    const { handleInit, fetchUnifiedBalance, isInitialized } = useNexus();
    const [showChainOptions, setShowChainOptions] = useState(false);

    const getChainName = () => {
        if (!chain) return 'Select Chain';
        return chain.name;
    };

    const getChainIcon = (chainId) => {
        if (chainId === 8453) return <img src={baseLogo} alt="Base" className="chain-icon" />;
        if (chainId === 1) return <FaEthereum className="chain-icon" style={{ color: '#627EEA', background: 'white', padding: '1px' }} />;
        if (chainId === 42161) return <FaLayerGroup className="chain-icon" style={{ color: '#28A0F0' }} />; // Arb placeholder
        if (chainId === 10) return <div className="chain-icon" style={{ background: 'red', borderRadius: '50%', width: 20, height: 20, textAlign: 'center', fontSize: 10, lineHeight: '20px' }}>OP</div>;
        return <FaLink className="chain-icon" />;
    };

    const handleNexusInit = async () => {
        if (isConnected && connector) {
            try {
                const provider = await connector.getProvider();
                console.log('Initializing Nexus with provider:', provider);
                await handleInit(provider);
            } catch (err) {
                console.error('Manual Init Error:', err);
            }
        }
    };

    const availableChains = [
        { id: 8453, name: 'Base', icon: <img src={baseLogo} alt="Base" className="chain-icon" /> },
        { id: 1, name: 'Ethereum', icon: <FaEthereum className="chain-icon" style={{ color: '#627EEA' }} /> },
        { id: 42161, name: 'Arbitrum', icon: <FaLayerGroup className="chain-icon" style={{ color: '#28A0F0' }} /> },
        { id: 10, name: 'Optimism', icon: <span style={{ color: 'red', fontWeight: 'bold' }}>OP</span> }
    ];

    return (
        <div className="wallet-dropdown-container" onMouseLeave={onClose}>
            {/* Header: Chain Switcher on Left, Refresh on Right */}
            <div className="wallet-dropdown-header">
                <div className="header-left">
                    <div className="chain-selector-wrapper">
                        <button
                            className="current-chain-btn"
                            onClick={() => setShowChainOptions(!showChainOptions)}
                        >
                            {chain ? getChainIcon(chain.id) : <FaLink />}
                            <span>{getChainName()}</span>
                            <FaChevronDown className="chain-caret" />
                        </button>

                        {showChainOptions && (
                            <div className="chain-options-dropdown">
                                {availableChains.map((c) => (
                                    <button
                                        key={c.id}
                                        className={`chain-option ${chain?.id === c.id ? 'active' : ''}`}
                                        onClick={() => {
                                            switchChain({ chainId: c.id });
                                            setShowChainOptions(false);
                                        }}
                                    >
                                        {c.icon}
                                        {c.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>



                <div className="header-right">
                    <button
                        className="refresh-icon-btn"
                        onClick={handleNexusInit}
                        title="Init Nexus"
                        style={{ boxShadow: 'none' }}
                    >
                        Init
                    </button>
                    <button
                        className="refresh-icon-btn"
                        onClick={() => fetchUnifiedBalance()}
                        title="Refresh Balances"
                        style={{ boxShadow: 'none' }}
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {/* Init Button - Only if NOT initialized */}




            {/* Unified Balance Component */}
            <UnifiedBalance />

            <button
                className="disconnect-btn"
                onClick={() => {
                    disconnect();
                    onClose();
                }}
                style={{ boxShadow: 'none' }}
            >
                Disconnect
            </button>
        </div>
    );
};

export default WalletDropdown;
