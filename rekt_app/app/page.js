"use client";

import React from "react";
import Header from "./components/Header";

import Image from "next/image";
import Banner from "./components/Banner";
import StorySection from "@/app/landingPage/StorySection";
import BuySection from "@/app/landingPage/BuySection";
import Roadmap from "@/app/landingPage/Roadmap";
import Rektnomics from "@/app/landingPage/Rektnomics";
import { MdCopyright, MdLanguage } from "react-icons/md";
import { FaTwitter } from "react-icons/fa";

import penthouse from "./creatives/penthouse.jpeg";
import ambassador from "./creatives/rekt_ceo_ambassador.png";
import pumpfun from "./creatives/socials/pump.png";
import raydium from "./creatives/socials/raydium.png";
import { bannerItems } from "./constants/landingPage";
import { faqData } from "./constants/faqData";

import "./landingPage/styles/intro.css";
import "./landingPage/styles/faq.css";

export default function Page() {
  

  return (
        <div className="App">
          <Header />
          <div className="body">
            <section
              id="welcome"
              style={{ backgroundImage: `url(${penthouse.src})` }}
              className="landing-section"
            >
              <div className="landing-main-div">
                <h1 className="landing-title">$ REKT CEO</h1>
                <ul className="landing-subtitle">
                  <li>🚀 No Insider</li>
                  <li>🎉 No KOL</li>
                  <li>🐶 No Bullshit</li>
                </ul>
                <button style={{ width: "220px" }}>LAUNCHING SOON</button>
              </div>
              <Image
                src={ambassador}
                alt="ambassador"
                className="ambassador-image"
              />
            </section>
            <Banner items={bannerItems} />

            <StorySection />

            <BuySection />

            <Roadmap />

            <Rektnomics />

            <section id="faq" className="faq-section">
              <h1 className="faq-title">FAQ</h1>
              <div className="faq-content-box">
                {faqData.map((data, index) => (
                  <div key={index} className="faq-card">
                    <h1>{data.question}</h1>
                    <p>{data.answer}</p>
                  </div>
                ))}
              </div>
              <div className="link-container">
                <div className="link-icon-box">
                  <MdLanguage size={42} />
                </div>
                <div className="link-icon-box">
                  <FaTwitter size={42} />
                </div>
                <div className="link-icon-box">
                  <Image
                    className="link-icon-image"
                    src={pumpfun}
                    alt="pump fun"
                  />
                </div>
                <div className="link-icon-box">
                  <Image
                    className="link-icon-image"
                    src={raydium}
                    alt="pump fun"
                  />
                </div>
              </div>
              <div className="end-box">
                <p>
                  DISCLAIMER: $CEO is a meme coin created for fun with
                  absolutely no intrinsic value or any expectation of financial
                  return. The token for entertainment purposes only and we take
                  zero responsibility for the value of this token. $CEO is
                  inspired by @MustStopMurad to be the king of meme coins.
                </p>
                <p
                  style={{
                    marginBlock: "2%",
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  2024 <MdCopyright size={16} /> MemesAfterDark. All right
                  reserved.
                </p>
              </div>
            </section>
          </div>
        </div>
  
  );
}
