import React, { useEffect, useState } from "react";
import "./header.css";
import { useLocation, useNavigate } from "react-router-dom";

export default function Navbar({ setShow }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [scrollTarget, setScrollTarget] = useState(null);

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

  return (
    <nav className="links-container">
      {/* Links to landing page sections */}

      <div onClick={() => scrollToSection("story")} className="links-style">
        STORY
      </div>
      <div onClick={() => scrollToSection("buyceo")} className="links-style">
        HOW TO BUY
      </div>
      <div onClick={() => scrollToSection("roadmap")} className="links-style">
        ROADMAP
      </div>
      <div
        onClick={() => scrollToSection("rektnomics")}
        className="links-style"
      >
        REKTNOMICS
      </div>

      {/* Links to other pages */}
      <div
        className="links-style"
        onClick={() => {
          navigate("/pfp");
        }}
      >
        PFP
      </div>
      <div
        onClick={() => {
          navigate("/memes");
        }}
        className="links-style"
      >
        MEMES
      </div>
      {/* <div
        onClick={() => {
          navigate("/chat");
        }}
        className="links-style"
      >
        CHAT
      </div> */}

      {/* Link to Landing Page Section */}
      <div onClick={() => scrollToSection("faq")} className="links-style">
        FAQ
      </div>
    </nav>
  );
}

// className={selectedLink==navlink.link? "selected-link":"links-style"}
// whileHover={{ scale: 1.1 }}
// whileTap={{scale: 0.9}}
