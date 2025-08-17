import meme1 from "../creatives/meme/Batman.png";
import meme2 from "../creatives/meme/Drake.png";
import meme3 from "../creatives/meme/Leonardo.png";
import meme4 from "../creatives/meme/Monkey.png";
import meme5 from "../creatives/meme/Success.png";
import meme6 from "../creatives/meme/Safe.png";
import meme7 from "../creatives/meme/Disaster.png";
import meme8 from "../creatives/meme/Office.png";
import meme9 from "../creatives/meme/Buttons.png";
import { buildFromRequireContext } from "../utils/loadMemes";
// Note: Keep legacy simple templates for old Meme page compatibility


// Categorized meme templates for MemeGen
export const memeTemplates = [
    { id: 1, src: meme1, name: "Meme 1" },
    { id: 2, src: meme2, name: "Meme 2" },
    { id: 3, src: meme3, name: "Meme 3" },
    { id: 4, src: meme4, name: "Meme 4" },
    { id: 5, src: meme5, name: "Meme 5" },
    { id: 6, src: meme6, name: "Meme 6" },
    { id: 7, src: meme7, name: "Meme 7" },
    { id: 8, src: meme8, name: "Meme 8" },
    { id: 9, src: meme9, name: "Meme 9" },
];

// Dynamic categorized meme templates for MemeGen (Option A — require.context)

const memesCtx = require.context(
  "../creatives/memes",
  true,
  /(png|jpe?g|gif|webp)$/i
);

export const categorizedMemeTemplates = buildFromRequireContext(memesCtx);
export const memeCategories = Object.keys(categorizedMemeTemplates);