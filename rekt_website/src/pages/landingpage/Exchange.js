import React, { Suspense, lazy } from 'react';

import './styles/exchange.css';
import pumpFunLogo from "../../creatives/crypto/pump_fun.png";
import solanaLogo from "../../creatives/crypto/solana.png";
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const BuyCEOonPump = lazy(() => import("../../components/BuyCEOonPump"));
const BridgeCEO = lazy(() => import("../../components/BridgeCEO"));

function ExchangeSectionFallback() {
  return (
    <div className="exchange-section-loading" aria-hidden="true">
      Loading…
    </div>
  );
}

export default function Exchange() {
  return (
    <div id="exchange" className="exchange-container">
      <header className="exchange-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <h1 className="exchange-section-title" style={{ marginBottom: 0 }}>
            Buy $CEO on
            pump<img src={pumpFunLogo} alt="Pump.fun" className="title-logo dot-fun" loading="lazy" />fun
            <img src={solanaLogo} alt="Solana" className="title-logo solana-logo" loading="lazy" />
            olana
          </h1>
          <WalletMultiButton />
        </div>
      </header>
      <main className="exchange-main">
        <section className="exchange-section" aria-labelledby="buy">
          <h2 id="buy" className="sr-only">Buy $CEO on Pump.fun</h2>
          <Suspense fallback={<ExchangeSectionFallback />}>
            <BuyCEOonPump />
          </Suspense>
        </section>
        <section className="exchange-section" aria-labelledby="bridge">
          <h2 id="bridge" className="sr-only">Bridge to Solana</h2>
          <Suspense fallback={<ExchangeSectionFallback />}>
            <BridgeCEO />
          </Suspense>
        </section>
      </main>
    </div>
  );
}
