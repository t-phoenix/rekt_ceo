import React, { useState } from "react";
import { MdKeyboardArrowDown, MdInfo } from "react-icons/md";
import Icon from "react-crypto-icons";
import "./Exchange.css";
import rektLogo from "../creatives/Rekt_logo_illustration.png";

export default function Exchange() {
  const [sellAmount, setSellAmount] = useState("1");
  const [buyAmount, setBuyAmount] = useState("134263");
  const [showMore, setShowMore] = useState(false);

  // Calculate USD values (mock calculations)
  const sellUsdValue = (parseFloat(sellAmount) * 832.31).toFixed(2);
  const receivedAmount = (parseFloat(buyAmount) * 0.999).toFixed(2);

  return (
    <div className="swap-column">
      <div className="swap-interface">
        <div className="swap-header">
          <span className="swap-title">You're swapping</span>
        </div>
        
        {/* Sell Section */}
        <div className="swap-section">
          <div className="swap-input-container">
            <div className="amount-display">
              <input 
                type="text" 
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
                className="amount-input"
              />
              <div className="usd-value">${sellUsdValue}</div>
            </div>
            <div className="token-selector">
                <div className="token-icon bnb-icon">
                  <Icon name="bnb" size={30} />
                  <div className="network-indicator">
                      <Icon name="bnb" size={8} />
                  </div>
                </div>
                <span className="token-name">BNB</span>
            </div>
          </div>
        </div>

        {/* Swap Direction */}
        <div className="swap-direction">
          <button className="swap-arrow-button" >
            ↓
          </button>
        </div>

        {/* Buy Section */}
        <div className="swap-section">
          <div className="swap-input-container">
            <div className="amount-display-output">
              <div className="amount-output">{buyAmount}</div>
              <div className="price-impact">-(1.01%)</div>
            </div>
            <div className="token-selector">
              <div className="token-icon ceo-icon">
                <img src={rektLogo} alt="CEO Token" className="ceo-logo" />
                <div className="network-indicator">
                    <Icon name="bnb" size={8} />
                </div>
              </div>
              <span className="token-name">CEO</span>
            </div>
          </div>
        </div>

        {/* Show More Section */}
        <div className="show-more-section" onClick={() => setShowMore(!showMore)}>
          <span>Show more</span>
          <MdKeyboardArrowDown size={16} className={showMore ? "rotated" : ""} />
        </div>

        {/* Transaction Details */}
        {showMore && (
          <div className="transaction-details">
            <div className="detail-row">
              <div className="detail-label">
                <span>Fee (0.25%)</span>
                <MdInfo size={14} />
              </div>
              <span className="detail-value">272.28 CEO</span>
            </div>
            <div className="detail-row">
              <div className="detail-label">
                <span>Network cost</span>
                <MdInfo size={14} />
              </div>
              <div className="detail-value">
                <div className="network-icon"></div>
                $0.02
              </div>
            </div>
            <div className="detail-row">
              <span className="detail-label">You receive</span>
              <span className="detail-value">{receivedAmount} CEO</span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <button className="swap-button">
          Launching Soon
        </button>
      </div>
    </div>
  );
} 