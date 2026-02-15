import { useCallback, useState, useEffect, useMemo } from "react";
import { ArrowDown, AlertTriangle, Loader2 } from "lucide-react";
import { useAccount, useSwitchChain, useChainId, useReadContract } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import {
    useUniswapAmountsOut,
    useUniswapAmountsIn,
    useTokenAllowance,
    useTokenApprove,
    useUniswapSwap,
    useTokenDecimals
} from "../../hooks/useUniswap";
import { UNISWAP_V2_ROUTER_ADDRESS, ERC20_ABI } from "../../constants/uniswap";
import SwapModal from "../SwapModal";
import TokenInput from "./TokenInput";
import { BASE_USDC_ADDRESS, BASE_TOKEN_ADDRESS, TARGET_CHAIN_ID, MOCK_TOKENS } from "./config";
import "../ProvideLiquidity.css"; // Ensure styles are imported

export default function GetRektCEO() {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const { switchChain } = useSwitchChain();

    const isWrongNetwork = isConnected && chainId !== TARGET_CHAIN_ID;

    // Swap State
    const [amountIn, setAmountIn] = useState("");
    const [amountOut, setAmountOut] = useState("");
    const [mode, setMode] = useState("PRICE");

    // Debouncing
    const [debouncedAmountIn, setDebouncedAmountIn] = useState("");
    const [debouncedAmountOut, setDebouncedAmountOut] = useState("");

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedAmountIn(amountIn), 500);
        return () => clearTimeout(timer);
    }, [amountIn]);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedAmountOut(amountOut), 500);
        return () => clearTimeout(timer);
    }, [amountOut]);

    // Token Data
    const decimalsUSDC = useTokenDecimals(BASE_USDC_ADDRESS) || 6;
    const decimalsCEO = useTokenDecimals(BASE_TOKEN_ADDRESS) || 18;

    // Balances
    const { data: balanceUSDCData, isLoading: isBalanceUSDCLoading, refetch: refetchBalanceUSDC } = useReadContract({
        address: BASE_USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address],
        chainId: TARGET_CHAIN_ID,
        query: { enabled: !!address, refetchInterval: 10000 }
    });

    const { data: balanceCEOData, isLoading: isBalanceCEOLoading, refetch: refetchBalanceCEO } = useReadContract({
        address: BASE_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address],
        chainId: TARGET_CHAIN_ID,
        query: { enabled: !!address, refetchInterval: 10000 }
    });

    const formattedBalanceUSDC = useMemo(() => {
        if (balanceUSDCData === undefined) return null;
        return formatUnits(balanceUSDCData, decimalsUSDC);
    }, [balanceUSDCData, decimalsUSDC]);

    const formattedBalanceCEO = useMemo(() => {
        if (balanceCEOData === undefined) return null;
        return formatUnits(balanceCEOData, decimalsCEO);
    }, [balanceCEOData, decimalsCEO]);

    // Ensure balances update on network switch
    useEffect(() => {
        if (address) {
            refetchBalanceUSDC();
            refetchBalanceCEO();
        }
    }, [chainId, address, refetchBalanceUSDC, refetchBalanceCEO]);

    // Uniswap Data
    const path = useMemo(() => [BASE_USDC_ADDRESS, BASE_TOKEN_ADDRESS], []);

    const { amounts: amountsOutData, isLoading: isLoadingOut } = useUniswapAmountsOut(
        debouncedAmountIn && mode === 'PRICE' ? parseUnits(debouncedAmountIn, decimalsUSDC) : undefined,
        path
    );

    const { amounts: amountsInData, isLoading: isLoadingIn } = useUniswapAmountsIn(
        debouncedAmountOut && mode === 'QUOTE' ? parseUnits(debouncedAmountOut, decimalsCEO) : undefined,
        path
    );

    useEffect(() => {
        if (mode === 'PRICE' && amountsOutData && amountsOutData.length > 1) {
            const out = formatUnits(amountsOutData[amountsOutData.length - 1], decimalsCEO);
            setAmountOut(parseFloat(out).toFixed(6));
        }
    }, [amountsOutData, mode, decimalsCEO]);

    useEffect(() => {
        if (mode === 'QUOTE' && amountsInData && amountsInData.length > 1) {
            const inp = formatUnits(amountsInData[0], decimalsUSDC);
            setAmountIn(parseFloat(inp).toFixed(6));
        }
    }, [amountsInData, mode, decimalsUSDC]);

    // Rate for Swap Display
    const { amounts: rateData } = useUniswapAmountsOut(parseUnits("1", decimalsUSDC), path);
    const rateUSDCtoCEO = rateData && rateData.length > 1 ? formatUnits(rateData[1], decimalsCEO) : null;

    // Errors
    const insufficientBalance = useMemo(() => {
        // Assume 0 if empty/invalid to prevent crashes, but logically it's not insufficient if empty
        if (balanceUSDCData === undefined) return false;
        // Don't flag error if input is empty
        if (!amountIn) return false;
        try {
            const val = parseUnits(amountIn, decimalsUSDC);
            return val > balanceUSDCData;
        } catch (e) {
            return false;
        }
    }, [amountIn, balanceUSDCData, decimalsUSDC]);

    // Transaction
    const [modalOpen, setModalOpen] = useState(false);
    const [txStep, setTxStep] = useState('IDLE');
    const [txHash, setTxHash] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);

    // Allowances
    const { allowance: allowanceUSDC, refetch: refetchAllowanceUSDC } = useTokenAllowance(BASE_USDC_ADDRESS, address, UNISWAP_V2_ROUTER_ADDRESS);
    const { approve, isConfirmed: isApproveConfirmed, error: approveError } = useTokenApprove();
    const { swapExactTokensForTokens, swapTokensForExactTokens, isConfirmed: isSwapConfirmed, error: swapError, hash: swapTxHash } = useUniswapSwap();

    const handleSwapExecution = useCallback(() => {
        try {
            const amountInBN = parseUnits(amountIn || "0", decimalsUSDC);
            if (!allowanceUSDC || allowanceUSDC < amountInBN) {
                setTxStep('APPROVING');
                approve(BASE_USDC_ADDRESS, UNISWAP_V2_ROUTER_ADDRESS, amountInBN);
            } else {
                setTxStep('SWAPPING');
                const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

                if (mode === 'PRICE') {
                    const amountOutMin = amountsOutData ? (amountsOutData[amountsOutData.length - 1] * 995n) / 1000n : 0n;
                    swapExactTokensForTokens(amountInBN, amountOutMin, path, address, deadline);
                } else {
                    const amountOutBN = parseUnits(amountOut || "0", decimalsCEO);
                    const amountInMax = amountsInData ? (amountsInData[0] * 1005n) / 1000n : amountInBN * 2n;
                    swapTokensForExactTokens(amountOutBN, amountInMax, path, address, deadline);
                }
            }
        } catch (e) {
            console.error(e);
            setTxStep('ERROR');
            setErrorMsg("Failed to initiate transaction");
        }
    }, [amountIn, amountOut, decimalsUSDC, allowanceUSDC, approve, mode, amountsOutData, swapExactTokensForTokens, path, address, decimalsCEO, amountsInData, swapTokensForExactTokens]);

    // Effects for Transaction States
    useEffect(() => {
        if (isApproveConfirmed) {
            setTxStep('APPROVE_SUCCESS');
            refetchAllowanceUSDC();
            setTimeout(() => handleSwapExecution(), 1000);
        }
        if (approveError) {
            setTxStep('ERROR');
            setErrorMsg(approveError.message || "Approval Failed");
        }
    }, [isApproveConfirmed, approveError, refetchAllowanceUSDC, handleSwapExecution]);

    useEffect(() => {
        if (isSwapConfirmed) {
            setTxStep('SUCCESS');
            setTxHash(swapTxHash);
            refetchBalanceUSDC();
            refetchBalanceCEO();
        }
        if (swapError) {
            setTxStep('ERROR');
            setErrorMsg(swapError.message || "Swap Failed");
        }
    }, [isSwapConfirmed, swapError, swapTxHash, refetchBalanceUSDC, refetchBalanceCEO]);

    const handleSwapClick = () => {
        if (!address) return;
        if (isWrongNetwork) {
            switchChain({ chainId: TARGET_CHAIN_ID });
            return;
        }
        setModalOpen(true);
        setTxStep('IDLE');
        setErrorMsg(null);
        handleSwapExecution();
    };


    const handleCloseModal = () => {
        if (txStep === 'SUCCESS' || txStep === 'ERROR' || txStep === 'IDLE') {
            setModalOpen(false);
            if (txStep === 'SUCCESS') {
                setAmountIn("");
                setAmountOut("");
                setTxStep('IDLE');
            }
        }
    };

    const getModalProps = () => {
        const steps = [
            { label: 'Approve USDC', status: txStep === 'APPROVING' ? 'pending' : (txStep === 'APPROVE_SUCCESS' || txStep === 'SWAPPING' || txStep === 'SUCCESS' ? 'completed' : 'idle') },
            { label: 'Confirm Swap', status: txStep === 'SWAPPING' ? 'pending' : (txStep === 'SUCCESS' ? 'completed' : 'idle') }
        ];
        return {
            title: "Swap USDC for CEO",
            steps: steps,
            txHash: txHash,
            errorMsg: errorMsg,
            successMsg: "Swap Successful!"
        };
    };

    return (
        <div className="swap-interface">
            <TokenInput
                label="Sell (Exact Input)"
                amount={amountIn}
                setAmount={(val) => {
                    setAmountIn(val);
                    setMode('PRICE');
                }}
                token={MOCK_TOKENS.USDC}
                balance={formattedBalanceUSDC ? parseFloat(formattedBalanceUSDC).toFixed(4) : (isBalanceUSDCLoading ? null : "0.0")}
                usdValue={amountIn}
                isLoading={mode === 'QUOTE' && isLoadingIn}
                error={insufficientBalance ? "Insufficient Balance" : null}
            />

            <div className="interface-divider">
                <div className="divider-icon">
                    <ArrowDown size={16} />
                </div>
            </div>

            <TokenInput
                label="Buy (Exact Output)"
                amount={amountOut}
                setAmount={(val) => {
                    setAmountOut(val);
                    setMode('QUOTE');
                }}
                token={MOCK_TOKENS.CEO}
                balance={formattedBalanceCEO ? parseFloat(formattedBalanceCEO).toFixed(4) : (isBalanceCEOLoading ? null : "0.0")}
                usdValue={""}
                isLoading={mode === 'PRICE' && isLoadingOut}
            />

            <div className={`fee-breakdown !mt-4 !p-3 !bg-black/20 !rounded-lg !text-sm !text-gray-400 ${(!rateUSDCtoCEO && !isLoadingOut) ? 'opacity-50' : ''}`}>
                <div className="flex justify-between mb-1">
                    <span>Rate</span>
                    <span className="flex items-center gap-2">
                        {rateUSDCtoCEO ? `1 USDC ≈ ${parseFloat(rateUSDCtoCEO).toFixed(2)} CEO` : <Loader2 className="animate-spin" size={12} />}
                    </span>
                </div>
                <div className="flex justify-between mb-1">
                    <span>Network Fee</span>
                    <span>~0.0005 ETH</span>
                </div>
                <div className="flex justify-between">
                    <span>Protocol Fee</span>
                    <span>0.30%</span>
                </div>
            </div>

            {isWrongNetwork ? (
                <button
                    className="action-button-large !mt-4 bg-yellow-600 hover:bg-yellow-500 text-white"
                    onClick={() => switchChain({ chainId: TARGET_CHAIN_ID })}
                >
                    <AlertTriangle size={18} className="mr-2 inline" />
                    Switch to Base
                </button>
            ) : (
                <button
                    className={`action-button-large !mt-4 ${insufficientBalance ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={handleSwapClick}
                    disabled={!amountIn || !amountOut || !isConnected || isLoadingOut || isLoadingIn || insufficientBalance}
                >
                    {isConnected ? (insufficientBalance ? "Insufficient USDC Balance" : "Swap") : "Connect Wallet"}
                </button>
            )}

            <SwapModal
                open={modalOpen}
                onClose={handleCloseModal}
                {...getModalProps()}
            />
        </div>
    );
}
