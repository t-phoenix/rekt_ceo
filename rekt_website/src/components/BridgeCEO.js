import React, { useState, useEffect } from 'react';
import './BridgeCEO.css';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useSolanaBalances } from '../hooks/useSolanaBalances';
import { useWormholeBridge } from '../hooks/useWormholeBridge';
import { ESTIMATED_BRIDGE_TIME_SECONDS, BASE_EXPLORER_URL } from '../config/wormholeConfig';
import { useAccount, useSwitchChain } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { useEthersSigner } from '../hooks/useEthersSigner';

import BridgeHeader from './bridge/BridgeHeader';
import PendingTxButton from './bridge/PendingTxButton';
import BridgeInputs from './bridge/BridgeInputs';
import RecipientInput from './bridge/RecipientInput';
import FeeBreakdown from './bridge/FeeBreakdown';
import BridgeProgressModal from './bridge/BridgeProgressModal';
import PendingTxModal from './bridge/PendingTxModal';

const BridgeCEO = () => {
    const { setVisible } = useWalletModal();
    const { connected } = useWallet();
    const { ceoBalance } = useSolanaBalances();

    const {
        sdkReady,
        status,
        currentStep,
        progressMessage,
        steps,
        quote,
        quoteError,
        fetchQuote,
        solanaTxHash,
        baseTxHash,
        wormholeExplorerUrl,
        errorMessage,
        elapsedSeconds,
        estimatedSeconds,
        bridge,
        reset,
        pendingTransactions,
        redeem,
        isLoadingPending,
        refetchPending,
    } = useWormholeBridge();

    // EVM Wallet (for redemption)
    const { address: evmAddress, isConnected: isEvmConnected, chainId: evmChainId } = useAccount();
    const { open: openEvmModal } = useAppKit();
    const { switchChain } = useSwitchChain();
    const ethersSigner = useEthersSigner({ chainId: evmChainId });

    const [solanaAmount, setSolanaAmount] = useState('');
    const [recipientAddress, setRecipientAddress] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showPendingModal, setShowPendingModal] = useState(false);
    const [redeemingId, setRedeemingId] = useState(null);

    const handleRedeem = async (tx) => {
        if (!isEvmConnected) {
            openEvmModal();
            return;
        }
        // Base Chain ID is 8453
        const BASE_CHAIN_ID = 8453;
        if (evmChainId !== BASE_CHAIN_ID) {
            if (switchChain) {
                switchChain({ chainId: BASE_CHAIN_ID });
            } else {
                alert("Please switch your wallet to Base chain to redeem.");
            }
            return;
        }
        if (!ethersSigner) {
            alert("Wallet signer not ready.");
            return;
        }

        try {
            setRedeemingId(tx.id);
            // Use the source transaction hash for TokenTransfer.from
            await redeem(tx.sourceTxHash, ethersSigner);
            alert("Success! Transfer completed.");
            refetchPending(); // Refresh list
        } catch (e) {
            console.error(e);
            alert("Redemption failed: " + (e.message || "Unknown error"));
        } finally {
            setRedeemingId(null);
        }
    };

    // Fetch quote when amount or recipient changes
    useEffect(() => {
        const amount = parseFloat(solanaAmount);
        if (amount > 0 && recipientAddress && recipientAddress.startsWith('0x') && recipientAddress.length === 42) {
            fetchQuote(amount, recipientAddress);
        }
    }, [solanaAmount, recipientAddress, fetchQuote]);

    // Show modal when bridge starts
    useEffect(() => {
        if (['confirming', 'bridging', 'relaying', 'success', 'error'].includes(status)) {
            setShowModal(true);
        }
    }, [status]);

    const handleAmountChange = (e) => {
        const value = e.target.value;
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
            setSolanaAmount(value);
        }
    };

    const handleMaxClick = () => {
        if (ceoBalance > 0) {
            setSolanaAmount(ceoBalance.toString());
        }
    };

    const handleHalfClick = () => {
        if (ceoBalance > 0) {
            setSolanaAmount((ceoBalance / 2).toString());
        }
    };

    const handleConnectWallet = () => {
        setVisible(true);
    };

    const handleBridge = () => {
        const amount = parseFloat(solanaAmount);
        if (amount > 0 && recipientAddress) {
            bridge(amount, recipientAddress);
        }
    };

    const handleButtonClick = () => {
        if (!connected) {
            handleConnectWallet();
        } else if (solanaAmount && parseFloat(solanaAmount) > 0 && recipientAddress) {
            handleBridge();
        }
    };

    const getButtonText = () => {
        if (!connected) return 'Connect Wallet';
        if (!sdkReady) return 'Initializing Bridge...';
        if (!solanaAmount || parseFloat(solanaAmount) <= 0) return 'Enter Amount';
        if (!recipientAddress || !recipientAddress.startsWith('0x') || recipientAddress.length !== 42) return 'Enter Base Address';
        if (status === 'quoting') return 'Getting Quote...';
        return 'Bridge Now';
    };

    const isButtonDisabled = () => {
        if (!connected) return false; // Connect wallet is always enabled
        if (!sdkReady) return true;
        if (!solanaAmount || parseFloat(solanaAmount) <= 0) return true;
        if (!recipientAddress || !recipientAddress.startsWith('0x') || recipientAddress.length !== 42) return true;
        if (status === 'quoting') return true;
        if (parseFloat(solanaAmount) > ceoBalance) return true;
        return false;
    };

    const closeModal = () => {
        setShowModal(false);
        if (status === 'success') {
            setSolanaAmount('');
            setRecipientAddress('');
        }
        reset();
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Estimated receive amount
    const estimatedReceive = quote?.success
        ? (quote.destinationAmount ? (Number(quote.destinationAmount) / (10 ** 6)).toFixed(2) : (parseFloat(solanaAmount) * 0.999).toFixed(2))
        : (solanaAmount ? (parseFloat(solanaAmount) * 0.999).toFixed(2) : '');

    // Progress percentage for the bar
    const getProgressPercent = () => {
        if (status === 'confirming' || status === 'bridging') return 15;
        if (status === 'relaying') {
            // Interpolate between 15% and 90% based on elapsed time
            const progress = Math.min((elapsedSeconds / estimatedSeconds) * 75, 75);
            return 15 + progress;
        }
        if (status === 'success') return 100;
        return 0;
    };

    return (
        <div className="bridge-ceo-card">
            <BridgeHeader />

            <div className="card-content">
                <PendingTxButton
                    setShowPendingModal={setShowPendingModal}
                    pendingTransactions={pendingTransactions}
                />

                <div className="bridge-interface">
                    <BridgeInputs
                        solanaAmount={solanaAmount}
                        handleAmountChange={handleAmountChange}
                        connected={connected}
                        ceoBalance={ceoBalance}
                        handleMaxClick={handleMaxClick}
                        handleHalfClick={handleHalfClick}
                        estimatedReceive={estimatedReceive}
                    />

                    <RecipientInput
                        recipientAddress={recipientAddress}
                        setRecipientAddress={setRecipientAddress}
                    />

                    <FeeBreakdown
                        solanaAmount={solanaAmount}
                        status={status}
                        quote={quote}
                        estimatedReceive={estimatedReceive}
                        ESTIMATED_BRIDGE_TIME_SECONDS={ESTIMATED_BRIDGE_TIME_SECONDS}
                        quoteError={quoteError}
                    />

                    {/* Action Button */}
                    <button
                        className={`bridge-button ${isButtonDisabled() ? 'disabled' : ''}`}
                        onClick={handleButtonClick}
                        disabled={isButtonDisabled()}
                    >
                        {getButtonText()}
                    </button>

                    <p className="bridge-note">
                        Securely bridge $CEO from Solana to Base via Wormhole. Automatic relay — no Base wallet interaction needed.
                    </p>
                </div>
            </div>

            <BridgeProgressModal
                showModal={showModal}
                status={status}
                closeModal={closeModal}
                steps={steps}
                currentStep={currentStep}
                getProgressPercent={getProgressPercent}
                elapsedSeconds={elapsedSeconds}
                estimatedSeconds={estimatedSeconds}
                formatTime={formatTime}
                progressMessage={progressMessage}
                solanaTxHash={solanaTxHash}
                wormholeExplorerUrl={wormholeExplorerUrl}
                solanaAmount={solanaAmount}
                estimatedReceive={estimatedReceive}
                BASE_EXPLORER_URL={BASE_EXPLORER_URL}
                baseTxHash={baseTxHash}
                errorMessage={errorMessage}
            />

            <PendingTxModal
                showPendingModal={showPendingModal}
                setShowPendingModal={setShowPendingModal}
                isEvmConnected={isEvmConnected}
                evmChainId={evmChainId}
                evmAddress={evmAddress}
                openEvmModal={openEvmModal}
                switchChain={switchChain}
                isLoadingPending={isLoadingPending}
                pendingTransactions={pendingTransactions}
                redeemingId={redeemingId}
                handleRedeem={handleRedeem}
            />
        </div >
    );
};

export default BridgeCEO;
