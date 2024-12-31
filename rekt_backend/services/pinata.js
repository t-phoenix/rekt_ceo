const fs = require("fs");
const { PinataSDK } = require("pinata-web3");
const { BASE_JSON } = require("./nftMetadata");
require("dotenv").config();

let supply = 7;

// PINATA
const PinataGroupID = "a7eec897-8758-4741-914e-b14a46034409";
const pinata = new PinataSDK({
  pinataJwt: process.env.REACT_APP_PINATA_JWT,
  pinataGateway: process.env.REACT_APP_GATEWAY_URL,
});

module.exports.uploadImageToPinata = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("File uploaded:", req.file);

    const result = uploadImageWithFile(req.file);
    // Cleanup: Remove local file after upload
    fs.unlinkSync(req.file.path);

    // Send Response to Frontend
    res.json({
      message: "File uploaded and pinned successfully to Pinata",
      pinataUrl: `https://${process.env.REACT_APP_GATEWAY_URL}/ipfs/${result.IpfsHash}`,
      ipfsHash: result.IpfsHash,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports.uploadImageWithFile = async (file) => {
  try {
    const fileBuffer = fs.readFileSync(file.path);
    const fileName = `Rekt Ceo #${supply + 1}.png`;

    console.log("File Name to upload: ", fileName);

    // Upload file to Pinata
    const result = await pinata.upload
      .file(
        new Blob([fileBuffer]) // Ensure correct Blob type
      )
      .addMetadata({ name: fileName })
      .group(PinataGroupID);
    console.log("Pinata Response:", result);
    return result;
  } catch (error) {
    console.error("Error uploading file:", error);
    return { error: "Internal server error" };
  }
};

module.exports.uploadMetadata = async (req) => {
  console.log("Composing Metadata...");
   // FETCH SUPPLY FROM SOLANA

  try {
    const item_json = JSON.parse(JSON.stringify(BASE_JSON));
    item_json.name = BASE_JSON.name + `${supply + 1}`;

    item_json.image = req.imageUri;
    item_json.properties.files[0].uri = req.imageUri;

    item_json.attributes = req.attributes;
    console.log("Metadata JSON Uploading: ", item_json);

    const result = await pinata.upload
      .json(item_json)
      .addMetadata({
        name: `${item_json.name}.json`,
      })
      .group(PinataGroupID);

    return result; 
  } catch (error) {
    console.error("Error uploading file:", error);
    return { error: "Internal server error" };
  }
};
