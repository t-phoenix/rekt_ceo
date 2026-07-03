/* global BigInt */
import { PublicKey, Transaction, ComputeBudgetProgram, LAMPORTS_PER_SOL, SystemProgram } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor';
import { Buffer } from 'buffer';
import idl from '../constants/pump_fun_idl.json';

// Constants from verified sample code
export const GLOBAL = new PublicKey('4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf');
export const FEE_RECIPIENT = new PublicKey('CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM');
export const ASSOC_TOKEN_ACC_PROG = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
export const RENT = new PublicKey('SysvarRent111111111111111111111111111111111');
export const PUMP_FUN_PROGRAM = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
export const PUMP_FUN_ACCOUNT = new PublicKey('Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1');
export const SYSTEM_PROGRAM_ID = SystemProgram.programId;
const FEE_PROGRAM_ID = new PublicKey('pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ');

// Pump.fun fee structure: 1% total (not 1.25% - that was incorrect)
// The bonding curve reserves already account for fees
export const PUMP_FUN_FEE_BPS = 124; // 100 basis points = 1%
export const PUMP_FUN_FEE_PERCENT = PUMP_FUN_FEE_BPS / 10000; // 0.01 = 1%

// PDA Derivation helpers
export const deriveBondingCurvePDA = (mint) => {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('bonding-curve'), mint.toBuffer()],
        PUMP_FUN_PROGRAM
    );
};

export const deriveCreatorVaultPDA = (creator) => {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('creator-vault'), creator.toBuffer()],
        PUMP_FUN_PROGRAM
    );
};

export const deriveFeeConfigPDA = () => {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from('fee_config'),
            Buffer.from([
                1, 86, 224, 246, 147, 102, 90, 207, 68, 219, 21, 104, 191, 23, 91, 170,
                81, 137, 203, 151, 245, 210, 255, 59, 101, 93, 43, 182, 253, 109, 24, 176
            ])
        ],
        FEE_PROGRAM_ID
    );
};

export const deriveGlobalVolumeAccumulatorPDA = () => {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('global_volume_accumulator')],
        PUMP_FUN_PROGRAM
    );
};

export const deriveUserVolumeAccumulatorPDA = (user) => {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('user_volume_accumulator'), user.toBuffer()],
        PUMP_FUN_PROGRAM
    );
};

export const deriveGlobalPDA = () => {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('global')],
        PUMP_FUN_PROGRAM
    );
};

export const deriveEventAuthorityPDA = () => {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('__event_authority')],
        PUMP_FUN_PROGRAM
    );
};

export const deriveAssociatedBondingCurvePDA = async (bondingCurve, mint) => {
    return await getAssociatedTokenAddress(
        mint,
        bondingCurve,
        true // allowOwnerOffCurve for PDA
    );
};

/**
 * Get bonding curve creator from on-chain data
 */
export const getBondingCurveCreator = async (connection, bondingCurve) => {
    const accountInfo = await connection.getAccountInfo(bondingCurve);
    if (!accountInfo) {
        throw new Error('Bonding curve account not found');
    }
    // Extract Creator from offset 49 (as per Rust layout)
    return new PublicKey(accountInfo.data.slice(49, 81));
};

/**
 * Create Anchor program instance for Pump.fun
 * Uses a wallet-like object for the provider
 */
export function createPumpFunProgram(connection, wallet) {
    // Create a provider with the wallet
    const provider = new AnchorProvider(
        connection,
        wallet,
        { commitment: 'confirmed' }
    );

    return new Program(idl, provider);
}

/**
 * Builds a buy instruction using Anchor SDK
 */
