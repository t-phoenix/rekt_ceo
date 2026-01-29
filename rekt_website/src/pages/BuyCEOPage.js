import React, { useEffect } from "react";
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
            <div className="exchange-layout">
                <header className="exchange-header">
                    <h1 className="exchange-title">Buy $CEO — on Base Chain <img src={baseLogo} alt="Base" className="token-icon" /></h1>
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
