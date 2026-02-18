
// Exchange Rate: $1 USD = 200 CEO (Estimated based on $5 = 1000 CEO)

export const INITIAL_MEME_TIERS = [
    {
        id: 1,
        name: "Early CEO",
        supply: 5000,
        minted: 1250, // Simulating some mints
        priceCEO: 1000,
        priceUSD: 5,
        status: "active"
    },
    {
        id: 2,
        name: "Wise CEO",
        supply: 3500,
        minted: 0,
        priceCEO: 3000,
        priceUSD: 15,
        status: "locked"
    },
    {
        id: 3,
        name: "Late CEO",
        supply: 1400,
        minted: 0,
        priceCEO: 10000,
        priceUSD: 50,
        status: "locked"
    },
    {
        id: 4,
        name: "FOMO",
        supply: 99,
        minted: 0,
        priceCEO: 220000,
        priceUSD: 1100,
        status: "locked"
    }
];

export const INITIAL_PFP_TIERS = [
    {
        id: 1,
        name: "Early Bird",
        supply: 500,
        minted: 500,
        priceCEO: 10000,
        priceUSD: 50,
        status: "completed"
    },
    {
        id: 2,
        name: "Wise Bird",
        supply: 300,
        minted: 45, // Simulating active mint
        priceCEO: 30000,
        priceUSD: 150,
        status: "active"
    },
    {
        id: 3,
        name: "Late Bird",
        supply: 190,
        minted: 0,
        priceCEO: 90000,
        priceUSD: 450,
        status: "locked"
    },
    {
        id: 4,
        name: "FOMO",
        supply: 9,
        minted: 0,
        priceCEO: 2200000,
        priceUSD: 11000,
        status: "locked"
    }
];

// Default exports for backward compatibility if needed, but prefer using INITIAL_ or fetching dynamics
export const MEME_TIERS = INITIAL_MEME_TIERS;
export const PFP_TIERS = INITIAL_PFP_TIERS;
