import { useMemo, useState } from "react";
import "./ProvideLiquidity.css";

const PAIRS = ["CEO/USDC"];
export default function ProvideLiquidity() {
  const [pair, setPair] = useState("CEO/USDC");
  const ratio = useMemo(() => (pair === "CEO/USDC" ? 5000 : 1000), [pair]);
  const [tokenA, setTokenA] = useState("");

  const tokenB = useMemo(() => {
    const a = parseFloat(tokenA || "0");
    if (isNaN(a)) return "";
    // tokenA is CEO, tokenB is BNB or USDC
    return (a / ratio).toFixed(6);
  }, [tokenA, ratio]);

  return (
    <div className="provide-liquidity-card">
      <div className="card-header">
        <h2 className="card-title">Provide Liquidity</h2>
      </div>
      <div className="card-content">
        <div className="tabs-container">
          <div className="tabs-list">
            {PAIRS.map((p) => (
              <button
                key={p}
                className={`tab-trigger ${pair === p ? 'active' : ''}`}
                onClick={() => setPair(p)}
              >
                {p}
              </button>
            ))}
          </div>
          {PAIRS.map((p) => (
            <div key={p} className={`tab-content ${pair === p ? 'active' : ''}`}>
              <div className="input-group">
                <label htmlFor="ceo">$CEO amount</label>
                <input
                  id="ceo"
                  type="text"
                  inputMode="decimal"
                  placeholder="Amount in $CEO"
                  value={pair === p ? tokenA : ""}
                  onChange={(e) => pair === p && setTokenA(e.target.value)}
                  className="amount-input"
                />
              </div>
              <div className="input-group">
                <label htmlFor="pair">{p.split("/")[1]} amount</label>
                <input
                  id="pair"
                  type="text"
                  value={pair === p ? tokenB : ""}
                  readOnly
                  className="amount-input"
                />
              </div>
              <div className="ratio-info">Ratio: {ratio.toLocaleString()} $CEO per {p.split("/")[1]}</div>
              <button className="add-liquidity-button">Add Liquidity (Soon)</button>
            </div>
          ))}
        </div>
        <p className="pool-info">Your pool share and LP rewards will appear here after deposit.</p>
      </div>
    </div>
  );
}