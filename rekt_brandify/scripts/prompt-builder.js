/**
 * prompt-builder.js
 *
 * Constructs the final AI edit prompt for each image based on:
 * - The meme category (which determines strategy)
 * - The specific filename (for additional hints)
 * - Global brand rules
 */

import { CATEGORY_CONFIG, BRAND, GLOBAL_BRAND_RULES } from '../config/brandify.config.js';
import path from 'path';

/**
 * Build the full edit prompt for a given image.
 * 
 * @param {string} category - Category name (e.g. "Angry - Wicked")
 * @param {string} filename - Image filename (e.g. "Pepe 1.jpg")
 * @returns {string} The complete prompt to send to GPT Image 2
 */
export function buildBrandifyPrompt(category, filename) {
  const config = CATEGORY_CONFIG[category];

  if (!config) {
    throw new Error(`No config found for category: "${category}"`);
  }

  const baseName = path.basename(filename, path.extname(filename));

  // Detect character hints from filename for smarter prompting
  const characterHints = detectCharacterHints(baseName);

  const prompt = `
You are a creative director at a crypto meme brand called "Rekt CEO" ($CEO token on Base chain).
Your task is to subtly brandify this meme template so it feels like it was created by the Rekt CEO creative team.

${characterHints ? `IMAGE CONTEXT: This appears to be a "${baseName}" meme. ${characterHints}` : ''}

BRAND: Rekt CEO ($CEO)
BRAND COLORS: Rekt Red (#e7255e), CEO Yellow (#F8C826), Deep Magenta (#3B1C32), Off White (#FFFFFF)
BRAND VIBE: Crypto-degen culture, meme community, "getting rekt" turned into a lifestyle brand

CATEGORY: ${category}
STRATEGY FOR THIS CATEGORY: ${config.strategy.join(' + ')}

SPECIFIC INSTRUCTIONS FOR THIS CATEGORY:
${config.promptInstruction.trim()}

${GLOBAL_BRAND_RULES.trim()}

Remember: The goal is for someone scrolling Twitter/X to see this meme and instantly recognize "that's a Rekt CEO meme" because of the subtle brand integration — not because there's a logo slapped on it. Think like a creative agency, not a watermark tool.
  `.trim();

  return prompt;
}

/**
 * Generate character-specific hints based on filename patterns.
 * This helps GPT Image 2 understand what it's looking at.
 */
function detectCharacterHints(basename) {
  const lower = basename.toLowerCase();

  const hints = {
    'pepe': 'Pepe the Frog is a cartoon frog character. He typically wears a shirt. The shirt color can be changed to brand colors.',
    'wojak': 'Wojak is a simple line-drawn man character, often in emotional situations.',
    'drake': 'Drake pointing meme format (two panels: reject/approve).',
    'homer': 'Homer Simpson cartoon character. He wears a white shirt — good candidate for shirt recolor.',
    'tom': 'Tom from Tom & Jerry cartoon. Good candidate for fur/outfit color accents.',
    'jerry': 'Jerry from Tom & Jerry cartoon.',
    'shrek': 'Shrek cartoon character. Can add brand elements to background.',
    'patrick': 'Patrick Star from SpongeBob. Can recolor his shorts/body.',
    'sponge': 'SpongeBob SquarePants character.',
    'krabs': 'Mr. Krabs from SpongeBob.',
    'morty': 'Morty from Rick and Morty. Yellow shirt is ideal for brand recolor.',
    'rick': 'Rick from Rick and Morty. White lab coat background can take brand color.',
    'pikachu': 'Pikachu Pokémon character. Yellow body, good for brand color accent on cheeks or background.',
    'stonks': 'Stonks meme — business man with stock chart. Background tint works well here.',
    'gru': 'Gru from Despicable Me. Wearing a dark outfit, good candidate for CEO badge.',
    'harold': 'Harold hiding pain meme — photorealistic man with smile. Background tint best approach.',
    'lisa': 'Lisa Simpson cartoon character.',
    'mario': 'Mario Nintendo character. Red outfit — potential brand accent on cap or badge.',
    'luigi': 'Luigi Nintendo character. Green outfit.',
    'emoji': 'Emoji/icon style image. Hue shift and badge work best.',
    'sans nom': 'Unknown character from French meme culture.',
    'bebe yoda': 'Baby Yoda (Grogu) from The Mandalorian. Green character — background/badge approach.',
    'batman': 'Batman superhero character. Dark costume — add brand elements subtly.',
    'spiderman': 'Spider-Man pointing at Spider-Man meme format.',
  };

  for (const [key, hint] of Object.entries(hints)) {
    if (lower.includes(key)) {
      return hint;
    }
  }

  return null;
}

/**
 * Get a short summary of what will happen to an image, for logging.
 */
export function getStrategyDescription(category) {
  const config = CATEGORY_CONFIG[category];
  if (!config) return 'unknown strategy';
  return config.strategy.join(' + ');
}
