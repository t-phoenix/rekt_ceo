/* global BigInt*/
import { useState, useCallback, useEffect } from 'react';
import { useAccount, useSignTypedData, useSwitchChain, useChainId, useSignMessage } from 'wagmi';
import { getBlock, readContract } from 'wagmi/actions';
import { ethers } from 'ethers';
import { config } from '../config/walletConfig';
import { api } from '../services/backend_api';
import CEOTokenABI from '../abi/CEOToken.json';

// EIP-2612 Permit typed data
const PERMIT_TYPES = {
    Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
    ],
};

// const CHAIN_ID = Number(process.env.REACT_APP_CHAIN_ID || 11155111); // Fallback to Sepolia (11155111)
// const CEO_TOKEN_ADDRESS = process.env.REACT_APP_BASE_TOKEN_ADDRESS || '0xA5bcA6252a477C4Eb62cDbabF3C16f7c06b4f741';
// const MINTER_CONTRACT_ADDRESS = process.env.REACT_APP_MINTER_CONTRACT_ADDRESS || '0xccb8a72cd9149F85c74de4d3d2D756782aa338e8';

const CHAIN_ID = Number(11155111); // Fallback to Sepolia (11155111)
const CEO_TOKEN_ADDRESS = '0xA5bcA6252a477C4Eb62cDbabF3C16f7c06b4f741';
const MINTER_CONTRACT_ADDRESS = '0xc4e8663F22050F13b812ff69b26d6cc372977a41';


export const MintStep = {
    IDLE: 'IDLE',
    PREPARING: 'PREPARING',
    SIGNING: 'SIGNING',
    PERMITTING: 'PERMITTING',
    MINTING: 'MINTING',
    COMPLETE: 'COMPLETE',
    ERROR: 'ERROR',
};

// Local storage helpers
const STORAGE_KEY = 'mint_state';

const memoryStateCache = {};

function saveMintState(address, state) {
    memoryStateCache[address] = { ...state };
    try {
        const key = `${STORAGE_KEY}_${address}`;
        localStorage.setItem(key, JSON.stringify({
            ...state,
            nonce: state.nonce.toString(),
            deadline: state.deadline.toString(),
            value: state.value.toString(),
        }));
    } catch (e) {
        console.warn('Failed to save mint state:', e);
    }
}

function loadMintState(address) {
    if (memoryStateCache[address]) {
        return memoryStateCache[address];
    }
    try {
        const key = `${STORAGE_KEY}_${address}`;
        const stored = localStorage.getItem(key);
        if (!stored) return null;

        const parsed = JSON.parse(stored);
        return {
            ...parsed,
            nonce: BigInt(parsed.nonce),
            deadline: BigInt(parsed.deadline),
            value: BigInt(parsed.value || '0'),
        };
    } catch (e) {
        console.warn('Failed to load mint state:', e);
        return null;
    }
}

function clearMintState(address) {
    delete memoryStateCache[address];
    try {
        const key = `${STORAGE_KEY}_${address}`;
        localStorage.removeItem(key);
    } catch (e) {
        console.warn('Failed to clear mint state:', e);
    }
}

