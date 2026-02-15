/* global BigInt */
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import {
    fetchBondingCurveData,
    calculateBuyAmount,
    calculateSellAmount,
    createPumpFunProgram,
    buildBuyInstruction,
    createTransaction
} from '../services/pumpFunService';

const CEO_TOKEN_MINT = process.env.REACT_APP_SOLANA_TOKEN_MINT;

export const usePumpFunData = () => {
    const { connection } = useConnection();

    return useQuery({
        queryKey: ['pumpFunData', CEO_TOKEN_MINT],
        queryFn: async () => {
            if (!CEO_TOKEN_MINT) throw new Error('Token mint not defined');
            const mintPubkey = new PublicKey(CEO_TOKEN_MINT);
            return await fetchBondingCurveData(connection, mintPubkey);
        },
        enabled: !!connection && !!CEO_TOKEN_MINT,
        refetchInterval: 10000,
    });
};

// Re-export calculation functions for use in components
export { calculateBuyAmount, calculateSellAmount };

export const usePumpFunSwap = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction, signTransaction, signAllTransactions } = useWallet();

    return useMutation({
        mutationFn: async ({ solAmount, tokenAmount, bondingCurve, slippage = 5 }) => {
            if (!publicKey || !connection || !CEO_TOKEN_MINT) {
                throw new Error("Missing required connection or wallet data");
            }


            const mintPubkey = new PublicKey(CEO_TOKEN_MINT);

            // 1. Create wallet adapter for Anchor provider
            const walletAdapter = {
                publicKey,
                signTransaction,
                signAllTransactions,
            };

            // 2. Create Anchor program instance
            const program = createPumpFunProgram(connection, walletAdapter);

            // 3. Calculate amounts with slippage
            const slippagePercent = slippage;
            const maxSolCostWithSlippage = solAmount * (1 + slippagePercent / 100);
            const maxSolCost = BigInt(Math.floor(maxSolCostWithSlippage * LAMPORTS_PER_SOL));
            const tokenOut = BigInt(Math.floor(tokenAmount * 1e6));



            // 4. Check if user's ATA exists, create if needed
            const associatedUser = await getAssociatedTokenAddress(
                mintPubkey,
                publicKey,
                false
            );

            const userAtaInfo = await connection.getAccountInfo(associatedUser);
            const ataInstructions = [];

            if (!userAtaInfo) {

                ataInstructions.push(
                    createAssociatedTokenAccountInstruction(
                        publicKey,
                        associatedUser,
                        publicKey,
                        mintPubkey
                    )
                );
            } else {

            }

            // 5. Build buy instruction using Anchor SDK
            const buyIx = await buildBuyInstruction(
                program,
                connection,
                mintPubkey,
                publicKey,
                tokenOut,
                maxSolCost,
                false // trackVolume - set to false to avoid volume accumulator issues
            );

            // 6. Create transaction with all instructions
            const priorityFeeSol = 0.0001; // 0.0001 SOL priority fee
            const allInstructions = [...ataInstructions, buyIx];

            const { transaction, lastValidBlockHeight } = await createTransaction(
                connection,
                allInstructions,
                publicKey,
                priorityFeeSol
            );

            // 7. Send transaction


            const signature = await sendTransaction(transaction, connection);

            // 8. Custom confirmation with real-time block progress tracking


            let confirmed = false;
            let attempts = 0;
            const maxAttempts = 60; // 30 seconds max (500ms intervals)

            while (!confirmed && attempts < maxAttempts) {
                attempts++;

                try {
                    // Get current block height
                    const currentBlockHeight = await connection.getBlockHeight('confirmed');




                    // Check transaction status
                    const status = await connection.getSignatureStatus(signature);

                    if (status?.value?.confirmationStatus === 'confirmed' ||
                        status?.value?.confirmationStatus === 'finalized') {

                        confirmed = true;

                        if (status.value.err) {
                            console.error("❌ Transaction Error:", status.value.err);
                            throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
                        }
                        break;
                    }

                    if (status?.value?.err) {
                        console.error("❌ Transaction Error:", status.value.err);
                        throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
                    }

                    // Check if we've exceeded the valid block height
                    if (currentBlockHeight > lastValidBlockHeight) {
                        console.warn("⚠️ Exceeded lastValidBlockHeight without confirmation");
                        throw new Error(`Transaction expired. Block height ${currentBlockHeight} exceeded ${lastValidBlockHeight}`);
                    }

                    // Wait before next check
                    await new Promise(resolve => setTimeout(resolve, 500));

                } catch (error) {
                    if (error.message.includes('Transaction failed') || error.message.includes('expired')) {
                        throw error;
                    }
                    console.warn("⚠️ Error checking status:", error.message);
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            if (!confirmed) {
                console.error("❌ Transaction confirmation timeout after", attempts, "attempts");
                throw new Error(`Transaction confirmation timeout. Check status at: https://solscan.io/tx/${signature}`);
            }

            return {
                signature,
                tokenAmount: Number(tokenOut) / 1e6,
                solCost: solAmount
            };
        }
    });
};
