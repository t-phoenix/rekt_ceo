import React, { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import "./meme.css";
import { memeTemplates } from "../constants/memeData";
import sharingService from "../services/SharingService";

import { FaTwitter } from "react-icons/fa";
import { MdDownload } from "react-icons/md";
import { styles } from "./mobileStyle";

export default function Meme() {
  const [selectedTemplate, setSelectedTemplate] = useState(
    memeTemplates[0].src
  );
  const [text1, setText1] = useState("Top Text");
  const [text2, setText2] = useState("Bottom Text");
  const [textColor, setTextColor] = useState("#000");

  const colorOptions = ["#000", "#fff", "#e7255e", "#fcd25a"];

  const memeCanvasRef = useRef(null);
  const text1Ref = useRef(null);
  const text2Ref = useRef(null);

  const [isMobile, setIsMobile] = useState(false);

  // Toast notification function
  const showToast = (message) => {
    const toast = document.createElement("div");
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #333;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      z-index: 10000;
      font-size: 16px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 3000);
  };

  // Initialize sharing service with toast
  useEffect(() => {
    sharingService.setToastFunction(showToast);
  }, []);

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

  const dragText = (e, ref) => {
    e.preventDefault();
    e.stopPropagation();

    const canvasRect = memeCanvasRef.current.getBoundingClientRect();
    const textRect = ref.current.getBoundingClientRect();

    const offsetX = e.clientX - textRect.left;
    const offsetY = e.clientY - textRect.top;

    const moveAt = (pageX, pageY) => {
      const newLeft = pageX - canvasRect.left - offsetX;
      const newTop = pageY - canvasRect.top - offsetY;

      // Clamp the text position within the canvas
      const clampedLeft = Math.max(
        0,
        Math.min(canvasRect.width - textRect.width, newLeft)
      );
      const clampedTop = Math.max(
        0,
        Math.min(canvasRect.height - textRect.height, newTop)
      );

      ref.current.style.left = `${clampedLeft}px`;
      ref.current.style.top = `${clampedTop}px`;
    };

    const onMouseMove = (event) => {
      moveAt(event.clientX, event.clientY);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.onmouseup = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.onmouseup = null;
    };
  };

  async function handleDownload() {
    const compositeElement = document.getElementById("meme-canvas-container");
    if (compositeElement) {
      await sharingService.downloadImage(compositeElement, "rekt_ceo_meme");
    }
  }

  const shareOnTwitter = async () => {
    const compositeElement = document.getElementById("meme-canvas-container");
    if (!compositeElement) return;
    
    // Use the sharing service with custom share text
    const customText = "🚀Check out this meme I made! #RektCEO #Meme. 🎉 Follow @rekt_ceo and visit rektceo.club to join the community and have fun.";
    
    await sharingService.shareToTwitter(
      compositeElement,
      text1,  // top text
      text2,  // bottom text
      customText  // custom share text
    );
  };

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
        <div className="meme-generator">
          {/* Meme Editor */}
          <div className="meme-editor">
            <h1>Meme Generator</h1>
            <div
              id="meme-canvas-container"
              ref={memeCanvasRef}
              className="meme-canvas"
              style={{ position: "relative" }}
            >
              <img
                src={selectedTemplate}
                alt="Selected Meme"
                className="meme-image"
              />
              <div
                ref={text1Ref}
                className="draggable-text"
                style={{
                  position: "absolute",
                  top: "10px",
                  left: "40%",
                  color: textColor,
                }}
                onMouseDown={(e) => dragText(e, text1Ref)}
              >
                {text1}
              </div>
              <div
                ref={text2Ref}
                className="draggable-text"
                style={{
                  position: "absolute",
                  top: "80%",
                  left: "40%",
                  color: textColor,
                }}
                onMouseDown={(e) => dragText(e, text2Ref)}
              >
                {text2}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "100%",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "space-around",
                  width: "60%",
                  marginBottom: "4%",
                }}
              >
                <button onClick={handleDownload}>
                  Download <MdDownload />
                </button>
                <button onClick={shareOnTwitter}>
                  Share <FaTwitter />{" "}
                </button>
              </div>
              <button>Mint Meme NFT (Soon)</button>
            </div>
          </div>

          {/* Meme Template Selector */}
          <div className="meme-templates">
            <div className="text-inputs">
              <label>
                Top Text:
                <input
                  type="text"
                  value={text1}
                  onChange={(e) => setText1(e.target.value)}
                />
              </label>
              <label>
                Bottom Text:
                <input
                  type="text"
                  value={text2}
                  onChange={(e) => setText2(e.target.value)}
                />
              </label>

              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  width: "60%",
                  marginTop: "2%",
                  justifyContent: "start",
                }}
              >
                {colorOptions.map((color, index) => (
                  <div
                    style={{
                      backgroundColor: color,
                      borderRadius: "50px",
                      height: "40px",
                      width: "40px",
                      marginInline: "4%",
                      boxShadow:
                        color === textColor ? "0px 0px 0px 3px #52959d" : "",
                    }}
                    onClick={() => setTextColor(color)}
                  />
                ))}
              </div>
            </div>
            <h2>Select a Template</h2>
            <div className="template-options">
              {memeTemplates.map((template) => (
                <img
                  key={template.id}
                  src={template.src}
                  alt={template.name}
                  className={`template-image ${
                    selectedTemplate === template.src ? "selected" : ""
                  }`}
                  onClick={() => setSelectedTemplate(template.src)}
                />
              ))}
            </div>
          </div>

          <p style={{marginBottom: '4%'}}>New Meme Templates Coming Soon</p>
        </div>
      )}
    </>
  );
}
