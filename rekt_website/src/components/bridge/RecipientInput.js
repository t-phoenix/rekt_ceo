import React from 'react';
import baseLogo from '../../creatives/crypto/base.png';

const RecipientInput = ({ recipientAddress, setRecipientAddress }) => {
    return (
        <div className="recipient-section">
            <label className="recipient-label">
                Recipient Base Address
                <img src={baseLogo} alt="Base" className="recipient-chain-icon" />
            </label>
            <input
                type="text"
                placeholder="0x..."
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className="recipient-input"
            />
        </div>
    );
};

export default RecipientInput;
