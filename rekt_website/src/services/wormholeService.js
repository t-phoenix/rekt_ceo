/* global BigInt */
import { wormhole, TokenTransfer, Wormhole, signSendWait } from '@wormhole-foundation/sdk';
import solana from '@wormhole-foundation/sdk/solana';
import { Transaction, VersionedTransaction, TransactionExpiredBlockheightExceededError } from '@solana/web3.js';
import evm from '@wormhole-foundation/sdk/evm';
import { getEvmSignerForSigner } from '@wormhole-foundation/sdk-evm';
import {
    WORMHOLE_NETWORK,
    CEO_TOKEN_MINT,
    CEO_TOKEN_DECIMALS,
    SOURCE_CHAIN,
    DESTINATION_CHAIN,
    STATUS_POLL_INTERVAL,
    TRANSFER_TIMEOUT,
    WORMHOLE_EXPLORER_URL,
    SOLANA_RPC_URL,
    BASE_RPC_URL,
} from '../config/wormholeConfig';

// Singleton Wormhole instance
let whInstance = null;

/**
 * Initialize the Wormhole SDK (singleton).
 * Both platform packages are registered for chain context,
 * but only Solana signing is required (automatic relay handles Base).
 */
export const initWormhole = async () => {
    if (whInstance) return whInstance;
    try {
        whInstance = await wormhole(WORMHOLE_NETWORK, [solana, evm], {
            chains: {
                Solana: {
                    rpc: SOLANA_RPC_URL,
                },
                Base: {
                    rpc: BASE_RPC_URL,
                }
            }
        });
        console.log('[Wormhole] SDK initialized for', WORMHOLE_NETWORK, 'RPCs configured');
        return whInstance;
    } catch (error) {
        console.error('[Wormhole] Failed to initialize SDK:', error);
        throw error;
    }
};

/**
 * Create a Wormhole-compatible signer from @solana/wallet-adapter.
 * Implements the SignAndSendSigner interface.
 */