export async function buildBuyInstruction(
    program,
    connection,
    mint,
    user,
    tokenOut,
    maxSolCost,
    trackVolume = false
) {
    const [global] = deriveGlobalPDA();
    const [bondingCurve] = deriveBondingCurvePDA(mint);
    const associatedBondingCurve = await deriveAssociatedBondingCurvePDA(bondingCurve, mint);
    const associatedUser = await getAssociatedTokenAddress(mint, user, false);
    const [eventAuthority] = deriveEventAuthorityPDA();
    const [globalVolumeAccumulator] = deriveGlobalVolumeAccumulatorPDA();
    const [userVolumeAccumulator] = deriveUserVolumeAccumulatorPDA(user);
    const [feeConfig] = deriveFeeConfigPDA();

    // Get creator from bonding curve and derive creatorVault PDA
    const creator = await getBondingCurveCreator(connection, bondingCurve);
    if (!creator) {
        throw new Error('Failed to get bonding curve creator');
    }
    const [creatorVault] = deriveCreatorVaultPDA(creator);

    console.log("📋 Building buy instruction with accounts:");
    console.log("  User:", user.toString());
    console.log("  Bonding Curve:", bondingCurve.toString());
    console.log("  Creator:", creator.toString());
    console.log("  Creator Vault:", creatorVault.toString());

    const instruction = await program.methods
        .buy(
            new BN(tokenOut.toString()),
            new BN(maxSolCost.toString()),
            { some: trackVolume } // OptionBool
        )
        .accounts({
            global,
            feeRecipient: FEE_RECIPIENT,
            mint,
            bondingCurve,
            associatedBondingCurve,
            associatedUser,
            user,
            systemProgram: SYSTEM_PROGRAM_ID,
            tokenProgram: TOKEN_PROGRAM_ID,
            creatorVault,
            eventAuthority,
            program: PUMP_FUN_PROGRAM,
            globalVolumeAccumulator,
            userVolumeAccumulator,
            feeConfig,
            feeProgram: FEE_PROGRAM_ID,
        })
        .instruction();

    return instruction;
}

/**
 * Create transaction with compute budget and priority fee
 */
export async function createTransaction(
    connection,
    instructions,
    payer,
    priorityFeeInSol = 0
) {
    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
        units: 1_000_000,
    });

    const transaction = new Transaction().add(modifyComputeUnits);

    if (priorityFeeInSol > 0) {
        const microLamports = Math.floor(priorityFeeInSol * 1_000_000_000);
        const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
            microLamports,
        });
        transaction.add(addPriorityFee);
    }

    transaction.add(...instructions);
    transaction.feePayer = payer;

    // Get blockhash and return it along with the transaction for confirmation
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;

    return { transaction, blockhash, lastValidBlockHeight };
}

/**
 * Fetch bonding curve data from on-chain
 */
export async function fetchBondingCurveData(connection, mint) {
    const [bondingCurve] = deriveBondingCurvePDA(mint);

    const accountInfo = await connection.getAccountInfo(bondingCurve);
    if (!accountInfo) {
        throw new Error('Bonding curve not found');
    }

    const data = accountInfo.data;
    const virtualTokenReserves = data.readBigUInt64LE(8);
    const virtualSolReserves = data.readBigUInt64LE(16);
    const realTokenReserves = data.readBigUInt64LE(24);
    const realSolReserves = data.readBigUInt64LE(32);
    const tokenTotalSupply = data.readBigUInt64LE(40);
    const complete = data[48] !== 0;

    return {
        virtualTokenReserves,
        virtualSolReserves,
        realTokenReserves,
        realSolReserves,
        tokenTotalSupply,
        complete,
        bondingCurve
    };
}

/**
 * Calculate expected token output for a given SOL input
 * Matches Pump.fun's bonding curve formula
 * 
 * Fee is applied to SOL input: 1% fee means 99% of SOL goes into bonding curve
 */
export const calculateBuyAmount = (solAmount, bondingCurveData) => {
    if (!bondingCurveData || !solAmount) return 0;

    // Convert SOL to lamports
    const solInLamports = BigInt(Math.floor(solAmount * LAMPORTS_PER_SOL));

    const vSol = bondingCurveData.virtualSolReserves;
    const vToken = bondingCurveData.virtualTokenReserves;

    // Apply 1% fee to SOL input (keep 99% for bonding curve calculation)
    const effectiveSOL = (solInLamports * BigInt(10000 - PUMP_FUN_FEE_BPS)) / 10000n;

    // Apply bonding curve formula: tokenOut = (effectiveSOL * vToken) / (vSol + effectiveSOL)
    const tokenOut = (effectiveSOL * vToken) / (vSol + effectiveSOL);

    // Convert to human readable (6 decimals)
    return Number(tokenOut) / 1e6;
};

/**
 * Calculate expected SOL output for a given token input
 */
export const calculateSellAmount = (tokenAmount, bondingCurveData) => {
    if (!bondingCurveData || !tokenAmount) return 0;

    const tokenIn = BigInt(Math.floor(tokenAmount * 1e6));
    const vSol = bondingCurveData.virtualSolReserves;
    const vToken = bondingCurveData.virtualTokenReserves;

    // Calculate SOL output: solOut = vSol - (k / (vToken + tokenIn))
    const k = vSol * vToken;
    const newVToken = vToken + tokenIn;
    const newVSol = k / newVToken;
    const solOutBeforeFee = vSol - newVSol;

    // Apply 1% fee
    const solOut = (solOutBeforeFee * 99n) / 100n;

    return Number(solOut) / LAMPORTS_PER_SOL;
};
