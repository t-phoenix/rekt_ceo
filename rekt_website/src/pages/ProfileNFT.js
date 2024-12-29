import React, { useEffect, useState, FC, useMemo } from "react";
import "./pfp.css";
// import ceo from "../creatives/rekt_ceo_ambassador.png";

import { layerNames, layers } from "../constants/layers";

import { MdDownload, MdShuffle } from "react-icons/md";
import html2canvas from "html2canvas";
import { styles } from "./mobileStyle";

// WEB3 SOLANA
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { useWallet } from "@solana/wallet-adapter-react";
// import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata'
import {
  WalletModalProvider,
  WalletDisconnectButton,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
// import { clusterApiUrl } from "@solana/web3.js";
import "@solana/wallet-adapter-react-ui/styles.css";


import LayerImage from "./page_components/LayerImage";
import LayerNavbar from "./page_components/LayerNavbar";
import LayerOptions from "./page_components/LayerOptions";

import { dataURLtoFile, generateMetadata, uploadImageToIPFS, uploadMetadataToIPFS } from "../services/PinataServices";
import { BASE_JSON } from "../constants/nftMetadata";
import { retry } from "../services/PfpHelpers";



export default function ProfileNFT() {

  const [supply, setSupply] = useState(2);  
  const [imageUri, setImageUri] = useState('');
  const [metadataJSON, setMetadataJSON] = useState('');
  const [metadataURI, setMetadataURI] = useState('');

  const [isMobile, setIsMobile] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(1); // Start with the second item as the current

  const [selectedLayer, setSelectedLayer] = useState([0, 0, 0, 0, 0, 0, 0]); // BG/ Hoodie / Pants / Shoes/ Skin / Face / Coin
  const limits = [3, 6, 3, 5, 3, 6, 7]; // Maximum random value for each index

  const wallet = useWallet();
  // console.log("Wallet pubkey:", wallet.publicKey);

  // Use the RPC endpoint of your choice.
  const umi = createUmi(
    "https://solana-devnet.g.alchemy.com/v2/8fB9RHW65lCGqnRxrELgw5y0yYEOFvu6"
  )
  // // Register Wallet Adapter to Umi
  umi.use(walletAdapterIdentity(wallet));

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


  function handleMint() {
    
  }

  async function uploadPfpData() {
    try {
      console.log("Starting the NFT upload process...");
  
      // Step 1: Upload Image
      const imageHash = await retry(() => uploadImageToIPFS(supply), 3, 2000); 
      console.log("Step 1 Complete: Image Hash ->", imageHash);

      // Step2: Generate Metadata
      const json_metadata = await generateMetadata(supply, selectedLayer, imageHash);
      console.log("Step 2 Complete: Metadata Generatioj: ", json_metadata); 

  
      // Step 3: Upload Metadata
      const metadataHash = await retry(()=> uploadMetadataToIPFS(json_metadata));
      console.log("Step 3 Complete: Metadata Hash ->", metadataHash);

      const ipfsLink = `https://${process.env.REACT_APP_GATEWAY_URL}/ipfs/${metadataHash.IpfsHash}`;
  
      console.log("NFT Metadata Upload Process Completed Successfully!");
      console.log("Link:", ipfsLink)

      setSupply(supply+1)
      // UPDATE METEADATA URI to NFT

    } catch (error) {
      console.error("Error during Metadata upload process:", error.message || error);
      throw error; // Rethrow for further handling if needed
    }
  }

  return (
    <>
      {isMobile ? (
        <div style={styles.overlay}>
          <div style={styles.messageBox}>
            <h1 style={styles.heading}>We're Launching Soon!</h1>
            <p style={styles.message}>
              This website is currently under rapid development. Please
              wait a bit for the best experience.
            </p>
            <p style={styles.message}>
              We're working on a friendly version, coming soon!
            </p>
          </div>
        </div>
      ) : (
        // <ConnectionProvider endpoint={endpoint}>
        //   <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
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
                  <LayerImage selectedLayer={selectedLayer}/>
                  
                  <div className="mint-button-box">
                    {/* <p>Layers:{selectedLayer}</p> */}
                    <div style={{ textAlign: "left", marginLeft: "0%" }}>
                      <p>
                        <strong>Price:</strong> 20,000 $CEO
                      </p>
                      <p>
                        <strong>Supply:</strong> {supply}/ 999
                      </p>
                      <p><strong>Balance:</strong> 284,323,422 $CEO</p>
                    </div>
                    
                    <div style={{width: '100%', display: 'flex', flexDirection: 'row', justifyContent: 'space-around'}}>
                    <WalletMultiButton />
                    
                    {wallet.publicKey ? (
                      <button
                        style={{
                          width: "50%",
                          display: "flex",
                          flexDirection: "column",
                        }}
                        onClick={handleMint}
                      >
                        <h3>Mint</h3>{" "}
                        <p style={{ fontSize: "12px" }}>
                        </p>
                      </button>
                    ) : (
                      <></>
                    )}
                    <div style={{display:'flex', flexDirection: 'column'}}>
                      {/* <button onClick={uploadImage}>Upload Image</button>
                      <button onClick={createMetadata}>Create Metadata</button> */}
                      {/* <button onClick={()=>generateMetadata(supply, selectedLayer, imageUri)}>Test GENERATE META</button> */}
                      <button onClick={handleMint}>Mint NFT</button>
                      <button onClick={uploadPfpData}>Upload Metadata</button>
                    </div>
                    </div>
                  </div>
                </div>
                {/* PFP OPTIONS */}
                <div className="pfp-options">
                  <h1>Options</h1>

                  {/* NAVBAR - PFP OPTIONS */}
                  <LayerNavbar currentIndex={currentIndex} setCurrentIndex={setCurrentIndex}/>

                  {/* PFP IMAGES */}
                  {/* USE LAYER2 similiar to layer for better view*/}
                  <LayerOptions currentIndex={currentIndex} selectedLayer={selectedLayer} setSelectedLayer={setSelectedLayer}/>
                  

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
            
            </WalletModalProvider>
        //   </WalletProvider>
        // </ConnectionProvider>
      )}
    </>
  );
}
