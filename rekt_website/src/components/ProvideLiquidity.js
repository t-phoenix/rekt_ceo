import { useState } from "react";
import "./ProvideLiquidity.css";
import GetRektCEO from "./rektToken/GetRektCEO";
import ProvideLiquidityComponent from "./rektToken/ProvideLiquidity";
import { BASE_USDC_ADDRESS, BASE_TOKEN_ADDRESS } from "./rektToken/config";
import uniswapLogo from "../creatives/crypto/uniswap.png";

export default function ProvideLiquidity() {
  // Tabs
  const [activeTab, setActiveTab] = useState("get-rekt");

  const uniswapUrl = `https://app.uniswap.org/swap?inputCurrency=${BASE_USDC_ADDRESS}&outputCurrency=${BASE_TOKEN_ADDRESS}&chain=base`;

  return (
    <div className="provide-liquidity-card">
      <div className="card-header-row">
        <div className="card-title-container">
          <h2 className="card-title">Enter Rekt $CEO World</h2>
          <span className="card-subtitle">Powered by Uniswap</span>
        </div>
        <a href={uniswapUrl} target="_blank" rel="noopener noreferrer" className="uniswap-link-button">
          <span>Trade on</span>
          <img src={uniswapLogo} alt="Uniswap" className="uniswap-button-logo" />
        </a>
      </div>

      <div className="nav-tabs">
        <button
          className={`nav-tab ${activeTab === "get-rekt" ? "active" : ""}`}
          onClick={() => setActiveTab("get-rekt")}
        >
          Get Rekt CEO
        </button>
        <button
          className={`nav-tab ${activeTab === "provide-liquidity" ? "active" : ""}`}
          onClick={() => setActiveTab("provide-liquidity")}
        >
          Provide Liquidity
        </button>
      </div>

      <div className="card-content-area">
        {activeTab === "get-rekt" && (
          <GetRektCEO />
        )}

        {activeTab === "provide-liquidity" && (
          <ProvideLiquidityComponent />
        )}
      </div>
    </div>
  );
}