import React from "react";
import "./styles/intro.css";
import "./styles/roadmap.css";


import aiimage from "../creatives/ai_image/aiimage.jpg";
import bioluminescent from "../creatives/ai_image/bioluminescent.jpg";
import cyber_forest from "../creatives/ai_image/cyber_forest.jpg";
import floating_garden from "../creatives/ai_image/floating_gardens.jpg";
import neon_mist from "../creatives/ai_image/neon_mist.jpg";
import waterfall_garden from "../creatives/ai_image/waterfall_garden.jpg";


export default function Roadmap(){
    return(
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
    )
}