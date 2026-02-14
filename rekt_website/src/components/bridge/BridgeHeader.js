import React from 'react';
import wormholeLogo from '../../creatives/crypto/wormhole.png';

const BridgeHeader = () => {
    return (
        <div className="bridge-card-header">
            <div className="bridge-header-left">
                <h2 className="card-title">Bridge $CEO</h2>
                <div className="bridge-subtitle">Solana → Base • Automatic Relay</div>
            </div>
            <a
                href="https://portalbridge.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="wormhole-bridge-btn"
            >
                Powered by <img src={wormholeLogo} alt="Wormhole" className="wormhole-logo" />
            </a>
        </div>
    );
};

export default BridgeHeader;
