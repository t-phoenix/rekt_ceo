import React from "react";
import "./styles/intro.css";
import "./styles/buy.css";
import penthouse2 from "../creatives/penthouse2.jpg";
import Exchange from "../components/Exchange";

import { MdRocketLaunch, MdShoppingCart, MdSwapHoriz, MdAccountBox } from "react-icons/md";
import { useNavigate } from "react-router-dom";

export default function BuySection(){
    const navigate = useNavigate();
    
    const metamaskLink = "https://metamask.io/"
    const trustWalletLink = "https://trustwallet.com/"
    const getBnbGuide = "https://www.binance.com/en/buy-BNB"

    return(
        <section
        id="buyceo"
        style={{ backgroundImage: `url(${penthouse2})` }}
        className="buy-section"
      >
        <h1 className="section-title" style={{color: 'var(--color-yellow)', fontSize: '4rem'}}>HOW TO BUY</h1>
        <div className="buy-container">
          {/* Left Column - Step Cards */}
          <div className="steps-column">
            <div className="buy-card item-1">
              <div className="content-section">
                <h1>1. Download Metamask or Trust Wallet</h1>
                <p>
                  Download and install the Metamask or Trust Wallet either from the app store
                  on your phone or as a browser extension for desktop.
                </p>
              </div>
              <div className="button-section">
                <button className="button-margin" onClick={() => window.open(metamaskLink, "_blank")}>GET METAMASK</button>
                <button className="button-margin" onClick={() => window.open(trustWalletLink, "_blank")}>GET TRUST</button>
              </div>
              <div className="icon-box">
                  <MdRocketLaunch className="card-icon" size={32} />
              </div>
            </div>
            <div className="buy-card item-2">
              <div className="content-section">
                <h1>2. BUY SOME BNB</h1>
                <p>
                  Purchase some BNB from an exchange or bridge BNB and send it to your
                  wallet to pay for gas fee.
                </p>
              </div>
              <div className="button-section">
                <button className="button-margin" onClick={() => window.open(getBnbGuide, "_blank")}>GET BNB</button>
                <button className="button-margin" onClick={() => window.open(getBnbGuide, "_blank")}>GET USDC</button>
              </div>
              <div className="icon-box">
                  <MdShoppingCart className="card-icon" size={32} />
              </div>
            </div>
            <div className="buy-card item-3">
              <div className="content-section">
                <h1>3. BUY $CEO</h1>
                <p>
                  Go to Exchange or Pancakeswap and paste the CEO contract address
                  listed on this website to swap BNB for $CEO or USDC for CEO.
                </p>
              </div>
              <div className="button-section">
                <button className="button-margin">EXCHANGE</button>
                <button className="button-margin">PANCAKESWAP</button>
              </div>
              <div className="icon-box">
                  <MdSwapHoriz className="card-icon" size={32} />
              </div>
            </div>
            <div className="buy-card item-4">
              <div className="content-section">
                <h1>4. Add $CEO to your Wallet & Mint NFTs</h1>
                <p>
                  Import $CEO token in your wallet if not already showing. You can also use $CEO across the website and immerse in web3 experience.
                </p>
              </div>
              <div className="button-section">
                <button className="button-margin">ADD CEO</button>
                <button className="button-margin" onClick={() => navigate("/pfp")}>MINT PFP</button>
              </div>
              <div className="icon-box">
                  <MdAccountBox className="card-icon" size={32} />
              </div>
            </div>
          </div>

          {/* Right Column - Swap Interface */}
          {/* <div className="swap-column">
            
            <Exchange />
          </div> */}
        </div>
      </section>
    )
}