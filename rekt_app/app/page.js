"use client";

import React, { useMemo } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Header from "./components/Header";
import Introduction from "./landingpage/Introduction";
import ProfileNFT from "./pages/pfp";
import Meme from "./pages/memes";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { clusterApiUrl } from "@solana/web3.js";

export default function Home() {
  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.
  const network = WalletAdapterNetwork.Devnet;

  // You can also provide a custom RPC endpoint.
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [network]
  );

  return (
    <BrowserRouter>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <div className="App">
            <Header />

            <div className="body">
              <Routes>
                <Route path="/" element={<Introduction />} />
                <Route path="/pfp" element={<ProfileNFT />} />
                <Route path="/memes" element={<Meme />} />
                {/* <Route path="/admin" element={<AdminPage/>} /> */}
                {/* <Route path="/chat" element={<Chat />}/> */}
              </Routes>
            </div>
          </div>
        </WalletProvider>
      </ConnectionProvider>
    </BrowserRouter>
  );
}
