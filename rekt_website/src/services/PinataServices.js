import { PinataSDK } from "pinata-web3";

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
  

export async function uploadFile(file){
    try {
        const upload = await pinata.upload.file(file);
        return upload;  
      } catch (error) {
        console.log(error)
        return error
      }
    
}

export async function uploadJSON(jsonFile){
    try {
        const upload = await pinata.upload.json(jsonFile);
        return upload;  
      } catch (error) {
        console.log(error)
        return error
      }
    
}