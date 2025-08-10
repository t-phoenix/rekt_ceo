import { useMemo, useState } from "react";
import "./BuyCEO.css";

const QUOTES = ["USDC", "USDT", "BNB"];

export default function BuyCEO() {
  const [quote, setQuote] = useState("USDC");
  const [from, setFrom] = useState("");
  const rate = useMemo(() => {
    // naive mock price: 1 quote buys X $CEO
    return quote === "BNB" ? 3000 : 1000;
  }, [quote]);

  const to = useMemo(() => {
    const f = parseFloat(from || "0");
    if (isNaN(f)) return "";
    return (f * rate).toFixed(2);
  }, [from, rate]);

  return (
    <div className="buy-ceo-card">
      <div className="card-header">
        <h2 className="card-title">Buy $CEO</h2>
      </div>
      <div className="card-content">
        <div className="tabs-container">
          <div className="tabs-list">
            {QUOTES.map((t) => (
              <button 
                key={t} 
                className={`tab-trigger ${quote === t ? 'active' : ''}`}
                onClick={() => setQuote(t)}
              >
                {t}
              </button>
            ))}
          </div>
          {QUOTES.map((t) => (
            <div key={t} className={`tab-content ${quote === t ? 'active' : ''}`}>
              <div className="input-group">
                <label htmlFor="from">From ({t})</label>
                <input
                  id="from"
                  type="text"
                  inputMode="decimal"
                  placeholder={`Amount in ${t}`}
                  value={quote === t ? from : ""}
                  onChange={(e) => quote === t && setFrom(e.target.value)}
                  className="amount-input"
                />
              </div>
              <div className="input-group">
                <label htmlFor="to">To ($CEO)</label>
                <input 
                  id="to" 
                  type="text"
                  value={quote === t ? to : ""} 
                  readOnly 
                  className="amount-input"
                />
              </div>
              <div className="rate-info">
                Rate: 1 {t} ≈ {rate.toLocaleString()} $CEO
              </div>
              <button className="buy-button">Buy $CEO</button>
            </div>
          ))}
        </div>
        <p className="demo-note">
          This is a demo DEX-style interface inspired by rektceo.club. Connect your wallet and route orders to your preferred DEX in production.
        </p>
      </div>
    </div>
  );
}
