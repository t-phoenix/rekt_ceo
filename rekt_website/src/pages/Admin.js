
import React from "react"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { generateSigner } from "@metaplex-foundation/umi"
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
// import {
//     mplTokenMetadata,

//   } from '@metaplex-foundation/mpl-token-metadata'
//import { mplCandyMachine } from '@metaplex-foundation/mpl-candy-machine'
// import { create } from '@metaplex-foundation/mpl-core-candy-machine'

//   import { create } from '@metaplex-foundation/mpl-candy-machine'




export default function AdminPage(){
    const wallet = useWallet();
    const umi = createUmi(
        "https://solana-devnet.g.alchemy.com/v2/8fB9RHW65lCGqnRxrELgw5y0yYEOFvu6"
      )
      umi.use(walletAdapterIdentity(wallet));
    //   umi.use(mplCandyMachine());


    async function makeCollection(){
        console.log("Creating Collection ...");
        const collectionMint = generateSigner(umi);
        // await create(umi)

    }

    async function testBackend(){
        const lowercase = "i am not here"
        fetch(`http://localhost:3001/uppercase/${lowercase}`)
            .then(res=> res.json())
            .then(data=> console.log("Response: ", data.message))
            .catch(err=> console.log("Error: ", err))
    }


    return(
        <WalletModalProvider>

        <div style={{marginTop: '14vh'}}>
            <h1>Admin</h1>
            <div style={{display: 'flex', flexDirection: 'column', alignItems:'center'}}>
                <WalletMultiButton />

                <button onClick={makeCollection}>Create Collection</button>
                <button onClick={testBackend}>Test Backend</button>
            </div>
        </div>
        </WalletModalProvider>
    )
}