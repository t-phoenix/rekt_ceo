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
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";

//MPL
import { mplCandyMachine } from "@metaplex-foundation/mpl-core-candy-machine";
import {
  createCoreCandyMachine,
  createCoreCollectionNFT,
  fetchCoreCandyMachine,
  fetchCoreCandyMachineLocal,
  initialiseAllocationGuard,
  insertItemsInCoreCandyMachine,
  mintCoreAsset,
  testFunction,
  updateAssetMetadata,
  updateWithPlugin,
} from "../services/coreCandyMachine";
import { mplCore } from "@metaplex-foundation/mpl-core";
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

  const wallet = useWallet();
  const umi = createUmi(process.env.NEXT_PUBLIC_SOLANA_DEVNET_URL);
  umi.use(walletAdapterIdentity(wallet));
  umi.use(mplCore());
  umi.use(mplCandyMachine());

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div className="App">
            <Header />

            <div style={{ marginTop: "14vh", width:'90%', justifyContent:'center' }}>
              <h1>Admin</h1>
              <div
                style={{
                  height: '20%',
                  width: "100%",
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "space-around",
                }}
              >
                <WalletMultiButton />
              </div>
              <div
                style={{
                  width: '100%',
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <div>
                  <h2>Core Candy Machine</h2>
                  <button onClick={() => createCoreCollectionNFT(umi)}>
                    Create Collection NFT
                  </button>
                  <button onClick={() => createCoreCandyMachine(umi)}>
                    Create Core Candy Machine
                  </button>
                  <button onClick={() => fetchCoreCandyMachine(umi)}>
                    Fetch Candy Machine
                  </button>
                  <button onClick={() => initialiseAllocationGuard(umi)}>
                    Init Alloc Guard
                  </button>
                  <button onClick={() => insertItemsInCoreCandyMachine(umi)}>
                    Insert Items
                  </button>
                  <button onClick={() => mintCoreAsset(umi, "early")}>
                    Mint Early Asset
                  </button>
                  <button onClick={() => mintCoreAsset(umi, "late")}>
                    Mint Late Asset
                  </button>
                  <button onClick={() => updateAssetMetadata(umi)}>
                    Update Asset
                  </button>
                  <button onClick={() => updateWithPlugin(umi)}>
                    Update Collection Plugin (royalty)
                  </button>
                  <button onClick={() => testFunction(umi)}>
                    Test Function
                  </button>
                  
                </div>
              </div>
            </div>
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
