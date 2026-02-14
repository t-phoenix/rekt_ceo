import { useState } from "react";
import { useAccount } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import UnifiedBalance from "./unified-balance/unified-balance";
import FastBridge from "./fast-bridge/fast-bridge";
import SwapWidget from "./swaps/swap-widget";
import { SUPPORTED_CHAINS } from "@avail-project/nexus-core";
import { useNexus } from "./nexus/NexusProvider";
import "./BuyCEO.css";

export default function BuyCEO() {
  const { address, isConnected, connector } = useAccount();
  const { open } = useAppKit();
  const { nexusSDK, handleInit, loading, fetchBridgableBalance, fetchSwapBalance } = useNexus();
  const [activeTab, setActiveTab] = useState("unified-balance");

  const handleWalletClick = () => {
    open();
  };

  const handleInitClick = async () => {
    if (connector) {
      const provider = await connector.getProvider();
      await handleInit(provider);
    }
  };

  const renderContent = () => {
    if (!isConnected) {
      return (
        <div className="flex flex-col h-[300px] items-center justify-center p-8 space-y-4 text-center">
          <p className="text-gray-300 !mb-8">Connect your wallet to access Nexus features</p>
          <button
            className="connect-wallet-btn"
            onClick={handleWalletClick}
            style={{ width: 'auto', padding: '10px 24px' }}
          >
            CONNECT WALLET
          </button>
        </div>
      );
    }

    if (!nexusSDK) {
      return (
        <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
          <p className="text-gray-300 mb-4">Initialize Nexus SDK to continue</p>
          <button
            className="connect-wallet-btn"
            onClick={handleInitClick}
            disabled={loading}
            style={{ width: 'auto', padding: '10px 24px' }}
          >
            {loading ? 'INITIALIZING...' : 'INITIALIZE NEXUS'}
          </button>
        </div>
      );
    }

    return (
      <div className="tabs-container">
        <div className="tabs-list">
          <button
            className={`tab-trigger ${activeTab === 'unified-balance' ? 'active' : ''}`}
            onClick={() => setActiveTab('unified-balance')}
          >
            Unified Balance
          </button>
          <button
            className={`tab-trigger ${activeTab === 'fast-bridge' ? 'active' : ''}`}
            onClick={() => setActiveTab('fast-bridge')}
          >
            Fast Bridge
          </button>
          <button
            className={`tab-trigger ${activeTab === 'swaps' ? 'active' : ''}`}
            onClick={() => setActiveTab('swaps')}
          >
            Swaps
          </button>
        </div>

        {activeTab === 'unified-balance' && (
          <div className="tab-content active">
            <UnifiedBalance />
          </div>
        )}

        {activeTab === 'fast-bridge' && (
          <div className="tab-content active">
            <div className="fast-bridge-container">
              <FastBridge
                connectedAddress={address}
                onComplete={() => {

                  fetchBridgableBalance();
                  fetchSwapBalance();
                  setActiveTab('unified-balance');
                }}
                onError={(e) => console.error("Bridge Error", e)}
              />
            </div>
          </div>
        )}

        {activeTab === 'swaps' && (
          <div className="tab-content active">
            <div className="swaps-container flex justify-center">
              <SwapWidget
                defaultInputs={{
                  toChainID: SUPPORTED_CHAINS.BASE,
                  toToken: {
                    tokenAddress: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
                    decimals: 6,
                    symbol: "USDC",
                    name: "USD Coin",
                    logo: "https://coin-images.coingecko.com/coins/images/6319/large/usdc.png?1696506694",
                  },
                }}
                onComplete={() => {

                  fetchBridgableBalance();
                  fetchSwapBalance();
                  setActiveTab('unified-balance');
                }}
                onStart={() => { }}
                onError={(e) => console.error("Swap Error", e)}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="buy-ceo-card">
      <div className="card-header">
        <h2 className="card-title">Get  USDC on BASE</h2>
        <p className="text-[10px] font-medium text-white/40 uppercase tracking-widest mt-0 text-center">
          Powered by Avail Nexus
        </p>
      </div>

      <div className="card-content">
        {renderContent()}
      </div>
    </div>
  );
}
