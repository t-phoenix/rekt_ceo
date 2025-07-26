import React, { useRef, useEffect, useState } from "react";
import "./banner.css";

export default function Banner({ items }) {
  const bannerRef = useRef(null);
  const [animationDuration, setAnimationDuration] = useState(30);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (bannerRef.current && items.length > 0) {
      // Small delay to ensure DOM is fully rendered
      const timer = setTimeout(() => {
        const contentWidth = bannerRef.current.scrollWidth / 2; // Divide by 2 since content is duplicated
        const speed = 50; // pixels per second - adjust for desired speed
        const duration = contentWidth / speed;
        
        setAnimationDuration(Math.max(duration, 10)); // Minimum 10s duration
        setIsReady(true);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [items]);

  // Reset animation when items change
  useEffect(() => {
    setIsReady(false);
  }, [items]);

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className="banner-container">
      <div
        className={`banner-content ${isReady ? 'banner-animate' : ''}`}
        style={{
          animationDuration: `${animationDuration}s`,
        }}
        ref={bannerRef}
      >
        {/* First set of items */}
        {items.map((item, index) => (
          <span className="banner-item" key={`first-${index}`}>
            {item}
          </span>
        ))}
        {/* Duplicate set for seamless loop */}
        {items.map((item, index) => (
          <span className="banner-item" key={`second-${index}`}>
            {item}
          </span>
        ))}
        {/* Triple set for extra smoothness */}
        {items.map((item, index) => (
          <span className="banner-item" key={`third-${index}`}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
};
