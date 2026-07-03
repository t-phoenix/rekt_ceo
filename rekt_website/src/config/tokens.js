
export const tokens = [
    {
        "id": "bitcoin",
        "symbol": "BTC",
        "name": "Bitcoin",
        "image": "https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png?1696501400"
    },
    {
        "id": "ethereum",
        "symbol": "ETH",
        "name": "Ethereum",
        "image": "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png?1696501628"
    },
    {
        "id": "tether",
        "symbol": "USDT",
        "name": "Tether",
        "image": "https://coin-images.coingecko.com/coins/images/325/large/Tether.png?1696501661"
    },
    {
        "id": "binancecoin",
        "symbol": "BNB",
        "name": "BNB",
        "image": "https://coin-images.coingecko.com/coins/images/825/large/bnb-icon2_2x.png?1696501970"
    },
    {
        "id": "ripple",
        "symbol": "XRP",
        "name": "XRP",
        "image": "https://coin-images.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png?1696501442"
    },
    {
        "id": "usd-coin",
        "symbol": "USDC",
        "name": "USDC",
        "image": "https://coin-images.coingecko.com/coins/images/6319/large/USDC.png?1769615602"
    },
    {
        "id": "solana",
        "symbol": "SOL",
        "name": "Solana",
        "image": "https://coin-images.coingecko.com/coins/images/4128/large/solana.png?1718769756"
    },
    {
        "id": "cardano",
        "symbol": "ADA",
        "name": "Cardano",
        "image": "https://coin-images.coingecko.com/coins/images/975/large/cardano.png?1696502090"
    },
    {
        "id": "dogecoin",
        "symbol": "DOGE",
        "name": "Dogecoin",
        "image": "https://coin-images.coingecko.com/coins/images/5/large/dogecoin.png?1696501409"
    },
    {
        "id": "tron",
        "symbol": "TRX",
        "name": "TRON",
        "image": "https://coin-images.coingecko.com/coins/images/1094/large/tron-logo.png?1696502193"
    },
    {
        "id": "chainlink",
        "symbol": "LINK",
        "name": "Chainlink",
        "image": "https://coin-images.coingecko.com/coins/images/877/large/Chainlink_Logo_500.png?1760023405"
    },
    {
        "id": "polkadot",
        "symbol": "DOT",
        "name": "Polkadot",
        "image": "https://coin-images.coingecko.com/coins/images/12171/large/polkadot.jpg?1766533446"
    },
    {
        "id": "wrapped-bitcoin",
        "symbol": "WBTC",
        "name": "Wrapped Bitcoin",
        "image": "https://coin-images.coingecko.com/coins/images/7598/large/wrapped_bitcoin_wbtc.png?1696507864"
    },
    {
        "id": "polygon",
        "symbol": "MATIC",
        "name": "Polygon",
        "image": "https://coin-images.coingecko.com/coins/images/4713/large/matic-token-icon.png?1696505325"
    },
    {
        "id": "avalanche-2",
        "symbol": "AVAX",
        "name": "Avalanche",
        "image": "https://coin-images.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png?1696512369"
    },
    {
        "id": "shiba-inu",
        "symbol": "SHIB",
        "name": "Shiba Inu",
        "image": "https://coin-images.coingecko.com/coins/images/11939/large/shiba.png?1696511800"
    },
    {
        "id": "litecoin",
        "symbol": "LTC",
        "name": "Litecoin",
        "image": "https://coin-images.coingecko.com/coins/images/2/large/litecoin.png?1696501400"
    },
    {
        "id": "bitcoin-cash",
        "symbol": "BCH",
        "name": "Bitcoin Cash",
        "image": "https://coin-images.coingecko.com/coins/images/780/large/bitcoin-cash-circle.png?1696501932"
    },
    {
        "id": "stellar",
        "symbol": "XLM",
        "name": "Stellar",
        "image": "https://coin-images.coingecko.com/coins/images/100/large/fmpFRHHQ_400x400.jpg?1735231350"
    },
    {
        "id": "uniswap",
        "symbol": "UNI",
        "name": "Uniswap",
        "image": "https://coin-images.coingecko.com/coins/images/12504/large/uniswap-logo.png?1720676669"
    },
    {
        "id": "arbitrum",
        "symbol": "ARB",
        "name": "Arbitrum",
        "image": "https://coin-images.coingecko.com/coins/images/16547/large/arb.jpg?1721358242"
    },
    {
        "id": "optimism",
        "symbol": "OP",
        "name": "Optimism",
        "image": "https://coin-images.coingecko.com/coins/images/25244/large/Optimism.png?1696524385"
    },
    {
        "id": "polygon-ecosystem-token",
        "symbol": "POL",
        "name": "Polygon Ecosystem Token",
        "image": "https://coin-images.coingecko.com/coins/images/4713/large/matic-token-icon.png?1696505325"
    },
    {
        "id": "kaia",
        "symbol": "KAIA",
        "name": "Kaia",
        "image": "https://coin-images.coingecko.com/coins/images/39901/large/KAIA.png"
    },
    {
        "id": "sophon",
        "symbol": "SOPH",
        "name": "Sophon",
        "image": "https://coin-images.coingecko.com/coins/images/38680/large/sophon_logo_200.png"
    },
    {
        "id": "hyperliquid",
        "symbol": "HYPE",
        "name": "Hyperliquid",
        "image": "https://coin-images.coingecko.com/coins/images/50882/large/hyperliquid.jpg"
    }
];

export const tokenLogos = tokens.reduce((acc, token) => {
    acc[token.symbol] = token.image;
    return acc;
}, {});

export const getTokenLogo = (symbol) => {
    return tokenLogos[symbol?.toUpperCase()] || null;
};
