import React from "react";
import { useNavigate } from "react-router-dom";
import "./styles/intro.css";
import "./styles/faq.css";

import penthouse from "../creatives/penthouse.jpeg";
import ceo_office from "../creatives/ceo_office2.jpg";
import ambassador from "../creatives/rekt_ceo_ambassador.png";
import pumpfun from "../creatives/socials/pump.png";
import raydium from "../creatives/socials/raydium.png";


import BuySection from "./BuySection";
import StorySection from "./StorySection";
import { Pienomics } from "./Pienomics";
import Roadmap from "./Roadmap";
import Banner from "../components/Banner";
import { faqData } from "../constants/faqData";
import { MdCopyright, MdMail, MdRocketLaunch, MdCelebration } from "react-icons/md";
import { FaTwitter} from "react-icons/fa"
import { FaDog } from "react-icons/fa";
import Exchange from "./Exchange";


export default function Introduction() {
  const navigate = useNavigate();

  const tweetUrl = "https://x.com/rekt_ceo"
  // const pitchDeckLink = "https://gray-quintessential-jellyfish-921.mypinata.cloud/ipfs/bafybeifnvoe54ijactevaz7upynenmdzwngkhwg7qyxkjhnsl3l6i2m5r4"

  const handleButtonClick = (route, event) => {
    // Add click animation class
    const button = event.target;
    button.classList.add('clicked');
    
    // Remove the class after animation completes
    setTimeout(() => {
      button.classList.remove('clicked');
      navigate(route);
    }, 500);
  };

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
          <h1 className="landing-title">REKT <span className="dollar-gradient">$</span>CEO</h1>
          <ul className="landing-subtitle">
            <li style={{display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4px'}}><MdRocketLaunch style={{color: "var(--color-purple)"}} size={32} /> No Insider</li>
            <li style={{display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4px'}}><MdCelebration style={{color: "var(--color-yellow)"}} size={32} /> No KOL</li>
            <li style={{display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4px'}}><FaDog style={{color: "var(--color-blue-primary)"}} size={32} /> No Bullshit</li>
          </ul>
          <div className="story-buttons">
              <button className="story-btn primary" onClick={(e) => handleButtonClick("/pfp", e)}>
                  LAUNCHING SOON
              </button>
              <button className="story-btn secondary" onClick={(e) => handleButtonClick("/memes", e)}>
                  CREATE MEME
              </button>
          </div>
        </div>
        <img src={ambassador} alt="ambassador" className="ambassador-image" />
      </section>
      <Banner items={bannerItems} />


      <StorySection />

      <BuySection  />

      <Pienomics />

      <Roadmap />

      <Exchange />

      <section id="faq" className="faq-section" style={{ backgroundImage: `url(${ceo_office})` }}>
        <div className="faq-overlay"></div>
        <h1 className="section-title" style={{color: 'var(--color-yellow)'}}>FAQ</h1>
        <div className="faq-content-box">
            {faqData.map((data, index) => (
                <div key={index} className="faq-card" data-aos="fade-up" data-aos-delay={index * 100}>
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
            <div className="link-icon-box" onClick={() => window.open("https://pump.fun", "_blank")}>
                <img className="link-icon-image" src={pumpfun} alt="pump fun" />
            </div>
            <div className="link-icon-box" onClick={() => window.open("https://raydium.io", "_blank")}>
                <img className="link-icon-image" src={raydium} alt="raydium" />
            </div>
        </div>
        <div className="end-box">
            <p>DISCLAIMER: $CEO is a meme coin created for fun with absolutely no intrinsic value or any expectation of financial return. The token for entertainment purposes only and we take zero responsibility for the value of this token. $CEO is inspired by @MustStopMurad to be the king of meme coins.</p>
            <p style={{marginBlock: '2%', display:'flex', flexDirection: 'row', alignItems:'center', justifyContent: 'center'}}>2024 <MdCopyright size={16}/> RektCeo. All right reserved.</p>
        </div>
        
      </section>

      
    </div>
  );
}
