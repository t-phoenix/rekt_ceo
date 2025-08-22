import React, { useEffect, useState } from "react";
import "./header.css";
import { useLocation, useNavigate } from "react-router-dom";

export default function Navbar({ setShow }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [scrollTarget, setScrollTarget] = useState(null);
  const [activeSection, setActiveSection] = useState("");

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
      const sections = ["story", "buyceo", "roadmap", "pienomics", "faq"];
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

  return (
    <nav className="links-container">
      {/* Links to landing page sections */}

      <div onClick={() => scrollToSection("story")} className={getNavItemClass("story")}>
        STORY
      </div>
      <div onClick={() => scrollToSection("buyceo")} className={getNavItemClass("buyceo")}>
        HOW TO BUY
      </div>
      
      <div
        onClick={() => scrollToSection("pienomics")}
        className={getNavItemClass("pienomics")}
      >
        REKTNOMICS
      </div>

      <div onClick={() => scrollToSection("roadmap")} className={getNavItemClass("roadmap")}>
        ROADMAP
      </div>

      {/* Links to other pages */}
      <div
        className={location.pathname === "/pfp" ? "links-style selected-link" : "links-style"}
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
        className={location.pathname === "/memes" ? "links-style selected-link" : "links-style"}
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
      <div onClick={() => scrollToSection("faq")} className={getNavItemClass("faq")}>
        FAQ
      </div>
    </nav>
  );
}

// className={selectedLink==navlink.link? "selected-link":"links-style"}
// whileHover={{ scale: 1.1 }}
// whileTap={{scale: 0.9}}
