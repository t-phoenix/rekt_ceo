import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { UNISWAP_V2_ROUTER_ADDRESS, UNISWAP_V2_ROUTER_ABI, ERC20_ABI, UNISWAP_FACTORY_ABI, UNISWAP_PAIR_ABI } from '../constants/uniswap';

// Environment variables
const CHAIN_ID = Number(process.env.BASE_CHAIN_ID || 8453);

export function useUniswapAmountsOut(amountIn, path) {
    const isEnabled = !!amountIn && amountIn !== '0' && path?.length >= 2;

    const { data, isError, isLoading, refetch } = useReadContract({
        address: UNISWAP_V2_ROUTER_ADDRESS,
        abi: UNISWAP_V2_ROUTER_ABI,
        functionName: 'getAmountsOut',
        args: [amountIn, path],
        chainId: CHAIN_ID,
        query: {
            enabled: isEnabled,
            staleTime: 5000, // 5 seconds
        }
    });

    return { amounts: data, isError, isLoading, refetch };
}

export function useUniswapAmountsIn(amountOut, path) {
    const isEnabled = !!amountOut && amountOut !== '0' && path?.length >= 2;

    const { data, isError, isLoading, refetch } = useReadContract({
        address: UNISWAP_V2_ROUTER_ADDRESS,
        abi: UNISWAP_V2_ROUTER_ABI,
        functionName: 'getAmountsIn',
        args: [amountOut, path],
        chainId: CHAIN_ID,
        query: {
            enabled: isEnabled,
            staleTime: 5000,
        }
    });

    return { amounts: data, isError, isLoading, refetch };
}

export function useTokenAllowance(tokenAddress, ownerAddress, spenderAddress) {
    const { data: allowance, refetch } = useReadContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [ownerAddress, spenderAddress],
        chainId: CHAIN_ID,
        query: {
            enabled: !!tokenAddress && !!ownerAddress && !!spenderAddress,
        }
    });
    return { allowance, refetch };
}

export function useTokenApprove() {
    const { writeContract, data: hash, isPending, error } = useWriteContract();

    // Wait for tx
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash,
    });

    const approve = (tokenAddress, spenderAddress, amount) => {
        writeContract({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [spenderAddress, amount],
            chainId: CHAIN_ID,
        });
    };

    return { approve, hash, isPending, isConfirming, isConfirmed, error };
}

export function useUniswapSwap() {
    const { writeContract, data: hash, isPending, error } = useWriteContract();

    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash,
    });

    const swapExactTokensForTokens = (amountIn, amountOutMin, path, to, deadline) => {
        writeContract({
            address: UNISWAP_V2_ROUTER_ADDRESS,
            abi: UNISWAP_V2_ROUTER_ABI,
            functionName: 'swapExactTokensForTokens',
            args: [amountIn, amountOutMin, path, to, deadline],
            chainId: CHAIN_ID,
        });
    };

    const swapTokensForExactTokens = (amountOut, amountInMax, path, to, deadline) => {
        writeContract({
            address: UNISWAP_V2_ROUTER_ADDRESS,
            abi: UNISWAP_V2_ROUTER_ABI,
            functionName: 'swapTokensForExactTokens',
            args: [amountOut, amountInMax, path, to, deadline],
            chainId: CHAIN_ID,
        });
    };

    return {
        swapExactTokensForTokens,
        swapTokensForExactTokens,
        hash,
        isPending,
        isConfirming,
        isConfirmed,
        error
    };
}

export function useTokenDecimals(tokenAddress) {
    const { data: decimals } = useReadContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'decimals',
        chainId: CHAIN_ID,
        query: {
            enabled: !!tokenAddress,
            staleTime: Infinity, // Decimals don't change
        }
    });
    return decimals;
}


export function useUniswapFactory() {
    // Try to get factory directly from router
    const { data: factory, isError, isLoading } = useReadContract({
        address: UNISWAP_V2_ROUTER_ADDRESS,
        abi: [{
            "inputs": [],
            "name": "factory",
            "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
            "stateMutability": "view",
            "type": "function"
        }],
        functionName: 'factory',
        chainId: CHAIN_ID,
        query: {
            staleTime: Infinity,
        }
    });

    return { factory, isError, isLoading };
}

export function useUniswapReserves(tokenA, tokenB, userAddress) {
    const { factory } = useUniswapFactory();

    // Get Pair Address
    const { data: pairAddress } = useReadContract({
        address: factory,
        abi: UNISWAP_FACTORY_ABI,
        functionName: 'getPair',
        args: [tokenA, tokenB],
        chainId: CHAIN_ID,
        query: {
            enabled: !!factory && !!tokenA && !!tokenB,
            staleTime: Infinity,
        }
    });

    // Get Reserves
    const { data: reserves, isError, isLoading, refetch } = useReadContract({
        address: pairAddress,
        abi: UNISWAP_PAIR_ABI,
        functionName: 'getReserves',
        chainId: CHAIN_ID,
        query: {
            enabled: !!pairAddress,
            refetchInterval: 10000,
        }
    });

    // Get Token0 to ensure correct ordering
    const { data: token0 } = useReadContract({
        address: pairAddress,
        abi: UNISWAP_PAIR_ABI,
        functionName: 'token0',
        chainId: CHAIN_ID,
        query: {
            enabled: !!pairAddress,
            staleTime: Infinity,
        }
    });

    // Get Total Supply
    const { data: totalSupply } = useReadContract({
        address: pairAddress,
        abi: ERC20_ABI,
        functionName: 'totalSupply',
        chainId: CHAIN_ID,
        query: {
            enabled: !!pairAddress,
            refetchInterval: 30000,
        }
    });

    // Get User LP Balance
    const { data: userBalance } = useReadContract({
        address: pairAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [userAddress],
        chainId: CHAIN_ID,
        query: {
            enabled: !!pairAddress && !!userAddress,
            refetchInterval: 10000,
        }
    });

    return { reserves, token0, pairAddress, isError, isLoading, refetch, totalSupply, userBalance };
}

export function useUniswapAddLiquidity() {
    const { writeContract, data: hash, isPending, error } = useWriteContract();

    // Wait for tx
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash,
    });

    const addLiquidity = (tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin, to, deadline) => {
        writeContract({
            address: UNISWAP_V2_ROUTER_ADDRESS,
            abi: UNISWAP_V2_ROUTER_ABI,
            functionName: 'addLiquidity',
            args: [tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin, to, deadline],
            chainId: CHAIN_ID,
        });
    };

    return { addLiquidity, hash, isPending, isConfirming, isConfirmed, error };
}

