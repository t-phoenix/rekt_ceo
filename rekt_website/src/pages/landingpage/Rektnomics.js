

import React from "react";
import "./styles/intro.css";
import "./styles/rektnomics.css";

import neon_penthouse from "../../creatives/neon_penthouse.jpg";
import ceo_swag from "../../creatives/ceo_swag.jpg";
import {
  MdCurrencyExchange,
  MdFace2,
  MdFingerprint,
  MdNightlife,
  MdRocketLaunch,
  MdTipsAndUpdates,
  MdVolunteerActivism,
  MdWaterDrop,
} from "react-icons/md";

export default function Rektnomics() {
  return (
    <section
      id="rektnomics"
      style={{ backgroundImage: `url(${neon_penthouse})` }}
      className="rektnomics-section"
    >
      <h1 className="section-title" style={{ color: "#fcd25a" }}>
        REKTNOMICS
      </h1>
      <div className="rektnomics-box">
        {/* COLUMN 1 */}
        <img src={ceo_swag} alt="" className="rekt-image" />

        {/* COLUMN 2 */}
        <div className="rekt-info">
          <div className="rekt-info-card">
            <h1>DEV Liquidity Locked</h1>
            <p>Launch on Pump fun and Raydium</p>
          </div>
          <div className="rekt-info-card">
            <h1>
              <strong>Buy/ Sell Tax:</strong> 0%
            </h1>
            <p>
              <strong>Supply:</strong> 1,000,000,000
            </p>
          </div>
          <div className="rekt-info-card">
            <h1>Contract Address</h1>
            <p style={{ overflowWrap: 'break-word' }}>TBD</p>
          </div>
          <button style={{ backgroundColor: "#e7255e", color: "#ffffff" }}>
            BUY $CEO (Soon)
          </button>
        </div>

        {/* COLUMN 3 */}
        <div className="rekt-utility">
          <h1>So Much To Do With $CEO</h1>
          <div className="rekt-utility-box">
            <div className="rekt-utility-div">
              <MdFace2 className="rekt-icon" />
              <p> Mint your unique PFP</p>
            </div>
            <div className="rekt-utility-div">
              <MdFingerprint className="rekt-icon" />
              <p> Mint and Own CEO Memes</p>
            </div>

            <div className="rekt-utility-div">
              <MdTipsAndUpdates className="rekt-icon" />{" "}
              <p> Use CEO in future releases</p>
            </div>
            <div className="rekt-utility-div">
              <MdNightlife className="rekt-icon" />{" "}
              <p> Fund IRL Clubhouse, Parties</p>
            </div>
            <div className="rekt-utility-div">
              <MdWaterDrop className="rekt-icon" />{" "}
              <p> Stake $CEO as LP on Raydium</p>
            </div>
            <div className="rekt-utility-div">
              <MdRocketLaunch className="rekt-icon" />{" "}
              <p> Earn Trading Fee as LP</p>
            </div>
            <div className="rekt-utility-div">
              <MdCurrencyExchange className="rekt-icon" size={30} />{" "}
              <p> Extract Arbitrage </p>
            </div>
            <div className="rekt-utility-div">
              <MdVolunteerActivism className="rekt-icon" />
              <p> HODL just like other coins</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}