/** Chain IDs and metadata used by Nexus bridge/swap UI (v1 SDK constants removed in v2). */

export const SUPPORTED_CHAINS = {
  ETHEREUM: 1,
  BASE: 8453,
  ARBITRUM: 42161,
  OPTIMISM: 10,
  POLYGON: 137,
  AVALANCHE: 43114,
  SCROLL: 534352,
  KAIA: 8217,
  BNB: 56,
  HYPEREVM: 999,
  MONAD: 143,
  CITREA: 4114,
  SEPOLIA: 11155111,
  BASE_SEPOLIA: 84532,
  ARBITRUM_SEPOLIA: 421614,
  OPTIMISM_SEPOLIA: 11155420,
  POLYGON_AMOY: 80002,
  MONAD_TESTNET: 10143,
  CITREA_TESTNET: 5115,
};

export const CHAIN_METADATA = {
  1: {
    id: 1,
    name: "Ethereum",
    logo: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png",
  },
  8453: {
    id: 8453,
    name: "Base",
    logo: "https://assets.coingecko.com/asset_platforms/images/131/large/base-network.png",
  },
  42161: {
    id: 42161,
    name: "Arbitrum",
    logo: "https://coin-images.coingecko.com/coins/images/16547/large/arb.jpg",
  },
  10: {
    id: 10,
    name: "Optimism",
    logo: "https://coin-images.coingecko.com/coins/images/25244/large/Optimism.png",
  },
  137: {
    id: 137,
    name: "Polygon",
    logo: "https://assets.coingecko.com/asset_platforms/images/15/large/polygon_pos.png",
  },
  43114: {
    id: 43114,
    name: "Avalanche",
    logo: "https://assets.coingecko.com/asset_platforms/images/12/large/avalanche.png",
  },
  534352: {
    id: 534352,
    name: "Scroll",
    logo: "https://assets.coingecko.com/asset_platforms/images/153/large/scroll.jpeg",
  },
  8217: {
    id: 8217,
    name: "Kaia",
    logo: "https://assets.coingecko.com/asset_platforms/images/9672/large/kaia.png",
  },
  56: {
    id: 56,
    name: "BNB Chain",
    logo: "https://assets.coingecko.com/asset_platforms/images/1/large/bnb_smart_chain.png",
  },
  999: {
    id: 999,
    name: "HyperEVM",
    logo: "https://assets.coingecko.com/asset_platforms/images/243/large/hyperliquid.png",
  },
  143: {
    id: 143,
    name: "Monad",
    logo: "https://assets.coingecko.com/coins/images/38927/large/monad.jpg",
  },
  4114: {
    id: 4114,
    name: "Citrea",
    logo: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png",
  },
  11155111: {
    id: 11155111,
    name: "Sepolia",
    logo: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png",
  },
  84532: {
    id: 84532,
    name: "Base Sepolia",
    logo: "https://assets.coingecko.com/asset_platforms/images/131/large/base-network.png",
  },
  421614: {
    id: 421614,
    name: "Arbitrum Sepolia",
    logo: "https://coin-images.coingecko.com/coins/images/16547/large/arb.jpg",
  },
  11155420: {
    id: 11155420,
    name: "Optimism Sepolia",
    logo: "https://coin-images.coingecko.com/coins/images/25244/large/Optimism.png",
  },
  80002: {
    id: 80002,
    name: "Polygon Amoy",
    logo: "https://assets.coingecko.com/asset_platforms/images/15/large/polygon_pos.png",
  },
  10143: {
    id: 10143,
    name: "Monad Testnet",
    logo: "https://assets.coingecko.com/coins/images/38927/large/monad.jpg",
  },
  5115: {
    id: 5115,
    name: "Citrea Testnet",
    logo: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png",
  },
};

export const TOKEN_METADATA = {
  ETH: {
    symbol: "ETH",
    name: "Ethereum",
    icon: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png",
  },
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    icon: "https://coin-images.coingecko.com/coins/images/6319/large/usdc.png",
  },
  USDT: {
    symbol: "USDT",
    name: "Tether USD",
    icon: "https://coin-images.coingecko.com/coins/images/35023/large/USDT.png",
  },
  DAI: {
    symbol: "DAI",
    name: "Dai Stablecoin",
    icon: "https://coin-images.coingecko.com/coins/images/9956/large/Badge_Dai.png",
  },
  WBTC: {
    symbol: "WBTC",
    name: "Wrapped Bitcoin",
    icon: "https://coin-images.coingecko.com/coins/images/7598/large/wrapped_bitcoin_wbtc.png",
  },
};
