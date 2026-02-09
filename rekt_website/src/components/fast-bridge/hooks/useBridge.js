import { NEXUS_EVENTS, SUPPORTED_CHAINS } from "@avail-project/nexus-core";
import { useEffect, useMemo, useRef, useState, useReducer } from "react";
import { isAddress } from "viem";
import { useStopwatch, usePolling, useNexusError, useTransactionSteps } from "../../common";

const buildInitialInputs = (network, connectedAddress, prefill) => {
  return {
    chain:
      (prefill?.chainId) ??
      (network === "testnet"
        ? SUPPORTED_CHAINS.SEPOLIA
        : SUPPORTED_CHAINS.ETHEREUM),
    token: (prefill?.token) ?? "USDC",
    amount: prefill?.amount ?? undefined,
    recipient: (prefill?.recipient) ?? connectedAddress,
  };
};

const useBridge = ({
  network,
  connectedAddress,
  nexusSDK,
  intent,
  bridgableBalance,
  prefill,
  onComplete,
  onStart,
  onError,
  fetchBalance,
  allowance
}) => {
  const handleNexusError = useNexusError();
  const initialState = {
    inputs: buildInitialInputs(network, connectedAddress, prefill),
    status: "idle",
  };
  function reducer(state, action) {
    switch (action.type) {
      case "setInputs":
        return { ...state, inputs: { ...state.inputs, ...action.payload } };
      case "resetInputs":
        return {
          ...state,
          inputs: buildInitialInputs(network, connectedAddress, prefill),
        };
      case "setStatus":
        return { ...state, status: action.payload };
      default:
        return state;
    }
  }
  const [state, dispatch] = useReducer(reducer, initialState);
  const inputs = state.inputs;
  const setInputs = (next) => {
    dispatch({ type: "setInputs", payload: next });
  };

  const loading = state.status === "executing";
  const [refreshing, setRefreshing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [txError, setTxError] = useState(null);
  const [lastExplorerUrl, setLastExplorerUrl] = useState("");
  const commitLockRef = useRef(false);
  const {
    steps,
    onStepsList,
    onStepComplete,
    reset: resetSteps,
  } = useTransactionSteps();

  const areInputsValid = useMemo(() => {
    const hasToken = inputs?.token !== undefined && inputs?.token !== null;
    const hasChain = inputs?.chain !== undefined && inputs?.chain !== null;
    const hasAmount = Boolean(inputs?.amount) && Number(inputs?.amount) > 0;
    const hasValidrecipient =
      Boolean(inputs?.recipient) && isAddress(inputs?.recipient);
    return hasToken && hasChain && hasAmount && hasValidrecipient;
  }, [inputs]);

  const handleTransaction = async () => {
    if (
      !inputs?.amount ||
      !inputs?.recipient ||
      !inputs?.chain ||
      !inputs?.token
    ) {
      console.error("Missing required inputs");
      return;
    }
    dispatch({ type: "setStatus", payload: "executing" });
    setTxError(null);
    onStart?.();
    setLastExplorerUrl("");

    try {
      if (!nexusSDK) {
        throw new Error("Nexus SDK not initialized");
      }
      const formattedAmount = nexusSDK.convertTokenReadableAmountToBigInt(inputs?.amount, inputs?.token, inputs?.chain);
      const bridgeTxn = await nexusSDK.bridge({
        token: inputs?.token,
        amount: formattedAmount,
        toChainId: inputs?.chain,
        recipient: inputs?.recipient ?? connectedAddress,
      }, {
        onEvent: (event) => {
          if (event.name === NEXUS_EVENTS.STEPS_LIST) {
            const list = Array.isArray(event.args) ? event.args : [];
            onStepsList(list);
          }
          if (event.name === NEXUS_EVENTS.STEP_COMPLETE) {
            if (event.args.type === "INTENT_HASH_SIGNED") {
              stopwatch.start();
            }
            onStepComplete(event.args);
          }
        },
      });
      if (!bridgeTxn) {
        throw new Error("Transaction rejected by user");
      }
      if (bridgeTxn) {
        setLastExplorerUrl(bridgeTxn.explorerUrl);
        await onSuccess();
      }
    } catch (error) {
      const { message } = handleNexusError(error);
      intent.current?.deny();
      intent.current = null;
      allowance.current = null;
      setTxError(message);
      onError?.(message);
      setIsDialogOpen(false);
      dispatch({ type: "setStatus", payload: "error" });
    }
  };

  const onSuccess = async () => {
    // Close dialog and stop timer on success
    stopwatch.stop();
    dispatch({ type: "setStatus", payload: "success" });
    onComplete?.();
    intent.current = null;
    allowance.current = null;
    dispatch({ type: "resetInputs" });
    setRefreshing(false);
    await fetchBalance();
  };

  const filteredBridgableBalance = useMemo(() => {
    return bridgableBalance?.find((bal) => bal?.symbol === inputs?.token);
  }, [bridgableBalance, inputs?.token]);

  const refreshIntent = async () => {
    setRefreshing(true);
    try {
      await intent.current?.refresh([]);
    } catch (error) {
      console.error("Transaction failed:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const reset = () => {
    intent.current?.deny();
    intent.current = null;
    allowance.current = null;
    dispatch({ type: "resetInputs" });
    dispatch({ type: "setStatus", payload: "idle" });
    setRefreshing(false);
    stopwatch.stop();
    stopwatch.reset();
    resetSteps();
  };

  const startTransaction = () => {
    // Reset timer for a fresh run
    intent.current?.allow();
    setIsDialogOpen(true);
    setTxError(null);
  };

  const commitAmount = async () => {
    if (commitLockRef.current) return;
    if (!intent.current || loading || txError || !areInputsValid) return;
    commitLockRef.current = true;
    try {
      await handleTransaction();
    } finally {
      commitLockRef.current = false;
    }
  };

  usePolling(Boolean(intent.current) && !isDialogOpen, refreshIntent, 15000);

  const stopwatch = useStopwatch({ intervalMs: 100 });

  useEffect(() => {
    if (intent.current) {
      intent.current.deny();
      intent.current = null;
    }
  }, [inputs]);

  useEffect(() => {
    if (!isDialogOpen) {
      stopwatch.stop();
      stopwatch.reset();
    }
  }, [isDialogOpen, stopwatch]);

  useEffect(() => {
    if (txError) {
      setTxError(null);
    }
  }, [inputs]);

  return {
    inputs,
    setInputs,
    timer: stopwatch.seconds,
    setIsDialogOpen,
    setTxError,
    loading,
    refreshing,
    isDialogOpen,
    txError,
    handleTransaction,
    reset,
    filteredBridgableBalance,
    startTransaction,
    commitAmount,
    lastExplorerUrl,
    steps,
    status: state.status,
  };
};

export default useBridge;
