import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import "./styles/intro.css";
import "./styles/faq.css";
import HeroAnimation from "./HeroAnimation";
import HowToBuy from "./HowToBuy";
import StorySection from "./StorySection";
// import LaunchSection from "./LaunchSection";
import LaunchStrip from "./LaunchStrip";
import { Pienomics } from "./Pienomics";
import Roadmap from "./Roadmap";
import Banner from "../../components/Banner";
import { faqData } from "../../constants/faqData";
import { MdCopyright, MdMail } from "react-icons/md";
import { FaInstagram, FaTwitter } from "react-icons/fa"
import { SiFarcaster } from "react-icons/si";
import Exchange from "./Exchange";
import { SolanaWalletProvider } from "../../config/SolanaWalletProvider";

const ceo_office = "/assets/media/ceo_office2.jpg";


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
      <Helmet>
        <title>REKT CEO ($CEO) - Be Your Own CEO</title>
        <meta name="description" content="REKT CEO ($CEO) is the best memecoin community on Base L2 and Solana. AI meme generator, NFT PFPs, DAO governance, and a growing global clubhouse." />
        <link rel="canonical" href="https://www.rektceo.club/" />

        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.rektceo.club/" />
        <meta property="og:title" content="REKT CEO ($CEO) - Be Your Own CEO" />
        <meta property="og:description" content="Join the REKT CEO movement — AI meme generator, NFT PFPs, and the best memecoin community on Base L2 and Solana." />
        <meta property="og:image" content="https://www.rektceo.club/rekt.webp" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@rekt_ceo" />
        <meta name="twitter:image" content="https://www.rektceo.club/rekt.webp" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": faqData.map(item => ({
            "@type": "Question",
            "name": item.question,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": item.answer
            }
          }))
        })}</script>
      </Helmet>
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
            <button className="story-btn primary" onClick={(e) => handleButtonClick("/launch", e)}>
              JOIN CAMPAIGN
            </button>
            <button className="story-btn secondary" onClick={(e) => handleButtonClick("/memes", e)}>
              CREATE MEME
            </button>
          </div>
        </div>
      </section>
      <Banner items={bannerItems} />


      <StorySection />

      <LaunchStrip />

      <HowToBuy />

      <Pienomics />

      <Roadmap />

      <SolanaWalletProvider>
        <Exchange />
      </SolanaWalletProvider>

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
          <p style={{ marginBlock: '2%', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>2026 <MdCopyright size={16} /> REKT CEO. All rights reserved.</p>
        </div>

      </section>


    </div>
  );
}
