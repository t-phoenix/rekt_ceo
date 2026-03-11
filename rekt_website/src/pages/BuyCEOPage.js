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
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:site" content="@rekt_ceo" />
                <meta name="twitter:image" content="https://www.rektceo.club/rekt.webp" />
                <script type="application/ld+json">{JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "HowTo",
                  "name": "How to Buy $CEO on Base",
                  "description": "Swap USDC for $CEO on Uniswap on Base L2. Connect your wallet, enter amount, and swap. You can also provide liquidity to earn fees.",
                  "step": [
                    { "@type": "HowToStep", "name": "Connect wallet", "text": "Connect a Base-compatible wallet (e.g. MetaMask) to the site." },
                    { "@type": "HowToStep", "name": "Enter amount", "text": "Choose how much USDC to swap for $CEO in the swap widget." },
                    { "@type": "HowToStep", "name": "Swap", "text": "Confirm the swap in your wallet. $CEO will appear in your wallet after the transaction." }
                  ]
                })}</script>
                <script type="application/ld+json">{JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  "mainEntity": [
                    { "@type": "Question", "name": "How do I buy $CEO?", "acceptedAnswer": { "@type": "Answer", "text": "Connect your wallet, use the swap widget above to exchange USDC for $CEO on Uniswap on Base L2. Confirm the transaction in your wallet." } },
                    { "@type": "Question", "name": "What wallet do I need?", "acceptedAnswer": { "@type": "Answer", "text": "Any Base-compatible wallet (e.g. MetaMask, Coinbase Wallet). Ensure you have USDC on Base for the swap and a little ETH for gas." } },
                    { "@type": "Question", "name": "What chain is $CEO on?", "acceptedAnswer": { "@type": "Answer", "text": "$CEO is on Base L2. This page supports buying on Base via Uniswap. The token also exists on Solana." } }
                  ]
                })}</script>
            </Helmet>
            <div className="exchange-layout">
                <header className="exchange-header">
                    <h1 className="exchange-title">Buy $CEO — on Base Chain <img src={baseLogo} alt="Base" className="token-icon" /></h1>
                    <section className="buy-intro-section" style={{ textAlign: "center", padding: "0rem", color: "white" }}>
                        <p style={{ color: "#aaa", marginBottom: "0.5rem", marginTop: "0.5rem" }}>$CEO is available on Uniswap on Base L2. Connect your wallet, enter the amount, and swap USDC for $CEO in seconds.</p>
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
                <section aria-label="Buy $CEO FAQ" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
                    <h2>Frequently asked questions</h2>
                    <dl>
                        <dt>How do I buy $CEO?</dt>
                        <dd>Connect your wallet and use the swap widget above to exchange USDC for $CEO on Uniswap on Base. Confirm the transaction in your wallet.</dd>
                        <dt>What wallet do I need?</dt>
                        <dd>Any Base-compatible wallet (e.g. MetaMask, Coinbase Wallet). Have USDC on Base for the swap and a little ETH for gas.</dd>
                        <dt>What chain is $CEO on?</dt>
                        <dd>$CEO is on Base L2. This page supports buying on Base via Uniswap. The token also exists on Solana.</dd>
                    </dl>
                </section>
            </div>
        </div>
    );
}