export const createSolanaSigner = (wallet, connection) => {
    if (!wallet.publicKey || !wallet.signTransaction) {
        throw new Error('Solana wallet not connected or does not support signing');
    }

    return {
        chain: () => SOURCE_CHAIN,
        address: () => wallet.publicKey.toBase58(),
        signAndSend: async (txns) => {
            const txids = [];
            for (const txn of txns) {
                let tx = txn.transaction;
                let auxiliarySigners = txn.signers || [];

                // Unwrap: Support nested transaction objects returned by some SDK versions
                if (tx && tx.transaction) {
                    if (tx.signers && Array.isArray(tx.signers)) {
                        auxiliarySigners = [...auxiliarySigners, ...tx.signers];
                    }
                    tx = tx.transaction;
                }

                // console.log("[Debug] Processing transaction:", {
                //     hasVersion: 'version' in tx,
                //     version: tx.version,
                //     hasSignatures: !!tx.signatures,
                //     signaturesLength: tx.signatures?.length,
                //     hasSerialize: typeof tx.serialize === 'function',
                //     feePayer: tx.feePayer?.toBase58(),
                //     recentBlockhash: ('version' in tx) ? tx.message?.recentBlockhash : tx.recentBlockhash
                // });

                // Patch: Fix "serialize is not a function" due to version mismatch
                if (typeof tx.serialize !== 'function') {
                    if ('version' in tx) {
                        Object.setPrototypeOf(tx, VersionedTransaction.prototype);
                    } else {
                        Object.setPrototypeOf(tx, Transaction.prototype);
                    }
                }

                // Ensure signatures array exists (Fix for 'Cannot read properties of undefined (reading length)')
                if (!tx.signatures) {
                    if ('version' in tx) {
                        const numRequiredSignatures = tx.message.header.numRequiredSignatures;
                        tx.signatures = new Array(numRequiredSignatures).fill(new Uint8Array(64));
                    } else {
                        tx.signatures = [];
                    }
                }

                // Ensure feePayer is set
                if (!tx.feePayer && !('version' in tx)) {
                    tx.feePayer = wallet.publicKey;
                }

                // Ensure recentBlockhash is set
                if (!('version' in tx) && !tx.recentBlockhash) {
                    const { blockhash } = await connection.getLatestBlockhash('confirmed');
                    tx.recentBlockhash = blockhash;
                } else if (('version' in tx) && !tx.message.recentBlockhash) {
                    const { blockhash } = await connection.getLatestBlockhash('confirmed');
                    try {
                        tx.message.recentBlockhash = blockhash;
                    } catch (e) {
                        console.warn("Could not set recentBlockhash on VersionedTransaction", e);
                    }
                }

                // Sign with auxiliary signers (if any)
                if (auxiliarySigners.length > 0) {
                    // console.log(`[Wormhole] Signing with ${auxiliarySigners.length} auxiliary signers`);
                    try {
                        if ('version' in tx) {
                            tx.sign(auxiliarySigners);
                        } else {
                            tx.partialSign(...auxiliarySigners);
                        }
                    } catch (err) {
                        console.error("[Wormhole] Failed to sign with auxiliary signers:", err);
                    }
                }

                // The Wormhole SDK provides VersionedTransaction or Transaction objects
                // We need to sign and send them via the wallet adapter
                const signed = await wallet.signTransaction(tx);
                const serialized = signed.serialize();
                const txid = await connection.sendRawTransaction(serialized, {
                    skipPreflight: false,
                    preflightCommitment: 'confirmed',
                });

                // Use modern confirmation strategy
                const latestBlockhash = await connection.getLatestBlockhash('confirmed');

                console.log(`[Wormhole] Transaction sent: ${txid}. Waiting for confirmation...`);

                try {
                    await connection.confirmTransaction({
                        signature: txid,
                        blockhash: latestBlockhash.blockhash,
                        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
                    }, 'confirmed');
                } catch (error) {
                    // Robustness: Double check if transaction actually landed despite the error
                    // This handles "TransactionExpiredBlockheightExceededError" which is common even if tx succeeded
                    if (error instanceof TransactionExpiredBlockheightExceededError || error.message.includes('expired')) {
                        console.warn("[Wormhole] Confirmation timed out/failed. Checking status manually...", error.message);

                        // Wait a moment before checking
                        await new Promise(r => setTimeout(r, 2000));

                        const status = await connection.getSignatureStatus(txid);
                        const confirmation = status?.value?.confirmationStatus;

                        if (confirmation === 'confirmed' || confirmation === 'finalized') {
                            console.log("[Wormhole] Transaction landed successfully despite confirmation error!");
                        } else {
                            console.error("[Wormhole] Transaction definitely failed or not found:", status);
                            throw error;
                        }
                    } else {
                        // For other errors, still try to check status just in case
                        console.warn("[Wormhole] Confirmation error. Checking status manually...");
                        const status = await connection.getSignatureStatus(txid);
                        const confirmation = status?.value?.confirmationStatus;
                        if (confirmation === 'confirmed' || confirmation === 'finalized') {
                            console.log("[Wormhole] Transaction landed successfully despite error!");
                        } else {
                            throw error;
                        }
                    }
                }

                txids.push(txid);
            }
            return txids;
        },
    };
};

/**
 * Get a fee quote for the bridge transfer.
 * Returns the relayer fee and estimated receive amount.
 */
export const quoteTransfer = async (wh, amountToSend, sourceAddress, destAddress) => {
    try {
        const srcChain = wh.getChain(SOURCE_CHAIN);
        const dstChain = wh.getChain(DESTINATION_CHAIN);

        // Create token ID for CEO on Solana
        const tokenId = Wormhole.tokenId(SOURCE_CHAIN, CEO_TOKEN_MINT);

        // Convert amount to atomic units
        const atomicAmount = BigInt(Math.floor(amountToSend * (10 ** CEO_TOKEN_DECIMALS)));

        console.log('[Wormhole] Token ID:', tokenId);
        console.log('[Wormhole] Atomic Amount:', atomicAmount);
        console.log('[Wormhole] Source Address:', sourceAddress);
        console.log('[Wormhole] Destination Address:', destAddress);
        // Create the transfer object
        const xfer = await wh.tokenTransfer(
            tokenId,
            atomicAmount,
            Wormhole.chainAddress(SOURCE_CHAIN, sourceAddress),
            Wormhole.chainAddress(DESTINATION_CHAIN, destAddress),
            'TokenBridge', // Use Manual Token Bridge (Automatic requires registration)
        );
        console.log('[Wormhole] Quote result XFER:', xfer);


        // Get the quote
        const quote = await TokenTransfer.quoteTransfer(
            wh,
            srcChain,
            dstChain,
            xfer.transfer,
        );

        console.log('[Wormhole] Quote result QUOTE:', quote);

        return {
            success: true,
            relayerFee: quote.relayFee || null,
            destinationAmount: quote.destinationToken?.amount || null,
            sourceAmount: amountToSend,
            isPossible: quote.destinationToken?.amount > 0,
            raw: quote,
        };
    } catch (error) {
        console.error('[Wormhole] Quote failed:', error);
        return {
            success: false,
            error: error.message || 'Failed to get bridge quote',
        };
    }
};

