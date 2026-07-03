/**
 * Shared JWT storage for SIWE (rekt_backend /api/auth → campaigns + daily API Bearer).
 * Wagmi often exposes a checksummed address; the backend issues JWTs with lowercase
 * `address` in the payload. We always read/write `authToken_<lowercase>` so invite
 * bootstrap, campaign_api, Launch Hub, and useMint stay aligned.
 */

/** @param {string | undefined | null} addr */
export function normalizeEvmAddress(addr) {
  if (!addr || typeof addr !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(addr)) return null;
  return addr.toLowerCase();
}

/** @param {string | undefined | null} addr */
export function authTokenStorageKeys(addr) {
  const lower = normalizeEvmAddress(addr);
  const keys = [];
  if (lower) keys.push(`authToken_${lower}`);
  // Legacy: token may have been saved under checksummed wagmi address
  if (addr && typeof addr === "string" && addr !== lower) keys.push(`authToken_${addr}`);
  return keys;
}

function decodeJwtPayload(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch (_) {
    return null;
  }
}

function isTokenStillValid(token) {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") return false;
  const nowSec = Math.floor(Date.now() / 1000);
  return payload.exp - nowSec > 30;
}

/**
 * Returns a valid Bearer token for this wallet, or null (and cleans expired keys).
 * @param {string | undefined | null} address
 */
export function getValidStoredAuthToken(address) {
  const keys = authTokenStorageKeys(address);
  if (keys.length === 0) return null;
  try {
    for (const key of keys) {
      const token = localStorage.getItem(key);
      if (!token) continue;
      if (!isTokenStillValid(token)) {
        localStorage.removeItem(key);
        continue;
      }
      return token;
    }
  } catch (_) {
    // localStorage unavailable
  }
  return null;
}

export function hasValidStoredAuthToken(address) {
  return Boolean(getValidStoredAuthToken(address));
}

/**
 * @param {string} address
 * @param {string} token
 */
export function setStoredAuthToken(address, token) {
  const lower = normalizeEvmAddress(address);
  if (!lower || !token) return;
  try {
    localStorage.setItem(`authToken_${lower}`, token);
    // Drop legacy checksummed duplicate to avoid split-brain
    if (address && address !== lower) {
      try {
        localStorage.removeItem(`authToken_${address}`);
      } catch (_) {
        /* ignore */
      }
    }
  } catch (_) {
    /* ignore */
  }
}

/** @param {string | undefined | null} address */
export function clearStoredAuthToken(address) {
  for (const key of authTokenStorageKeys(address)) {
    try {
      localStorage.removeItem(key);
    } catch (_) {
      /* ignore */
    }
  }
}
