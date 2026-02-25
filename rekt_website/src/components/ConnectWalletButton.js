import React, { useState, useEffect, useRef } from "react";
import { useAppKit } from '@reown/appkit/react';
import { useAccount } from 'wagmi';
import WalletDropdown from './WalletDropdown';
import "./header.css";

export default function ConnectWalletButton({ className = "" }) {
    const [showWalletDropdown, setShowWalletDropdown] = useState(false);
    const { open } = useAppKit();
    const { address, isConnected } = useAccount();
    const wrapperRef = useRef(null);

    const truncateAddress = (addr) => {
        if (!addr) return '';
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const handleWalletClick = () => {
        if (!isConnected) {
            open();
        } else {
            // Toggle dropdown on click
            setShowWalletDropdown((prev) => !prev);
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowWalletDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    return (
        <div
            ref={wrapperRef}
            className={`connect-wallet-container ${className}`}
            onMouseEnter={() => isConnected && setShowWalletDropdown(true)}
            onMouseLeave={() => setShowWalletDropdown(false)}
        >
            <button
                className={`connect-wallet-btn ${isConnected ? 'connected' : ''}`}
                onClick={handleWalletClick}
            >
                {isConnected ? (
                    <div className="wallet-btn-content">
                        <span>{truncateAddress(address)}</span>
                    </div>
                ) : (
                    'CONNECT WALLET'
                )}
            </button>

            {isConnected && showWalletDropdown && (
                <WalletDropdown onClose={() => setShowWalletDropdown(false)} />
            )}
        </div>
    );
}
