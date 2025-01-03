import React, { useEffect, useState, useMemo } from "react";
import "./App.css";

import { Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Introduction from "./landingpage/Introduction";
import Header from "./components/Header";

import penthouse from "./creatives/penthouse.jpeg";
import ProfileNFT from "./pages/ProfileNFT";
import Meme from "./pages/Meme";
import Chat from "./pages/Chat";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";

import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { clusterApiUrl } from "@solana/web3.js";
import AdminPage from "./pages/Admin";


function App() {

  const [isMobile, setIsMobile] = useState(false);

  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.
  const network = WalletAdapterNetwork.Devnet;

  // You can also provide a custom RPC endpoint.
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [network]
  );


  // useEffect(() => {
  //   // Detect screen width or use a user-agent check
  //   const handleResize = () => {
  //     setIsMobile(window.innerWidth <= 992); // Adjust breakpoint as needed
  //   };

  //   // Initial check
  //   handleResize();

  //   // Add event listener for window resize
  //   window.addEventListener("resize", handleResize);

  //   // Cleanup event listener on unmount
  //   return () => window.removeEventListener("resize", handleResize);
  // }, []);

  return (
    // <>
    //   {isMobile ? (
    //     <div style={styles.overlay} >
    //       <div style={styles.messageBox}>
    //         <h1 style={styles.heading}>We're Optimizing for Mobile!</h1>
    //         <p style={styles.message}>
    //           This website is currently designed for desktop view only. Please
    //           switch to a desktop device for the best experience.
    //         </p>
    //         <p style={styles.message}>
    //           We're working on a mobile-friendly version, coming soon!
    //         </p>
    //       </div>
    //     </div>
    //   ) : (
      <ConnectionProvider endpoint={endpoint}>
          <WalletProvider wallets={wallets} autoConnect>
        <div className="App">
          <Header />

          <div className="body">
            <Routes>
              <Route path="/" element={<Introduction />} />
              <Route path="/pfp" element={<ProfileNFT />}/>
              <Route path="/memes" element={<Meme />}/>
              <Route path="/admin" element={<AdminPage/>} />
              {/* <Route path="/chat" element={<Chat />}/> */}
            </Routes>
          </div>
        </div>
        </WalletProvider>
        </ConnectionProvider>
    //   )}
    // </>
  );
}



export default App;
