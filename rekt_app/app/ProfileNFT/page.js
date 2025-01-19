"use client";
import React, { useEffect, useState, FC, useMemo } from "react";
import "../styles/pfp.css";

import { layerNames, layers } from "../constants/layers";

import { MdDownload, MdShuffle } from "react-icons/md";
import html2canvas from "html2canvas";
import { styles } from "../styles/mobileStyle";

// WEB3 SOLANA
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import {
  ConnectionProvider,
  useWallet,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import {
  mplCandyMachine,
  fetchCandyMachine,
} from "@metaplex-foundation/mpl-core-candy-machine";
import {
  WalletModalProvider,
  WalletDisconnectButton,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
// import { clusterApiUrl } from "@solana/web3.js";
import "@solana/wallet-adapter-react-ui/styles.css";

import LayerImage from "../components/profileNFT/LayerImage";
import LayerNavbar from "../components/profileNFT/LayerNavbar";
import LayerOptions from "../components/profileNFT/LayerOptions";

import { BASE_JSON } from "../constants/nftMetadata";
import { dataURLtoFile, downloadImage, retry } from "../services/PfpHelpers";
import Header from "../components/Header";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { clusterApiUrl } from "@solana/web3.js";

export default function Page() {

  const network = WalletAdapterNetwork.Devnet;

  // You can also provide a custom RPC endpoint.
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [network]
  );


  const [supply, setSupply] = useState(2);
  const [isMobile, setIsMobile] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(1); // Start with the second item as the current
  const [selectedLayer, setSelectedLayer] = useState([0, 0, 0, 0, 0, 0, 0]); // BG/ Hoodie / Pants / Shoes/ Skin / Face / Coin
  const limits = [3, 6, 3, 5, 3, 6, 7]; // Maximum random value for each index

  const wallet = useWallet();

  // Use the RPC endpoint of your choice.
  const umi = createUmi(process.env.NEXT_PUBLIC_SOLANA_DEVNET_URL);
  // // Register Wallet Adapter to Umi
  umi.use(walletAdapterIdentity(wallet));
  umi.use(mplCandyMachine());


  useEffect(() => {
    // Ensure it only runs in the browser (Next.js SSR fix)
    if (typeof window !== "undefined") {
      const handleResize = () => {
        setIsMobile(window.innerWidth <= 992);
      };
      handleResize();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  const randomiseLayers = () => {
    const randomized = selectedLayer.map((_, index) =>
      Math.floor(Math.random() * (limits[index] + 1))
    );
    setSelectedLayer(randomized);
  };

  function handleMint() {}

  async function uploadMetadata() {
    const compositeElement = document.getElementById("composite-container");

    const canvas = await html2canvas(compositeElement);
    const image = canvas.toDataURL("image/png");

    const file = dataURLtoFile(image, `Rekt Ceo.png`);

    let attribute_list = [
      { trait_type: "Background", value: `${layerNames[0][selectedLayer[0]]}` },
      { trait_type: "Hoodie", value: `${layerNames[1][selectedLayer[1]]}` },
      { trait_type: "Pants", value: `${layerNames[2][selectedLayer[2]]}` },
      { trait_type: "Shoes", value: `${layerNames[3][selectedLayer[3]]}` },
      { trait_type: "Rekt Coin", value: "rekt_coin" },
      { trait_type: "Skin", value: `${layerNames[4][selectedLayer[4]]}` },
      { trait_type: "Face", value: `${layerNames[5][selectedLayer[5]]}` },
      { trait_type: "Coin", value: `${layerNames[6][selectedLayer[6]]}` },
    ];

    const formData = new FormData();
    formData.append("image", file);
    formData.append("attributes", JSON.stringify(attribute_list)); // Add attribute list as JSON string

    fetch(`http://localhost:3001/uploadImageAndMetadata`, {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (response.ok) {
          return response.json();
        } else {
          throw new Error("File upload failed");
        }
      })
      .then((data) => {
        console.log("Server response:", data);
      })
      .catch((error) => {
        console.error("Error uploading file:", error);
      });
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <div className="App">
          <Header />
          <div style={{ marginTop: "10vh", minHeight: "100vh" }}>
            {isMobile ? (
              <div style={styles.overlay}>
                <div style={styles.messageBox}>
                  <h1 style={styles.heading}>We are Launching Soon!</h1>
                  <p style={styles.message}>
                    This website is currently under rapid development. Please
                    wait a bit for the best experience.
                  </p>
                  <p style={styles.message}>
                    We are working on a friendly version, coming soon!
                  </p>
                </div>
              </div>
            ) : (
              <WalletModalProvider>
                <div style={{ width: "98vw" }}>
                  <h1 style={{ marginBlock: "4% 2%" }} className="pfp-title">
                    Mint Your Unique $CEO PFP NFT
                  </h1>

                  <div className="pfp-box">
                    {/* INSTRUCTIONS */}
                    <div className="pfp-instructions">
                      <h1>Instructions</h1>
                      <p className="pfp-instruct-point">Buy some $CEO</p>
                      <p className="pfp-instruct-point">Build your PFP</p>
                      <p className="pfp-instruct-point">
                        MINT PFP NFT using $CEO
                      </p>
                      <p className="pfp-instruct-point">
                        Share on Social Media
                      </p>
                      <p className="pfp-instruct-point">
                        Use as your Twitter Profile Picture
                      </p>
                    </div>
                    {/* PFP LAYER IMAGE */}
                    <div className="pfp-image-box">
                      <LayerImage selectedLayer={selectedLayer} />

                      <div className="mint-button-box">
                        {/* <p>Layers:{selectedLayer}</p> */}
                        <div style={{ textAlign: "left", marginLeft: "0%" }}>
                          <p>
                            <strong>Price:</strong> 20,000 $CEO
                          </p>
                          <p>
                            <strong>Supply:</strong> {supply}/ 999
                          </p>
                          <p>
                            <strong>Balance:</strong> 284,323,422 $CEO
                          </p>
                        </div>

                        <div
                          style={{
                            width: "100%",
                            display: "flex",
                            flexDirection: "row",
                            justifyContent: "space-around",
                          }}
                        >
                          <WalletMultiButton />

                      
                          <div
                            style={{ display: "flex", flexDirection: "column" }}
                          >
                            
                            <button onClick={uploadMetadata}>
                              Server + Pinata Upload
                            </button>
                            <button onClick={handleMint}>Mint NFT</button>
                          </div>
                        </div>
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
              </WalletModalProvider>
            )}
          </div>
        </div>
      </WalletProvider>
    </ConnectionProvider>
  );
}