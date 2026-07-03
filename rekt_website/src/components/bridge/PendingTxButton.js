import React from 'react';
import { MdHistory } from "react-icons/md";

const PendingTxButton = ({ setShowPendingModal, pendingTransactions }) => {
    return (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
            <button
                className="pending-tx-btn"
                onClick={() => setShowPendingModal(true)}
                style={{
                    background: 'transparent',
                    border: '1px solid #ffffff20',
                    color: '#aaa',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}
            >
                <MdHistory size={16} />
                Pending Transfers
                {pendingTransactions && pendingTransactions.length > 0 && (
                    <span style={{
                        background: '#FF5252',
                        color: 'white',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 'bold'
                    }}>
                        {pendingTransactions.length}
                    </span>
                )}
            </button>
        </div>
    );
};

export default PendingTxButton;
