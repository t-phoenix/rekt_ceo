import React, { useEffect, useState, useCallback } from "react";
import "./pfp.css";
import "../landingpage/styles/story.css";
import InteractiveGlow from "../components/InteractiveGlow.js";
import StickerCard from "./page_components/StickerCard.js";
import { MdDownload, MdShuffle } from "react-icons/md";
import SocialShareFooter from "./page_components/SocialShareFooter.js";

import LayerImage from "./page_components/LayerImage";
import LayerNavbar from "./page_components/LayerNavbar";
import LayerOptions from "./page_components/LayerOptions";

import { downloadImage } from "../services/PfpHelpers";
import sharingService from "../services/SharingService.js";

export default function ProfileNFT() {
  // const [imageUri, setImageUri] = useState("");
  // const [metadataJSON, setMetadataJSON] = useState("");
  // const [metadataURI, setMetadataURI] = useState("");

  const [screenWidth, setScreenWidth] = useState(window.innerWidth);

  const [currentIndex, setCurrentIndex] = useState(1); // Start with the second item as the current

  const [selectedLayer, setSelectedLayer] = useState([0, 0, 0, 0, 0, 0, 0, 0]); // BG/ Hoodie / Pants / Shoes/ Skin / Face / Jewellery / Coin
  const limits = [6, 3, 4, 5, 4, 4, 3, 7]; // Maximum random value for each index



  const randomiseLayers = () => {
    const randomized = selectedLayer.map((_, index) =>
      Math.floor(Math.random() * (limits[index] + 1))
    );
    console.log(randomized);
    setSelectedLayer(randomized);
  };

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    randomiseLayers();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const showToast = useCallback((message) => {
    // Simple toast implementation
    const toast = document.createElement("div");
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #333;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 1000;
      animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = "slideOut 0.3s ease";
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  }, []);

  // Initialize sharing service with toast function
  useEffect(() => {
    sharingService.setToastFunction(showToast);
  }, [showToast]);

  function handleMint() { }

  const handleSocialShare = async (platform) => {
    await sharingService.handleSocialShare(platform, {
      elementId: 'composite-container',
      shareText: 'Check out my Rekt CEO PFP NFT!',
      fileName: 'rekt-ceo-pfp'
    });
  };



  // LEGACY CODE: SOLANA
  // async function uploadMetadata() {
  //   const compositeElement = document.getElementById("composite-container");

  //   const canvas = await html2canvas(compositeElement);
  //   const image = canvas.toDataURL("image/png");

  //   const file = dataURLtoFile(image, `Rekt Ceo.png`);

  //   let attribute_list = [
  //     { "trait_type": "Background", "value": `${layerNames[0][selectedLayer[0]]}` },
  //     { "trait_type": "Hoodie", "value": `${layerNames[1][selectedLayer[1]]}` },
  //     { "trait_type": "Pants", "value": `${layerNames[2][selectedLayer[2]]}` },
  //     { "trait_type": "Shoes", "value": `${layerNames[3][selectedLayer[3]]}` },
  //     { "trait_type": "Rekt Coin", "value": "rekt_coin" },
  //     { "trait_type": "Skin", "value": `${layerNames[4][selectedLayer[4]]}` },
  //     { "trait_type": "Face", "value": `${layerNames[5][selectedLayer[5]]}` },
  //     { "trait_type": "Coin", "value": `${layerNames[6][selectedLayer[6]]}` }
  //   ]

  //   const formData = new FormData();
  //   formData.append('image', file);
  //   formData.append('attributes', JSON.stringify(attribute_list)); // Add attribute list as JSON string


  //   fetch(`http://localhost:3001/uploadImageAndMetadata`, {
  //     method: "POST",
  //     body: formData
  //   })    
  //     .then((response) => {
  //       if (response.ok) {
  //         return response.json();
  //       } else {
  //         throw new Error("File upload failed");
  //       }
  //     })
  //     .then((data) => {
  //       console.log("Server response:", data);
  //     })
  //     .catch((error) => {
  //       console.error("Error uploading file:", error);
  //     });

  // }


  // Show responsive message for small screens to match site theme
  if (screenWidth < 900) {
    return (
      <div className="responsive-message-container">
        <div className="responsive-message-card">
          <div className="responsive-message-icon">💼</div>
          <h1 className="responsive-message-title">CEO of Responsiveness</h1>
          <p className="responsive-message-subtitle">
            This PFP builder is best experienced on desktop. Were brewing a mobile-friendly version.
          </p>
          <div className="responsive-message-requirements">
            <div className="requirement-item">
              <span className="requirement-icon">📱</span>
              <span>Current: {screenWidth}px</span>
            </div>
            <div className="requirement-item">
              <span className="requirement-icon">💻</span>
              <span>Required: 1200px+</span>
            </div>
          </div>
          <p className="responsive-message-footer">
            Switch to a larger screen to mint your ultimate REKT CEO PFP.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pfp-gen-container">
      <InteractiveGlow />
      <main className="pfp-gen-main">
        <header className="pfp-gen-header">
          {/* <h1 className="pfp-gen-title">Mint Your Unique $CEO PFP NFT</h1> */}
        </header>

        <section className="pfp-gen-grid">
          {/* Left Column: Info & CTA */}
          <div className="pfp-left-column">
            <div className="pfp-mint-card">
              <div className="pfp-mint-header">
                <h3 className="pfp-mint-title">REKT CEO PFP COLLECTION</h3>
              </div>
              <div className="pfp-mint-content">
                <div className="pfp-mint-grid">
                  <div className="pfp-mint-item">
                    <div className="pfp-mint-label">Price (CEO)</div>
                    <div className="pfp-mint-value">Priceless</div>
                  </div>
                  <div className="pfp-mint-item">
                    <div className="pfp-mint-label">Supply</div>
                    <div className="pfp-mint-value">-- / 999 only</div>
                  </div>
                  <div className="pfp-mint-item">
                    <div className="pfp-mint-label">Your balance (CEO)</div>
                    <div className="pfp-mint-value">--</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticker Section */}
            <StickerCard
              onAddSticker={(sticker) => {
                // Handle sticker addition for PFP (placeholder for now)
                console.log("Sticker added:", sticker);
              }}
              onRemoveAllStickers={() => {
                // Handle sticker removal for PFP (placeholder for now)
                console.log("All stickers removed");
              }}
            />

            <div className="pfp-subtitle-card">
              <div className="pfp-subtitle-content">
                <p className="pfp-gen-subtitle-mint">
                  Build your flex. Mint your identity. Become the CEO of your timeline.
                </p>
              </div>
            </div>
          </div>

          {/* Center Column: Preview */}
          <div className="pfp-canvas-card">
            <div className="pfp-canvas-header">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 className="pfp-canvas-title">PFP Preview</h3>
                <div className="pfp-canvas-actions">
                  {/* <button onClick={downloadImage} className="story-btn primary">
                    <span style={{ marginRight: 6 }}>Download</span> <MdDownload />
                  </button> */}
                  <button onClick={randomiseLayers} className="story-btn secondary">
                    <span style={{ marginRight: 6 }}>Randomise</span> <MdShuffle />
                  </button>
                </div>
              </div>
            </div>
            <div className="pfp-canvas-content">
              <div className="pfp-canvas-stage has-image">
                <LayerImage selectedLayer={selectedLayer} />
              </div>
            </div>

            {/* Social Share Footer */}
            <SocialShareFooter onSocialShare={handleSocialShare} />

          </div>

          {/* Right Column: Controls */}
          <div className="pfp-controls-card">
            <div className="pfp-controls-header">
              <h3 className="pfp-controls-title">Options</h3>
            </div>
            <div className="pfp-controls-content">

              <div className="pfp-control-group">
                <LayerNavbar currentIndex={currentIndex} setCurrentIndex={setCurrentIndex} />
              </div>
              <div className="pfp-control-group">
                <LayerOptions
                  currentIndex={currentIndex}
                  selectedLayer={selectedLayer}
                  setSelectedLayer={setSelectedLayer}
                />
              </div>


              <div className="pfp-ready-card" style={{ marginTop: "0.6rem" }}>
                <div className="pfp-ready-header">
                  <h3 className="pfp-ready-title">Ready?</h3>
                </div>
                <div className="pfp-ready-content">
                  <p className="pfp-ready-text">Mint your PFP NFT using $CEO. Coming soon.</p>
                  <button onClick={handleMint} className="story-btn secondary" style={{ width: "100%" }}>
                    Mint NFT (Soon)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
