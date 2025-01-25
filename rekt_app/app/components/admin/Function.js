"use client"
import { useWallet } from "@solana/wallet-adapter-react";
import {
    WalletMultiButton,
  } from "@solana/wallet-adapter-react-ui";

import Header from "../Header";

// METAPLEX
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { mplCore } from "@metaplex-foundation/mpl-core";
import { mplCandyMachine } from "@metaplex-foundation/mpl-core-candy-machine";
import {
  createCoreCandyMachine,
  createCoreCollectionNFT,
  deleteCoreCandyMachine,
  fetchCoreCandyMachine,
  initialiseAllocationGuard,
  insertItemsInCoreCandyMachine,
  mintCoreAsset,
  testFunction,
  updateAssetMetadata,
  updateWithPlugin,
} from "../../services/coreCandyMachine";


export function AdminFunction() {
    const wallet = useWallet();
    const umi = createUmi(process.env.NEXT_PUBLIC_SOLANA_DEVNET_URL);
    
    // Apply wallet identity only if connected
    if (wallet.publicKey) {
      umi.use(walletAdapterIdentity(wallet));
    }
  
    umi.use(mplCore());
    umi.use(mplCandyMachine());
  
    return (
      <div className="App">
        <Header />
        <div style={{ marginTop: "14vh", width: "90%", justifyContent: "center" }}>
          <h1>Admin</h1>
          <div style={{ height: "20%", width: "100%", display: "flex", flexDirection: "row", justifyContent: "space-around" }}>
            <WalletMultiButton />
          </div>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <h2>Core Candy Machine</h2>
            <button onClick={() => createCoreCollectionNFT(umi)}>Create Collection NFT</button>
            <button onClick={() => createCoreCandyMachine(umi)}>Create Core Candy Machine</button>
            <button onClick={() => fetchCoreCandyMachine(umi)}>Fetch Candy Machine</button>
            <button onClick={() => initialiseAllocationGuard(umi)}>Init Alloc Guard</button>
            <button onClick={() => insertItemsInCoreCandyMachine(umi)}>Insert Items</button>
            <button onClick={() => mintCoreAsset(umi, "early")}>Mint Early Asset</button>
            <button onClick={() => mintCoreAsset(umi, "late")}>Mint Late Asset</button>
            <button onClick={() => updateAssetMetadata(umi)}>Update Asset</button>
            <button onClick={() => updateWithPlugin(umi)}>Update Collection Plugin (royalty)</button>
            <button onClick={() => testFunction(umi)}>Test Function</button>
            <button onClick={() => deleteCoreCandyMachine(umi)}>Delete Candy Machine</button>
          </div>
        </div>
      </div>
    );
  }