"use server"
import React from "react";
//UMI
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  assertAccountExists,
  createSignerFromKeypair,
  dateTime,
  generateSigner,
  none,
  percentAmount,
  publicKey,
  sol,
  some,
  transactionBuilder,
} from "@metaplex-foundation/umi";
//MPL CORE AND CANDY MACHINE
import { findAssociatedTokenPda, setComputeUnitLimit } from "@metaplex-foundation/mpl-toolbox";
import { addCollectionPlugin, addCollectionPluginV1, addPluginV1, createCollection, createCollectionV1, fetchAsset, fetchCollection, ruleSet, update, updateCollectionPluginV1 } from "@metaplex-foundation/mpl-core";
import { addConfigLines, create, deleteCandyMachine, fetchCandyGuard, fetchCandyMachine, mintV1, route } from "@metaplex-foundation/mpl-core-candy-machine";
//CONSTANTS
import { coreCandyMachineAddr, coreCollectionNFTAddr, creator1, creator2, treasury, USDTDevnetAddr } from "../constants/metaplex";

//test function
import bs58 from 'bs58';


export async function createCoreCollectionNFT(umi){
    console.log("Creating Collection NFT ... ");
    try {
        //MPL CORE COLLECTION
        const collectionSigner = generateSigner(umi)

        await createCollection(umi, {
          collection: collectionSigner,
          name: 'Rekt Ceo PFP Collection',
          uri: 'https://gray-quintessential-jellyfish-921.mypinata.cloud/ipfs/bafkreiftdt25xg2hl3zv75rl2vz2cjl4b6lyxy6tx6wxoyhzfbsea47rwe',
          plugins:[{
            type:'Royalties',
            basisPoints:900,
            creators:[
                {address: creator1, percentage: 40},
                {address: creator2, percentage: 60}
            ],
            ruleSet:ruleSet("None"),
        }]
        }).sendAndConfirm(umi)

        console.log("Collection NFT: ", collectionSigner.publicKey);

    } catch (error) {
        console.log("Error Creating NFT: ", error)
    }

}

export async function createCoreCandyMachine(umi){
    console.log(" Creating Core Candy Machine ...");
    try {
        // const collectionSigner = generateSigner(umi)

        // await createCollectionV1(umi, {
        //   collection: collectionSigner,
        //   name: 'Rekt Ceo PFP Collection',
        //   uri: 'https://gray-quintessential-jellyfish-921.mypinata.cloud/ipfs/bafkreiftdt25xg2hl3zv75rl2vz2cjl4b6lyxy6tx6wxoyhzfbsea47rwe',
        // }).sendAndConfirm(umi)

        // console.log("Collection NFT: ", collectionSigner.publicKey);

        console.log("Collection NFT: ", coreCollectionNFTAddr)

        // MPL CORE CANDY MACHINE
        const candyMachine = generateSigner(umi)

        const createIx =  await create(umi, {
            candyMachine,
            collection: publicKey(coreCollectionNFTAddr),
            collectionUpdateAuthority: umi.identity,
            itemsAvailable: 1000,
            authority: umi.identity.publicKey,
            guards: {
              botTax: some({ lamports: sol(0.5), lastInstruction: true }),
              mintLimit: some({ id: 1, limit: 5 }),
            },
            groups: [
              {
                label: 'early',
                guards: {
                    tokenPayment: some({
                        amount: 10000000n, //10USDT
                        mint: publicKey(USDTDevnetAddr),
                        destinationAta: findAssociatedTokenPda(umi, {
                          mint: publicKey(USDTDevnetAddr),
                          owner: umi.identity.publicKey,
                        })[0],
                    }),
                  allocation: some({ id: 1, limit: 10 }),
                },
              },
              {
                label: 'late',
                guards: {
                    tokenPayment: some({
                        amount: 20000000n, //20USDT
                        mint: publicKey(USDTDevnetAddr),
                        destinationAta: findAssociatedTokenPda(umi, {
                          mint: publicKey(USDTDevnetAddr),
                          owner: umi.identity.publicKey,
                        })[0],
                    }),
                  allocation: some({ id: 2, limit: 10 }),
                },
              },
            ],
            configLineSettings: some({
                  prefixName: 'REKT CEO #',
                  nameLength: 3,
                  prefixUri: 'https://gray-quintessential-jellyfish-921.mypinata.cloud/ipfs/',
                  uriLength: 100,
                  isSequential: true,
                }),
            hiddenSettings: none()
          
        })
        await createIx.sendAndConfirm(umi);
        
        console.log("Core Candy Machine: ", candyMachine.publicKey)
        
    } catch (error) {
        console.log("error: ", error)
    }
}



