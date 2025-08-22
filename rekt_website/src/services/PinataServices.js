// Note: Pinata functionality has been removed. This file is kept for future reference.
// To re-enable IPFS uploads, you'll need to implement a different IPFS solution.

export async function uploadImageToIPFS(supply){
  console.log("IPFS upload functionality has been removed. Please implement an alternative solution.");
  return null;
}

export function generateMetadata(supply, selectedLayer, imageUri ){
  console.log("Generating Metadata...");

  // Note: This function requires BASE_JSON and layerNames to be imported when needed
  console.log("Metadata generation requires BASE_JSON and layerNames imports");

  return null;   
}

export async function uploadMetadataToIPFS(metadataJSON){
  console.log("IPFS upload functionality has been removed. Please implement an alternative solution.");
  return null;
}

// MEANT FOR ProfileNFT.js file
// SAVING HERE
// async function uploadPfpData() {
//   try {
//     console.log("Starting the NFT upload process...");

//     // Step 1: Upload Image
//     const imageHash = await retry(() => uploadImageToIPFS(supply), 3, 2000); 
//     console.log("Step 1 Complete: Image Hash ->", imageHash);

//     // Step2: Generate Metadata
//     const json_metadata = await generateMetadata(supply, selectedLayer, imageHash);
//     console.log("Step 2 Complete: Metadata Generatioj: ", json_metadata); 

  
//     // Step 3: Upload Metadata
//     const metadataHash = await retry(()=> uploadMetadataToIPFS(json_metadata));
//     console.log("Step 3 Complete: Metadata Hash ->", metadataHash);

//     const ipfsLink = `https://${process.env.REACT_APP_GATEWAY_URL}/ipfs/${metadataHash.IpfsHash}`;
  
//     console.log("Console.log("NFT Metadata Upload Process Completed Successfully!");
//     console.log("Link:", ipfsLink)

//     setSupply(supply+1)
//     // UPDATE METEADATA URI to NFT

//   } catch (error) {
//     console.error("Error during Metadata upload process:", error.message || error);
//     throw error; // Rethrow for further handling if needed
//   }
// }