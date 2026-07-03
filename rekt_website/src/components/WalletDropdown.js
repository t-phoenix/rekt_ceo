import React, { useState } from 'react';
import { useAccount, useDisconnect, useSwitchChain } from 'wagmi';
import { chains } from '../config/chains';
import { FaLink, FaChevronDown } from 'react-icons/fa';
import UnifiedBalance from "./unified-balance/unified-balance";
import "./WalletDropdown.css";

const WalletDropdown = ({ onClose }) => {
    const { chain } = useAccount();
    const { disconnect } = useDisconnect();
    const { switchChain } = useSwitchChain();
    const [showChainOptions, setShowChainOptions] = useState(false);

    const getChainName = () => {
        if (!chain) return 'Select Chain';
        return chain.name;
    };

    const getChainIcon = (chainId) => {
        const chainConfig = chains.find(c => c.id === chainId);
        if (chainConfig) {
            return <img src={chainConfig.logo} alt={chainConfig.name} className="chain-icon" />;
        }
        return <FaLink className="chain-icon" />;
    };

    return (
        <div className="wallet-dropdown-container" onMouseLeave={onClose}>
            {/* Header: Chain Switcher on Left */}
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
                                {chains.map((c) => (
                                    <button
                                        key={c.id}
                                        className={`chain-option ${chain?.id === c.id ? 'active' : ''}`}
                                        onClick={() => {
                                            switchChain({ chainId: c.id });
                                            setShowChainOptions(false);
                                        }}
                                    >
                                        <img src={c.logo} alt={c.name} className="chain-icon" />
                                        {c.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="unified-balance-container" style={{ padding: '0.5rem' }}>
                <UnifiedBalance />
            </div>

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
