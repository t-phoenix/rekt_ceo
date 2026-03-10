import React, { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import BuyCEO from "../components/BuyCEO";
import ProvideLiquidity from "../components/ProvideLiquidity";
import "./BuyCEO.css";
import baseLogo from '../creatives/crypto/base.png';

export default function BuyCEOPage() {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="buy-ceo-page-container">
            <Helmet>
                <title>Buy $CEO Token on Base Chain | REKT CEO</title>
                <meta name="description" content="Buy $CEO on Base chain via Uniswap. Simple token swap interface — connect wallet, choose amount, swap. Provide liquidity to earn fees." />
                <link rel="canonical" href="https://www.rektceo.club/buy-ceo" />
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://www.rektceo.club/buy-ceo" />
                <meta property="og:title" content="Buy $CEO Token on Base Chain | REKT CEO" />
                <meta property="og:description" content="Buy $CEO on Base chain via Uniswap. Simple token swap interface." />
                <meta property="og:image" content="https://www.rektceo.club/rekt.webp" />
            </Helmet>
            <div className="exchange-layout">
                <header className="exchange-header">
                    <h1 className="exchange-title">Buy $CEO — on Base Chain <img src={baseLogo} alt="Base" className="token-icon" /></h1>
                    <section className="buy-intro-section" style={{ textAlign: "center", padding: "0rem", color: "white" }}>
                        <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>How to Buy $CEO on Base Chain</h2>
                        <p style={{ color: "#aaa", marginBottom: "0.5rem" }}>$CEO is available on Uniswap on Base L2. Connect your wallet, enter the amount, and swap USDC for $CEO in seconds.</p>
                        <div className="contract-info" style={{ fontSize: "0.9rem", color: "#888" }}>
                            <strong>Contract Address: </strong>
                            <code>0xcomingsoon</code>
                        </div>
                    </section>
                </header>
                <main className="exchange-main">
                    <section className="exchange-section" aria-labelledby="buy">
                        <h2 id="buy" className="sr-only">Buy $CEO</h2>
                        <BuyCEO />
                    </section>
                    <section className="exchange-section" aria-labelledby="lp">
                        <h2 id="lp" className="sr-only">Provide Liquidity</h2>
                        <ProvideLiquidity />
                    </section>
                </main>
            </div>
        </div>
    );
}
