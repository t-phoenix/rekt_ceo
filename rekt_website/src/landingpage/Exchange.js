import BuyCEO from "../components/BuyCEO";
import ProvideLiquidity from "../components/ProvideLiquidity";
import "./styles/exchange.css";

export default function Exchange() {
    return(
        <div className="exchange-container">
      <header className="exchange-header">
        <h1 className="section-title">Buy $CEO — Rekt CEO DEX</h1>
        {/* <p className="exchange-subtitle">No Insider · No KOL · No Bullshit</p> */}
        
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
    )
}