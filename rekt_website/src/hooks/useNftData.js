// Consolidated hook for Tier Data (Merges static & dynamic)
import { useMemo } from 'react';
import { INITIAL_MEME_TIERS, INITIAL_PFP_TIERS } from '../constants/tierData';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/backend_api';

// Hook to check backend health
export const useBackendHealth = () => {
    return useQuery({
        queryKey: ['backendHealth'],
        queryFn: api.checkHealth,
        staleTime: 60 * 1000, // 1 minute
    });
};

// Hook to get CEO token price
export const useCeoPrice = () => {
    return useQuery({
        queryKey: ['ceoPrice'],
        queryFn: api.getCEOPrice,
        refetchInterval: 60 * 1000, // Refresh every minute
    });
};

// Hook to get NFT pricing/info by type (PFP or MEME)
// Hook to get NFT pricing/info by type (PFP or MEME)
export const useNftPricing = (nftType, isEnabled = true) => {
    return useQuery({
        queryKey: ['nftPricing', nftType],
        queryFn: () => api.getPricing(nftType),
        enabled: !!nftType && isEnabled,
        refetchInterval: 30 * 1000, // Refresh every 30 seconds
    });
};

// Consolidated hook for User Data (Mint Info & CEO Balance)
export const useUserData = (address) => {
    return useQuery({
        queryKey: ['userData', address],
        queryFn: async () => {
            const [mintInfo, ceoBalance] = await Promise.all([
                api.getUserInfo(address),
                api.getUserCEOBalance(address)
            ]);
            console.log("Mint Info: ", mintInfo)

            return {
                mintInfo,
                ceoBalance
            };
        },
        enabled: !!address,
        refetchInterval: 30 * 1000, // Refresh every 30 seconds
    });
};

// useMint hook should now be imported from useMint.js


export const useTierData = (collectionType) => {
    // 1. Check Backend Health first
    const { data: isBackendHealthy, isLoading: isHealthLoading } = useBackendHealth();

    const type = collectionType === 'PFP' ? 'PFP' : 'MEME';

    // 2. Fetch Pricing Data ONLY if backend is healthy
    const { data: pricingData, isLoading: isPricingLoading, error } = useNftPricing(type, !!isBackendHealthy);

    console.log("Backend Health:", isBackendHealthy, "Pricing Data:", pricingData);

    const tiers = useMemo(() => {
        const initialTiers = collectionType === 'PFP' ? INITIAL_PFP_TIERS : INITIAL_MEME_TIERS;

        if (!pricingData) return initialTiers;

        // API returns the single active tier data object, not an array of tiers
        const currentTierId = pricingData.tierId;

        return initialTiers.map(tier => {
            if (tier.id === currentTierId) {
                // This is the active tier
                return {
                    ...tier,
                    minted: pricingData.currentSupply ?? tier.minted,
                    priceCEO: pricingData.priceCEO ? parseFloat(pricingData.priceCEO) : tier.priceCEO,
                    priceUSD: pricingData.priceUSD ? parseFloat(pricingData.priceUSD) : tier.priceUSD,
                    status: 'active',
                };
            } else if (tier.id < currentTierId) {
                // Completed tier
                return {
                    ...tier,
                    status: 'completed',
                    minted: tier.supply, // Assume full usage for completed tiers
                };
            } else {
                // Future/Locked tier
                return {
                    ...tier,
                    status: 'locked',
                    minted: 0,
                };
            }
        });
    }, [collectionType, pricingData]);

    const activeTier = useMemo(() => {
        return tiers.find(t => t.status === 'active') || tiers[tiers.length - 1];
    }, [tiers]);

    const totalSupply = useMemo(() => tiers.reduce((acc, tier) => acc + tier.supply, 0), [tiers]);

    // Combined loading state: 
    // Loading if health check is pending, OR if health check passed and pricing check is pending.
    const isLoading = isHealthLoading || (!!isBackendHealthy && isPricingLoading);

    return {
        tiers,
        activeTier,
        totalSupply,
        isLoading,
        error
    };
};
