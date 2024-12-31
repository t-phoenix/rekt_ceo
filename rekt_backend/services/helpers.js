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
