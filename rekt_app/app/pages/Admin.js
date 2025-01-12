import React from "react";
//UMI
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  assertAccountExists,
  dateTime,
  generateSigner,
  none,
  publicKey,
  sol,
  some,
  transactionBuilder,
} from "@metaplex-foundation/umi";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";


//SOLANA
import { useWallet } from "@solana/wallet-adapter-react";
import {
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";

//MPL
import {
  mplCandyMachine,
  create,
  fetchCandyMachine,
  fetchCandyGuard,
  updateCandyGuard,
  deleteCandyMachine,
  deleteCandyGuard,
  findCandyGuardPda,
  deserializeCandyMachine,
  deserializeCandyGuard,
  mintV2,
  addConfigLines,
  mint,
  mintFromCandyMachine,
} from "@metaplex-foundation/mpl-candy-machine";
import {
  createNft,
  TokenStandard,
} from "@metaplex-foundation/mpl-token-metadata";
import { createMintWithAssociatedToken, findAssociatedTokenPda, setComputeUnitLimit } from "@metaplex-foundation/mpl-toolbox";

// CONSTANTS
import { CandyGuard, CandyMachineAddr, CollectionMint } from "../constants/metaplex";
import { fetchCollection, makeCollection, updateCollectionGuardGroup } from "../services/candyMachine";
import { mintV1 } from "@metaplex-foundation/mpl-core-candy-machine";


export default function AdminPage() {
  const wallet = useWallet();
  const umi = createUmi(process.env.NEXT_PUBLIC_SOLANA_DEVNET_URL);
  umi.use(walletAdapterIdentity(wallet));
  umi.use(mplCandyMachine());


  async function mintAsset() {
    console.log("Testing mint");
    try {
      const nftMint = generateSigner(umi);
      const candyMachineAccount = await fetchCandyMachine(umi, publicKey(CandyMachineAddr));
      console.log("Candy Machine: ", candyMachineAccount)
      
      const trx = await transactionBuilder()
        .add(setComputeUnitLimit(umi, { units: 800_000 }))
        .add(mintV2(umi, {
              candyMachine: publicKey(candyMachineAccount.publicKey),
              nftMint,
              collectionMint: publicKey(candyMachineAccount.collectionMint),
              collectionUpdateAuthority: publicKey(candyMachineAccount.authority),
              group: some("early"),
              mintArgs: {
                solPayment: some({destination: publicKey(umi.identity.publicKey) })
              }
            })
          )
          .sendAndConfirm(umi)
         // .sendAndConfirm(umi, {send: { skipPreflight: true}})
  

        
        console.log("Mint trx: ", mintTransaction)


    } catch (error) {
      console.log("Mint Error", error);
    }
  }

  
  async function insertItems(){
    console.log("Inserting Items...");
    try {
        const candyMachine = await fetchCandyMachine(umi, CandyMachineAddr);
        const trx = await addConfigLines(umi, {
            candyMachine: candyMachine.publicKey,
            index: candyMachine.itemsLoaded,
            configLines: [
              { name: '6', uri: '6.json' },
              { name: '7', uri: '7.json' },
            ],
          }).sendAndConfirm(umi)

          console.log("Inserting Trx: ", trx)
    } catch (error) {
        console.log("Inserting item error: ", error)
    }
  }
  

  

  return (
    <WalletModalProvider>
      <div style={{ marginTop: "14vh" }}>
        <h1>Admin</h1>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <WalletMultiButton />

          <button onClick={()=>makeCollection(umi)}>Create Collection</button>
          <button onClick={()=>fetchCollection(umi)}>Get Collection</button>
          <button onClick={()=>updateCollectionGuardGroup(umi)}>Update Guard</button>
          <button onClick={insertItems}>Insert Items</button>
          <button onClick={mintAsset}>Mint Test Asset</button>
        </div>
      </div>
    </WalletModalProvider>
  );
}
