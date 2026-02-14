import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import {
    WalletModalProvider
} from '@solana/wallet-adapter-react-ui';


// Default styles that can be overridden by your app
require('@solana/wallet-adapter-react-ui/styles.css');

export const SolanaWalletProvider = ({ children }) => {


    // You can also provide a custom RPC endpoint.
    // You can also provide a custom RPC endpoint.
    // Use Ankr public RPC which is often more reliable than the default mainnet-beta
    const endpoint = useMemo(() => {
        const envReact = process.env.REACT_APP_SOLANA_RPC_HTTP_URL;
        const envPlain = process.env.SOLANA_RPC_HTTP_URL;


        const envUrl = envReact || envPlain;
        return envUrl;
    }, []);

    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter(),
        ],
        []
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};
