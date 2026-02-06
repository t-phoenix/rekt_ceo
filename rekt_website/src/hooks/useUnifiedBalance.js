import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';

const useUnifiedBalance = (nexusSDK) => {


    const fetchBalances = async () => {
        if (!nexusSDK) {
            console.warn('Nexus SDK not configured for query');
            return null;
        }

        // This log is purely for debugging, mirroring original behavior
        if (nexusSDK.isInitialized) {
            console.log('Nexus SDK initialized status:', nexusSDK.isInitialized());
        }

        console.log('🚀 Triggering getBalancesForBridge via React Query...');
        const balances = await nexusSDK.getBalancesForBridge();
        console.log('✅ Unified Balances fetched:', balances);
        return balances;
    };

    const { data: unifiedBalance, refetch, isFetching, error } = useQuery({
        queryKey: ['unifiedBalance', nexusSDK?.isInitialized], // Include initialized status or ID if available to force refresh on change
        queryFn: fetchBalances,
        enabled: !!nexusSDK, // Only run when SDK is available
        retry: (failureCount, error) => {
            console.warn(`❌ Balance fetch attempt ${failureCount + 1} failed:`, error);
            console.log('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));

            // Retry logic matching original requirement
            if (error.message && error.message.includes('currencies is not iterable') && failureCount < 6) {
                console.log(`Retrying fetch in 2s... (Attempt ${failureCount + 2})`);
                return true;
            }
            // Stop retrying for other errors or after max attempts
            console.error('Final balance fetch failure');
            return false;
        },
        retryDelay: 2000,
        staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes
        refetchOnWindowFocus: false, // Optional: prevent aggressive refetching
    });

    // Force refetch when SDK instance changes to ensure we aren't showing stale data from a previous session
    useEffect(() => {
        if (nexusSDK) {
            refetch();
        }
    }, [nexusSDK, refetch]);

    // Provide a compatibility wrapper for manual refetching
    const fetchUnifiedBalance = useCallback(async () => {
        // We explicitly ignore arguments as state logic handles SDK reference
        return refetch();
    }, [refetch]);

    return {
        unifiedBalance: unifiedBalance || [],
        fetchUnifiedBalance,
        isLoading: isFetching,
        error
    };
};

export default useUnifiedBalance;
