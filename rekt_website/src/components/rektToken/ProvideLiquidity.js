import { useCallback, useState, useEffect, useMemo } from "react";
import { Plus } from "lucide-react";
import { useAccount, useSwitchChain, useChainId, useReadContract } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import {
    useTokenAllowance,
    useTokenApprove,
    useUniswapAddLiquidity,
    useUniswapReserves,
    useTokenDecimals,
    useUniswapAmountsOut
} from "../../hooks/useUniswap";
import { UNISWAP_V2_ROUTER_ADDRESS, ERC20_ABI } from "../../constants/uniswap";
import SwapModal from "../SwapModal";
import TokenInput from "./TokenInput";
import { BASE_USDC_ADDRESS, BASE_TOKEN_ADDRESS, TARGET_CHAIN_ID, MOCK_TOKENS } from "./config";
import "../ProvideLiquidity.css";

export default function ProvideLiquidity() {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const { switchChain } = useSwitchChain();

    const isWrongNetwork = isConnected && chainId !== TARGET_CHAIN_ID;

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

    // Rate for Fallback
    const path = useMemo(() => [BASE_USDC_ADDRESS, BASE_TOKEN_ADDRESS], []);
    const { amounts: rateData } = useUniswapAmountsOut(parseUnits("1", decimalsUSDC), path);
    const rateUSDCtoCEO = rateData && rateData.length > 1 ? formatUnits(rateData[1], decimalsCEO) : null;


    // Liquidity State
    const [liquidityAmountA, setLiquidityAmountA] = useState("");
    const [liquidityAmountB, setLiquidityAmountB] = useState("");

    // Fetch Reserves for Liquidity Ratio
    const { reserves, token0, totalSupply, userBalance: userLPBalance } = useUniswapReserves(BASE_USDC_ADDRESS, BASE_TOKEN_ADDRESS, address);

    const [reserveUSDC, reserveCEO] = useMemo(() => {
        if (!reserves || !token0) return [0n, 0n];
        const [r0, r1] = reserves;
        if (BASE_USDC_ADDRESS.toLowerCase() === token0.toLowerCase()) return [r0, r1];
        return [r1, r0];
    }, [reserves, token0]);

    // Calculate Rate based on Reserves (No Fees) or Fallback to Swap Rate
    const liquidityRateUSDCtoCEO = useMemo(() => {
        if (reserveUSDC > 0n && reserveCEO > 0n) {
            const usdc = parseFloat(formatUnits(reserveUSDC, decimalsUSDC));
            const ceo = parseFloat(formatUnits(reserveCEO, decimalsCEO));
            return usdc > 0 ? ceo / usdc : 0;
        }
        if (rateUSDCtoCEO) return parseFloat(rateUSDCtoCEO);
        return 0;
    }, [reserveUSDC, reserveCEO, decimalsUSDC, decimalsCEO, rateUSDCtoCEO]);

    const handleLiquidityChange = (field, value) => {
        if (liquidityRateUSDCtoCEO === 0) {
            if (field === "A") setLiquidityAmountA(value);
            else setLiquidityAmountB(value);
            return;
        }

        if (field === "A") { // CEO
            setLiquidityAmountA(value);
            const val = parseFloat(value);
            if (!isNaN(val)) {
                setLiquidityAmountB((val / liquidityRateUSDCtoCEO).toFixed(6));
            } else if (!value) setLiquidityAmountB("");
        } else { // USDC
            setLiquidityAmountB(value);
            const val = parseFloat(value);
            if (!isNaN(val)) {
                setLiquidityAmountA((val * liquidityRateUSDCtoCEO).toFixed(6));
            } else if (!value) setLiquidityAmountA("");
        }
    };

    // Pool Share and LP Balance
    const poolShare = useMemo(() => {
        if (!userLPBalance || !totalSupply || totalSupply === 0n) return "0";

        // Uniswap V2 LP Tokens are 18 decimals
        // To Calculate share: (User Balance / Total Supply) * 100

        const bal = parseFloat(formatUnits(userLPBalance, 18));
        const total = parseFloat(formatUnits(totalSupply, 18));

        if (total === 0) return "0";
        const share = (bal / total) * 100;

        if (share < 0.0001 && share > 0) return "<0.0001";
        if (share < 0.01 && share > 0) return "<0.01";
        return share.toFixed(4);
    }, [userLPBalance, totalSupply]);


    // Errors
    const insufficientLiquidityBalance = useMemo(() => {
        if (balanceCEOData === undefined || balanceUSDCData === undefined) return false;
        const valA = parseFloat(liquidityAmountA || "0");
        const valB = parseFloat(liquidityAmountB || "0");
        const balA = parseFloat(formattedBalanceCEO || "0");
        const balB = parseFloat(formattedBalanceUSDC || "0");
        return valA > balA || valB > balB;
    }, [liquidityAmountA, liquidityAmountB, formattedBalanceCEO, formattedBalanceUSDC, balanceCEOData, balanceUSDCData]);


    // Transaction
    const [modalOpen, setModalOpen] = useState(false);
    const [txStep, setTxStep] = useState('IDLE');
    const [txHash, setTxHash] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);

    // Allowances
    const { allowance: allowanceUSDC, refetch: refetchAllowanceUSDC } = useTokenAllowance(BASE_USDC_ADDRESS, address, UNISWAP_V2_ROUTER_ADDRESS);
    const { allowance: allowanceCEO, refetch: refetchAllowanceCEO } = useTokenAllowance(BASE_TOKEN_ADDRESS, address, UNISWAP_V2_ROUTER_ADDRESS);

    const { approve, isConfirmed: isApproveConfirmed, error: approveError } = useTokenApprove();
    const { addLiquidity, isConfirmed: isAddLiquidityConfirmed, error: addLiquidityError, hash: addLiquidityHash } = useUniswapAddLiquidity();

    const handleAddLiquidityExecution = useCallback(() => {
        try {
            const amountA_BN = parseUnits(liquidityAmountA || "0", decimalsCEO); // CEO
            const amountB_BN = parseUnits(liquidityAmountB || "0", decimalsUSDC); // USDC

            // Check CEO Allowance
            if (!allowanceCEO || allowanceCEO < amountA_BN) {
                setTxStep('APPROVING_CEO');
                approve(BASE_TOKEN_ADDRESS, UNISWAP_V2_ROUTER_ADDRESS, amountA_BN);
                return;
            }

            // Check USDC Allowance
            if (!allowanceUSDC || allowanceUSDC < amountB_BN) {
                setTxStep('APPROVING_USDC');
                approve(BASE_USDC_ADDRESS, UNISWAP_V2_ROUTER_ADDRESS, amountB_BN);
                return;
            }

            setTxStep('ADDING');
            const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

            // Slippage 0.5%
            const amountAMin = (amountA_BN * 995n) / 1000n;
            const amountBMin = (amountB_BN * 995n) / 1000n;

            addLiquidity(
                BASE_TOKEN_ADDRESS,
                BASE_USDC_ADDRESS,
                amountA_BN,
                amountB_BN,
                amountAMin,
                amountBMin,
                address,
                deadline
            );

        } catch (e) {
            console.error(e);
            setTxStep('ERROR');
            setErrorMsg("Failed to initiate add liquidity");
        }
    }, [liquidityAmountA, liquidityAmountB, decimalsCEO, decimalsUSDC, allowanceCEO, allowanceUSDC, approve, addLiquidity, address]);

    // Effects for Transaction States
    useEffect(() => {
        if (isApproveConfirmed) {
            if (txStep === 'APPROVING_CEO') {
                setTxStep('APPROVED_CEO');
                refetchAllowanceCEO();
                setTimeout(() => handleAddLiquidityExecution(), 1000);
            } else if (txStep === 'APPROVING_USDC') {
                setTxStep('APPROVED_USDC');
                refetchAllowanceUSDC();
                setTimeout(() => handleAddLiquidityExecution(), 1000);
            }
        }
        if (approveError) {
            setTxStep('ERROR');
            setErrorMsg(approveError.message || "Approval Failed");
        }
    }, [isApproveConfirmed, approveError, refetchAllowanceUSDC, refetchAllowanceCEO, txStep, handleAddLiquidityExecution]);


    useEffect(() => {
        if (isAddLiquidityConfirmed) {
            setTxStep('SUCCESS');
            setTxHash(addLiquidityHash);
            refetchBalanceUSDC();
            refetchBalanceCEO();
        }
        if (addLiquidityError) {
            setTxStep('ERROR');
            setErrorMsg(addLiquidityError.message || "Liquidity Provision Failed");
        }
    }, [isAddLiquidityConfirmed, addLiquidityError, addLiquidityHash, refetchBalanceUSDC, refetchBalanceCEO]);

    const handleAddLiquidityClick = () => {
        if (!address) return;
        if (isWrongNetwork) {
            switchChain({ chainId: TARGET_CHAIN_ID });
            return;
        }
        setModalOpen(true);
        setTxStep('IDLE');
        setErrorMsg(null);
        handleAddLiquidityExecution();
    };

    const handleCloseModal = () => {
        if (txStep === 'SUCCESS' || txStep === 'ERROR' || txStep === 'IDLE') {
            setModalOpen(false);
            if (txStep === 'SUCCESS') {
                setLiquidityAmountA("");
                setLiquidityAmountB("");
                setTxStep('IDLE');
            }
        }
    };

    const getModalProps = () => {
        const steps = [];
        const ceoStatus = (txStep === 'APPROVING_CEO') ? 'pending'
            : (['APPROVED_CEO', 'APPROVING_USDC', 'APPROVED_USDC', 'ADDING', 'SUCCESS'].includes(txStep) ? 'completed' : 'idle');

        const usdcStatus = (txStep === 'APPROVING_USDC') ? 'pending'
            : (['APPROVED_USDC', 'ADDING', 'SUCCESS'].includes(txStep) ? 'completed' : 'idle');

        steps.push({ label: "Approve CEO", status: ceoStatus });
        steps.push({ label: "Approve USDC", status: usdcStatus });
        steps.push({
            label: "Add Liquidity",
            status: txStep === 'ADDING' ? 'pending' : (txStep === 'SUCCESS' ? 'completed' : 'idle')
        });

        return {
            title: "Add Liquidity",
            steps: steps,
            txHash: txHash,
            errorMsg: errorMsg,
            successMsg: "Liquidity Added!"
        };
    };

    return (
        <div className="liquidity-interface">
            <TokenInput
                label="Input"
                amount={liquidityAmountA}
                setAmount={(v) => handleLiquidityChange("A", v)}
                token={MOCK_TOKENS.CEO}
                balance={formattedBalanceCEO ? parseFloat(formattedBalanceCEO).toFixed(4) : (isBalanceCEOLoading ? null : "0.0")}
                usdValue={""}
            />

            <div className="interface-divider">
                <div className="divider-icon">
                    <Plus size={16} />
                </div>
            </div>

            <TokenInput
                label="Input"
                amount={liquidityAmountB}
                setAmount={(v) => handleLiquidityChange("B", v)}
                token={MOCK_TOKENS.USDC}
                balance={formattedBalanceUSDC ? parseFloat(formattedBalanceUSDC).toFixed(4) : (isBalanceUSDCLoading ? null : "0.0")}
                usdValue={liquidityAmountB}
            />

            <div className="pool-stats">
                <div className="stat-row">
                    <span>Rate</span>
                    <span>{liquidityRateUSDCtoCEO ? `1 USDC = ${liquidityRateUSDCtoCEO.toFixed(2)} CEO` : "Loading..."}</span>
                </div>
                <div className="stat-row">
                    <span>Yield</span>
                    <span className="text-green-400">0.3% / tx</span>
                </div>
                <br />

                <div className="stat-row">
                    <span>My Liquidity</span>
                    <span title={userLPBalance ? userLPBalance.toString() : ""}>
                        {userLPBalance ? Number(userLPBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 }) : "0.00"} UNI-V2
                    </span>
                </div>
                <div className="stat-row">
                    <span>Share of Pool</span>
                    <span>{poolShare}%</span>
                </div>
            </div>

            <button
                className={`action-button-large mt-4 ${insufficientLiquidityBalance ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={handleAddLiquidityClick}
                disabled={!liquidityAmountA || !liquidityAmountB || !isConnected || insufficientLiquidityBalance}
            >
                {isConnected ? (insufficientLiquidityBalance ? "Insufficient Balance" : "Add Liquidity") : "Connect Wallet"}
            </button>

            <SwapModal
                open={modalOpen}
                onClose={handleCloseModal}
                {...getModalProps()}
            />
        </div>
    );
}