/**
 * Execute the bridge transfer using automatic relay.
 * Only requires Solana signing — the relayer handles Base-side redemption.
 *
 * @param {Object} wh - Wormhole instance
 * @param {number} amountToSend - Amount of CEO tokens to bridge
 * @param {Object} solanaSigner - Wormhole-compatible Solana signer
 * @param {string} destAddress - Destination Base address (0x...)
 * @param {Function} onProgress - Callback: (step, data) => void
 *   Steps: 'initiating' | 'submitted' | 'relaying' | 'completed' | 'error'
 */
export const executeBridge = async (wh, amountToSend, solanaSigner, destAddress, onProgress) => {
    try {
        const srcChain = wh.getChain(SOURCE_CHAIN); // Needed for VAA parsing
        const sourceAddress = solanaSigner.address();

        // Create token ID
        const tokenId = Wormhole.tokenId(SOURCE_CHAIN, CEO_TOKEN_MINT);

        // Convert to atomic units
        const atomicAmount = BigInt(Math.floor(amountToSend * (10 ** CEO_TOKEN_DECIMALS)));

        console.log("Token Transfer params", tokenId, atomicAmount, sourceAddress, Wormhole.chainAddress(SOURCE_CHAIN, sourceAddress), Wormhole.chainAddress(DESTINATION_CHAIN, destAddress))

        onProgress('initiating', { message: 'Creating bridge transfer...' });

        // 5. Initiate Transfer on Source Chain
        const tbSrc = await srcChain.getTokenBridge();

        const transferTxns = await tbSrc.transfer(
            sourceAddress,
            Wormhole.chainAddress(DESTINATION_CHAIN, destAddress),
            tokenId.address,
            atomicAmount
        );

        onProgress('initiating', { message: 'Please approve the transaction in your wallet...' });

        // Initiate transfer on Solana (user signs)
        const srcTxids = await signSendWait(srcChain, transferTxns, solanaSigner);
        console.log('[Wormhole] Transfer initiated. result:', srcTxids);

        // Get the last transaction hash which contains the bridge instruction
        let solanaTxHash = srcTxids[srcTxids.length - 1];

        // DEFENSIVE FIX: Ensure solanaTxHash is a string
        if (typeof solanaTxHash === 'object' && solanaTxHash !== null) {
            console.warn('[Wormhole] solanaTxHash is an object, attempting to extract signature. Keys:', Object.keys(solanaTxHash));
            // Try common properties
            if (solanaTxHash.signature) solanaTxHash = solanaTxHash.signature;
            else if (solanaTxHash.txid) solanaTxHash = solanaTxHash.txid;
            else if (solanaTxHash.id) solanaTxHash = solanaTxHash.id;
            else {
                // specific check for array of objects?
                // Some versions return { transaction: ..., signature: ... }
                // Let's assume JSON stringify might help debugging if all else fails, but we need a string.
                try {
                    solanaTxHash = JSON.stringify(solanaTxHash).substring(0, 10); // Fail-safe fallback to prevent "substring not function" crash in UI
                } catch (e) {
                    solanaTxHash = "unknown_tx";
                }
            }
        }

        // Ensure it is a string now
        if (typeof solanaTxHash !== 'string') {
            solanaTxHash = String(solanaTxHash);
        }

        console.log('[Wormhole] Final Solana TxHash:', solanaTxHash);

        onProgress('submitted', {
            message: 'Transaction confirmed!',
            solanaTxHash,
            wormholeExplorerUrl: `${WORMHOLE_EXPLORER_URL}/#/tx/${solanaTxHash}`,
        });

        // Small delay to allow UI to show 'Confirmed' state before moving to 'Success'
        await new Promise(r => setTimeout(r, 1000));

        // SIMPLIFIED: Stop here. Do not wait for VAA or relay.
        // The transaction is on-chain, user can check Wormhole explorer for progress.

        onProgress('completed', {
            message: 'Bridge transaction submitted! Assets are on their way to Base.',
            solanaTxHash,
            wormholeExplorerUrl: `${WORMHOLE_EXPLORER_URL}/#/tx/${solanaTxHash}`,
        });

        return {
            success: true,
            solanaTxHash,
            baseTxHash: null,
            wormholeExplorerUrl: `${WORMHOLE_EXPLORER_URL}/#/tx/${solanaTxHash}`,
            amount: amountToSend,
            vaa: null,
        };
    } catch (error) {
        console.error('[Wormhole] Bridge execution failed:', error);
        onProgress('error', { message: error.message || 'Bridge transfer failed' });
        throw error;
    }
};


