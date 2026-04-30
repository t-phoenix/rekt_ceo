import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { api } from "../services/backend_api";
import {
  clearStoredAuthToken,
  getValidStoredAuthToken,
  hasValidStoredAuthToken,
  setStoredAuthToken,
} from "../utils/evmAuthToken";

const FALLBACK_CHAIN_ID = Number(process.env.REACT_APP_CHAIN_ID || 11155111);

/**
 * Lazily ensures we have a valid backend JWT for the connected EVM wallet.
 *
 * Flow (rekt_backend — `REACT_APP_BACKEND_API_URL`, not the campaigns host):
 *   1. POST /api/auth/nonce   → nonce in Redis `nonce:<lowerAddress>`
 *   2. Wallet signs EIP-4361-style message
 *   3. POST /api/auth/verify  → SIWE verify, JWT signed with backend `JWT_SECRET`
 *   4. Token cached as `authToken_<lowercaseAddress>` (see `evmAuthToken.js`)
 *
 * rekt_campaigns uses the **same** `JWT_SECRET` to verify `Authorization: Bearer` on
 * optional routes (bootstrap invite batch) and required routes (daily, identity, etc.).
 *
 * If launch shows "complete SIWE" while the wallet is connected, check that
 * `JWT_SECRET` matches both services and that this app can reach the main backend.
 */
export function useSiweAuth({ autoSignOnConnect = false } = {}) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const signAsyncRef = useRef(signMessageAsync);
  signAsyncRef.current = signMessageAsync;
  const [signing, setSigning] = useState(false);
  const [authenticated, setAuthenticated] = useState(() => hasValidStoredAuthToken(address));
  const [autoError, setAutoError] = useState(null);

  useEffect(() => {
    setAuthenticated(hasValidStoredAuthToken(address));
  }, [address]);

  const ensureToken = useCallback(async () => {
    if (!address) {
      throw new Error("Connect your EVM wallet before linking identity.");
    }

    const cached = getValidStoredAuthToken(address);
    if (cached) {
      setAuthenticated(true);
      return cached;
    }

    setSigning(true);
    try {
      const nonce = await api.getNonce(address);

      const domain = window.location.host;
      const uri = window.location.origin;
      const issuedAt = new Date().toISOString();
      const message =
        `${domain} wants you to sign in with your Ethereum account:\n` +
        `${address}\n\n` +
        `Sign in to Rekt CEO to verify your wallet for the Launch Hub.\n\n` +
        `URI: ${uri}\n` +
        `Version: 1\n` +
        `Chain ID: ${FALLBACK_CHAIN_ID}\n` +
        `Nonce: ${nonce}\n` +
        `Issued At: ${issuedAt}`;

      const signature = await signAsyncRef.current({ message });
      const data = await api.verifySignature(message, signature);
      if (!data?.token) {
        throw new Error("Authentication failed — backend returned no token.");
      }
      setStoredAuthToken(address, data.token);
      setAuthenticated(true);
      return data.token;
    } finally {
      setSigning(false);
    }
  }, [address]);

  const ensureTokenRef = useRef(ensureToken);
  ensureTokenRef.current = ensureToken;

  const clearAuthToken = useCallback(() => {
    if (!address) return;
    clearStoredAuthToken(address);
    setAuthenticated(false);
  }, [address]);

  useEffect(() => {
    if (!autoSignOnConnect) return;
    if (!isConnected || !address) return;
    if (getValidStoredAuthToken(address)) return;

    let cancelled = false;
    setAutoError(null);
    ensureTokenRef.current().catch((err) => {
      if (cancelled) return;
      setAutoError(
        err?.message?.includes("User rejected")
          ? "Wallet signature declined. Click any verify button to retry."
          : err?.message || "Sign-in failed.",
      );
    });
    return () => {
      cancelled = true;
    };
  }, [autoSignOnConnect, isConnected, address]);

  return {
    ensureToken,
    clearAuthToken,
    signing,
    authenticated,
    autoError,
  };
}
