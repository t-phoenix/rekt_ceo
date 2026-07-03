const STORAGE_VERSION = "v1";

function storageKey(wallet, kind) {
  return `rekt_launch_last_reward_${STORAGE_VERSION}_${kind}_${String(wallet).toLowerCase()}`;
}

/**
 * @param {string | undefined} presetId
 * @returns {string}
 */
export function xMissionMemoryKind(presetId) {
  const safe = String(presetId || "default").replace(/[^a-z0-9_-]/gi, "_");
  return `x_mission_${safe}`;
}

/**
 * @param {string | undefined} wallet
 * @param {string} kind
 * @returns {{ xp: number, dateUtc: string, extra?: object | null } | null}
 */
export function readLastReward(wallet, kind) {
  if (!wallet || typeof wallet !== "string") return null;
  try {
    const raw = localStorage.getItem(storageKey(wallet, kind));
    if (!raw) return null;
    const o = JSON.parse(raw);
    const xp = Number(o?.xp);
    if (!Number.isFinite(xp) || xp < 0) return null;
    return {
      xp,
      dateUtc: typeof o.dateUtc === "string" ? o.dateUtc : "",
      extra: o.extra && typeof o.extra === "object" ? o.extra : null,
    };
  } catch {
    return null;
  }
}

/**
 * @param {string | undefined} wallet
 * @param {string} kind
 * @param {number} xp
 * @param {object | null} [extra]
 */
export function writeLastReward(wallet, kind, xp, extra = null) {
  if (!wallet || typeof wallet !== "string") return;
  const dateUtc = new Date().toISOString().slice(0, 10);
  try {
    localStorage.setItem(storageKey(wallet, kind), JSON.stringify({ xp, dateUtc, extra }));
  } catch {
    /* ignore quota */
  }
}
