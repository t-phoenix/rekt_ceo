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
} from "@metaplex-foundation/mpl-candy-machine";
import {
  createNft,
  TokenStandard,
} from "@metaplex-foundation/mpl-token-metadata";
import { setComputeUnitLimit } from "@metaplex-foundation/mpl-toolbox";

// CONSTANTS
import { CandyGuard, CandyMachineAddr, CollectionMint } from "../constants/metaplex";



// MAKE COLLECTION
export async function makeCollection(umi) {
    console.log("Updated Creating Collection ...");
    try {
      // Create the Collection NFT.
      const collectionMint = generateSigner(umi);
      await createNft(umi, {
        mint: collectionMint,
        authority: umi.identity,
        name: "Rekt Ceo PFP Collection NFT",
        uri: "https://gray-quintessential-jellyfish-921.mypinata.cloud/ipfs/bafkreiftdt25xg2hl3zv75rl2vz2cjl4b6lyxy6tx6wxoyhzfbsea47rwe",
        sellerFeeBasisPoints: 500, // 5%
        isCollection: true,
      }).sendAndConfirm(umi);

      //   const collectionMint = {
      //     publicKey: "CZdav9886aM8AuAWWxuCNxiWuK6GR4S6e5gospTTNt6M",
      //   };
      console.log("Collection NFT  ... ", collectionMint.publicKey);

      // Create the Candy Machine.
      const candyMachine = generateSigner(umi);
      const tx = await create(umi, {
        candyMachine,
        collectionMint: collectionMint.publicKey,
        collectionUpdateAuthority: umi.identity,
        tokenStandard: TokenStandard.NonFungible,
        sellerFeeBasisPoints: 500, // 5%
        itemsAvailable: 5,
        creators: [
          {
            address: umi.identity.publicKey,
            verified: true,
            percentageShare: 100,
          },
        ],
        configLineSettings: some({
          prefixName: "Rekt Ceo #",
          nameLength: 4,
          prefixUri:
            "https://gray-quintessential-jellyfish-921.mypinata.cloud/ipfs/",
          uriLength: 40,
          isSequential: true,
        }),
        guards: some({
          botTax: some({ lamports: sol(0.01), lastInstruction: true }),
        }),
      });
      await tx.sendAndConfirm(umi);

      console.log("Candy Machine Collection Created ...", tx, candyMachine);
    } catch (error) {
      console.log(error);
    }
  }


  export async function fetchCollection(umi) {
    console.log("Fetching Collection");
    try {
        const candyMachine = await fetchCandyMachine(umi, CandyMachineAddr);
        console.log("Candy Machine: ", candyMachine);
        const candyGuard = await fetchCandyGuard(umi, candyMachine.mintAuthority);
        console.log("Candy Guard: ", candyGuard);
    } catch (error) {
      console.log(error);
    }
  }

  export async function updateCollectionGuardGroup(umi) {
    console.log("Updating Colletion Guard Group...");
    try {
      const candyMachine = await fetchCandyMachine(umi, CandyMachineAddr);
      const candyGuard = await fetchCandyGuard(umi, candyMachine.mintAuthority);
      console.log("Candy Guard: ", candyGuard);

      if (!candyGuard?.publicKey || !candyGuard?.guards) {
        throw new Error("Candy Guard or its guards are undefined");
      }

      const tx = await updateCandyGuard(umi, {
        candyGuard: candyGuard.publicKey,
        guards: candyGuard.guards,
        groups: [
          {
            label: "early",
            guards: {
              solPayment: some({
                lamports: sol(0.01),
                destination: umi.identity.publicKey,
              }),
              botTax: some({ lamports: sol(1), lastInstruction: true }),
            },
          },
        ],
      }).sendAndConfirm(umi);
      console.log("Transaction: ", tx);
    } catch (error) {
      console.log("Error: ", error);
    }
  }


 export async function updateCollectionGuard(umi) {
    console.log("Updating Colletion Guard...");
    const candyMachinePublicKey = publicKey(CandyMachineAddr);

    try {
      const candyMachine = await fetchCandyMachine(umi, candyMachinePublicKey);
      const candyGuard = await fetchCandyGuard(umi, candyMachine.mintAuthority);
      console.log("Candy Guard: ", candyGuard);

      const tx = await updateCandyGuard(umi, {
        candyGuard: candyGuard.publicKey,
        guards: {
          ...candyGuard.guards,
          botTax: some({ lamports: sol(1), lastInstruction: true }),
        },
      }).sendAndConfirm(umi);
      console.log("Transaction: ", tx);
    } catch (error) {
      console.log("Error: ", error);
    }
  }

 export async function deleteCandyMachineAndGuard(umi) {
    console.log("Deleting Candy Machine And Candy Guard");
    const candyMachine = await fetchCandyMachine(umi, CandyMachineAddr);

    try {
      await deleteCandyMachine(umi, {
        candyMachine: candyMachine.publicKey,
      }).sendAndConfirm(umi);

      await deleteCandyGuard(umi, {
        candyGuard: candyMachine.mintAuthority,
      }).sendAndConfirm(umi);
    } catch (error) {
      console.log("Error deleting: ", error);
    }
  }