import React from "react";
import { useNavigate } from "react-router-dom";
import "./intro.css";
import "./roadmap.css";
import "./rektnomics.css";

import BG_1 from "../creatives/BG_1.png";
import neonbackground from "../creatives/neon_penthouse.jpg";
import penthouse from "../creatives/penthouse.jpeg";
import neon_penthouse from "../creatives/neon_penthouse.jpg";
import ceooffice4 from "../creatives/ceo_office2.jpg";
import ceo_swag from "../creatives/ceo_swag.jpg";

import aiimage from "../creatives/ai_image/aiimage.jpg";
import bioluminescent from "../creatives/ai_image/bioluminescent.jpg";
import cyber_forest from "../creatives/ai_image/cyber_forest.jpg";
import floating_garden from "../creatives/ai_image/floating_gardens.jpg";
import neon_mist from "../creatives/ai_image/neon_mist.jpg";
import waterfall_garden from "../creatives/ai_image/waterfall_garden.jpg";

import ambassador from "../creatives/rekt_ceo_ambassador.png";
import BuySection from "./BuySection";
import StorySection from "./StorySection";
import {
  MdCurrencyExchange,
  MdFace2,
  MdFilterFrames,
  MdFingerprint,
  MdNightlife,
  MdRocketLaunch,
  MdTipsAndUpdates,
  MdVolunteerActivism,
  MdWaterDrop,
} from "react-icons/md";

export default function Introduction() {
  const navigate = useNavigate();
  return (
    <div>
      <section
        style={{ backgroundImage: `url(${penthouse})` }}
        className="landing-section"
      >
        <div className="landing-main-div">
          <h1 className="landing-title">$ REKT CEO</h1>
          <ul className="landing-subtitle">
            <li>🚀 No Insider</li>
            <li>🎉 No KOL</li>
            <li>🐶 No Bullshit</li>
          </ul>
          <button style={{ width: "220px" }}>BUY $CEO</button>
        </div>
        <img src={ambassador} alt="ambassador" className="ambassador-image" />
      </section>

      <StorySection />

      <BuySection />

      <section></section>

      <section className="roadmap-section">
        <h1
          className="section-title"
          style={{ marginTop: "8", marginBottom: "2%" }}
        >
          ROADMAP
        </h1>
        <div className="roadmap-box">
          <div
            style={{
              backgroundImage: `url(${aiimage})`,
              backgroundPosition: "top",
            }}
            className="roadmap-card road-1"
          >
            <h1>1. GET $CEO</h1>
          </div>
          <div
            style={{ backgroundImage: `url(${bioluminescent})` }}
            className="roadmap-card road-2"
          >
            <h1>2. MINT PFP</h1>
          </div>
          <div
            style={{ backgroundImage: `url(${cyber_forest})` }}
            className="roadmap-card road-3"
          >
            <h1>3. Generate MEME</h1>
          </div>
          <div
            style={{
              backgroundImage: `url(${floating_garden})`,
              backgroundPosition: "bottom left",
            }}
            className="roadmap-card road-4"
          >
            <h1>4. Fund Clubhouse</h1>
          </div>
          <div
            style={{ backgroundImage: `url(${neon_mist})` }}
            className="roadmap-card road-5"
          >
            <h1>5. Fund Party Box</h1>
          </div>
          <div
            style={{
              backgroundImage: `url(${waterfall_garden})`,
              backgroundPosition: "bottom",
            }}
            className="roadmap-card road-6"
          >
            <h1>6. Fund Investment Box</h1>
          </div>
          <div
            style={{
              backgroundImage: `url(${aiimage})`,
              backgroundPosition: "bottom",
            }}
            className="roadmap-card road-7"
          >
            <h1>7. Engage in DAO (soon)</h1>
          </div>
          <div
            style={{
              backgroundImage: `url(${cyber_forest})`,
              backgroundPosition: "bottom",
            }}
            className="roadmap-card road-8"
          >
            <h1>8. Share on X</h1>
          </div>
        </div>
      </section>

      <section
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
              <p style={{overflowWrap: 'break-word'}}>madHpjRn6bd8t78Rsy7NuSuNwWa2HU8ByPobZprHbHv</p>
            </div>
            <button style={{ backgroundColor: "#e7255e", color: "#ffffff" }}>
              BUY $CEO
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
    </div>
  );
}
