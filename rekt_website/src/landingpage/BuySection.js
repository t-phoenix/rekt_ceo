import React from "react";
import "./styles/intro.css";
import "./styles/buy.css";
import penthouse2 from "../creatives/penthouse2.jpg";

import { MdRocketLaunch, MdShoppingCart, MdSwapHoriz, MdAccountBox } from "react-icons/md";
import { useNavigate } from "react-router-dom";


export default function BuySection(){
    const navigate = useNavigate();

    const phantomLink = "https://phantom.com/en-GB"
    const solflareLink = "https://solflare.com/"
    const getSolanaGuide = "https://medium.com/@rameshmagarrr/how-to-deposit-funds-to-your-phantom-wallet-2831d4fb49aa"

    return(
        <section
        id="buyceo"
        style={{ backgroundImage: `url(${penthouse2})` }}
        className="buy-section"
      >
        <h1 className="section-title" style={{color: 'var(--color-yellow)'}}>HOW TO BUY</h1>
        <div className="buy-box">
          <div className="buy-card item-1">
            <h1>1. Download Phantom OR Solflare Wallet</h1>
            <p>
              Download and install the Phantom Wallet either from the app store
              on your phone or as a browser extension for desktop.
            </p>
            <div className="row-box">
              <button className="button-margin" onClick={() => window.open(phantomLink, "_blank")}>GET PHANTOM</button>
              <button className="button-margin" onClick={() => window.open(solflareLink, "_blank")}>GET SOLFLARE</button>
            </div>
            <div className="icon-box">
                <MdRocketLaunch className="card-icon" size={32} />
            </div>
          </div>
          <div className="buy-card item-2">
            <h1>2. BUY SOME SOLANA</h1>
            <p>
              Purchase $SOL from an exchange or bridge $SOL and send it to your
              Phantom wallet
            </p>
            <button onClick={() => window.open(getSolanaGuide, "_blank")}>GET SOLANA</button>
            <div className="icon-box">
                <MdShoppingCart className="card-icon" size={32} />
            </div>
          </div>
          <div className="buy-card item-3">
            <h1>3. BUY $CEO</h1>
            <p>
              Go to Pump.fun or Raydium, and paste the $CEO contract address
              listed on this website to swap your SOL for CEO
            </p>
            <div className="row-box">
              <button className="button-margin">PUMP FUN</button>
              <button className="button-margin">RAYDIUM</button>
            </div>
            <div className="icon-box">
                <MdSwapHoriz className="card-icon" size={32} />
            </div>
          </div>
          <div className="buy-card item-4">
            <h1>4. ADD $CEO to Wallet and mint your CEO PFP NFT</h1>
            <p>
              Add $CEO contract address to your Phantom Wallet for your $CEO
              tokens to show. Also use $CEO accross the website and emerse in
              the web3 experience.
            </p>
            <div className="row-box">
              <button className="button-margin">ADD $CEO</button>
              <button className="button-margin" onClick={() => navigate("/pfp")}>MINT PFP</button>
            </div>
            <div className="icon-box">
                <MdAccountBox className="card-icon" size={32} />
            </div>
          </div>
        </div>
      </section>
    )
}