
export const chains = [
    {
        id: 8453,
        name: 'Base',
        logo: 'https://pbs.twimg.com/profile_images/1945608199500910592/rnk6ixxH_400x400.jpg',
        symbol: 'ETH'
    },
    {
        id: 1,
        name: 'Ethereum',
        logo: 'https://coin-images.coingecko.com/coins/images/279/large/ethereum.png?1696501628',
        symbol: 'ETH'
    },
    {
        id: 42161,
        name: 'Arbitrum',
        logo: 'https://coin-images.coingecko.com/coins/images/16547/large/arb.jpg?1721358242',
        symbol: 'ETH',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
    },
    {
        id: 10,
        name: 'Optimism',
        logo: 'https://coin-images.coingecko.com/coins/images/25244/large/Optimism.png?1696524385',
        symbol: 'ETH',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
    },
    {
        id: 137,
        name: 'Polygon',
        logo: 'https://coin-images.coingecko.com/coins/images/4713/large/matic-token-icon.png?1696505325',
        symbol: 'POL',
        nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 }
    },
    {
        id: 43114,
        name: 'Avalanche',
        logo: 'https://coin-images.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png?1696512369',
        symbol: 'AVAX',
        nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 }
    },
    {
        id: 56,
        name: 'BNB Smart Chain',
        logo: 'https://coin-images.coingecko.com/coins/images/825/large/bnb-icon2_2x.png?1696501970',
        symbol: 'BNB',
        nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 }
    },
    {
        id: 534352,
        name: 'Scroll',
        logo: 'https://coin-images.coingecko.com/coins/images/50571/large/scroll.jpg',
        symbol: 'ETH',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
    },
    {
        id: 8217,
        name: 'Kaia',
        logo: 'https://coin-images.coingecko.com/coins/images/39901/large/KAIA.png',
        symbol: 'KAIA',
        nativeCurrency: { name: 'Kaia', symbol: 'KAIA', decimals: 18 }
    },
    {
        id: 50104,
        name: 'Sophon',
        logo: 'https://coin-images.coingecko.com/coins/images/38680/large/sophon_logo_200.png',
        symbol: 'SOPH',
        nativeCurrency: { name: 'Sophon', symbol: 'SOPH', decimals: 18 }
    },
    {
        id: 999,
        name: 'HyperEVM',
        logo: 'https://coin-images.coingecko.com/coins/images/50882/large/hyperliquid.jpg',
        symbol: 'HYPE',
        nativeCurrency: { name: 'Hyperliquid', symbol: 'HYPE', decimals: 18 }
    }
];

export const getChainLogo = (chainId) => {
    const chain = chains.find(c => c.id === chainId);
    return chain ? chain.logo : null;
};

export const getChainName = (chainId) => {
    const chain = chains.find(c => c.id === chainId);
    return chain ? chain.name : `Chain ${chainId}`;
};
