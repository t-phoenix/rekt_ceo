import React, { useEffect, useState } from "react";
import "./pfp.css";
import ceo from "../creatives/rekt_ceo_ambassador.png";

import { layers } from "../constants/layers";

import rektcoin from "../creatives/pfp/rekt_coin.png";
import { MdDownload, MdShuffle } from "react-icons/md";
import html2canvas from "html2canvas";
import { styles } from "./mobileStyle";

export default function ProfileNFT() {
  const [connected, setConnected] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect screen width or use a user-agent check
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 992); // Adjust breakpoint as needed
    };

    // Initial check
    handleResize();

    // Add event listener for window resize
    window.addEventListener("resize", handleResize);

    // Cleanup event listener on unmount
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
  const limits = [3, 6, 3, 5, 3, 6, 7]; // Maximum random value for each index

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

  const downloadImage = async () => {
    const compositeElement = document.getElementById("composite-container");
    if (compositeElement) {
      const canvas = await html2canvas(compositeElement);
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = "rekt_ceo.png";
      link.click();
    }
  };

  const randomiseLayers = () => {
    const randomized = selectedLayer.map((_, index) =>
      Math.floor(Math.random() * (limits[index] + 1))
    );
    setSelectedLayer(randomized);
  };

  function handleMint() {}

  return (
    <>
      {isMobile ? (
        <div style={styles.overlay}>
          <div style={styles.messageBox}>
            <h1 style={styles.heading}>We're Optimizing for Mobile!</h1>
            <p style={styles.message}>
              This website is currently designed for desktop view only. Please
              switch to a desktop device for the best experience.
            </p>
            <p style={styles.message}>
              We're working on a mobile-friendly version, coming soon!
            </p>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: "10vh", width: "100vw" }}>
          <h1 style={{ marginBlock: "4%" }} className="section-title">
            Mint Your Unique $CEO PFP NFT
          </h1>
          <div className="pfp-box">
            {/* INSTRUCTIONS */}
            <div className="pfp-instructions">
              <h1>Instructions</h1>
              <p className="pfp-instruct-point">Buy some $CEO</p>
              <p className="pfp-instruct-point">Build your PFP</p>
              <p className="pfp-instruct-point">MINT PFP NFT using $CEO</p>
              <p className="pfp-instruct-point">Share on Social Media</p>
              <p className="pfp-instruct-point">Use as your Twitter Profile Picture</p>
            </div>
            {/* PFP LAYER IMAGE */}
            <div className="pfp-image-box">
              <div id="composite-container" className="pfp-image">
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
              <div className="mint-button-box">
                {/* <p>Layers:{selectedLayer}</p> */}
                <div style={{ textAlign: "left", marginLeft: "0%" }}>
                  <p>
                    <strong>Price:</strong> 20,000 $CEO
                  </p>
                  <p>
                    <strong>Supply:</strong> 23/ 999
                  </p>
                </div>
                {connected ? (
                  <button
                    style={{
                      width: "40%",
                      display: "flex",
                      flexDirection: "column",
                    }}
                    onClick={handleMint}
                  >
                    <h3>Mint</h3>{" "}
                    <p style={{ fontSize: "12px" }}>
                      Balance: 284,323,422 $CEO
                    </p>
                  </button>
                ) : (
                  <button onClick={() => setConnected(true)}>
                    Connect Wallet To Mint
                  </button>
                )}
              </div>
            </div>
            {/* PFP OPTIONS */}
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
                    {currentIndex < items.length - 1
                      ? items[currentIndex + 1]
                      : ""}
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
              {/* USE LAYER2 similiar to layer for better view*/}
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

              {/* BUTTONS */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  marginBlock: "8%",
                  justifyContent: "space-evenly",
                }}
              >
                <button onClick={downloadImage}>
                  Download <MdDownload />
                </button>
                <button onClick={randomiseLayers}>
                  Randomise <MdShuffle />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