/**
 * Get pending bridge transactions for a given wallet address.
 * Filters for Solana -> Base transactions that have not been completed.
 *
 * @param {Object} wh - Wormhole instance
 * @param {string} address - Wallet address to check (Solana address)
 */
export const getPendingTransactions = async (wh, address) => {
    try {
        if (!wh || !address) return [];

        // Fetch recent transactions (last 50 should cover pending ones since they are recent)
        // Note: This API might return transactions where the address is sender OR receiver.
        const txs = await wh.getTransactionsForAddress(address, 50);
        if (!txs || txs.length === 0) return [];

        const pending = txs.filter(tx => {
            // 1. Check direction: Solana (1) -> Base (30)
            // standard properties: fromChain, toChain
            const isSolanaBase = tx.standardizedProperties?.fromChain === 1 &&
                tx.standardizedProperties?.toChain === 30;

            if (!isSolanaBase) return false;

            // 2. Check if completed
            // If globalTx.destinationTx exists and status is 'completed' or 'finalized', it is done.
            const destTx = tx.globalTx?.destinationTx;
            if (destTx && (destTx.status === 'completed' || destTx.status === 'finalized')) {
                return false;
            }

            // Also ensure source transaction is confirmed, otherwise it's not even a valid bridge tx yet
            // but normally it appears in this list only if indexed.
            return true;
        });

        console.log('[Wormhole] Pending transactions:', pending);

        return pending.map(tx => ({
            id: tx.id, // Wormhole Message ID (Chain/Emitter/Sequence)
            amount: tx.payload?.amount,
            symbol: 'CEO', // Assumed for this filter, or check standardizedProperties.tokenAddress
            timestamp: tx.timestamp,
            sourceTxHash: tx.txHash,
        }));
    } catch (error) {
        console.error("[Wormhole] Failed to fetch pending transactions:", error);
        return [];
    }
};

/**
 * Redeem a transfer on the destination chain (Base).
 *
 * @param {Object} wh - Wormhole instance
 * @param {string} messageId - Wormhole Message ID
 * @param {Object} ethersSigner - Ethers signer for the destination chain (Base)
 */
export const redeemTransfer = async (wh, txHash, ethersSigner) => {
    try {
        console.log('[Wormhole] Redeeming transfer with hash:', txHash);

        // Custom Signer Implementation for EVM
        // This bypasses `getEvmSignerForSigner` which attempts `eth_signTransaction`
        // We use `sendTransaction` directly which is supported by all wallets (MM, CB, etc.)
        const signerAddress = await ethersSigner.getAddress();
        const signer = {
            chain: () => 'Base', // Explicitly return 'Base' as we know we are redeeming on Base
            address: () => signerAddress,
            signAndSend: async (txs) => {
                const txids = [];
                for (const tx of txs) {
                    const { transaction } = tx;
                    console.log('[Wormhole] Sending EVM transaction:', transaction);

                    // Send directly
                    const txResponse = await ethersSigner.sendTransaction(transaction);
                    console.log('[Wormhole] EVM Tx Hash:', txResponse.hash);

                    // Wait for it to be mined
                    await txResponse.wait();

                    txids.push(txResponse.hash);
                }
                return txids;
            }
        };

        // Reconstruct TokenTransfer from transaction hash
        const xfer = await TokenTransfer.from(wh, {
            chain: SOURCE_CHAIN,
            txid: txHash
        });

        console.log('[Wormhole] Transfer object created:', xfer);

        // Fetch attestation (VAA) - wait if not ready
        // timeout 60s
        const attestations = await xfer.fetchAttestation(60 * 1000);
        console.log('[Wormhole] Attestation fetched:', attestations);

        // Complete transfer (Redeem)
        const txids = await xfer.completeTransfer(signer);
        console.log('[Wormhole] Redemption submitted:', txids);

        return txids;
    } catch (error) {
        console.error('[Wormhole] Redemption failed:', error);
        throw error;
    }
};
