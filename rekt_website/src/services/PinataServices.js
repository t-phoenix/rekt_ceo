import html2canvas from "html2canvas";
import { PinataSDK } from "pinata-web3";
import { BASE_JSON } from "../constants/nftMetadata";
import { layerNames } from "../constants/layers";
const PinataGroupID = "a7eec897-8758-4741-914e-b14a46034409";

const pinata = new PinataSDK({
  pinataJwt: process.env.REACT_APP_PINATA_JWT,
  pinataGateway: process.env.REACT_APP_GATEWAY_URL
})

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
  

  export async function uploadImageToIPFS(supply){
    const compositeElement = document.getElementById("composite-container");
    
    const canvas = await html2canvas(compositeElement);
    const image = canvas.toDataURL("image/png");
    
    const file = dataURLtoFile(image, `Rekt Ceo #${supply+1}.png`);

    
      const result = await pinata.upload.file(file).group(PinataGroupID);

      // RETURNS
      // IpfsHash, PinSize, TimeStamp
      console.log("File uploaded to IPFS:", result);

      // Return IPFS link
      const ipfsLink = `https://${process.env.REACT_APP_GATEWAY_URL}/ipfs/${result.IpfsHash}`;
    //   console.log("IPFS Link:", ipfsLink);
      return ipfsLink; 
  }


export function generateMetadata(supply, selectedLayer, imageUri ){
    console.log("Generating Metadata...");

    // const resultIpfs =  await uploadImage();
    const item_json = JSON.parse(JSON.stringify(BASE_JSON));
    console.log(BASE_JSON);

    item_json.name = BASE_JSON.name+`${supply+1}`
    console.log(item_json)

    // item_json.image = resultIpfs;
    // item_json.properties.files[0].uri = resultIpfs;
    item_json.image = imageUri;
    item_json.properties.files[0].uri = imageUri;

    let attribute_list = [
      { "trait_type": "Hoodie", "value": `${layerNames[1][selectedLayer[1]]}` },
      { "trait_type": "Pants", "value": `${layerNames[2][selectedLayer[2]]}` },
      { "trait_type": "Shoes", "value": `${layerNames[3][selectedLayer[3]]}` },
      { "trait_type": "Rekt Coin", "value": "rekt_coin" },
      { "trait_type": "Skin", "value": `${layerNames[4][selectedLayer[4]]}` },
      { "trait_type": "Face", "value": `${layerNames[5][selectedLayer[5]]}` },
      { "trait_type": "Coin", "value": `${layerNames[6][selectedLayer[6]]}` }
    ]

    item_json.attributes = attribute_list;
    return item_json;   
  }


  export async function uploadMetadataToIPFS(metadataJSON){
    console.log("Metadata JSON: ", metadataJSON);
    
    // RETURNS
    // IpfsHash, PinSize, TimeStamp
    const result = await pinata.upload.json(metadataJSON).addMetadata({
        name: `${metadataJSON.name}.json`
      }).group(PinataGroupID);
    
    // console.log("Metadata IPFS Link:", ipfsLink);
    return result;
    
  }