// Consolidated hook for Tier Data (Merges static & dynamic)
import { useMemo } from 'react';
import { INITIAL_MEME_TIERS, INITIAL_PFP_TIERS } from '../constants/tierData';
import { useQuery, useMutation } from '@tanstack/react-query';
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

// Hook to get user mint info (e.g. minted count)
export const useUserMintInfo = (address) => {
    return useQuery({
        queryKey: ['userMintInfo', address],
        queryFn: () => api.getUserInfo(address),
        enabled: !!address,
    });
};

// Hook to get user CEO balance
export const useUserCeoBalance = (address) => {
    return useQuery({
        queryKey: ['userCeoBalance', address],
        queryFn: () => api.getUserCEOBalance(address),
        enabled: !!address,
    });
};

// Mutation to initiate mint
export const useInitiateMint = () => {
    return useMutation({
        mutationFn: ({ nftType, imageData, permitSignature, token }) =>
            api.initiateMint(nftType, imageData, permitSignature, token),
    });
};


export const useTierData = (collectionType) => {
    // 1. Check Backend Health first
    const { data: isBackendHealthy, isLoading: isHealthLoading } = useBackendHealth();

    const type = collectionType === 'PFP' ? 'PFP' : 'MEME';

    // 2. Fetch Pricing Data ONLY if backend is healthy
    const { data: pricingData, isLoading: isPricingLoading, error } = useNftPricing(type, !!isBackendHealthy);

    console.log("Backend Health:", isBackendHealthy, "Pricing Data:", pricingData);

    const tiers = useMemo(() => {
        const initialTiers = collectionType === 'PFP' ? INITIAL_PFP_TIERS : INITIAL_MEME_TIERS;

        if (!pricingData || !pricingData.tiers) return initialTiers;

        return initialTiers.map(tier => {
            const dynamicTier = pricingData.tiers.find(t => t.id === tier.id);
            if (dynamicTier) {
                return {
                    ...tier,
                    minted: dynamicTier.minted ?? tier.minted,
                    supply: dynamicTier.supply ?? tier.supply,
                    priceCEO: dynamicTier.priceCEO ?? tier.priceCEO,
                    priceUSD: dynamicTier.priceUSD ?? tier.priceUSD,
                    status: dynamicTier.status ?? tier.status,
                };
            }
            return tier;
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
