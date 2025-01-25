"use client";
import React, { useEffect, useState, FC, useMemo } from "react";
import "../styles/pfp.css";

// import { layerNames, layers } from "../constants/layers";

// import { MdDownload, MdShuffle } from "react-icons/md";
// import html2canvas from "html2canvas";
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
// import {
//   WalletModalProvider,
//   WalletDisconnectButton,
//   WalletMultiButton,
// } from "@solana/wallet-adapter-react-ui";
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
import {
  generateMetadata,
  uploadImageToIPFS,
  uploadMetadataToIPFS,
} from "../services/PinataServices";
import { mplCore } from "@metaplex-foundation/mpl-core";
import NFTBuilder from "../components/profileNFT/NFTBuilder";

export default function Page() {
  const network = WalletAdapterNetwork.Devnet;

  // You can also provide a custom RPC endpoint.
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [network]
  );

  const [isMobile, setIsMobile] = useState(false);
  
  
  // CHECK IF DEVICE IS DESKTOP OR MOBILE 
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
  // const [hasMounted, setHasMounted] = useState(false); // Fix for SSR hydration
  // const [isMobile, setIsMobile] = useState(false);

  // const network = WalletAdapterNetwork.Devnet;
  // const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  // const wallets = useMemo(() => [], [network]);

  // useEffect(() => {
  //   setHasMounted(true); // Prevents SSR mismatch
  //   const handleResize = () => setIsMobile(window.innerWidth <= 992);
  //   handleResize();
  //   window.addEventListener("resize", handleResize);
  //   return () => window.removeEventListener("resize", handleResize);
  // }, []);

  // if (!hasMounted) return <></>; // Prevent SSR mismatch

  


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
              <NFTBuilder/>
            )}
          </div>
        </div>
      </WalletProvider>
    </ConnectionProvider>
  );
}
