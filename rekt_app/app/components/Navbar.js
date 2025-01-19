"use client";
import React, { useEffect, useState } from "react";
import "./header.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";

export default function Navbar({ setShow }) {
  const router = useRouter();
  const pathName = usePathname();

  const [scrollTarget, setScrollTarget] = useState(null);

  // Effect to handle scrolling after navigation
  useEffect(() => {
    if (scrollTarget && pathName === "/") {
      const section = document.getElementById(scrollTarget);
      if (section) {
        section.scrollIntoView({ behavior: "smooth" });
      }
      // Reset scroll target after scrolling
      setScrollTarget(null);
    }
  }, [scrollTarget, pathName]);

  // Function to handle smooth scrolling
  const scrollToSection = (sectionId) => {
    if (pathName !== "/") {
      setScrollTarget(sectionId);
      router.push("/");
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
      <Link href={"ProfileNFT"} className="links-style" style={{ textDecoration: "none" }}>
         PFP
      </Link>

      <Link href={"Memes"} className="links-style" style={{ textDecoration: "none" }}>
        MEMES
      </Link>
      <div className="links-style">
        <Link href={"Admin"} style={{ textDecoration: "none" }}>
          Admin
        </Link>
      </div>

      {/* Link to Landing Page Section */}
      <div onClick={() => scrollToSection("faq")} className="links-style">
        FAQ
      </div>
    </nav>
  );
}
