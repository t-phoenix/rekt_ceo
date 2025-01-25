"use client";

import React, { useMemo, useState } from "react";
//UMI
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";

//SOLANA
import {
  ConnectionProvider,
  useWallet,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import {
  WalletModalProvider
} from "@solana/wallet-adapter-react-ui";

//MPL
// import { mplCandyMachine } from "@metaplex-foundation/mpl-core-candy-machine";
// import {
//   createCoreCandyMachine,
//   createCoreCollectionNFT,
//   fetchCoreCandyMachine,
//   fetchCoreCandyMachineLocal,
//   initialiseAllocationGuard,
//   insertItemsInCoreCandyMachine,
//   mintCoreAsset,
//   testFunction,
//   updateAssetMetadata,
//   updateWithPlugin,
// } from "../services/coreCandyMachine";
// import { mplCore } from "@metaplex-foundation/mpl-core";
// import Header from "../components/Header";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { clusterApiUrl } from "@solana/web3.js";
import { AdminFunction } from "../components/admin/Function";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";

export default function Page() {
  const network = WalletAdapterNetwork.Devnet;

  // You can also provide a custom RPC endpoint.
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <AdminFunction />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
