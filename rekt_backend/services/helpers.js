const fs = require("fs");
const path = require("path");
const { createSignerFromKeypair } = require("@metaplex-foundation/umi");

module.exports.getWallet = (umi) => {
  try {
    const __dirname = path.resolve();
    const resolvedPath = path.join(__dirname, "./keypair.json");
    const walletFile = Uint8Array.from(
      JSON.parse(fs.readFileSync(resolvedPath, "utf8"))
    );

    // console.log("wallet:", walletFile);
    let keypair = umi.eddsa.createKeypairFromSecretKey(walletFile);

    const signer = createSignerFromKeypair(umi, keypair);
    return signer;
  } catch (error) {
    return error;
  }
};


//USING EXPRESS BACKEND
  // async function uploadMetadata() {
  //   const compositeElement = document.getElementById("composite-container");

  //   const canvas = await html2canvas(compositeElement);
  //   const image = canvas.toDataURL("image/png");

  //   const file = dataURLtoFile(image, `Rekt Ceo.png`);

  //   let attribute_list = [
  //     { trait_type: "Background", value: `${layerNames[0][selectedLayer[0]]}` },
  //     { trait_type: "Hoodie", value: `${layerNames[1][selectedLayer[1]]}` },
  //     { trait_type: "Pants", value: `${layerNames[2][selectedLayer[2]]}` },
  //     { trait_type: "Shoes", value: `${layerNames[3][selectedLayer[3]]}` },
  //     { trait_type: "Rekt Coin", value: "rekt_coin" },
  //     { trait_type: "Skin", value: `${layerNames[4][selectedLayer[4]]}` },
  //     { trait_type: "Face", value: `${layerNames[5][selectedLayer[5]]}` },
  //     { trait_type: "Coin", value: `${layerNames[6][selectedLayer[6]]}` },
  //   ];

  //   const formData = new FormData();
  //   formData.append("image", file);
  //   formData.append("attributes", JSON.stringify(attribute_list)); // Add attribute list as JSON string

  //   fetch(`http://localhost:3001/uploadImageAndMetadata`, {
  //     method: "POST",
  //     body: formData,
  //   })
  //     .then((response) => {
  //       if (response.ok) {
  //         return response.json();
  //       } else {
  //         throw new Error("File upload failed");
  //       }
  //     })
  //     .then((data) => {
  //       console.log("Server response:", data);
  //     })
  //     .catch((error) => {
  //       console.error("Error uploading file:", error);
  //     });
  // }