import { useEffect, useMemo, useReducer } from "react";
import {
  useTransactionSteps,
  SWAP_EXPECTED_STEPS,
  useNexusError,
  useDebouncedCallback,
  usePolling,
} from "../../common";

const initialState = {
  inputs: {
    fromToken: undefined,
    toToken: undefined,
    fromAmount: undefined,
    toAmount: undefined,
    fromChainID: undefined,
    toChainID: undefined,
  },
  swapMode: "exactIn",
  status: "idle",
  error: null,
  explorerUrls: {
    sourceExplorerUrl: null,
    destinationExplorerUrl: null,
  },
};

function reducer(state, action) {
  switch (action.type) {
    case "setInputs": {
      return {
        ...state,
        inputs: {
          ...state.inputs,
          ...action.payload,
        },
      };
    }
    case "setStatus":
      return { ...state, status: action.payload };
    case "setError":
      return { ...state, error: action.payload };
    case "setSwapMode":
      return { ...state, swapMode: action.payload };
    case "setExplorerUrls":
      return {
        ...state,
        explorerUrls: { ...state.explorerUrls, ...action.payload },
      };
    case "reset":
      return { ...initialState };
    default:
      return state;
  }
}

const useSwaps = ({
  nexusSDK,
  swapIntent,
  swapBalance,
  fetchBalance,
  onComplete,
  onStart,
  onError,
  defaultInputs,
}) => {
  const [state, dispatch] = useReducer(reducer, initialState, (initial) => {
    return {
      ...initial,
      inputs: {
        ...initial.inputs,
        ...defaultInputs,
      },
    };
  });
  const {
    steps,
    seed,
    onStepComplete,
    reset: resetSteps,
  } = useTransactionSteps();

  const areExactInInputsValid = useMemo(() => {
    return (
      state?.inputs?.fromChainID !== undefined &&
      state?.inputs?.toChainID !== undefined &&
      state?.inputs?.fromToken &&
      state?.inputs?.toToken &&
      state?.inputs?.fromAmount &&
      Number(state.inputs.fromAmount) > 0
    );
  }, [state.inputs]);

  const areExactOutInputsValid = useMemo(() => {
    return (
      state?.inputs?.toChainID !== undefined &&
      state?.inputs?.toToken &&
      state?.inputs?.toAmount &&
      Number(state.inputs.toAmount) > 0
    );
  }, [state.inputs]);

  const areInputsValid = useMemo(() => {
    return state.swapMode === "exactIn"
      ? areExactInInputsValid
      : areExactOutInputsValid;
  }, [state.swapMode, areExactInInputsValid, areExactOutInputsValid]);

  const handleNexusError = useNexusError();

  const handleSwapEvent = (event) => {
    if (event.type === "plan_preview") {
      seed(event.plan?.steps ?? SWAP_EXPECTED_STEPS);
    }
    if (event.type === "plan_progress") {
      if (event.stepType === "source_swap" && event.explorerUrl) {
        dispatch({
          type: "setExplorerUrls",
          payload: { sourceExplorerUrl: event.explorerUrl },
        });
      }
      if (event.stepType === "destination_swap" && event.explorerUrl) {
        dispatch({
          type: "setExplorerUrls",
          payload: { destinationExplorerUrl: event.explorerUrl },
        });
      }
      if (event.state === "confirmed" || event.state === "submitted") {
        onStepComplete({
          type: event.stepType?.toUpperCase(),
          explorerURL: event.explorerUrl,
          ...event.step,
        });
      }
    }
  };

  const getSwapHooks = () => ({
    hooks: {
      onIntent: (data) => {
        swapIntent.current = data;
      },
    },
    onEvent: handleSwapEvent,
  });

  const handleExactInSwap = async () => {
    if (
      !nexusSDK ||
      !areExactInInputsValid ||
      !state?.inputs?.fromToken ||
      !state?.inputs?.toToken ||
      !state?.inputs?.fromAmount ||
      !state?.inputs?.toChainID ||
      !state?.inputs?.fromChainID
    ) {
      return;
    }

    const fromTokenAddress =
      state.inputs.fromToken.contractAddress ??
      state.inputs.fromToken.tokenAddress;
    const amountBigInt = nexusSDK.utils.parseUnits(
      state.inputs.fromAmount,
      state.inputs.fromToken.decimals
    );

    await nexusSDK.swapWithExactIn(
      {
        sources: [
          {
            chainId: state.inputs.fromChainID,
            tokenAddress: fromTokenAddress,
            amountRaw: amountBigInt,
          },
        ],
        toChainId: state.inputs.toChainID,
        toTokenAddress: state.inputs.toToken.tokenAddress,
      },
      getSwapHooks()
    );
  };

  const handleExactOutSwap = async () => {
    if (
      !nexusSDK ||
      !areExactOutInputsValid ||
      !state?.inputs?.toToken ||
      !state?.inputs?.toAmount ||
      !state?.inputs?.toChainID
    ) {
      return;
    }

    const amountBigInt = nexusSDK.utils.parseUnits(
      state.inputs.toAmount,
      state.inputs.toToken.decimals
    );

    await nexusSDK.swapWithExactOut(
      {
        toAmountRaw: amountBigInt,
        toChainId: state.inputs.toChainID,
        toTokenAddress: state.inputs.toToken.tokenAddress,
      },
      getSwapHooks()
    );
  };

  const handleSwap = async () => {
    if (!nexusSDK || !areInputsValid) return;

    try {
      onStart?.();
      dispatch({ type: "setStatus", payload: "simulating" });
      seed(SWAP_EXPECTED_STEPS);

      if (state.swapMode === "exactIn") {
        await handleExactInSwap();
      } else {
        await handleExactOutSwap();
      }

      dispatch({ type: "setStatus", payload: "success" });
      onComplete?.(swapIntent.current?.intent?.destination?.amount);
      await fetchBalance();
    } catch (error) {
      const { message } = handleNexusError(error);
      dispatch({ type: "setStatus", payload: "error" });
      dispatch({ type: "setError", payload: message });
      onError?.(message);
      swapIntent.current = null;
    }
  };

  const debouncedSwapStart = useDebouncedCallback(handleSwap, 1200);

  const reset = () => {
    dispatch({
      type: "setInputs",
      payload: { ...initialState.inputs, ...defaultInputs },
    });
    dispatch({ type: "setStatus", payload: "idle" });
    dispatch({ type: "setError", payload: null });
    resetSteps();
    swapIntent.current = null;
  };

  const availableBalance = useMemo(() => {
    if (
      !nexusSDK ||
      !swapBalance ||
      !state.inputs?.fromToken ||
      !state.inputs?.fromChainID
    ) {
      return undefined;
    }
    return (
      swapBalance
        ?.find((token) => token.symbol === state.inputs?.fromToken?.symbol)
        ?.breakdown?.find(
          (chain) => chain.chain?.id === state.inputs?.fromChainID
        ) ?? undefined
    );
  }, [state.inputs?.fromToken, state.inputs?.fromChainID, swapBalance, nexusSDK]);

  const destinationBalance = useMemo(() => {
    if (
      !nexusSDK ||
      !swapBalance ||
      !state.inputs?.toToken ||
      !state.inputs?.toChainID
    ) {
      return undefined;
    }
    return (
      swapBalance
        ?.find((token) => token.symbol === state?.inputs?.toToken?.symbol)
        ?.breakdown?.find(
          (chain) => chain.chain?.id === state?.inputs?.toChainID
        ) ?? undefined
    );
  }, [
    state?.inputs?.toToken,
    state?.inputs?.toChainID,
    swapBalance,
    nexusSDK,
  ]);

  const availableStables = useMemo(() => {
    if (!nexusSDK || !swapBalance) return [];
    const filteredToken = swapBalance?.filter((token) =>
      ["USDT", "USDC", "ETH", "DAI", "WBTC"].includes(token.symbol)
    );
    return filteredToken ?? [];
  }, [swapBalance, nexusSDK]);

  const formatBalance = (balance, symbol, decimals) => {
    if (!balance || !symbol || !decimals) return undefined;
    return nexusSDK?.utils?.formatTokenBalance(balance, {
      symbol,
      decimals,
    });
  };

  useEffect(() => {
    if (!swapBalance) {
      fetchBalance();
    }
  }, [swapBalance, fetchBalance]);

  useEffect(() => {
    const isValidForCurrentMode =
      state.swapMode === "exactIn"
        ? areExactInInputsValid &&
          state?.inputs?.fromAmount &&
          state?.inputs?.fromChainID &&
          state?.inputs?.fromToken &&
          state?.inputs?.toChainID &&
          state?.inputs?.toToken
        : areExactOutInputsValid &&
          state?.inputs?.toAmount &&
          state?.inputs?.toChainID &&
          state?.inputs?.toToken;

    if (!isValidForCurrentMode) {
      swapIntent.current?.deny();
      swapIntent.current = null;
      return;
    }
    if (state.status === "idle") {
      debouncedSwapStart();
    }
  }, [
    state.inputs,
    state.swapMode,
    areExactInInputsValid,
    areExactOutInputsValid,
    state.status,
    debouncedSwapStart,
    swapIntent,
  ]);

  const refreshSimulation = async () => {
    try {
      const updated = await swapIntent.current?.refresh();
      if (updated) {
        swapIntent.current.intent = updated;
      }
    } catch (e) {
      console.error(e);
    }
  };

  usePolling(
    state.status === "simulating" && Boolean(swapIntent.current),
    async () => {
      await refreshSimulation();
    },
    15000
  );

  return {
    status: state.status,
    inputs: state.inputs,
    swapMode: state.swapMode,
    setSwapMode: (mode) => dispatch({ type: "setSwapMode", payload: mode }),
    setStatus: (status) => dispatch({ type: "setStatus", payload: status }),
    setInputs: (inputs) => {
      if (state.status === "error") {
        dispatch({ type: "setError", payload: null });
        dispatch({ type: "setStatus", payload: "idle" });
      }
      dispatch({ type: "setInputs", payload: inputs });
    },
    txError: state.error,
    setTxError: (error) => dispatch({ type: "setError", payload: error }),
    availableBalance,
    availableStables,
    destinationBalance,
    formatBalance,
    steps,
    explorerUrls: state.explorerUrls,
    handleSwap,
    reset,
    areInputsValid,
  };
};

export default useSwaps;