export async function fetchCoreCandyMachine(umi){
    console.log("Fetching Core Candy Machine")
    try {
        const coreCandyMachine = await fetchCandyMachine(umi, publicKey(coreCandyMachineAddr));
        console.log("Core Candy Machine: ", coreCandyMachine);

        const coreCandyGuard =  await fetchCandyGuard(umi, coreCandyMachine.mintAuthority );
        console.log("Core Candy Guard: ", coreCandyGuard)

        const collection = await fetchCollection(umi, coreCollectionNFTAddr);
        console.log("Core Collection: ", collection);
        return coreCandyMachine
    } catch (error) {
        console.log("error while fetching collection: ", error)
    }
}

export async function initialiseAllocationGuard(umi){
    console.log("Init Allocation Guard ...")
    const candyMachine = await fetchCandyMachine(umi, publicKey(coreCandyMachineAddr));
    console.log("Core Candy Machine: ", candyMachine)

    try {
        const tx = await route(umi, {
            candyMachine: candyMachine.publicKey,
            guard: 'allocation',
            group: some('early'), // <- We are verifying using "allowListA".
            routeArgs: {
                id: 1,
                candyGuardAuthority: umi.identity,
            },
        }).sendAndConfirm(umi);
        
        console.log("Init Allocation Guard Group1: ", tx)


        const tx2 = await route(umi, {
            candyMachine: candyMachine.publicKey,
            guard: 'allocation',
            group: some('late'), // <- We are verifying using "allowListA".
            routeArgs: {
                id: 2,
                candyGuardAuthority: umi.identity,
            },
        }).sendAndConfirm(umi);
        
        console.log("Init Allocation Guard Group2: ", tx2)
    } catch (error) {
        console.log("error init allocation: ", error)
    }
}

