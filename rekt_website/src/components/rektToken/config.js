import rektLogo from "../../creatives/Rekt_logo_illustration.png";
import usdcLogo from "../../creatives/crypto/usdc.png";

export const BASE_USDC_ADDRESS = process.env.BASE_USDC_ADDRESS || "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const BASE_TOKEN_ADDRESS = process.env.BASE_TOKEN_ADDRESS || "0x296ad590f077614d951ccc630e763765d1Ef004f";
export const TARGET_CHAIN_ID = Number(process.env.BASE_CHAIN_ID || 8453);

export const MOCK_TOKENS = {
    CEO: { symbol: "CEO", name: "Rekt CEO", logo: rektLogo, address: BASE_TOKEN_ADDRESS },
    USDC: { symbol: "USDC", name: "USD Coin", logo: usdcLogo, address: BASE_USDC_ADDRESS },
};
