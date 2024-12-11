import React, { useState } from "react";
import "./pfp.css";
import ceo from "../creatives/rekt_ceo_ambassador.png";

import { layers } from "../constants/layers";

import rektcoin from "../creatives/pfp/rekt_coin.png";

export default function ProfileNFT() {
  const [currentIndex, setCurrentIndex] = useState(1); // Start with the second item as the current
  const items = [
    "Background",
    "Hoodie",
    "Pants",
    "Shoes",
    "Skin",
    "Face",
    "Coin",
  ];

  const [selectedLayer, setSelectedLayer] = useState([0, 0, 0, 0, 0, 0, 0]);

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

  function updateLayer(layerindex) {
    setSelectedLayer((selectedLayer) => {
      const updatedLayer = [...selectedLayer]; // Create a shallow copy of the array
      updatedLayer[currentIndex] = layerindex; // Update the specific index
      return updatedLayer;
    });
    console.log("Updated Layer:", selectedLayer);
  }

  //   const translateX = -currentIndex * 100;

  return (
    <div style={{ marginTop: "10vh", width: "100vw" }}>
      <h1 style={{ marginBlock: "4%" }} className="section-title">
        Mint Your Unique $CEO PFP NFT
      </h1>
      <div className="pfp-box">
        <div className="pfp-instructions">
          <h1>Instructions</h1>
          <p className="pfp-instruct-point">Buy some $CEO</p>
          <p className="pfp-instruct-point">Build your PFP</p>
          <p className="pfp-instruct-point">MINT PFP NFT using $CEO</p>
          <p className="pfp-instruct-point">Share on Social Media</p>
        </div>
        <div className="pfp-image">
          {selectedLayer.slice(0, 4).map((layerelement, index) => (
            <img
              src={layers[index][layerelement]}
              alt="layer pfp"
              className="composite-layer"
            />
          ))}
          <img
            src={rektcoin}
            alt="rektcoin layer"
            className="composite-layer"
          />

          {selectedLayer.slice(4, 9).map((layerelement, index) => (
            <img
              src={layers[index + 4][layerelement]}
              alt="layer pfp"
              className="composite-layer"
            />
          ))}
        </div>
        <div className="pfp-options">
          <h1>Options</h1>

          {/* NAVBAR - PFP OPTIONS */}
          <div className="option-navbar">
            <button
              className="scroll-button"
              onClick={scrollLeft}
              disabled={currentIndex === 0}
            >
              &lt;
            </button>

            <div className="options">
              <div className="option left">
                {currentIndex > 0 ? items[currentIndex - 1] : ""}
              </div>
              <div className="option current">{items[currentIndex]}</div>
              <div className="option right">
                {currentIndex < items.length - 1 ? items[currentIndex + 1] : ""}
              </div>
            </div>

            <button
              className="scroll-button"
              onClick={scrollRight}
              disabled={currentIndex === items.length - 1}
            >
              &gt;
            </button>
          </div>

          {/* PFP IMAGES */}
          <div className="option-layers-box">
            {layers[currentIndex].map((layer, layerindex) => (
              <img
                key={layerindex}
                src={layer}
                alt="layer"
                className={
                  selectedLayer[currentIndex] === layerindex
                    ? "selected-option-layer"
                    : "option-layer"
                }
                onClick={() => updateLayer(layerindex)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
