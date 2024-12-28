export const BASE_IMAGE_URL = "ipfs://";
export const EXTERNAL_URL = "https://www.rektceo.club/";
export const BASE_NAME = "Rekt Ceo #";
export const DESCRIPTION =
  "Own the chaos, wear the crown—Rekt CEO PFP, where degenerates become legends.";
export const PROPERTIES = {
  files: [
    {
      uri: BASE_IMAGE_URL,
      type: "image/png",
    },
  ],
  category: "image",
};

export const BASE_JSON = {
  name: BASE_NAME,
  description: DESCRIPTION,
  image: BASE_IMAGE_URL,
  external_url: EXTERNAL_URL,
  attributes: [],
  properties: PROPERTIES,
};
