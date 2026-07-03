import React, { useState, useEffect, useRef } from "react";
import { useAppKit } from '@reown/appkit/react';
import { useAccount } from 'wagmi';
import WalletDropdown from './WalletDropdown';
import "./header.css";

/**
 * @param {boolean} simple - When true, suppresses the hover/click wallet
 *   dropdown menu. Connected state shows a static address pill that opens
 *   AppKit's account modal on click (so the user can still disconnect).
 */
export default function ConnectWalletButton({ className = "", simple = false }) {
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
            return;
        }
        if (simple) {
            // Open AppKit's own account modal so the user can disconnect /
            // switch network without us hosting a parallel dropdown.
            open({ view: 'Account' });
            return;
        }
        setShowWalletDropdown((prev) => !prev);
    };

    // Close dropdown when clicking outside (only relevant when dropdown is on).
    useEffect(() => {
        if (simple) return;
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowWalletDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef, simple]);

    return (
        <div
            ref={wrapperRef}
            className={`connect-wallet-container ${className}`}
            onMouseEnter={() => !simple && isConnected && setShowWalletDropdown(true)}
            onMouseLeave={() => !simple && setShowWalletDropdown(false)}
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

            {!simple && isConnected && showWalletDropdown && (
                <WalletDropdown onClose={() => setShowWalletDropdown(false)} />
            )}
        </div>
    );
}
