import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import "./styles/intro.css";
import "./styles/faq.css";

import penthouse from "../creatives/penthouse.jpeg";
import ambassador from "../creatives/rekt_ceo_ambassador.png";
import pumpfun from "../creatives/socials/pump.png";
import raydium from "../creatives/socials/raydium.png";
import memedepot from "../creatives/socials/memedepot.png"


import BuySection from "./BuySection";
import StorySection from "./StorySection";

import Roadmap from "./Roadmap";
import Rektnomics from "./Rektnomics";
import Banner from "../components/Banner";
import { faqData } from "../constants/faqData";
import { MdCopyright, MdLanguage, MdMail, MdMailOutline, MdRocketLaunch, MdCelebration } from "react-icons/md";
import { FaTwitter} from "react-icons/fa"
import { FaDog } from "react-icons/fa";


export default function Introduction() {
  const navigate = useNavigate();

  const tweetUrl = "https://x.com/rekt_ceo"
  const pitchDeckLink = "https://gray-quintessential-jellyfish-921.mypinata.cloud/ipfs/bafybeifnvoe54ijactevaz7upynenmdzwngkhwg7qyxkjhnsl3l6i2m5r4"

  const bannerItems = [
    "Rekt $CEO",
    "@rekt_ceo",
    "Join our community.",
    "NO BULLSHIT",
    "#rekt #ceo",
    "Rekt $CEO",
    "@rekt_ceo",
    "Join our community.",
    "NO BULLSHIT",
    "#rekt #ceo",
  ];

  
  


  return (
    <div>
      <section
        id="welcome"
        style={{ backgroundImage: `url(${penthouse})` }}
        className="landing-section"
      >
        <div className="landing-main-div">
          <h1 className="landing-title">REKT $CEO</h1>
          <ul className="landing-subtitle">
            <li><MdRocketLaunch style={{color: "var(--color-red)"}} /> No Insider</li>
            <li><MdCelebration style={{color: "var(--color-yellow)"}} /> No KOL</li>
            <li><FaDog style={{color: "var(--color-blue-primary)"}} /> No Bullshit</li>
          </ul>
          <div style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-around', width: '70%'}}>
            <button style={{ width: "220px" }} onClick={() => window.open(pitchDeckLink, "_blank")}>LAUNCHING SOON</button>
            <button style={{}} onClick={() => window.open(pitchDeckLink, "_blank")}>PITCH DECK</button>
          </div>
        </div>
        <img src={ambassador} alt="ambassador" className="ambassador-image" />
      </section>
      <Banner items={bannerItems} />


      <StorySection />

      <BuySection  />

      <Roadmap />

      <Rektnomics  />

      <section id="faq" className="faq-section">
        <h1 className="faq-title">FAQ</h1>
        <div className="faq-content-box">
            {faqData.map((data)=>(
                <div className="faq-card">
                    <h1>{data.question}</h1>
                    <p>{data.answer}</p>
                </div>
            ))}

        </div>
        <div className="link-container">
            <div className="link-icon-box" onClick={() => window.location.href = `mailto:contact@rektceo.club`}>
                <MdMail size={42}/>
            </div>
            <div className="link-icon-box" onClick={() => window.open(tweetUrl, "_blank")} >
                <FaTwitter  size={42}/>
            </div>
            <div className="link-icon-box">
                <img className="link-icon-image" src={pumpfun} alt="pump fun" />
            </div>
            <div className="link-icon-box">
                <img className="link-icon-image" src={raydium} alt="pump fun" />
            </div>
        </div>
        <div className="end-box">
            <p>DISCLAIMER: $CEO is a meme coin created for fun with absolutely no intrinsic value or any expectation of financial return. The token for entertainment purposes only and we take zero responsibility for the value of this token. $CEO is inspired by @MustStopMurad to be the king of meme coins.</p>
            <p style={{marginBlock: '2%', display:'flex', flexDirection: 'row', alignItems:'center', justifyContent: 'center'}}>2024 <MdCopyright size={16}/> RektCeo. All right reserved.</p>
        </div>
        {/* ,{
          question: "What are official project links ?",
          answer: `Website: https:www.rektceo.club Twitter: @rekt_ceo  Pump.fun: link Raydium: link`
        } */}
        
      </section>

      
    </div>
  );
}
