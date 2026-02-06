import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./styles/intro.css";
import "./styles/faq.css";

import ceo_office from "../../creatives/ceo_office2.jpg";
import HeroAnimation from "./HeroAnimation";
import HowToBuy from "./HowToBuy";
import StorySection from "./StorySection";
import LaunchSection from "./LaunchSection";
import { Pienomics } from "./Pienomics";
import Roadmap from "./Roadmap";
import Banner from "../../components/Banner";
import { faqData } from "../../constants/faqData";
import { MdCopyright, MdMail } from "react-icons/md";
import { FaInstagram, FaTwitter } from "react-icons/fa"
import { SiFarcaster } from "react-icons/si";
import Exchange from "./Exchange";


export default function Introduction() {
  const navigate = useNavigate();
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);

  const xrektceoUrl = "https://x.com/rekt_ceo"
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

  // Text splitting function
  const splitText = (text) => {
    return text.split('').map((char, index) => (
      <span key={index} className="text-split-char">
        {char === ' ' ? '\u00A0' : char}
      </span>
    ));
  };

  useEffect(() => {
    // Text splitting is handled by CSS animations
    // This effect can be used for additional animations if needed
  }, []);

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
        className="landing-section"
      >
        <HeroAnimation />
        <div className="landing-main-div">
          <h1 ref={titleRef} className="landing-title text-split-container">
            {splitText('REKT ')}
            <span className="dollar-gradient text-split-container">{splitText('$')}</span>
            <span className="ceo-text text-split-container">{splitText('CEO')}</span>
          </h1>
          <p ref={subtitleRef} className="landing-subtitle-animated text-split-container">
            {splitText('A Memecoin Movement')}
          </p>
          <div className="story-buttons">
            <button className="story-btn primary" onClick={(e) => handleButtonClick("/pfp", e)}>
              LAUNCHING SOON
            </button>
            <button className="story-btn secondary" onClick={(e) => handleButtonClick("/memes", e)}>
              CREATE MEME
            </button>
          </div>
        </div>
      </section>
      <Banner items={bannerItems} />


      <StorySection />

      <LaunchSection />

      <HowToBuy />

      <Pienomics />

      <Roadmap />

      <Exchange />

      <section id="faq" className="faq-section" style={{ backgroundImage: `url(${ceo_office})` }}>
        <div className="faq-overlay"></div>
        <h1 className="section-title" style={{ color: 'var(--color-yellow)' }}>FAQ</h1>
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
            <MdMail size={42} />
          </div>
          <div className="link-icon-box" onClick={() => window.open(xrektceoUrl, "_blank")} >
            <FaTwitter size={42} />
          </div>
          <div className="link-icon-box" onClick={() => window.open("https://www.instagram.com/rektceo", "_blank")}>
            <FaInstagram size={42} />
          </div>
          <div className="link-icon-box" onClick={() => window.open("https://farcaster.xyz/rekt-ceo", "_blank")} >
            <SiFarcaster size={42} />
          </div>
          {/* <div className="link-icon-box" onClick={() => window.open("https://0xppl.com/rekt_ceo", "_blank")}>
              <img src={zeroXpl} alt="0xppl/" style={{width: '42px', height: '40px'}} />
            </div> */}
          {/* <div className="link-icon-box" onClick={() => window.open("https://pump.fun", "_blank")}>
                <img className="link-icon-image" src={pumpfun} alt="pump fun" />
            </div>
            <div className="link-icon-box" onClick={() => window.open("https://raydium.io", "_blank")}>
                <img className="link-icon-image" src={raydium} alt="raydium" />
            </div> */}
        </div>
        <div className="end-box">
          <p>DISCLAIMER: $CEO is a meme coin created for fun with absolutely no intrinsic value or any expectation of financial return. The token for entertainment purposes only and we take zero responsibility for the value of this token. $CEO is inspired by @MustStopMurad to be the king of meme coins.</p>
          <p style={{ marginBlock: '2%', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>2024 <MdCopyright size={16} /> RektCeo. All right reserved.</p>
        </div>

      </section>


    </div>
  );
}
