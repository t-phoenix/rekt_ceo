"use client"
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { clusterApiUrl } from "@solana/web3.js";
import React, { useMemo } from "react";

export default function Layout({ children }) {
  const network = WalletAdapterNetwork.Devnet;

  // You can also provide a custom RPC endpoint.
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [network]
  );
  return (
    <div className="flex h-screen flex-col md:flex-row md:overflow-hidden">
      {/* <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect> */}
          <div className="flex-grow p-6 md:overflow-y-auto md:p-12">
            {children}
          </div>
        {/* </WalletProvider>
      </ConnectionProvider> */}
    </div>
  );
}
