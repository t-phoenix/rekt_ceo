/**
 * Wormhole Bridge Configuration
 * All constants for CEO token bridging from Solana → Base via Wormhole automatic relay.
 */

// CEO token mint on Solana — from .env
export const CEO_TOKEN_MINT = process.env.REACT_APP_SOLANA_TOKEN_MINT;

// CEO token decimals on Solana (SPL standard is 6 for most tokens)
export const CEO_TOKEN_DECIMALS = 6;

// Wormhole network
export const WORMHOLE_NETWORK = 'Mainnet';

// Chain identifiers used by Wormhole SDK
export const SOURCE_CHAIN = 'Solana';
export const DESTINATION_CHAIN = 'Base';

// RPC URLs for reliable connection
// Use Ankr as fallback for Solana since mainnet-beta is often rate-limited
export const SOLANA_RPC_URL = process.env.REACT_APP_SOLANA_RPC_HTTP_URL || 'https://rpc.ankr.com/solana';
export const BASE_RPC_URL = process.env.BASE_RPC_HTTP_URL || 'https://mainnet.base.org';

// Estimated bridge time in seconds (automatic relay)
export const ESTIMATED_BRIDGE_TIME_SECONDS = 240; // ~4 minutes typical

// Bridge steps for progress tracking
export const BRIDGE_STEPS = [
    { id: 'initiate', label: 'Locking tokens on Solana', description: 'Submitting transaction to Solana...' },
    { id: 'relay', label: 'Wormhole relaying', description: 'Guardians attesting & relayer delivering to Base...' },
    { id: 'complete', label: 'Tokens delivered', description: 'Transfer complete on Base!' },
];

// Base chain explorer
export const BASE_EXPLORER_URL = 'https://basescan.org';

// Wormhole explorer for tracking
export const WORMHOLE_EXPLORER_URL = 'https://wormholescan.io';

// Polling interval for transfer status (ms)
export const STATUS_POLL_INTERVAL = 5000;

// Transfer timeout (ms) — 15 minutes max wait
export const TRANSFER_TIMEOUT = 15 * 60 * 1000;
