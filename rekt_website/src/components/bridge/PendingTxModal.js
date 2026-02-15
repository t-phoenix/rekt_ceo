import React from 'react';

const PendingTxModal = ({
    showPendingModal,
    setShowPendingModal,
    isEvmConnected,
    evmChainId,
    evmAddress,
    openEvmModal,
    switchChain,
    isLoadingPending,
    pendingTransactions,
    redeemingId,
    handleRedeem
}) => {
    if (!showPendingModal) return null;

    return (
        <div className="bridge-modal-overlay" onClick={() => setShowPendingModal(false)}>
            <div className="bridge-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Pending Transfers</h3>
                    <button className="bridge-modal-close" onClick={() => setShowPendingModal(false)} style={{ position: 'static' }}>×</button>
                </div>

                <div style={{ background: '#252525', borderRadius: '8px', padding: '12px', marginBottom: '20px', fontSize: '0.9rem', borderLeft: '4px solid #D81E5B' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#ccc' }}>
                            {!isEvmConnected
                                ? "Connect your Base wallet (EVM) to redeem transfers."
                                : evmChainId !== 8453
                                    ? "Switch to Base Network to redeem."
                                    : `Connected to Base: ${evmAddress?.slice(0, 6)}...${evmAddress?.slice(-4)}`
                            }
                        </span>
                        {!isEvmConnected ? (
                            <button
                                onClick={() => openEvmModal()}
                                style={{
                                    background: '#D81E5B', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem'
                                }}
                            >
                                Connect Wallet
                            </button>
                        ) : evmChainId !== 8453 ? (
                            <button
                                onClick={() => switchChain ? switchChain({ chainId: 8453 }) : alert("Please switch network in your wallet manually.")}
                                style={{
                                    background: '#FF9800', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem'
                                }}
                            >
                                Switch to Base
                            </button>
                        ) : (
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4CAF50' }}></div>
                        )}
                    </div>
                </div>

                {isLoadingPending ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Loading pending transactions...</div>
                ) : pendingTransactions.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No pending transfers found.</div>
                ) : (
                    <div className="pending-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '400px', overflowY: 'auto' }}>
                        {pendingTransactions.map(tx => (
                            <div key={tx.id} style={{ background: '#1a1a1a', padding: '15px', borderRadius: '8px', border: '1px solid #333' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span style={{ color: '#fff', fontWeight: 'bold' }}>
                                        {tx.amount ? (Number(tx.amount) / (10 ** 6)).toFixed(2) : '???'} $CEO
                                    </span>
                                    <span style={{ color: '#888', fontSize: '0.9rem' }}>
                                        {new Date(tx.timestamp).toLocaleString()}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span style={{ color: '#aaa', fontSize: '0.8rem' }}>Solana → Base</span>
                                        <span style={{ color: '#666', fontSize: '0.7rem' }}>Tx: {tx.sourceTxHash ? `${tx.sourceTxHash.slice(0, 8)}...` : 'Unknown'}</span>
                                    </div>
                                    <button
                                        onClick={() => handleRedeem(tx)}
                                        disabled={redeemingId === tx.id || !isEvmConnected || evmChainId !== 8453}
                                        style={{
                                            background: redeemingId === tx.id ? '#666' : (!isEvmConnected || evmChainId !== 8453) ? '#444' : '#2196F3',
                                            color: (!isEvmConnected || evmChainId !== 8453) ? '#888' : 'white',
                                            border: 'none',
                                            padding: '8px 16px',
                                            borderRadius: '4px',
                                            cursor: (redeemingId === tx.id || !isEvmConnected || evmChainId !== 8453) ? 'not-allowed' : 'pointer',
                                            fontWeight: 'bold',
                                            opacity: (!isEvmConnected || evmChainId !== 8453) ? 0.7 : 1
                                        }}
                                        title={!isEvmConnected ? "Connect EVM Wallet first" : evmChainId !== 8453 ? "Switch to Base first" : "Redeem on Base"}
                                    >
                                        {redeemingId === tx.id ? 'Redeeming...' : 'Redeem on Base'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <div style={{ marginTop: '10px' }}></div>
            </div>
        </div>
    );
};

export default PendingTxModal;
