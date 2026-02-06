import React, { createContext, useContext, useState, useCallback } from 'react';
import { NexusSDK } from '@avail-project/nexus-core';
import useUnifiedBalance from '../hooks/useUnifiedBalance';

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

    // Use the custom hook for balance management
    const { unifiedBalance, fetchUnifiedBalance } = useUnifiedBalance(nexusSDK);

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

            // React Query in useUnifiedBalance will automatically trigger fetch when nexusSDK state updates

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
