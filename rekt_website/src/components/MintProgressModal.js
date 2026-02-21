import React, { useState } from 'react';
import { MintStep } from '../hooks/useMint';
import { Loader2 } from 'lucide-react';
import { ethers } from 'ethers';
import './MintConfirmModal.css';

const MintProgressModal = ({
    isOpen,
    onClose,
    onConfirm,
    useMintInterface,
    type,
    imagePreview,
    pricing,
    isConnected
}) => {
    const {
        prepareMint,
        signPermit,
        submitMint,
        clearPendingMint,
        isMinting,
        error,
        currentStep,
        hasPendingMint,
        savedState
    } = useMintInterface;

    const [approvalAmount, setApprovalAmount] = useState('');
    const [localError, setLocalError] = useState(null);

    // Initialize the default approval amount if state exists
    React.useEffect(() => {
        if (savedState?.value && !approvalAmount) {
            try {
                const formatted = ethers.formatUnits(savedState.value, 18);
                setApprovalAmount(formatted);
            } catch (e) {
                // ignore
            }
        }
    }, [savedState, approvalAmount]);

    if (!isOpen) return null;

    const handlePrepare = async () => {
        setLocalError(null);
        try {
            await prepareMint(type, imagePreview);
        } catch (err) {
            setLocalError(err.message || 'Failed to prepare mint transaction');
        }
    };

    const handleSign = async () => {
        setLocalError(null);
        try {
            if (!approvalAmount || isNaN(approvalAmount)) {
                throw new Error("Please enter a valid numeric approval amount");
            }
            const weiAmount = ethers.parseUnits(approvalAmount.toString(), 18);
            await signPermit(weiAmount);
        } catch (err) {
            setLocalError(err.message || 'Signature failed or was rejected');
        }
    };

    const handleSubmit = async () => {
        setLocalError(null);
        try {
            await submitMint();
            onConfirm(); // Close or show success
        } catch (err) {
            setLocalError(err.message || 'Failed to submit mint');
        }
    };

    const handleReset = () => {
        clearPendingMint();
        setApprovalAmount('');
        setLocalError(null);
    }

    const displayError = localError || error;

    return (
        <div className="mint-confirm-overlay" onClick={isMinting ? undefined : onClose}>
            <div className="mint-confirm-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <div className="mint-confirm-header">
                    <h2 className="mint-confirm-title">
                        Minting Progress
                    </h2>
                    <button className="mint-confirm-close" onClick={onClose} disabled={isMinting}>
                        ✕
                    </button>
                </div>

                <div className="p-6 flex flex-col overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
                    {displayError && (
                        <div className="p-4 mb-6 text-sm font-medium text-[#ff8080] bg-[#3b1c32]/80 rounded-xl border border-[#d81e5b]/50 flex flex-col items-center justify-center text-center shadow-xl">
                            <span className="text-2xl mb-2">⚠️</span>
                            {displayError}
                        </div>
                    )}

                    <div className="flex flex-col" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
                        {/* Step 1: Prepare */}
                        <div style={{ display: 'flex', flexDirection: 'column', padding: '16px', borderRadius: '12px', border: currentStep === MintStep.IDLE || currentStep === MintStep.PREPARING ? '2px solid var(--color-yellow)' : '1px solid rgba(255,255,255,0.2)', background: currentStep === MintStep.IDLE || currentStep === MintStep.PREPARING ? 'rgba(248, 200, 38, 0.1)' : 'rgba(0,0,0,0.4)', transition: 'all 0.3s ease' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: currentStep === MintStep.PREPARING ? 'var(--color-yellow)' : 'white', fontFamily: 'var(--body-font)' }}>1. Prepare Transaction</span>
                                {currentStep > MintStep.PREPARING && <span style={{ color: 'var(--color-green)', fontWeight: 'bold' }}>✓ Done</span>}
                            </div>
                            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', margin: '0 0 12px 0', lineHeight: 1.4 }}>Authenticates your wallet, checks network, and fetches necessary contract details.</p>
                            {(currentStep === MintStep.IDLE || currentStep === MintStep.PREPARING || currentStep === MintStep.ERROR) && (
                                <button className="story-btn primary" style={{ width: '100%', margin: 0, padding: '12px', fontSize: '1rem' }} onClick={handlePrepare} disabled={isMinting || !isConnected}>
                                    {isMinting && currentStep === MintStep.PREPARING ? <><Loader2 className="animate-spin inline mr-2" size={16} /> Preparing...</> : 'Authenticate & Prepare'}
                                </button>
                            )}
                        </div>

                        {/* Step 2: Sign Permit */}
                        <div style={{ display: 'flex', flexDirection: 'column', padding: '16px', borderRadius: '12px', border: currentStep === MintStep.SIGNING ? '2px solid var(--color-yellow)' : '1px solid rgba(255,255,255,0.2)', background: currentStep === MintStep.SIGNING ? 'rgba(248, 200, 38, 0.1)' : 'rgba(0,0,0,0.4)', opacity: currentStep < MintStep.SIGNING ? 0.5 : 1, transition: 'all 0.3s ease' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: currentStep === MintStep.SIGNING ? 'var(--color-yellow)' : 'white', fontFamily: 'var(--body-font)' }}>2. Gasless Token Approval</span>
                                {currentStep > MintStep.SIGNING && <span style={{ color: 'var(--color-green)', fontWeight: 'bold' }}>✓ Signed</span>}
                            </div>
                            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', margin: '0 0 16px 0', lineHeight: 1.4 }}>Approve the precise amount of $CEO tokens required for this NFT.</p>

                            <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '16px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Approval Amount ($CEO)</label>
                                <input
                                    type="number"
                                    style={{ width: '100%', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(248,200,38,0.3)', borderRadius: '8px', padding: '12px', color: 'white', fontFamily: 'monospace', fontSize: '1.1rem', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                                    value={approvalAmount}
                                    onChange={(e) => setApprovalAmount(e.target.value)}
                                    disabled={currentStep !== MintStep.SIGNING || isMinting}
                                    placeholder="e.g. 10000"
                                />
                            </div>

                            {currentStep === MintStep.SIGNING && (
                                <button className="story-btn primary" style={{ width: '100%', margin: 0, padding: '12px', fontSize: '1rem' }} onClick={handleSign} disabled={isMinting || !approvalAmount}>
                                    {isMinting && currentStep === MintStep.SIGNING ? <><Loader2 className="animate-spin inline mr-2" size={16} /> Waiting for signature...</> : 'Sign Approval'}
                                </button>
                            )}
                        </div>

                        {/* Step 3: Emit Mint */}
                        <div style={{ display: 'flex', flexDirection: 'column', padding: '16px', borderRadius: '12px', border: currentStep === MintStep.PERMITTING || currentStep === MintStep.MINTING ? '2px solid var(--color-yellow)' : '1px solid rgba(255,255,255,0.2)', background: currentStep === MintStep.PERMITTING || currentStep === MintStep.MINTING ? 'rgba(248, 200, 38, 0.1)' : 'rgba(0,0,0,0.4)', opacity: currentStep < MintStep.MINTING ? 0.5 : 1, transition: 'all 0.3s ease' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: currentStep === MintStep.MINTING || currentStep === MintStep.PERMITTING ? 'var(--color-yellow)' : 'white', fontFamily: 'var(--body-font)' }}>3. Execute Mint</span>
                                {currentStep === MintStep.COMPLETE && <span style={{ color: 'var(--color-green)', fontWeight: 'bold' }}>✓ Complete!</span>}
                            </div>
                            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', margin: '0 0 12px 0', lineHeight: 1.4 }}>Send the signed transaction directly to the backend to emit the NFT gas-free.</p>

                            {(currentStep === MintStep.PERMITTING || currentStep === MintStep.MINTING || currentStep === MintStep.COMPLETE) && (
                                <button className="story-btn primary" style={{ width: '100%', margin: 0, padding: '12px', fontSize: '1rem' }} onClick={handleSubmit} disabled={isMinting || currentStep === MintStep.COMPLETE}>
                                    {isMinting && (currentStep === MintStep.MINTING || currentStep === MintStep.PERMITTING) ? <><Loader2 className="animate-spin inline mr-2" size={16} /> Minting in progress...</> : currentStep === MintStep.COMPLETE ? 'Minted Successfully!' : 'Mint NFT!'}
                                </button>
                            )}
                        </div>
                    </div>

                </div>

                <div className="mint-confirm-footer justify-between">
                    <button className="text-sm text-gray-400 underline hover:text-white" onClick={handleReset} style={{ margin: 0 }}>
                        Reset State
                    </button>
                    <button
                        className="story-btn secondary"
                        onClick={onClose}
                        disabled={isMinting}
                        style={{ margin: 0, opacity: isMinting ? 0.5 : 1 }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MintProgressModal;
