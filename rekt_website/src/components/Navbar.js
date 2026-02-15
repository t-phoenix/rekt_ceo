import React, { useEffect, useState } from "react";
import "./header.css";
import { useLocation, useNavigate } from "react-router-dom";
import { useMediaQuery } from "react-responsive";
import pumpFunLogo from "../creatives/crypto/pump_fun.png";
import baseLogo from "../creatives/crypto/base.png";
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { useAccount } from 'wagmi';
import WalletDropdown from './WalletDropdown';

export default function Navbar({ setShow }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isTab = useMediaQuery({ maxWidth: "992px" });

  const [scrollTarget, setScrollTarget] = useState(null);
  const [activeSection, setActiveSection] = useState("");
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);

  // WalletConnect hooks
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();

  // Function to truncate wallet address
  const truncateAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Handle wallet button click
  const handleWalletClick = () => {
    if (!isConnected) {
      open();
    }
    // If connected, dropdown handles disconnect
  };


  // Effect to handle scrolling after navigation
  useEffect(() => {
    if (scrollTarget && location.pathname === "/") {
      const section = document.getElementById(scrollTarget);
      if (section) {
        section.scrollIntoView({ behavior: "smooth" });
      }
      // Reset scroll target after scrolling
      setScrollTarget(null);
    }
  }, [scrollTarget, location]);

  // Effect to handle scroll spy functionality
  useEffect(() => {
    if (location.pathname !== "/") {
      setActiveSection("");
      return;
    }

    const handleScroll = () => {
      const sections = ["story", "launch", "buyceo", "roadmap", "pienomics", "exchange", "faq"];
      const scrollPosition = window.scrollY + window.innerHeight / 3;

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = document.getElementById(sections[i]);
        if (section) {
          const sectionTop = section.offsetTop;
          const sectionHeight = section.offsetHeight;

          if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            setActiveSection(sections[i]);
            break;
          }
        }
      }
    };

    // Initial check
    handleScroll();

    // Add scroll listener
    window.addEventListener("scroll", handleScroll);

    // Cleanup
    return () => window.removeEventListener("scroll", handleScroll);
  }, [location.pathname]);

  // Function to handle smooth scrolling
  const scrollToSection = (sectionId) => {
    if (location.pathname !== "/") {
      setScrollTarget(sectionId);
      navigate("/");
    } else {
      const section = document.getElementById(sectionId);
      if (section) {
        section.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  // Function to get the appropriate CSS class for nav items
  const getNavItemClass = (sectionId) => {
    if (location.pathname === "/" && activeSection === sectionId) {
      return "links-style selected-link";
    }
    return "links-style";
  };

  const [isRektInfoOpen, setIsRektInfoOpen] = useState(false);

  return (
    <nav className="links-container">
      {/* Links to landing page sections */}

      {!isTab ? (
        <div className="nav-item-wrapper dropdown-wrapper"
          onMouseEnter={() => setIsRektInfoOpen(true)}
          onMouseLeave={() => setIsRektInfoOpen(false)}>
          <div className={location.pathname === "/" ? "links-style selected-link" : "links-style"}>
            REKT-INFO
          </div>

          {isRektInfoOpen && (
            <div className={`rekt-info-dropdown show`}>
              <div onClick={() => { scrollToSection("story"); }} className={getNavItemClass("story")}>
                STORY
              </div>
              <div onClick={() => { scrollToSection("launch"); }} className={getNavItemClass("launch")}>
                LAUNCH MECH
              </div>
              <div onClick={() => { scrollToSection("buyceo"); }} className={getNavItemClass("buyceo")}>
                HOW TO BUY
              </div>
              <div
                onClick={() => { scrollToSection("pienomics"); }}
                className={getNavItemClass("pienomics")}
              >
                REKTNOMICS
              </div>
              <div onClick={() => { scrollToSection("roadmap"); }} className={getNavItemClass("roadmap")}>
                ROADMAP
              </div>
              <div onClick={() => { scrollToSection("exchange"); }} className={getNavItemClass("exchange")}>
                BUY $CEO <img src={pumpFunLogo} alt="pump.fun" style={{ height: '20px', marginLeft: '8px', verticalAlign: 'middle' }} />
              </div>
              <div onClick={() => { scrollToSection("faq"); }} className={getNavItemClass("faq")}>
                FAQ
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <div onClick={() => { scrollToSection("story"); setShow(false); }} className={getNavItemClass("story")}>
            STORY
          </div>
          <div onClick={() => { scrollToSection("launch"); setShow(false); }} className={getNavItemClass("launch")}>
            LAUNCH MECH
          </div>
          <div onClick={() => { scrollToSection("buyceo"); setShow(false); }} className={getNavItemClass("buyceo")}>
            HOW TO BUY
          </div>
          <div
            onClick={() => { scrollToSection("pienomics"); setShow(false); }}
            className={getNavItemClass("pienomics")}
          >
            REKTNOMICS
          </div>
          <div onClick={() => { scrollToSection("roadmap"); setShow(false); }} className={getNavItemClass("roadmap")}>
            ROADMAP
          </div>
          <div onClick={() => { scrollToSection("exchange"); setShow(false); }} className={getNavItemClass("exchange")}>
            BUY $CEO <img src={pumpFunLogo} alt="pump.fun" style={{ height: '20px', marginLeft: '8px', verticalAlign: 'middle' }} />
          </div>
          <div onClick={() => { scrollToSection("faq"); setShow(false); }} className={getNavItemClass("faq")}>
            FAQ
          </div>
        </>
      )}

      <div
        className={location.pathname === "/buy-ceo" ? "links-style selected-link" : "links-style"}
        onClick={() => {
          navigate("/buy-ceo");
          isTab && setShow(false);
        }}
      >
        BUY $CEO <img src={baseLogo} alt="base" style={{ height: '20px', marginLeft: '8px', verticalAlign: 'middle', borderRadius: '10%' }} />
      </div>

      {/* Links to other pages */}
      <div
        className={location.pathname === "/pfp" ? "links-style selected-link" : "links-style"}
        onClick={() => {
          navigate("/pfp");
          isTab && setShow(false);
        }}
      >
        PFP
      </div>
      <div
        onClick={() => {
          navigate("/memes");
          isTab && setShow(false);
        }}
        className={location.pathname === "/memes" ? "links-style selected-link" : "links-style"}
      >
        MEMES
      </div>

      <div
        onClick={() => {
          navigate("/blueprint");
          isTab && setShow(false);
        }}
        className={location.pathname === "/blueprint" ? "links-style selected-link" : "links-style"}
      >
        THE BLUEPRINT
      </div>

      <div
        className="connect-wallet-container"
        onMouseEnter={() => isConnected && setShowWalletDropdown(true)}
        onMouseLeave={() => setShowWalletDropdown(false)}
      >
        <button
          className={`connect-wallet-btn ${isConnected ? 'connected' : ''}`}
          onClick={handleWalletClick}
        >
          {isConnected ? (
            <div className="wallet-btn-content">
              <span>{truncateAddress(address)}</span>
            </div>
          ) : (
            'CONNECT WALLET'
          )}
        </button>

        {isConnected && showWalletDropdown && (
          <WalletDropdown onClose={() => setShowWalletDropdown(false)} />
        )}
      </div>
    </nav>
  );
}

// className={selectedLink==navlink.link? "selected-link":"links-style"}
// whileHover={{ scale: 1.1 }}
// whileTap={{scale: 0.9}}
