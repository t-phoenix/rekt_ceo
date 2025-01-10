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
import { CandyGuard, CandyMachineAddr, CollectionMint } from "../constants/metaplex";
import { setComputeUnitLimit } from "@metaplex-foundation/mpl-toolbox";

export default function AdminPage() {
  const wallet = useWallet();
  const umi = createUmi(process.env.NEXT_PUBLIC_SOLANA_DEVNET_URL);
  umi.use(walletAdapterIdentity(wallet));
  umi.use(mplCandyMachine());

  async function makeCollection() {
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

  async function mintAsset() {
    console.log("Testing mint");
    try {
      const nftMint = generateSigner(umi);
      // const nftOwner = generateSigner(umi).publicKey
      await transactionBuilder()
        .add(setComputeUnitLimit(umi, { units: 800_000 }))
        .add(
            mintV2(umi, {
              candyMachine: CandyMachineAddr,
              nftMint,
              collectionMint: CollectionMint,
              collectionUpdateAuthority: collectionNft.metadata.updateAuthority,
              tokenStandard: candyMachine.tokenStandard,
            })
          )
        .sendAndConfirm(umi);
    } catch (error) {
      console.log(error);
    }
  }

  async function fetchCollection() {
    console.log("Fetching Collection");
    try {
        const candyMachine = await fetchCandyMachine(umi, CandyMachineAddr);
        console.log("Candy Machine: ", candyMachine);
        const candyGuard = await fetchCandyGuard(umi, candyMachine.mintAuthority);
        console.log("Candy Guard: ", candyGuard);

    //   const candyGuardAddress = findCandyGuardPda(umi, {
    //     base: CandyMachineAddr,
    //   });
    //   const [rawCandyMachine, rawCandyGuard] = await umi.rpc.getAccounts([
    //     CandyMachineAddr,
    //     CandyGuard,
    //   ]);
    //   console.log(
    //     "Raw Candy Machine and Guard: ",
    //     rawCandyMachine,
    //     rawCandyGuard
    //   );
    //   const assertCandyMachine = await assertAccountExists(rawCandyMachine);
    //   const assertGuard = await assertAccountExists(rawCandyGuard);

    //   console.log("Candy Machine Assertion: ", assertGuard);

    //   //   const candyMachineDeserialised = deserializeCandyMachine(umi, rawCandyMachine);
    //   const candyGuardDeserialised = deserializeCandyGuard(umi, rawCandyGuard);

    //   //   console.log("Candy Machine: ", candyMachineDeserialised);
    //   console.log("Candy Guard: ", candyGuardDeserialised);
    } catch (error) {
      console.log(error);
    }
  }

  async function updateCollectionGuardGroup() {
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

  async function updateCollectionGuard() {
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

  async function deleteCandyMachineAndGuard() {
    console.log("Deleting Candy Machine And Candy Guard");
    const candyMachine = await fetchCandyMachine(umi, CandyMachine);

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

          <button onClick={makeCollection}>Create Collection</button>
          <button onClick={fetchCollection}>Get Collection</button>
          <button onClick={updateCollectionGuard}>Update Guard</button>

          <button onClick={mintAsset}>Mint Test Asset</button>
        </div>
      </div>
    </WalletModalProvider>
  );
}
