import React, { useEffect, useState } from "react";
import "./pfp.css";
// import ceo from "../creatives/rekt_ceo_ambassador.png";

//import { layerNames } from "../constants/layers";

import { MdDownload, MdShuffle } from "react-icons/md";
//import html2canvas from "html2canvas";
import { styles } from "./mobileStyle";

import LayerImage from "./page_components/LayerImage";
import LayerNavbar from "./page_components/LayerNavbar";
import LayerOptions from "./page_components/LayerOptions";

import { downloadImage } from "../services/PfpHelpers";

export default function ProfileNFT() {
  // const [imageUri, setImageUri] = useState("");
  // const [metadataJSON, setMetadataJSON] = useState("");
  // const [metadataURI, setMetadataURI] = useState("");

  const [isMobile, setIsMobile] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(1); // Start with the second item as the current

  const [selectedLayer, setSelectedLayer] = useState([0, 0, 0, 0, 0, 0, 0]); // BG/ Hoodie / Pants / Shoes/ Skin / Face / Coin
  const limits = [3, 6, 3, 5, 3, 6, 7]; // Maximum random value for each index

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

  const randomiseLayers = () => {
    const randomized = selectedLayer.map((_, index) =>
      Math.floor(Math.random() * (limits[index] + 1))
    );
    setSelectedLayer(randomized);
  };

  function handleMint() {}

  

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


  return (
    <>
      {isMobile ? (
        <div style={styles.overlay}>
          <div style={styles.messageBox}>
            <h1 style={styles.heading}>We're Launching Soon!</h1>
            <p style={styles.message}>
              This website is currently under rapid development. Please wait a
              bit for the best experience.
            </p>
            <p style={styles.message}>
              We're working on a friendly version, coming soon!
            </p>
          </div>
        </div>
      ) : (
        // <ConnectionProvider endpoint={endpoint}>

        <div style={{ marginTop: "10vh", width: "100vw" }}>
            <h1 style={{ marginBlock: "2%" }} className="section-title">
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
                <p className="pfp-instruct-point">
                  Use as your Twitter Profile Picture
                </p>
              </div>
              {/* PFP LAYER IMAGE */}
              <div className="pfp-image-box">
                <LayerImage selectedLayer={selectedLayer} />

                <h2 style={{marginTop: '4%'}}>( NEW ART COMING SOON )</h2>

                <div className="mint-button-box">
                  <div style={{ textAlign: "left", marginLeft: "0%" }}>
                    <p>
                      <strong>Price:</strong> 20,000 $CEO
                    </p>
                    <p>
                      <strong>Supply:</strong> --/ 999
                    </p>
                    <p>
                      <strong>Balance:</strong> -- $CEO
                    </p>
                  </div>

                  <button style={{marginTop: '4%'}} onClick={handleMint}>Mint NFT (Soon)</button>

                  {/* <div
                    style={{
                      width: "100%",
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "space-around",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <button onClick={uploadMetadata}>Server + Pinata Upload</button>
                    </div>
                  </div> */}
                </div>
              </div>
              {/* PFP OPTIONS */}
              <div className="pfp-options">
                <h1>Options</h1>

                {/* NAVBAR - PFP OPTIONS */}
                <LayerNavbar
                  currentIndex={currentIndex}
                  setCurrentIndex={setCurrentIndex}
                />

                {/* PFP IMAGES */}
                {/* USE LAYER2 similiar to layer for better view*/}
                <LayerOptions
                  currentIndex={currentIndex}
                  selectedLayer={selectedLayer}
                  setSelectedLayer={setSelectedLayer}
                />

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