export const useMint = (token, pricingData) => {
    const { address } = useAccount();
    const { signTypedDataAsync } = useSignTypedData();
    const { signMessageAsync } = useSignMessage();
    const { switchChainAsync } = useSwitchChain();
    const currentChainId = useChainId();
    const [isMinting, setIsMinting] = useState(false);
    const [error, setError] = useState(null);
    const [currentStep, setCurrentStep] = useState(MintStep.IDLE);
    const [hasPendingMint, setHasPendingMint] = useState(false);

    useEffect(() => {
        async function checkPendingState() {
            if (!address) {
                setHasPendingMint(false);
                return;
            }
            const savedState = loadMintState(address);
            if (savedState && savedState.step !== MintStep.IDLE && savedState.step !== MintStep.COMPLETE) {
                try {
                    const block = await getBlock(config);
                    const valid = savedState.deadline > block.timestamp + BigInt(60);
                    if (valid) {
                        setHasPendingMint(true);
                        setCurrentStep(savedState.step);
                    } else {
                        clearMintState(address);
                        setHasPendingMint(false);
                    }
                } catch {
                    setHasPendingMint(true);
                    setCurrentStep(savedState.step);
                }
            }
        }
        checkPendingState();
    }, [address]);

    const clearPendingMint = useCallback(() => {
        if (address) {
            clearMintState(address);
            setHasPendingMint(false);
            setCurrentStep(MintStep.IDLE);
        }
    }, [address]);
    // Uses ethers native signature parsing now
    const getAuthToken = useCallback(async () => {
        if (token) return token; // Use actively passed token if it exists

        const cachedTokenKey = `authToken_${address}`;
        let activeToken = localStorage.getItem(cachedTokenKey);

        // Basic check if token exists, we'll try to use it. 
        // If it's expired, the backend will throw 401 later.
        if (activeToken) return activeToken;

        console.log("No auth token found. Requesting SIWE signature...");

        // 1. Get Nonce
        const nonce = await api.getNonce(address);

        // 2. Prepare SIWE Message
        const domain = window.location.host;
        const uri = window.location.origin;
        const message = `${domain} wants you to sign in with your Ethereum account:\n${address}\n\nSign in to Rekt CEO to authenticate minting.\n\nURI: ${uri}\nVersion: 1\nChain ID: ${CHAIN_ID}\nNonce: ${nonce}\nIssued At: ${new Date().toISOString()}`;

        // 3. Sign Message
        const signature = await signMessageAsync({ message });

        // 4. Verify & Obtain Token
        const data = await api.verifySignature(message, signature);
        if (data && data.token) {
            localStorage.setItem(cachedTokenKey, data.token);
            return data.token;
        }

        throw new Error("Authentication failed to return a token");
    }, [address, token, signMessageAsync]);

    // @param {Array<{trait_type: string, value: string|number}>} [attributes] - NFT metadata traits to embed in IPFS metadata
    const mint = useCallback(async (nftType, imageSrcFallback, attributes) => {
        if (!address) {
            throw new Error('Wallet not connected');
        }

        setIsMinting(true);
        setError(null);
        setCurrentStep(MintStep.PREPARING);

        try {
            // 0. Ensure connected to the right chain!
            if (currentChainId !== CHAIN_ID && switchChainAsync) {
                try {
                    console.log(`Switching chain from ${currentChainId} to ${CHAIN_ID}`);
                    await switchChainAsync({ chainId: CHAIN_ID });
                } catch (err) {
                    console.warn("User rejected or failed chain switch:", err);
                    throw new Error("Please switch to the correct network to mint.");
                }
            }
            // 1. Image preparation
            let imageData = imageSrcFallback;
            if (imageSrcFallback && imageSrcFallback.startsWith('data:')) {
                imageData = imageSrcFallback;
            } else if (imageSrcFallback) {
                try {
                    const response = await fetch(imageSrcFallback);
                    const blob = await response.blob();
                    imageData = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                } catch (e) { /* ignore */ }
            }

            // 2. Permit Nonce
            const nonce = await api.getPermitNonce(address);

            // 3. Deadline and Value
            const block = await getBlock(config);
            const deadline = block.timestamp + BigInt(3600); // 1 hour

            // Get exact price from pricing config passed via hook, but first try fetching fresh pricing
            let value = BigInt('1000000000000000000000000'); // Default fallback 1 million CEO token
            try {
                // Fetch fresh pricing exactly at mint time to avoid stale prices
                const freshPricing = await api.getPricing(nftType);
                if (freshPricing && freshPricing.priceCEO) {
                    const cleanPriceText = freshPricing.priceCEO.toString().replace(/,/g, '').replace(/[^\d.]/g, '');
                    value = BigInt(ethers.parseUnits(cleanPriceText, 18));
                } else if (pricingData?.ceoPrice) {
                    // Fallback to hook data if fresh pricing is missing the field
                    const cleanPriceText = pricingData.ceoPrice.toString().replace(/,/g, '').replace(/[^\d.]/g, '');
                    value = BigInt(ethers.parseUnits(cleanPriceText, 18));
                }
            } catch (pricingError) {
                console.warn('Could not fetch fresh pricing, falling back to cached', pricingError);
                if (pricingData?.ceoPrice) {
                    try {
                        const cleanPriceText = pricingData.ceoPrice.toString().replace(/,/g, '').replace(/[^\d.]/g, '');
                        value = BigInt(ethers.parseUnits(cleanPriceText, 18));
                    } catch (e) { console.warn(e); }
                }
            }

            // 4. Token Name
            let tokenName = 'REKT CEO';
            try {
                tokenName = await readContract(config, {
                    address: CEO_TOKEN_ADDRESS,
                    abi: CEOTokenABI,
                    functionName: 'name',
                });
            } catch (e) { console.warn('Could not fetch token name, using default', e); }

            saveMintState(address, {
                step: MintStep.SIGNING,
                nftType,
                imageData,
                nonce,
                deadline,
                value: value.toString(),
                tokenName,
                attributes: attributes || [],
                timestamp: Date.now(),
            });
            setCurrentStep(MintStep.SIGNING);
            setHasPendingMint(true);

            const activeToken = await getAuthToken(); // Trigger SIWE if needed

            // Print addresses and typed data to console for manual verification
            console.log("=== MINT PARAMS ===");
            console.log("Network Chain ID (Target):", CHAIN_ID);
            console.log("CEO Token Address:", CEO_TOKEN_ADDRESS);
            console.log("Minter Contract Address:", MINTER_CONTRACT_ADDRESS);
            console.log("Token Name:", tokenName);
            console.log("Value (wei):", value.toString());
            console.log("Nonce:", nonce.toString());
            console.log("Deadline:", deadline.toString());
            console.log("Owner Address:", address);
            console.log("===================");

            setIsMinting(false);
            return {
                step: MintStep.SIGNING,
                nftType, imageData, nonce, deadline, value: value.toString(), tokenName, activeToken
            };

        } catch (err) {
            const message = err.shortMessage || err.message || 'Mint preparation failed';
            if (message.includes('401') || message.includes('Missing or invalid auth')) {
                localStorage.removeItem(`authToken_${address}`);
            }
            setError(message);
            setCurrentStep(MintStep.ERROR);
            setIsMinting(false);
            throw new Error(message);
        }
    }, [address, switchChainAsync, currentChainId, getAuthToken, pricingData]);

    const signPermit = useCallback(async (manualValueWeiBigInt) => {
        if (!address) throw new Error('Wallet not connected');
        const savedState = loadMintState(address);
        if (!savedState) throw new Error('No prepared mint found');

        setIsMinting(true);
        setError(null);
        setCurrentStep(MintStep.SIGNING);

        try {
            const usedValue = manualValueWeiBigInt ? manualValueWeiBigInt.toString() : savedState.value;

            const signature = await signTypedDataAsync({
                domain: {
                    name: savedState.tokenName,
                    version: '1',
                    chainId: CHAIN_ID,
                    verifyingContract: CEO_TOKEN_ADDRESS,
                },
                types: PERMIT_TYPES,
                primaryType: 'Permit',
                message: {
                    owner: address,
                    spender: MINTER_CONTRACT_ADDRESS,
                    value: usedValue,
                    nonce: savedState.nonce,
                    deadline: savedState.deadline,
                },
            });

            const parsedSig = ethers.Signature.from(signature);
            const { v, r, s } = parsedSig;

            saveMintState(address, {
                ...savedState,
                step: MintStep.PERMITTING,
                value: usedValue,
                signature,
                v, r, s,
                timestamp: Date.now(),
            });
            setCurrentStep(MintStep.MINTING);
            setIsMinting(false);

            return signature;
        } catch (err) {
            const message = err.shortMessage || err.message || 'Signature failed';
            setError(message);
            setIsMinting(false);
            throw new Error(message);
        }
    }, [address, signTypedDataAsync]);

    const submitMint = useCallback(async () => {
        if (!address) throw new Error('Wallet not connected');
        const savedState = loadMintState(address);
        if (!savedState || !savedState.signature) throw new Error('No signed permit found');

        setIsMinting(true);
        setError(null);
        setCurrentStep(MintStep.MINTING);

        try {
            const { nftType, imageData, deadline, value, v, r, s, attributes } = savedState;
            const permitSignature = { owner: address, spender: MINTER_CONTRACT_ADDRESS, value: value.toString(), deadline: Number(deadline), v, r, s };

            const activeToken = await getAuthToken();
            const result = await api.initiateMint(nftType, imageData, permitSignature, activeToken, attributes);

            clearMintState(address);
            setHasPendingMint(false);
            setCurrentStep(MintStep.COMPLETE);

            return result;
        } catch (err) {
            const msg = err.shortMessage || err.message || 'Mint submission failed';
            if (msg.includes('401') || msg.includes('Missing or invalid auth')) {
                localStorage.removeItem(`authToken_${address}`);
            }
            setError(msg);
            setCurrentStep(MintStep.ERROR);
            throw new Error(msg);
        } finally {
            setIsMinting(false);
        }
    }, [address, getAuthToken]);

    return {
        prepareMint: mint,
        signPermit,
        submitMint,
        resumeMint: submitMint, // Fallback alias
        clearPendingMint,
        isMinting,
        error,
        currentStep,
        hasPendingMint,
        savedState: address ? loadMintState(address) : null
    };
};
