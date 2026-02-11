import React from 'react';
import { Link } from "react-router-dom";
import BuyCEOonPump from "../../components/BuyCEOonPump";
import BridgeCEO from "../../components/BridgeCEO";
import './styles/exchange.css';
import pumpFunLogo from "../../creatives/crypto/pump_fun.png";
import solanaLogo from "../../creatives/crypto/solana.png";
import baseLogo from "../../creatives/crypto/base.png";

export default function Exchange() {
  return (
    <div id="exchange" className="exchange-container">
      <header className="exchange-header">
        <h1 className="exchange-section-title">
          Buy $CEO on
          pump<img src={pumpFunLogo} alt="Pump.fun" className="title-logo" />fun
          <img src={solanaLogo} alt="Solana" className="title-logo solana-logo" />
          olana
        </h1>
        <div className="base-button-container">
          <Link to="/buy-ceo" className="base-buy-button">
            <span className="base-button-text">Buy On Base</span>
            <img src={baseLogo} alt="Base" className="base-button-logo" />
            <div className="base-button-glow"></div>
          </Link>
        </div>
        {/* <p className="exchange-subtitle">No Insider · No KOL · No Bullshit</p> */}

      </header>
      <main className="exchange-main">
        <section className="exchange-section" aria-labelledby="buy">
          <h2 id="buy" className="sr-only">Buy $CEO on Pump.fun</h2>
          <BuyCEOonPump />
        </section>
        <section className="exchange-section" aria-labelledby="bridge">
          <h2 id="bridge" className="sr-only">Bridge to Solana</h2>
          <BridgeCEO />
        </section>
      </main>
    </div>
  )
}