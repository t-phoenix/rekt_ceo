const { createUmi } = require("@metaplex-foundation/umi-bundle-defaults");
const { createNft } = require('@metaplex-foundation/mpl-token-metadata')
const { generateSigner, signerIdentity, publicKey , some, sol} = require("@metaplex-foundation/umi");
const { 
    mplCandyMachine, create, fetchCandyMachine, mintV1
  } = require("@metaplex-foundation/mpl-core-candy-machine");
const { getWallet } = require("./helpers");


const umi = createUmi("https://api.devnet.solana.com").use(mplCandyMachine());


module.exports.createCandyMachine = async (req, res) => {
    const signer = await getWallet(umi);
    umi.use(signerIdentity(signer));
  
    try {

        // Collectio NFT
        // const collectionMint =  generateSigner(umi)
        const collectionMint = {publicKey: '7N6xTrM3aUAfk3VNFuGPJXcqK8UykSk7UJkmLBywgYEf'}
        // await createNft(umi, {
        //     mint: collectionMint,
        //     authority: umi.identity,
        //     name: 'Rekt Ceo Collection NFT',
        //     uri: 'https://gray-quintessential-jellyfish-921.mypinata.cloud/ipfs/bafkreiftdt25xg2hl3zv75rl2vz2cjl4b6lyxy6tx6wxoyhzfbsea47rwe',
        //     sellerFeeBasisPoints: 160, // 1.6%
        //     isCollection: true,
        //   }).sendAndConfirm(umi)
          
        console.log("Collection NFT: ", collectionMint);

        // Candy Machine
        const candyMachine = generateSigner(umi)
        await create(umi, {
            candyMachine,
            collection: collectionMint.publicKey,
            collectionUpdateAuthority: umi.identity,
            itemsAvailable: 1000,
            sellerFeeBasisPoints: 160,
            authority: umi.identity.publicKey,
            configLineSettings: some({
                prefixName: "Rekt Ceo #",
                nameLength: 4,
                prefixUri: "https://gray-quintessential-jellyfish-921.mypinata.cloud/ipfs/",
                uriLength: 40,
                isSequential: true
            }),
            guards: {
                //botTax: some({ lamports: sol(0.01), lastInstruction: true }),
                solPayment: some({ lamports: sol(0.1), destination: umi.identity }),
                // startDate: some({ date: dateTime('2023-04-04T16:00:00Z') }),
                // All other guards are disabled...
            },
        }).sendAndConfirm(umi)
        // await tx.sendAndConfirm(umi);
  
        console.log("Transaction: ", tx);
  
      const collectionId = publicKey(candyMachine.publicKey);
  
      const collection = await fetchCandyMachine(umi, collectionId);
      console.log("Candy Machine: ", collection);
      console.log("Pubkey: ", collection.publicKey);
      console.log("Collection Mint: ", collection.collectionMint)

      
      res.status(200).json({ message: "Candy Machine Created Succesfully" });
    } catch (error) {
      console.log("Error:", error);
      res.status(500).json({ error: "Failed to create Collection" });
    }
  };