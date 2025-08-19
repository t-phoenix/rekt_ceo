import React from "react";
import { items } from "../../constants/layers";
import "../pfp.css";
import "../../landingpage/styles/story.css";


export default function LayerNavbar({currentIndex, setCurrentIndex}){

    const scrollLeft = () => {
        if (currentIndex > 0) {
          setCurrentIndex((prevIndex) => prevIndex - 1);
        }
      };
    
      const scrollRight = () => {
        if (currentIndex < items.length - 1) {
          setCurrentIndex((prevIndex) => prevIndex + 1);
        }
      };

    return (
    <div className="option-navbar">
        <button
          className="scroll-button story-btn primary"
          onClick={scrollLeft}
          disabled={currentIndex === 0}
        >
          &lt;
        </button>

        <div className="options">
          <div className="option left">
            {currentIndex > 0 ? items[currentIndex - 1] : ""}
          </div>
          <div className="option current">
            {items[currentIndex]}
          </div>
          <div className="option right">
            {currentIndex < items.length - 1
              ? items[currentIndex + 1]
              : ""}
          </div>
        </div>

        <button
          className="scroll-button story-btn primary"
          onClick={scrollRight}
          disabled={currentIndex === items.length - 1}
        >
          &gt;
        </button>
      </div>)
}