/**
 * Retry utility function
 * @param {Function} fn - The async function to retry
 * @param {number} retries - Number of retry attempts
 * @param {number} delay - Delay between retries in ms
 */

import html2canvas from "html2canvas";
import { generateMetadata, uploadImageToIPFS, uploadMetadataToIPFS } from "./PinataServices";
import { createSignerFromKeypair, signerIdentity } from "@metaplex-foundation/umi";
import { updateAssetMetadata } from "./coreCandyMachine";

export const downloadImage = async () => {
  const compositeElement = document.getElementById("composite-container");
  if (compositeElement) {
    const canvas = await html2canvas(compositeElement);
    const image = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = image;
    link.download = "rekt_ceo.png";
    link.click();
  }
};

export async function retry(fn, retries = 3, delay = 1000) {
    let attempt = 0;
    while (attempt < retries) {
      try {
        return await fn();
      } catch (error) {
        attempt++;
        console.warn(`Attempt ${attempt} failed: ${error.message || error}`);
        if (attempt === retries) {
          console.error(`Failed after ${retries} attempts.`);
          throw error;
        }
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }

  export function dataURLtoFile(dataUrl, filename) {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1]; // Extract MIME type
    const bstr = atob(arr[1]); // Decode base64
    let n = bstr.length;
    const u8arr = new Uint8Array(n); // Create a Uint8Array
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n); // Populate the array with binary data
    }
  
    return new File([u8arr], filename, { type: mime }); // Create a File object
  }

  // Utility to Convert DataURL to Blob
export function dataURLtoBlob(dataURL) {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
  }

  return new Blob([u8arr], { type: mime });
}

export async function waitForConfirmation(umi, transactionId, maxRetries = 20, delay = 20000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const confirmation = await umi.rpc.getTransaction(transactionId);
      console.log("Confirmation: ", confirmation)
      if (confirmation) {
        console.log(`Transaction ${transactionId} confirmed.`);
        return;
      }
    } catch (error) {
      console.log(`Attempt ${attempt}: Waiting for transaction confirmation...`);
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  throw new Error(`Transaction ${transactionId} confirmation failed.`);
}

export async function retryWithBackoff(fn, retries = 5, delay = 30000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      console.log(`Retry ${attempt}/${retries} failed. Retrying in ${delay}ms...`);
      if (attempt === retries) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
}



export async function uploadMetadata(collectionSupply, selectedLayer) {
  try {
    //Step1: Upload Image
    const uploadImageResult = await uploadImageToIPFS(collectionSupply);
    console.log("Image Link: ", uploadImageResult);

    // Step2: Generate Metadata
    const getMatadataJSON = await generateMetadata(
      collectionSupply,
      selectedLayer,
      uploadImageResult
    );

    // Step3: Upload Metadata
    console.log("JSON Metadata:", getMatadataJSON);
    const uploadMetadataResult = await uploadMetadataToIPFS(getMatadataJSON);

    //   const ipfsLink = `https://${process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/${uploadMetadataResult.IpfsHash}`;
    console.log("IPFS Link: ", uploadMetadataResult.IpfsHash);

    //Use On chain data in production
    // setSupply(collectionSupply + 1);
    return uploadMetadataResult.IpfsHash;
  } catch (error) {
    console.log("Error Uploading Image or Metadata JSON to pinata: ", error);
    return "";
  }
}

export async function updateMetadata(umi, nftAddress, metadataUri) {
  console.log("Keypair: ", process.env.NEXT_PUBLIC_ADMIN_KEYPAIR);
  const walletFile = Uint8Array.from(
    JSON.parse(process.env.NEXT_PUBLIC_ADMIN_KEYPAIR)
  );
  let keypair = umi.eddsa.createKeypairFromSecretKey(walletFile);
  console.log("Keypair: ", keypair);
  const signer = createSignerFromKeypair(umi, keypair);

  umi.use(signerIdentity(signer));
  console.log("UMI:", umi.identity);
  // const nftAddress = 'DcNcx8HhSGG1eQ6A6H7wCvHNbWRjUw9knDkVK1NQXhEC';
  // const metadataUri = 'bafkreib2xs2f77jno7q5w7jjtrpu736blxn2kv5oce7tphqot5mjyvl3wy'
  const updateResult = await updateAssetMetadata(
    umi,
    nftAddress,
    metadataUri
  );
  return updateResult;
}
