import React, { useState } from 'react';
import { useAccount, useDisconnect, useSwitchChain } from 'wagmi';
import { useNexus } from '../config/NexusProvider';
import UnifiedBalance from './nexus/UnifiedBalance';
import { chains } from '../config/chains';
import { FaLink, FaChevronDown } from 'react-icons/fa';
import "./WalletDropdown.css";

const WalletDropdown = ({ onClose }) => {
    const { chain, connector, isConnected } = useAccount();
    const { disconnect } = useDisconnect();
    const { switchChain } = useSwitchChain();
    const { handleInit, fetchUnifiedBalance } = useNexus();
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
