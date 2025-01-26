import "../../styles/pfp.css";

import React, { useEffect, useState, FC, useMemo } from "react";
import { layerNames, layers } from "../../constants/layers";

import { MdDownload, MdShuffle } from "react-icons/md";
import html2canvas from "html2canvas";

// WEB3 SOLANA

import {
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";

//METAPLEX
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import {
  mplCandyMachine,
} from "@metaplex-foundation/mpl-core-candy-machine";
import { mplCore } from "@metaplex-foundation/mpl-core";


//COMPONENTS
import LayerImage from "./LayerImage";
import LayerNavbar from "./LayerNavbar";
import LayerOptions from "./LayerOptions";

import {
  downloadImage,
  retryWithBackoff,
  waitForConfirmation,
  uploadMetadata,
  updateMetadata
} from "../../services/PfpHelpers";


import {
  fetchCoreCandyMachine,
  mintCoreAsset,
} from "../../services/coreCandyMachine";


export default function NFTBuilder() {
  const [supply, setSupply] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(1); // Start with the second item as the current
  const [selectedLayer, setSelectedLayer] = useState([0, 0, 0, 0, 0, 0, 0]); // BG/ Hoodie / Pants / Shoes/ Skin / Face / Coin
  const limits = [3, 6, 3, 5, 3, 6, 7]; // Maximum random value for each index

  const wallet = useWallet();
//   const [umi, setUmi] = useState(null);

    // Use the RPC endpoint of your choice.
    const umi = createUmi(process.env.NEXT_PUBLIC_SOLANA_DEVNET_URL);
    // // Register Wallet Adapter to Umi
    // Apply wallet identity only if connected
    // if (wallet.publicKey) {
    umi.use(walletAdapterIdentity(wallet));

    umi.use(mplCandyMachine());
    umi.use(mplCore());
//   useEffect(() => {
//     if (typeof window !== "undefined" && connected) {
//       console.log("Wallet connected, initializing UMI...");
//       const umiInstance = createUmi(process.env.NEXT_PUBLIC_SOLANA_DEVNET_URL);
//       umiInstance.use(walletAdapterIdentity(wallet));
//       umiInstance.use(mplCandyMachine());
//       umiInstance.use(mplCore());
//       setUmi(umiInstance);
//     }
//   }, [wallet, setUmi, connected]);

//   useEffect(() => {
//     if (!umi) return;
//     (async () => {
//       try {
//         const coreCandyMachine = await retryWithBackoff(() =>
//           fetchCoreCandyMachine(umi)
//         );
//         setSupply(coreCandyMachine.itemsRedeemed);
//       } catch (error) {
//         console.error("Error fetching supply:", error);
//       }
//     })();
//   }, [umi]);

  useEffect(()=>{
    randomiseLayers();
  },[])


  const randomiseLayers = () => {
    const randomized = selectedLayer.map((_, index) =>
      Math.floor(Math.random() * (limits[index] + 1))
    );
    setSelectedLayer(randomized);
  };

  async function manageNFTMint() {
    // if (!umi) return; // Ensure umi is initialized
    console.log("Checking Umi: ", umi)
    try {
      let tempSupply = 0;
      let group = "";

      // Step 1: Fetch Core Candy Machine
      const coreCandyMachine = await retryWithBackoff(() =>
        fetchCoreCandyMachine(umi)
      );
      console.log("Core Candy Machine: ", coreCandyMachine.itemsRedeemed);

      tempSupply = coreCandyMachine.itemsRedeemed;
      setSupply(coreCandyMachine.itemsRedeemed);
      if(coreCandyMachine.itemsRedeemed > coreCandyMachine.itemsLoaded/2 ){
        group="late"
      }else if(coreCandyMachine.itemsRedeemed<coreCandyMachine.itemsLoaded/2){
        group="early"
      }
      // Step 2: Handle Mint
      const mintAssetResult = await retryWithBackoff(() => mintCoreAsset(umi, group));
      console.log("Asset Address and Trxn: ", mintAssetResult);

      // Step 3: Wait for Mint Transaction Confirmation
      await waitForConfirmation(umi, mintAssetResult.mintTrxn.signature);

      // Step 4: Upload Metadata
      const uploadMetadataResult = await retryWithBackoff(() =>
        uploadMetadata(Number(tempSupply), selectedLayer)
      );
      console.log("Metadata Hash:", uploadMetadataResult);

      // Step 5: Update Metadata with Retry
      const updateAssetResult = await retryWithBackoff(() =>
        updateMetadata(umi, mintAssetResult.nftAddress, uploadMetadataResult)
      );

      console.log("Update Trxn: ", updateAssetResult);
    } catch (error) {
      console.log("Error: ", error);
    }
  }

  return (
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
            <p className="pfp-instruct-point">MINT PFP NFT using $CEO</p>
            <p className="pfp-instruct-point">Share on Social Media</p>
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

                <div style={{ display: "flex", flexDirection: "column" }}>
                  <button onClick={manageNFTMint}>Mint NFT</button>
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
  );
}
