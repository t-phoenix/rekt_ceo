import { useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

const CEO_TOKEN_MINT = process.env.REACT_APP_SOLANA_TOKEN_MINT || process.env.SOLANA_TOKEN_MINT; // Ensure this is set in your env

export const useSolanaBalances = () => {
    const { connection } = useConnection();
    const { publicKey } = useWallet();
    const [solBalance, setSolBalance] = useState(0);
    const [ceoBalance, setCeoBalance] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchBalances = useCallback(async () => {
        if (!publicKey || !connection) {
            setSolBalance(0);
            setCeoBalance(0);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Fetch SOL Balance
            try {

                const balance = await connection.getBalance(publicKey);

                setSolBalance(balance / LAMPORTS_PER_SOL);
            } catch (solError) {
                console.error("Error fetching SOL balance:", solError);
            }

            // Fetch CEO Token Balance
            if (CEO_TOKEN_MINT) {

                const mintPublicKey = new PublicKey(CEO_TOKEN_MINT);
                const tokenAccount = await getAssociatedTokenAddress(
                    mintPublicKey,
                    publicKey
                );


                try {
                    // const tokenAccountInfo = await getAccount(connection, tokenAccount); // Not strictly needed if we use getParsedAccountInfo

                    const parsedAccountInfo = await connection.getParsedAccountInfo(tokenAccount);


                    if (parsedAccountInfo.value) {
                        const uiAmount = parsedAccountInfo.value.data.parsed.info.tokenAmount.uiAmount;

                        setCeoBalance(uiAmount || 0);
                    } else {

                        setCeoBalance(0);
                    }

                } catch (e) {
                    // Token account might not exist if user has no tokens

                    setCeoBalance(0);
                }
            } else {

            }

        } catch (err) {
            console.error("Error fetching Solana balances:", err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [connection, publicKey]);

    useEffect(() => {
        fetchBalances();

        // Optional: Set up a listener or interval to refresh
        const intervalId = setInterval(fetchBalances, 30000); // Refresh every 30s
        return () => clearInterval(intervalId);

    }, [fetchBalances]);

    return { solBalance, ceoBalance, loading, error, fetchBalances };
};
