import { createNexusClient } from "@avail-project/nexus-core";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAccountEffect } from "wagmi";
import { normalizeTokenBalances } from "../../utils/nexusBalance";

const NexusContext = createContext(undefined);

const defaultConfig = {
  network: "mainnet",
  debug: process.env.NODE_ENV === "development",
};

const NexusProvider = ({ children, config = defaultConfig }) => {
  const stableConfig = useMemo(
    () => ({ ...defaultConfig, ...config }),
    [config]
  );

  const clientRef = useRef(null);

  const [nexusSDK, setNexusSDK] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initError, setInitError] = useState(null);
  const supportedChainsAndTokens = useRef(null);
  const swapSupportedChainsAndTokens = useRef(null);
  const [bridgableBalance, setBridgableBalance] = useState(null);
  const [swapBalance, setSwapBalance] = useState(null);
  const exchangeRate = useRef(null);

  const intent = useRef(null);
  const allowance = useRef(null);
  const swapIntent = useRef(null);

  const setupNexus = useCallback(async (activeClient) => {
    const list = activeClient.getSupportedChains();
    supportedChainsAndTokens.current = list ?? null;
    swapSupportedChainsAndTokens.current =
      list?.filter((chain) => chain.swapSupported) ?? null;

    const [bridgeAbleBalanceResult, swapBalanceResult, rates] =
      await Promise.allSettled([
        activeClient.getBalancesForBridge(),
        activeClient.getBalancesForSwap(),
        activeClient.utils.getCoinbaseRates(),
      ]);

    if (bridgeAbleBalanceResult.status === "fulfilled") {
      setBridgableBalance(
        normalizeTokenBalances(bridgeAbleBalanceResult.value)
      );
    }

    if (swapBalanceResult.status === "fulfilled") {
      setSwapBalance(normalizeTokenBalances(swapBalanceResult.value));
    }

    if (rates?.status === "fulfilled") {
      const usdPerUnit = {};
      for (const [symbol, value] of Object.entries(rates.value)) {
        const unitsPerUsd = Number.parseFloat(String(value));
        if (Number.isFinite(unitsPerUsd) && unitsPerUsd > 0) {
          usdPerUnit[symbol.toUpperCase()] = 1 / unitsPerUsd;
        }
      }
      exchangeRate.current = usdPerUnit;
    }
  }, []);

  const initializeNexus = useCallback(
    async (provider) => {
      setLoading(true);
      setInitError(null);
      try {
        if (!provider || typeof provider.request !== "function") {
          throw new Error("Invalid EIP-1193 provider");
        }

        let activeClient = clientRef.current;
        if (!activeClient) {
          activeClient = createNexusClient({
            network: stableConfig.network,
            debug: stableConfig.debug,
          });
          clientRef.current = activeClient;
        }

        if (!nexusSDK) {
          await activeClient.initialize();
          await activeClient.setEVMProvider(provider);
          setNexusSDK(activeClient);
        }

        await setupNexus(activeClient);
        return activeClient;
      } catch (error) {
        console.error("Error initializing Nexus:", error);
        setInitError(
          error?.message ?? "Failed to initialize Nexus. Please try again."
        );
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [nexusSDK, setupNexus, stableConfig.debug, stableConfig.network]
  );

  const deinitializeNexus = useCallback(async () => {
    try {
      clientRef.current?.destroy?.();
      clientRef.current = null;
      setNexusSDK(null);
      supportedChainsAndTokens.current = null;
      swapSupportedChainsAndTokens.current = null;
      setBridgableBalance(null);
      setSwapBalance(null);
      exchangeRate.current = null;
      intent.current = null;
      swapIntent.current = null;
      allowance.current = null;
      setInitError(null);
      setLoading(false);
    } catch (error) {
      console.error("Error deinitializing Nexus:", error);
    }
  }, []);

  const handleInit = useCallback(
    async (provider) => {
      if (loading) return;
      if (nexusSDK?.hasEvmProvider) return;
      await initializeNexus(provider);
    },
    [loading, nexusSDK, initializeNexus]
  );

  const fetchBridgableBalance = useCallback(async () => {
    try {
      const activeClient = clientRef.current;
      if (!activeClient) return;
      const updatedBalance = await activeClient.getBalancesForBridge();
      setBridgableBalance(normalizeTokenBalances(updatedBalance));
    } catch (error) {
      console.error("Error fetching bridgable balance:", error);
    }
  }, []);

  const fetchSwapBalance = useCallback(async () => {
    try {
      const activeClient = clientRef.current;
      if (!activeClient) return;
      const updatedBalance = await activeClient.getBalancesForSwap();
      setSwapBalance(normalizeTokenBalances(updatedBalance));
    } catch (error) {
      console.error("Error fetching swap balance:", error);
    }
  }, []);

  const getFiatValue = useCallback((amount, token) => {
    const key = token.toUpperCase();
    const rate = exchangeRate.current?.[key] ?? 1;
    return rate * amount;
  }, []);

  useAccountEffect({
    onDisconnect() {
      deinitializeNexus();
    },
  });

  const value = useMemo(
    () => ({
      nexusSDK,
      initializeNexus,
      deinitializeNexus,
      intent,
      allowance,
      swapIntent,
      handleInit,
      supportedChainsAndTokens: supportedChainsAndTokens.current,
      swapSupportedChainsAndTokens: swapSupportedChainsAndTokens.current,
      bridgableBalance,
      swapBalance,
      network: stableConfig.network,
      loading,
      initError,
      fetchBridgableBalance,
      fetchSwapBalance,
      exchangeRate: exchangeRate.current,
      getFiatValue,
    }),
    [
      nexusSDK,
      initializeNexus,
      deinitializeNexus,
      handleInit,
      swapBalance,
      stableConfig.network,
      loading,
      initError,
      fetchBridgableBalance,
      fetchSwapBalance,
      bridgableBalance,
      getFiatValue,
    ]
  );

  return (
    <NexusContext.Provider value={value}>{children}</NexusContext.Provider>
  );
};

export function useNexus() {
  const context = useContext(NexusContext);
  if (!context) {
    throw new Error("useNexus must be used within a NexusProvider");
  }
  return context;
}

export default NexusProvider;
