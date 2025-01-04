import React, { useRef, useEffect, useState } from "react";
import "./banner.css";


export default function Banner ({ items }) {
  const bannerRef = useRef(null);
  const [scrollWidth, setScrollWidth] = useState(0);

  useEffect(() => {
    if (bannerRef.current) {
      const contentWidth = bannerRef.current.scrollWidth;
      setScrollWidth(contentWidth);
    }
  }, [items]);

  return (
    <div className="banner-container">
      <div
        className="banner-content"
        style={{
          width: `${scrollWidth * 2}px`, // Duplicate width for seamless scrolling
        }}
        ref={bannerRef}
      >
        {items.map((item, index) => (
          <span className="banner-item" key={index}>
            {item}
          </span>
        ))}
        {items.map((item, index) => (
          <span className="banner-item" key={`duplicate-${index}`}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
};
