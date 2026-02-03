import React, { createContext, useContext, useState, useCallback } from 'react';
import { NexusSDK } from '@avail-project/nexus-core';

const NexusContext = createContext({
    nexusSDK: null,
    loading: false,
    error: null,
    handleInit: async () => { },
});

export const useNexus = () => {
    const context = useContext(NexusContext);
    if (!context) {
        throw new Error('useNexus must be used within NexusProvider');
    }
    return context;
};

const NexusProvider = ({ children, config = {} }) => {
    const [nexusSDK, setNexusSDK] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [unifiedBalance, setUnifiedBalance] = useState(null);

    // Debug: Intercept fetch requests to inspect backend responses
    React.useEffect(() => {
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const [resource, config] = args;
            try {
                const response = await originalFetch(resource, config);

                // Clone response to read it without consuming the stream for the original caller
                const clone = response.clone();
                const url = resource.toString();

                if (url.includes('nexus') || url.includes('avail') || url.includes('arcana')) {
                    try {
                        const text = await clone.text();
                        console.log(`📡 Fetch Spy [${url}]:`, text.substring(0, 500)); // Log first 500 chars
                    } catch (e) {
                        console.error('Fetch spy error:', e);
                    }
                }

                return response;
            } catch (err) {
                // If the fetch itself fails (network error)
                throw err;
            }
        };

        return () => {
            window.fetch = originalFetch;
        };
    }, []);

    const fetchUnifiedBalance = useCallback(async () => {
        if (!nexusSDK) {
            console.warn('Nexus SDK not initialized, cannot fetch balances');
            return;
        }

        console.log('Fetching unified balances...');
        let retries = 0;

        const executeFetch = async () => {
            try {
                // Introduce a small delay for backend sync if retrying or initial fetch
                if (retries === 0) await new Promise(r => setTimeout(r, 1000));

                if (nexusSDK.isInitialized) {
                    console.log('Nexus SDK initialized status:', nexusSDK.isInitialized());
                }

                const balances = await nexusSDK.getUnifiedBalances();
                console.log('Unified Balances fetched:', balances);
                if (balances) {
                    setUnifiedBalance(balances);
                }
            } catch (err) {
                console.warn(`Balance fetch attempt ${retries + 1} failed:`, err);
                console.log('Error details:', JSON.stringify(err, Object.getOwnPropertyNames(err)));

                // Retry if specific error, but stop after 6 tries
                if (err.message && err.message.includes('currencies is not iterable') && retries < 6) {
                    retries++;
                    console.log(`Retrying fetch in 2s... (Attempt ${retries + 1})`);
                    setTimeout(executeFetch, 2000);
                } else {
                    console.error('Final balance fetch failure - setting empty balance');
                    // Fallback to empty array if persistence fails or other error
                    setUnifiedBalance([]);
                }
            }
        };

        executeFetch();
    }, [nexusSDK]);

    const handleInit = useCallback(async (provider) => {
        if (!provider) {
            console.error('No provider available for Nexus initialization');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const nexusConfig = {
                network: config.network || 'mainnet',
                debug: config.debug || false,
            };

            const nexus = new NexusSDK(nexusConfig);
            await nexus.initialize(provider);
            setNexusSDK(nexus);
            console.log('Nexus SDK initialized successfully');

            // We can't call fetchUnifiedBalance here immediately because nexusSDK state 
            // won't be updated yet. We can call it directly on the new instance though.

            // Define local fetch for immediate execution (Single Attempt)
            const localFetch = async () => {
                try {
                    await new Promise(r => setTimeout(r, 1000));
                    console.log("🚀 Triggering initial getUnifiedBalances...");
                    const balances = await nexus.getUnifiedBalances();
                    console.log('✅ Unified Balances fetched (init):', balances);
                    if (balances) setUnifiedBalance(balances);
                } catch (e) {
                    console.warn('❌ Initial balance fetch failed:', e);
                    // Do not retry here. Use the manual "Fetch Unified Balance" button to retry given the persistence of the error.
                    setUnifiedBalance([]);
                }
            };
            localFetch();

        } catch (err) {
            console.error('Error initializing Nexus SDK:', err);
            setError(err.message || 'Failed to initialize Nexus SDK');
        } finally {
            setLoading(false);
        }
    }, [config]);

    const value = {
        nexusSDK,
        loading,
        error,
        handleInit,
        unifiedBalance,
        fetchUnifiedBalance,
        isInitialized: !!nexusSDK,
        provider: nexusSDK?.getEVMProviderWithCA ? nexusSDK.getEVMProviderWithCA() : null
    };

    return (
        <NexusContext.Provider value={value}>
            {children}
        </NexusContext.Provider>
    );
};

export default NexusProvider;
