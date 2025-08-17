import React, { useEffect } from "react";

/*****
 * InteractiveGlow
 * Subtle radial glow that follows the cursor, using design-system tokens.
 *****/
function InteractiveGlow () {
  useEffect(() => {
    const handler = (e) => {
      document.documentElement.style.setProperty("--pointer-x", `${e.clientX}px`);
      document.documentElement.style.setProperty("--pointer-y", `${e.clientY}px`);
    };
    window.addEventListener("pointermove", handler);
    return () => window.removeEventListener("pointermove", handler);
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        background:
          "radial-gradient(600px circle at var(--pointer-x, 50%) var(--pointer-y, 50%), rgba(216, 30, 91, 0.12), transparent 60%)",
      }}
    />
  );
}

export default InteractiveGlow; 