import React from "react";
import { useNavigate } from "react-router-dom";
import "./intro.css";
import "./story.css";
import ceo_office from "../creatives/ceo_office.jpg";


export default function StorySection(){
    return(
        <section className="story-section">
        <h1 className="section-title">STORY</h1>
        <div className="story-box">
          <img src={ceo_office} alt="story" className="image-div" />
          <div className="story-div">
            <h1 className="story-content-size" style={{ textAlign: "left" }}>
              I was a meme guy once.
              <br />
              I spent hours scrolling through crypto Twitter and Discord,
              laughing at jokes that hit too close to home.
              <br />
              Like every other degen, I aped into meme coins hyped by
              influencers, hoping to turn my crumbs into millions. Guess what?
              The market turned, and my bags? Worth less than gas fees to sell.
              <br />
              I was rekt.
              <br />
              But I wasn’t done. I doubled down, learned the game, and stopped
              chasing every moonshot. I found projects with purpose, a strong
              community, and real vibes. Slowly but surely, my memes turned into
              dreams. Now, I’m not just holding bags—I’m holding the future. A
              community that laughs, learns, and grows together. Because let’s
              face it:
            </h1>
            <br />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "start",
              }}
            >
              <h1 className="story-content-size">
                ✅ We’re all here to make money
              </h1>
              <h1 className="story-content-size">
                ✅ We’re all here to have fun
              </h1>
              <h1 className="story-content-size">
                ✅ We’re all here to belong
              </h1>
            </div>
            <br />
            <h1 className="story-content-size" style={{ textAlign: "left" }}>
              A decentralized community where we stick together, innovate, and
              turn cool ideas into reality. We’ve all been rekt at some
              point—don’t let it define you. Trust your gut, back yourself, and
              enjoy the ride.
            </h1>
            <button style={{ marginTop: "6%"}}>CREATE YOUR PFP </button>
          </div>
        </div>
      </section>
    )
}