const { createUmi } = require("@metaplex-foundation/umi-bundle-defaults");
const {
  mplCandyMachine,
  createCandyMachine,
} = require("@metaplex-foundation/mpl-candy-machine");
const { generateSigner, publicKey } = require("@metaplex-foundation/umi");
const {
  createNft,
  TokenStandard,
} = require("@metaplex-foundation/mpl-token-metadata");
const { signerIdentity, some } = require("@metaplex-foundation/umi");
const { getWallet } = require("./helpers");
const {
  mplCore,
  create,
  createCollection,
  fetchCollection,
  ruleSet,
  fetchAsset
} = require("@metaplex-foundation/mpl-core");

const umi = createUmi("https://api.devnet.solana.com").use(mplCore());

const collectionjson =
  "bafkreifzik26lxf5tkkwcpex5rcf5nn7gxw5fs2w56foeq6lun3nbfnuye";
const collectionPubkey = "ChDBp2Kgv3ffVQ1XWKjGkcH6EKKA51K29vnVHCYKRKC8";

let assetSupply = 1;

module.exports.createNFTCollection = async (req, res) => {
  const signer = await getWallet(umi);
  umi.use(signerIdentity(signer));

  try {
    const collectionSigner = generateSigner(umi);
    // console.log("Collection: ", collectionSigner)
    const tx = await createCollection(umi, {
      collection: collectionSigner,
      name: "Rekt Ceo Collection",
      uri: `https://${process.env.REACT_APP_GATEWAY_URL}/ipfs/${collectionjson}`,
      plugins: [
          {
            type: 'Royalties',
            basisPoints: 500,
            creators: [
              {
                address: umi.identity.publicKey,
                percentage: 100,
              }
            ],
            ruleSet: ruleSet('None'), // Compatibility rule set
          },
        ],
    }).sendAndConfirm(umi);

    console.log("Transaction: ", tx);

    const collectionId = publicKey(collectionSigner.publicKey);

    const collection = await fetchCollection(umi, collectionId);
    console.log("Collection: ", collection);

    res.status(200).json({ message: "Collection Created Succesfully" });
  } catch (error) {
    console.log("Error:", error);
    res.status(500).json({ error: "Failed to create Collection" });
  }
};


module.exports.mintNFT = async (req, res) => {
  // CHANGE THIS FOR FRONTEND TRXN
  const signer = await getWallet(umi);
  umi.use(signerIdentity(signer));

  console.log("Umi Identity: ", umi.identity);

  try {
    const collection = await fetchCollection(umi, collectionPubkey);
    const assetSigner = generateSigner(umi);
    await create(umi, {
      asset: assetSigner,
      collection: collection,
      
      name: `Rekt Ceo ${assetSupply + 1}`,
      uri: "https://gray-quintessential-jellyfish-921.mypinata.cloud/ipfs/bafkreigwjgsz3x2jwrcdtuys2bu2idnk7ov67aryrrrhg6cjyxbafwaefy",
      external_url: "https://www.rektceo.club",
      plugins: [
        {
          type: "Royalties",
          basisPoints: 500,
          creators: [
            {
              address: umi.identity.publicKey,
              percentage: 100,
            },
          ],
          ruleSet: ruleSet("None"), // Compatibility rule set
        },
      ],
    }).sendAndConfirm(umi);
    assetSupply = assetSupply+1;

    const asset = await fetchAsset(umi, assetSigner.publicKey, {
      skipDerivePlugins: false,
    });

    console.log("Asset: ", asset);
    res.status(200).json({ message: "Mint Succesfull", asset: asset });
  } catch (error) {
    console.log("Error:", error);
    res.status(500).json({ error: "Failed to create Asset" });
  }
};

module.exports.getCollection = async (req, res) => {
    try {
        console.log("Fetching collection");
        const collectionId = publicKey(collectionPubkey);
        const collection = await fetchCollection(umi, collectionId)
        console.log("Collection :", collection);
        res.status(200).json({message: "Collection Retrieval Succesful", collection: JSON.stringify(collection)});
    } catch (error) {
        console.log("Error: ", error);
        res.status(500).json({ error: "Failed to retrieve Collection" });
    }

}
