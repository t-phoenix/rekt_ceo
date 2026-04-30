// Centralized brand asset map for the Launch Hub.
// Keep this file in sync with the rekt_website/src/creatives/* folder.

import baseLogo from "../../creatives/crypto/base.png";
import solanaLogo from "../../creatives/crypto/solana.png";
import pumpFunLogo from "../../creatives/crypto/pump_fun.png";
import wormholeLogo from "../../creatives/crypto/wormhole.png";
import uniswapLogo from "../../creatives/crypto/uniswap.png";
import usdcLogo from "../../creatives/crypto/usdc.png";

import ceoBadge from "../../creatives/rekt_stickers/ceo_badge.png";
import degenSticker from "../../creatives/rekt_stickers/degen-mode-activated.png";
import degenActivated from "../../creatives/rekt_stickers/degen-activated.png";
import wagmSticker from "../../creatives/rekt_stickers/wagm.png";
import logo3D from "../../creatives/rekt_stickers/Rekt_logo_3D.png";
import logo2D from "../../creatives/rekt_stickers/Rekt_logo_2D.png";
import beerSticker from "../../creatives/rekt_stickers/rektceo_beer-.png";
import controllerSticker from "../../creatives/rekt_stickers/rkt_controller.png";
import bottleSticker from "../../creatives/rekt_stickers/rekt_bottle.png";
import rektAgain from "../../creatives/rekt_stickers/rekt_again.png";
import hodlBubble from "../../creatives/rekt_stickers/hodl_bubble.png";

export const cryptoLogo = {
  base: baseLogo,
  solana: solanaLogo,
  pumpFun: pumpFunLogo,
  wormhole: wormholeLogo,
  uniswap: uniswapLogo,
  usdc: usdcLogo,
};

export const sticker = {
  ceoBadge,
  degenSticker,
  degenActivated,
  wagmSticker,
  logo3D,
  logo2D,
  beer: beerSticker,
  controller: controllerSticker,
  bottle: bottleSticker,
  rektAgain,
  hodlBubble,
};

export const campaignIcon = {
  meme: rektAgain,
  tag: hodlBubble,
  discord: controllerSticker,
  invite: ceoBadge,
  telegram: wagmSticker,
  spin: degenSticker,
  pumpFun: pumpFunLogo,
  uniswap: uniswapLogo,
  wormhole: wormholeLogo,
  base: baseLogo,
  solana: solanaLogo,
};

export const providerMeta = {
  x: {
    label: "X (TWITTER)",
    accent: "#1DA1F2",
    helpUrl: "https://twitterapi.io/",
  },
  discord: {
    label: "DISCORD",
    accent: "#7289DA",
    helpUrl: "https://discord.com/",
  },
  telegram: {
    label: "TELEGRAM",
    accent: "#26A5E4",
    helpUrl: "https://core.telegram.org/widgets/login",
  },
  solana: {
    label: "SOLANA WALLET",
    accent: "#9945FF",
    helpUrl: "https://phantom.app/",
  },
};
