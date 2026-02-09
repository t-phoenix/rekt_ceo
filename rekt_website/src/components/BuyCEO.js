import { useState } from "react";
import { useAccount } from "wagmi";
import UnifiedBalance from "./unified-balance/unified-balance";
import FastBridge from "./fast-bridge/fast-bridge";
import SwapWidget from "./swaps/swap-widget";
import { SUPPORTED_CHAINS } from "@avail-project/nexus-core";
import "./BuyCEO.css";

export default function BuyCEO() {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState("unified-balance");

  return (
    <div className="buy-ceo-card">
      <div className="card-header">
        <h2 className="card-title">Buy $CEO</h2>
      </div>

      <div className="card-content">
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
                  onComplete={() => console.log("Bridge Completed")}
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
                  onComplete={() => console.log("Swap Completed")}
                  onStart={() => console.log("Swap Started")}
                  onError={(e) => console.error("Swap Error", e)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
