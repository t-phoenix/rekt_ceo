import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useSpring } from "framer-motion";
import Icon from "react-crypto-icons";
import rektLogo from "../creatives/Rekt_logo_illustration.png";
import "./customCursor.css";

const isInteractiveElement = (element) => {
  if (!element) return false;
  const tagName = element.tagName?.toLowerCase();
  if (
    tagName === "a" ||
    tagName === "button" ||
    tagName === "input" ||
    tagName === "select" ||
    tagName === "textarea"
  ) {
    return true;
  }
  const role = element.getAttribute?.("role");
  if (role && ["button", "link", "tab", "switch"].includes(role)) return true;
  if (element.closest?.("[data-cursor='hover']")) return true;
  return false;
};

function CustomCursor() {
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Use memo to avoid recreating springs on re-render
  const x = useSpring(0, { stiffness: 300, damping: 40, mass: 0.6 });
  const y = useSpring(0, { stiffness: 300, damping: 40, mass: 0.6 });
  const scale = useSpring(1, { stiffness: 400, damping: 30, mass: 0.5 });
  const opacity = useSpring(0, { stiffness: 200, damping: 25, mass: 0.6 });

  const size = 40; // outer ring size (px)
  const centerOffset = -size / 10;
  const lastPointerEvent = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    setIsCoarsePointer(coarse);

    if (coarse) {
      return; // Disable follower on coarse pointers (mobile/touch)
    }

    const handlePointerMove = (event) => {
      lastPointerEvent.current = { x: event.clientX, y: event.clientY };
      x.set(event.clientX - centerOffset);
      y.set(event.clientY - centerOffset);
      if (!isVisible) {
        setIsVisible(true);
        opacity.set(1);
      }
    };

    // Removed hover handlers to keep cursor simple

    // Removed click handlers to keep cursor constant

    const handleMouseLeave = () => {
      opacity.set(0);
      setIsVisible(false);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("blur", handleMouseLeave);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("blur", handleMouseLeave);
    };
  }, [centerOffset, isVisible, opacity, scale, x, y]);

  // Small hint on touch devices: subtle branded dot that auto-hides
  const [showHint, setShowHint] = useState(false);
  useEffect(() => {
    if (isCoarsePointer) {
      setShowHint(true);
      const t = setTimeout(() => setShowHint(false), 2000);
      return () => clearTimeout(t);
    }
  }, [isCoarsePointer]);

  if (isCoarsePointer) {
    return showHint ? (
      <div className="cursor-hint" aria-hidden>
        <img src={rektLogo} alt="REKT CEO" className="hint-logo-img" />
      </div>
    ) : null;
  }

  return (
    <motion.div
      className="cursor-follower"
      style={{ x, y, scale, opacity }}
      aria-hidden
    >
      {/* REKT CEO logo with gradient styling */}
      <div className="cursor-rekt-logo">
        <img src={rektLogo} alt="REKT CEO" className="rekt-logo-img" />
      </div>
    </motion.div>
  );
}

export default CustomCursor;