export async function insertItemsInCoreCandyMachine(umi){
    console.log("Inserting Items...");
    try {
        const coreCandyMachine = await fetchCandyMachine(umi, coreCandyMachineAddr);
        console.log("Core Candy Machine: ", coreCandyMachine);

        const trx = await addConfigLines(umi, {
            candyMachine: coreCandyMachine.publicKey,
            index: coreCandyMachine.itemsLoaded,
            configLines: [
              { name: '11', uri: 'bafkreiftdt25xg2hl3zv75rl2vz2cjl4b6lyxy6tx6wxoyhzfbsea47rwe' },
              { name: '12', uri: 'bafkreiftdt25xg2hl3zv75rl2vz2cjl4b6lyxy6tx6wxoyhzfbsea47rwe' },
              { name: '13', uri: 'bafkreiftdt25xg2hl3zv75rl2vz2cjl4b6lyxy6tx6wxoyhzfbsea47rwe' },
              { name: '14', uri: 'bafkreiftdt25xg2hl3zv75rl2vz2cjl4b6lyxy6tx6wxoyhzfbsea47rwe' },
              { name: '15', uri: 'bafkreiftdt25xg2hl3zv75rl2vz2cjl4b6lyxy6tx6wxoyhzfbsea47rwe' },
              { name: '16', uri: 'bafkreiftdt25xg2hl3zv75rl2vz2cjl4b6lyxy6tx6wxoyhzfbsea47rwe' },
              { name: '17', uri: 'bafkreiftdt25xg2hl3zv75rl2vz2cjl4b6lyxy6tx6wxoyhzfbsea47rwe' },
              { name: '18', uri: 'bafkreiftdt25xg2hl3zv75rl2vz2cjl4b6lyxy6tx6wxoyhzfbsea47rwe' },
              { name: '19', uri: 'bafkreiftdt25xg2hl3zv75rl2vz2cjl4b6lyxy6tx6wxoyhzfbsea47rwe' },
              { name: '20', uri: 'bafkreiftdt25xg2hl3zv75rl2vz2cjl4b6lyxy6tx6wxoyhzfbsea47rwe' },
            ],
          }).sendAndConfirm(umi)

          console.log("Inserting Trx: ", trx)
    } catch (error) {
        console.log("Inserting item error: ", error)
    }
  }
  



  export async function mintCoreAsset(umi, group){
    console.log("Minting Asset From Core Candy Machine");
    console.log("Group: ", group, "id: ", group === 'early' ? 1 : 2)
    try {
        const asset = generateSigner(umi)

        const mintTx = await transactionBuilder()
          .add(setComputeUnitLimit(umi, { units: 300_000 }))
          .add(
            mintV1(umi, {
              candyMachine: publicKey(coreCandyMachineAddr),
              asset,
              collection: publicKey(coreCollectionNFTAddr),
              group: some(group),
              mintArgs: {
                mintLimit: some({id: 1}),
                tokenPayment: some({
                    mint: publicKey(USDTDevnetAddr),
                    destinationAta: findAssociatedTokenPda(umi, {
                        mint: publicKey(USDTDevnetAddr),
                        owner: publicKey(treasury),
                    })[0],
                  }),
                allocation: some({id: group === 'early' ? 1 : 2})
              },
            })
          )
          .sendAndConfirm(umi)

          console.log("Mint Transaction : ", asset.publicKey, mintTx)
          return {
            nftAddress: asset.publicKey,
            mintTrxn: mintTx
          }
        
    } catch (error) {
        console.log("Minting Failed: ", error)
        return error
    }
  }

  export async function updateAssetMetadata(umi, assetAddr, metadataUri){
    console.log("Updating Asset Metadata ...")
    // const assetAddr = '2VRFSssaPKYv71iq75vA97DtHR8EYzKtWfnkzRUSZQAj'; // Change Asset 
    // const metadataUri = 'bafkreibjj6gi7xyfgu52z7c2df53mz4emz6z3xfysxnytnvviamtwkiena' // Change Metadata 


    const assetId = publicKey(assetAddr);
    const asset = await fetchAsset(umi, assetId)
    console.log("Asset: ", asset)

    const collection = await fetchCollection(umi, coreCollectionNFTAddr);
    console.log("Collection: ", collection);

    try {
        const tx = await update(umi, {
            asset,
            // Optional: Collection is only required if Asset is part of a collection
            collection,
            uri: `https://gray-quintessential-jellyfish-921.mypinata.cloud/ipfs/${metadataUri}`,
          }).sendAndConfirm(umi)

          console.log("Updating Transaction: ",tx)
          return tx
    } catch (error) {
        console.log("Error updating asset: ",error);
        return error 
    }
    // { name: '3', uri: 'bafkreieuamujjsiquvw5fvhczwy27sq3inf3tk3yngpwa3cwilljkco37e' },
    // { name: '4', uri: 'bafkreies2qld523v2i2zixinaawt3mlxpxy263kvcoiomt3wlkkx5bltbm' },
    // { name: '5', uri: 'bafkreibjj6gi7xyfgu52z7c2df53mz4emz6z3xfysxnytnvviamtwkiena' },
    // { name: '6', uri: 'bafkreibjj6gi7xyfgu52z7c2df53mz4emz6z3xfysxnytnvviamtwkiena' },
    // { name: '7', uri: 'bafkreigwjgsz3x2jwrcdtuys2bu2idnk7ov67aryrrrhg6cjyxbafwaefy' },
    // { name: '8', uri: 'bafkreie3h4vzvkp7h55z4xvxlvhjj4piiamasew6etnk3kgs57cmeyphbq' },
  }


  export async function updateWithPlugin(umi){
    console.log("Updating Collection Plugin ... ");
    console.log("Collection Address: ", coreCollectionNFTAddr);

    try {
        // const updateTx = await updateCollectionPluginV1(umi,{
        //     collection: publicKey(coreCollectionNFTAddr),
        //     plugin: {
        //         type: 'Royalties',
        //         basisPoints: 900n,
        //         creators: [{ address: publicKey(creator1), percentage: 40 }, {address: publicKey(creator2), percentage: 60}],
        //         ruleSet: ruleSet('None'),
        //       },
        // }).sendAndConfirm(umi);

        //MUST ADD PLUGIN
        const addTx = await addCollectionPlugin(umi, {
            collection: publicKey(coreCollectionNFTAddr),
            plugin:{
                type:'Royalties',
                basisPoints:900,
                creators:[
                    {address: creator1, percentage: 40},
                    {address: creator2, percentage: 60}
                ],
                ruleSet:ruleSet("None"),
            }
        }).sendAndConfirm(umi);

        console.log("Collection Plugin Updated:", addTx)
    } catch (error) {
        console.log("Error updating collection plugin: ", error)
    }
  }


  export async function deleteCoreCandyMachine(umi) {
    console.log("Deleting Candy Machine And Candy Guard");
    const candyMachine = await fetchCandyMachine(umi, coreCandyMachineAddr);

    try {
      const txCandy = await deleteCandyMachine(umi, {
        candyMachine: candyMachine.publicKey,
      }).sendAndConfirm(umi);

      // const txGuard = await deleteCandyGuard(umi, {
      //   candyGuard: candyMachine.mintAuthority,
      // }).sendAndConfirm(umi);
      console.log("Deleted Programs sucessfully", txCandy)
    } catch (error) {
      console.log("Error deleting: ", error);
    }
  }


  export async function testFunction(umi){
    // const tokenPda = findAssociatedTokenPda(umi, {
    //     mint: publicKey(USDTDevnetAddr),
    //     owner: umi.identity.publicKey,
    //   }
    // )
    // console.log("Token PDA: ", tokenPda)
    const uint8arrayKey = Uint8Array.from([29,11,128,182,90,219,106,27,40,97,96,67,224,133,91,126,24,19,241,103,191,197,151,38,118,14,89,223,216,42,124,255,10,133,253,112,26,123,239,227,216,200,137,103,177,43,51,228,117,254,249,4,206,24,72,255,248,243,93,181,17,214,137,32])
    const signer =  bs58.encode(uint8arrayKey)
    console.log("PrivateKey : ", signer);
  } 