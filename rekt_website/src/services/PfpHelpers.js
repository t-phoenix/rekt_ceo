/**
 * Retry utility function
 * @param {Function} fn - The async function to retry
 * @param {number} retries - Number of retry attempts
 * @param {number} delay - Delay between retries in ms
 */

import html2canvas from "html2canvas";

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
