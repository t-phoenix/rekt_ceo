const BASE_IMAGE_URL = "ipfs://";
const EXTERNAL_URL = "https://www.rektceo.club/";
const BASE_NAME = "Rekt Ceo #";
const DESCRIPTION = "Own the chaos, wear the crown—Rekt CEO PFP, where degenerates become legends.";
const PROPERTIES = {
  files: [
    {
      uri: BASE_IMAGE_URL,
      type: "image/png",
    },
  ],
  category: "image",
};

 const BASE_JSON = {
  name: BASE_NAME,
  description: DESCRIPTION,
  image: BASE_IMAGE_URL,
  external_url: EXTERNAL_URL,
  attributes: [],
  properties: PROPERTIES,
};

// Exporting variables using CommonJS syntax
module.exports = {
  BASE_IMAGE_URL,
  EXTERNAL_URL,
  BASE_NAME,
  DESCRIPTION,
  PROPERTIES,
  BASE_JSON,
};