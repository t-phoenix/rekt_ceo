/**
 * useWormholeBridge Hook
 * React hook for managing Wormhole bridge state, fee quotes, and transfer execution.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useQuery } from '@tanstack/react-query';
import { initWormhole, createSolanaSigner, quoteTransfer, executeBridge, getPendingTransactions, redeemTransfer } from '../services/wormholeService';
import { ESTIMATED_BRIDGE_TIME_SECONDS, BRIDGE_STEPS } from '../config/wormholeConfig';

/**
 * Bridge status flow:
 * idle → quoting → ready → confirming → bridging → relaying → success | error
 */
export const useWormholeBridge = () => {
    const { connection } = useConnection();
    const wallet = useWallet();
    const { publicKey, connected, signTransaction, sendTransaction } = wallet;

    // Wormhole SDK instance
    const [wh, setWh] = useState(null);
    const [sdkReady, setSdkReady] = useState(false);
    const [sdkError, setSdkError] = useState(null);

    // Bridge state
    const [status, setStatus] = useState('idle'); // idle | quoting | ready | confirming | bridging | relaying | success | error
    const [currentStep, setCurrentStep] = useState(0); // Index into BRIDGE_STEPS
    const [progressMessage, setProgressMessage] = useState('');

    // Quote
    const [quote, setQuote] = useState(null);
    const [quoteError, setQuoteError] = useState(null);

    // Transfer results
    const [solanaTxHash, setSolanaTxHash] = useState(null);
    const [baseTxHash, setBaseTxHash] = useState(null);
    const [wormholeExplorerUrl, setWormholeExplorerUrl] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');

    // Timer
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const timerRef = useRef(null);
    const quoteDebounceRef = useRef(null);

    // Initialize Wormhole SDK on mount
    useEffect(() => {
        let cancelled = false;
        const init = async () => {
            try {
                const instance = await initWormhole();
                if (!cancelled) {
                    setWh(instance);
                    setSdkReady(true);
                }
            } catch (err) {
                if (!cancelled) {
                    setSdkError(err.message || 'Failed to initialize Wormhole SDK');
                }
            }
        };
        init();
        return () => { cancelled = true; };
    }, []);

    // Timer for elapsed time during bridging
    const startTimer = useCallback(() => {
        setElapsedSeconds(0);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setElapsedSeconds((prev) => prev + 1);
        }, 1000);
    }, []);

    const stopTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => stopTimer();
    }, [stopTimer]);

    /**
     * Fetch a fee quote for a given amount and destination address.
     * Debounced to avoid excessive API calls.
     */
    const fetchQuote = useCallback(async (amount, destAddress) => {
        if (!wh || !connected || !publicKey || !amount || amount <= 0 || !destAddress) {
            setQuote(null);
            setQuoteError(null);
            return;
        }

        // Debounce
        if (quoteDebounceRef.current) clearTimeout(quoteDebounceRef.current);
        quoteDebounceRef.current = setTimeout(async () => {
            setStatus('quoting');
            setQuoteError(null);
            try {
                const result = await quoteTransfer(wh, amount, publicKey.toBase58(), destAddress);
                if (result.success) {
                    setQuote(result);
                    setStatus('ready');
                } else {
                    setQuoteError(result.error);
                    setQuote(null);
                    setStatus('idle');
                }
            } catch (err) {
                setQuoteError(err.message || 'Failed to fetch quote');
                setQuote(null);
                setStatus('idle');
            }
        }, 800);
    }, [wh, connected, publicKey]);

    // Pending Transactions Query
    const {
        data: pendingTransactions,
        isLoading: isLoadingPending,
        refetch: refetchPending
    } = useQuery({
        queryKey: ['wormhole-pending', publicKey?.toBase58()],
        queryFn: () => getPendingTransactions(wh, publicKey?.toBase58()),
        enabled: !!wh && !!publicKey,
        refetchInterval: 15000,
    });

    /**
     * Redeem a pending transaction on Base
     */
    const redeem = useCallback(async (messageId, signer) => {
        if (!wh) throw new Error("Wormhole SDK not ready");
        return await redeemTransfer(wh, messageId, signer);
    }, [wh]);

    /**
     * Execute the bridge transfer.
     */
    const bridge = useCallback(async (amount, destAddress) => {
        if (!wh || !connected || !publicKey || !signTransaction) {
            setErrorMessage('Wallet not connected');
            setStatus('error');
            return;
        }

        try {
            setStatus('confirming');
            setCurrentStep(0);
            setSolanaTxHash(null);
            setBaseTxHash(null);
            setWormholeExplorerUrl(null);
            setErrorMessage('');

            // Create signer
            const signer = createSolanaSigner(wallet, connection);

            setStatus('bridging');
            startTimer();

            // Progress callback
            const onProgress = (step, data) => {
                setProgressMessage(data.message || '');

                switch (step) {
                    case 'initiating':
                        setCurrentStep(0);
                        break;
                    case 'submitted':
                        setCurrentStep(1);
                        if (data.solanaTxHash) setSolanaTxHash(data.solanaTxHash);
                        if (data.wormholeExplorerUrl) setWormholeExplorerUrl(data.wormholeExplorerUrl);
                        setStatus('relaying');
                        break;
                    case 'relaying':
                        setCurrentStep(1);
                        break;
                    case 'completed':
                        setCurrentStep(2);
                        if (data.baseTxHash) setBaseTxHash(data.baseTxHash);
                        stopTimer();
                        setStatus('success');
                        break;
                    case 'error':
                        stopTimer();
                        setErrorMessage(data.message || 'Transfer failed');
                        setStatus('error');
                        break;
                    default:
                        break;
                }
            };

            await executeBridge(wh, amount, signer, destAddress, onProgress);
        } catch (err) {
            stopTimer();
            setErrorMessage(err.message || 'Bridge transfer failed');
            setStatus('error');
        }
    }, [wh, connected, publicKey, signTransaction, wallet, connection, startTimer, stopTimer]);

    /**
     * Reset bridge state to idle.
     */
    const reset = useCallback(() => {
        stopTimer();
        setStatus('idle');
        setCurrentStep(0);
        setProgressMessage('');
        setQuote(null);
        setQuoteError(null);
        setSolanaTxHash(null);
        setBaseTxHash(null);
        setWormholeExplorerUrl(null);
        setErrorMessage('');
        setElapsedSeconds(0);
    }, [stopTimer]);

    return {
        // SDK state
        sdkReady,
        sdkError,

        // Bridge state
        status,
        currentStep,
        progressMessage,
        steps: BRIDGE_STEPS,

        // Quote
        quote,
        quoteError,
        fetchQuote,

        // Transfer results
        solanaTxHash,
        baseTxHash,
        wormholeExplorerUrl,
        errorMessage,

        // Timer
        elapsedSeconds,
        estimatedSeconds: ESTIMATED_BRIDGE_TIME_SECONDS,

        // Actions
        bridge,
        reset,

        // Pending items
        pendingTransactions: pendingTransactions || [],
        isLoadingPending,
        refetchPending,
        redeem,
    };
};
