import React, { useState } from "react";
//UMI
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";

//SOLANA
import { useWallet } from "@solana/wallet-adapter-react";
import {
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";

//MPL
import { mplCandyMachine } from "@metaplex-foundation/mpl-core-candy-machine";


// import {
//   deleteCandyMachineAndGuard,
//   fetchCollection,
//   makeCollection,
//   updateCollectionGuardGroup,
// } from "../services/candyMachine";
import { createCoreCandyMachine, createCoreCollectionNFT, fetchCoreCandyMachine, fetchCoreCandyMachineLocal, initialiseAllocationGuard, insertItemsInCoreCandyMachine, mintCoreAsset, testFunction, updateAssetMetadata, updateWithPlugin } from "../services/coreCandyMachine";
import { mplCore } from "@metaplex-foundation/mpl-core";

export default function AdminPage() {

  const wallet = useWallet();
  const umi = createUmi(process.env.NEXT_PUBLIC_SOLANA_DEVNET_URL);
  umi.use(walletAdapterIdentity(wallet));
  umi.use(mplCore());
  umi.use(mplCandyMachine());


  return (
    <WalletModalProvider>
      <div style={{ marginTop: "14vh" }}>
        <h1>Admin</h1>
        <WalletMultiButton />
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <div>
            {/* <h2>Candy Machine</h2>
            <button onClick={() => makeCollection(umi)}>
              Create Collection
            </button>
            <button onClick={() => fetchCollection(umi)}>Get Collection</button>
            <button onClick={() => updateCollectionGuardGroup(umi)}>
              Update Guard
            </button>
            <button onClick={() => insertItems(umi)}>Insert Items</button>
            <button onClick={() => mintAsset(umi)}>Mint Test Asset</button>
            <button onClick={() => deleteCandyMachineAndGuard(umi)}>
              Delete Candy Machine
            </button> */}
          </div>

          <div>
            <h2>Core Candy Machine</h2>
            <button onClick={() => createCoreCollectionNFT(umi)}>Create Collection NFT</button>
            <button onClick={() => createCoreCandyMachine(umi)}>Create Core Candy Machine</button>
            <button onClick={() => fetchCoreCandyMachine(umi)}>Fetch Candy Machine</button>
            <button onClick={() => initialiseAllocationGuard(umi)}>Init Alloc Guard</button>
            <button onClick={() => insertItemsInCoreCandyMachine(umi)}>Insert Items</button>
            <button onClick={() => mintCoreAsset(umi, 'early')}>Mint Early Asset</button>
            <button onClick={() => mintCoreAsset(umi, 'late')}>Mint Late Asset</button>
            <button onClick={() => updateAssetMetadata(umi)}>Update Asset</button>
            <button onClick={() => updateWithPlugin(umi)}>Update Collection Plugin (royalty)</button>
            <button onClick={() => testFunction(umi)}>Test Function</button>
            {/* <button onClick={() => deleteCandyMachineAndGuard(umi)}>
              Delete Candy Machine
            </button> */}
          </div>
        </div>
      </div>
    </WalletModalProvider>
  );
}
