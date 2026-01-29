import React from "react";
import "./styles/intro.css";
import "./styles/buy.css";
import penthouse2 from "../creatives/penthouse2.jpg";

import { MdRocketLaunch, MdShoppingCart, MdSwapHoriz, MdAccountBox } from "react-icons/md";
import { useNavigate } from "react-router-dom";

export default function HowToBuy() {
    const navigate = useNavigate();

    const metamaskLink = "https://metamask.io/"
    const phantomLink = "https://phantom.app/"
    const getSOL = "https://solana.com/"
    const getETH = "https://ethereum.org/"
    const buyOnPump = "https://pump.fun/"
    const buyOnUniswap = "https://app.uniswap.org/#/swap?outputCurrency="

    return (
        <section
            id="buyceo"
            style={{ backgroundImage: `url(${penthouse2})` }}
            className="buy-section"
        >
            <h1 className="section-title" style={{ color: 'var(--color-yellow)', fontSize: '4rem' }}>HOW TO BUY</h1>
            <div className="buy-container">
                {/* Left Column - Step Cards */}
                <div className="steps-column">
                    <div className="buy-card item-1">
                        <div className="content-section">
                            <h1>1. Download Metamask or Phantom</h1>
                            <p>
                                Download and install the Metamask or Phantom either from the app store
                                on your phone or as a browser extension for desktop.
                            </p>
                        </div>
                        <div className="button-section">
                            <button className="button-margin" onClick={() => window.open(metamaskLink, "_blank")}>GET METAMASK</button>
                            <button className="button-margin" onClick={() => window.open(phantomLink, "_blank")}>GET PHANTOM</button>
                        </div>
                        <div className="icon-box">
                            <MdRocketLaunch className="card-icon" size={32} />
                        </div>
                    </div>
                    <div className="buy-card item-2">
                        <div className="content-section">
                            <h1>2. Fund Your Wallet with SOL or USDC and ETH</h1>
                            <p>
                                Get some SOL to buy $CEO on pump.fun or get some USDC and ETH on Base to buy $CEO from Uniswap
                            </p>
                        </div>
                        <div className="button-section">
                            <button className="button-margin" onClick={() => window.open(getSOL, "_blank")}>GET SOL</button>
                            <button className="button-margin" onClick={() => window.open(getETH, "_blank")}>GET ETH</button>
                        </div>
                        <div className="icon-box">
                            <MdShoppingCart className="card-icon" size={32} />
                        </div>
                    </div>
                    <div className="buy-card item-3">
                        <div className="content-section">
                            <h1>3. BUY $CEO (Soon)</h1>
                            <p>
                                Go to Pump.fun or Uniswap and paste the CEO contract address
                                listed on this website to swap SOL for $CEO or USDC for CEO.
                            </p>
                        </div>
                        <div className="button-section">
                            <button onClick={() => window.open(buyOnPump, "_blank")} className="button-margin ]]">PUMP.FUN</button>
                            <button onClick={() => window.open(buyOnUniswap, "_blank")} className="button-margin">UNISWAP</button>
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
                            <button className="button-margin">ADD CEO (Soon)</button>
                            <button className="button-margin" onClick={() => navigate("/pfp")}>MINT PFP</button>
                        </div>
                        <div className="icon-box">
                            <MdAccountBox className="card-icon" size={32} />
                        </div>
                    </div>
                </div>

                {/* Right Column - Swap Interface */}
            </div>
        </section>
    )
}
