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

import { dataURLtoFile, uploadFile, uploadJSON } from "../services/PinataServices";
import { BASE_JSON } from "../constants/nftMetadata";



export default function ProfileNFT() {
  const [supply, setSupply] = useState(0);  
  const [imageUri, setImageUri] = useState('');
  const [metadataJSON, setMetadataJSON] = useState('');
  const [metadataURI, setMetadataURI] = useState('');

  const [isMobile, setIsMobile] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(1); // Start with the second item as the current

  const [selectedLayer, setSelectedLayer] = useState([0, 0, 0, 0, 0, 0, 0]); // BG/ Hoodie / Pants / Shoes/ Skin / Face / Coin
  const limits = [3, 6, 3, 5, 3, 6, 7]; // Maximum random value for each index

  const wallet = useWallet();
  console.log("Wallet pubkey:", wallet.publicKey);

  // Use the RPC endpoint of your choice.
  const umi = createUmi(
    "https://solana-devnet.g.alchemy.com/v2/8fB9RHW65lCGqnRxrELgw5y0yYEOFvu6"
  )

  // // Register Wallet Adapter to Umi
  umi.use(walletAdapterIdentity(wallet));
  console.log("UMI: ", umi);

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

  async function uploadImage(){
    const compositeElement = document.getElementById("composite-container");
    
    const canvas = await html2canvas(compositeElement);
    const image = canvas.toDataURL("image/png");
    
    const imageFile = dataURLtoFile(image, `rekt_ceo_#${supply+1}.png`);

    try {
      const result = await uploadFile(imageFile)
      // RETURNS
      // IpfsHash, PinSize, TimeStamp
      console.log("File uploaded to IPFS:", result);

      // Return IPFS link
      const ipfsLink = `https://${process.env.REACT_APP_GATEWAY_URL}/ipfs/${result.IpfsHash}`;
      
      console.log("IPFS Link:", ipfsLink);
      setImageUri(ipfsLink);
      return ipfsLink;
    } catch (error) {
      return false;
    }
    

  }

  async function createMetadata(){
    console.log("Uploading Image...");

    // const resultIpfs =  await uploadImage();


    console.log("Image Metadata...");
    let item_json = BASE_JSON;
    item_json.name = item_json.name+`${supply+1}`

    // item_json.image = resultIpfs;
    // item_json.properties.files[0].uri = resultIpfs;
    item_json.image = imageUri;
    item_json.properties.files[0].uri = imageUri;

    console.log("Selected layers: ", selectedLayer);
    let attribute_list = [
      { "trait_type": "Hoodie", "value": `${layerNames[1][selectedLayer[1]]}` },
      { "trait_type": "Pants", "value": `${layerNames[2][selectedLayer[2]]}` },
      { "trait_type": "Shoes", "value": `${layerNames[3][selectedLayer[3]]}` },
      { "trait_type": "Rekt Coin", "value": "rekt_coin" },
      { "trait_type": "Skin", "value": `${layerNames[4][selectedLayer[4]]}` },
      { "trait_type": "Face", "value": `${layerNames[5][selectedLayer[5]]}` },
      { "trait_type": "Coin", "value": `${layerNames[6][selectedLayer[6]]}` }
    ]

    item_json.attributes = attribute_list;
    console.log("Item Json: ", item_json);
    setMetadataJSON(item_json);
    
  }


  async function uploadMetadata(){
    console.log("MEtadata JSON: ", metadataJSON);

    try {
      const result = await uploadJSON(metadataJSON)
      // RETURNS
      // IpfsHash, PinSize, TimeStamp
      console.log("File uploaded to IPFS:", result);

      // Return IPFS link
      const ipfsLink = `https://${process.env.REACT_APP_GATEWAY_URL}/ipfs/${result.IpfsHash}`;
      
      console.log("Metadata IPFS Link:", ipfsLink);
      setMetadataURI(ipfsLink);
      return ipfsLink;
    } catch (error) {
      return false;
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
                        <strong>Supply:</strong> 23/ 999
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
                      <button onClick={uploadImage}>Upload Image</button>
                      <button onClick={createMetadata}>Create Metadata</button>
                      <button onClick={uploadMetadata}>Update Metadata</button>
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
