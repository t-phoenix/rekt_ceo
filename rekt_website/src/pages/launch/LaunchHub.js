import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaLock } from "react-icons/fa";
import { motion, useReducedMotion } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import { useAccount } from "wagmi";
import ConnectWalletButton from "../../components/ConnectWalletButton";
import { campaignApi } from "../../services/campaign_api";
import { useSiweAuth } from "../../hooks/useSiweAuth";
import { hasValidStoredAuthToken } from "../../utils/evmAuthToken";
import LaunchBlockRenderer from "./LaunchBlockRenderer";

import baseLogo from "../../creatives/crypto/base.png";
import solanaLogo from "../../creatives/crypto/solana.png";
import pumpFunLogo from "../../creatives/crypto/pump_fun.png";
import wormholeLogo from "../../creatives/crypto/wormhole.png";
import uniswapLogo from "../../creatives/crypto/uniswap.png";
import usdcLogo from "../../creatives/crypto/usdc.png";

import ceoBadge from "../../creatives/rekt_stickers/ceo_badge.png";
import degenSticker from "../../creatives/rekt_stickers/degen-mode-activated.png";
import wagmSticker from "../../creatives/rekt_stickers/wagm.png";
import logoSticker from "../../creatives/rekt_stickers/Rekt_logo_3D.png";
import ceoArt from "../../creatives/rekt ceo guy.jpg";

import "./launchHub.css";

const INVITE_PROOF_KEY = "rekt_launch_invite_proof";
const INVITE_CODE_KEY = "rekt_launch_invite_code";

function readInviteProof() {
  try {
    return typeof sessionStorage !== "undefined" ? sessionStorage.getItem(INVITE_PROOF_KEY) : null;
  } catch {
    return null;
  }
}

function readInviteCodeStored() {
  try {
    return typeof sessionStorage !== "undefined" ? sessionStorage.getItem(INVITE_CODE_KEY) || "" : "";
  } catch {
    return "";
  }
}

const NETWORK_STRIP = [
  { src: baseLogo, label: "BASE", url: "https://base.org" },
  { src: solanaLogo, label: "SOLANA", url: "https://solana.com" },
  { src: pumpFunLogo, label: "PUMP.FUN", url: "https://pump.fun" },
  { src: wormholeLogo, label: "WORMHOLE", url: "https://wormhole.com" },
  { src: uniswapLogo, label: "UNISWAP", url: "https://uniswap.org" },
  { src: usdcLogo, label: "USDC", url: "https://www.circle.com/usdc" },
];

function readOAuthBanner() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const discord = params.get("discord");
  const x = params.get("x");
  const provider = discord ? "discord" : x ? "x" : null;
  if (!provider) return null;
  const status = discord || x;
  const handle = params.get("handle");
  const reason = params.get("reason");
  return { provider, status, handle, reason };
}

function clearOAuthBanner() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  ["discord", "x", "handle", "reason"].forEach((p) => url.searchParams.delete(p));
  window.history.replaceState({}, "", url.toString());
}

const heroContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

const heroItemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
  },
};

const heroItemReduced = {
  hidden: { opacity: 1, y: 0 },
  show: { opacity: 1, y: 0 },
};

export default function LaunchHub() {
  const { isConnected, address } = useAccount();
  const reduceMotion = useReducedMotion();
  const mountedRef = useRef(true);
  const { authenticated, signing, autoError } = useSiweAuth({
    autoSignOnConnect: true,
  });
  /** Invite UI also checks localStorage; avoids one-frame false when hook state lags after reload. */
  const siweAuthenticated =
    authenticated || (typeof address === "string" && address.length > 0 && hasValidStoredAuthToken(address));
  const [layout, setLayout] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hubErrors, setHubErrors] = useState(null);
  const [oauthBanner, setOauthBanner] = useState(() => readOAuthBanner());
  const [inviteField, setInviteField] = useState("");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteProof, setInviteProof] = useState(null);
  const autoRedeemDoneRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadHub = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setHubErrors(null);
      try {
        const { layout: layoutPayload, data: dataPayload, errors } =
          await campaignApi.loadLaunchHubData(address);
        if (!mountedRef.current) return;

        const mergedIdentity = {
          ...dataPayload.identity,
          evmConnected: isConnected || dataPayload.identity.evmConnected,
        };

        setLayout(layoutPayload);
        setData({ ...dataPayload, identity: mergedIdentity });

        if (errors.length) {
          setHubErrors(errors);
          const layoutFail = errors.some((e) => e.scope === "layout");
          const bootFail = errors.some((e) => e.scope === "bootstrap");
          const message =
            layoutFail && bootFail
              ? "Campaign API unreachable — showing offline preview."
              : layoutFail
              ? "Hub layout fell back to defaults."
              : "Could not sync your wallet data — stats may be stale.";
          toast.error(message, { duration: 5000 });
        } else if (isRefresh) {
          toast.success("Launch Hub updated.");
        }
      } catch (e) {
        if (!mountedRef.current) return;
        const msg = e?.message || "Could not load Launch Hub.";
        setHubErrors([{ scope: "load", message: msg }]);
        toast.error(msg);
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [address, isConnected, authenticated],
  );

  useEffect(() => {
    loadHub(false);
  }, [loadHub]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    const urlCode = p.get("code") || "";
    const storedCode = readInviteCodeStored();
    setInviteField((prev) => prev || urlCode || storedCode || "");
    setInviteProof(readInviteProof());
  }, []);

  useEffect(() => {
    autoRedeemDoneRef.current = false;
  }, [address]);

  useEffect(() => {
    if (!oauthBanner) return;
    const timer = setTimeout(() => {
      setOauthBanner(null);
      clearOAuthBanner();
    }, 6000);
    return () => clearTimeout(timer);
  }, [oauthBanner]);

  const refreshHub = useCallback(() => loadHub(true), [loadHub]);

  const heroStats = useMemo(() => {
    if (!data) {
      return [
        { label: "SEASON XP", value: "—" },
        { label: "STREAK", value: "—" },
        { label: "LEVEL", value: "—" },
      ];
    }
    return [
      { label: "SEASON XP", value: data.xp.season.toLocaleString() },
      { label: "STREAK", value: `${data.daily?.streak?.count || 0}D` },
      { label: "LEVEL", value: data.xp.level },
    ];
  }, [data]);

  const inviteWall = !!data?.invite?.inviteWall;
  const inviteActivation = !!data?.invite?.activation;
  const eligibleIdentity = !!data?.eligibility?.eligible;
  const hubCampaignsOpen = eligibleIdentity && (!inviteWall || inviteActivation);
  const inviteFirstScreen = !!(inviteWall && !inviteActivation && !inviteProof);
  const missingChecks = data?.eligibility?.missing || [];

  const effectiveLayout = useMemo(() => {
    if (!layout) return null;
    if (hubCampaignsOpen) return layout;
    const gateBlockTypes = new Set([
      "SeasonStripBlock",
      "EligibilityBannerBlock",
      "IdentityChecklistBlock",
      "ConnectGuideBlock",
      "GapCreativeBlock",
    ]);
    const blocks = layout.blocks.filter((b) => gateBlockTypes.has(b.type));
    const sortKey = (t) =>
      t === "SeasonStripBlock"
        ? 0
        : t === "EligibilityBannerBlock"
        ? 1
        : t === "IdentityChecklistBlock"
        ? 2
        : t === "GapCreativeBlock"
        ? 2.5
        : 3;
    blocks.sort((a, b) => sortKey(a.type) - sortKey(b.type));
    return { ...layout, blocks };
  }, [layout, hubCampaignsOpen]);

  const staggerChild = reduceMotion ? heroItemReduced : heroItemVariants;

  const submitPreflightInvite = useCallback(async () => {
    const raw = inviteField.trim();
    if (!raw) {
      toast.error("Enter an invite code.");
      return;
    }
    setInviteSubmitting(true);
    try {
      const res = await campaignApi.validateInvite(raw);
      if (!res.ok) {
        toast.error(res.message || "Invalid code.");
        return;
      }
      try {
        sessionStorage.setItem(INVITE_PROOF_KEY, res.proof);
        sessionStorage.setItem(INVITE_CODE_KEY, res.code);
      } catch (_) {
        // ignore quota / private mode
      }
      setInviteProof(res.proof);
      setInviteField(res.code);
      toast.success("Invite accepted — connect your wallet below to register.");
    } finally {
      setInviteSubmitting(false);
    }
  }, [inviteField]);

  const retryWalletInviteRegistration = useCallback(async () => {
    autoRedeemDoneRef.current = false;
    if (!address || !authenticated) {
      toast.error("Connect and sign in with your wallet first.");
      return;
    }
    const proof = inviteProof || readInviteProof();
    const code = inviteField.trim() || readInviteCodeStored();
    if (!proof || !code) {
      toast.error("Validate your invite code again (use the field above).");
      return;
    }
    setInviteSubmitting(true);
    try {
      const res = await campaignApi.redeemInvite(address, code, proof);
      if (!res.ok) {
        toast.error(res.message || "Could not register invite.");
        return;
      }
      const act = res.data?.activation;
      if (res.data?.already) {
        toast.success("Wallet already registered for Launch Hub.");
      } else {
        toast.success(
          `Registered — +${act?.xpInvitee ?? 0} XP${act?.bootstrap ? " (team code)" : ""}.`,
        );
      }
      await loadHub(true);
    } finally {
      setInviteSubmitting(false);
    }
  }, [address, authenticated, inviteField, inviteProof, loadHub]);

  useEffect(() => {
    if (!inviteWall || !address || !authenticated || inviteActivation) return;
    const proof = inviteProof || readInviteProof();
    const code = inviteField.trim() || readInviteCodeStored();
    if (!proof || !code) return;
    if (autoRedeemDoneRef.current) return;
    autoRedeemDoneRef.current = true;
    let cancelled = false;
    (async () => {
      setInviteSubmitting(true);
      try {
        const res = await campaignApi.redeemInvite(address, code, proof);
        if (cancelled) return;
        if (!res.ok) {
          autoRedeemDoneRef.current = false;
          toast.error(res.message || "Could not register invite on your wallet.");
          return;
        }
        const act = res.data?.activation;
        if (res.data?.already) {
          toast.success("Wallet already registered for Launch Hub.");
        } else {
          toast.success(
            `Registered — +${act?.xpInvitee ?? 0} XP${act?.bootstrap ? " (team code)" : ""}.`,
          );
        }
        await loadHub(true);
      } finally {
        if (!cancelled) setInviteSubmitting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [inviteWall, address, authenticated, inviteActivation, inviteProof, inviteField, loadHub]);
  const staggerParent = reduceMotion
    ? { hidden: {}, show: {} }
    : heroContainer;

  return (
    <main className="launch-hub-page">
      <Toaster
        position="top-center"
        containerClassName="launch-hub-toaster"
        toastOptions={{
          className: "launch-toast",
          duration: 5200,
          error: {
            duration: 12000,
            style: { maxWidth: "min(92vw, 480px)", whiteSpace: "pre-wrap" },
          },
        }}
      />

      {refreshing ? (
        <div className="launch-refresh-bar" role="status" aria-live="polite">
          <span className="launch-refresh-bar-fill" />
        </div>
      ) : null}

      {hubErrors?.length ? (
        <div className="hub-sync-banner" role="alert">
          <div className="hub-sync-banner-copy">
            <strong>Connection issue</strong>
            <span>
              {hubErrors.length > 1
                ? "Some campaign data could not load. You may be viewing demo content."
                : hubErrors[0].message}
            </span>
          </div>
          <button type="button" className="launch-btn ghost small" onClick={() => refreshHub()}>
            RETRY
          </button>
        </div>
      ) : null}

      {oauthBanner ? (
        <div className={`oauth-banner ${oauthBanner.status === "ok" ? "ok" : "fail"}`}>
          {oauthBanner.status === "ok" ? (
            <span>
              ✓ {oauthBanner.provider === "x" ? "X" : "Discord"} linked
              {oauthBanner.handle ? <> as <strong>{oauthBanner.handle}</strong></> : null}.
            </span>
          ) : (
            <span>
              {oauthBanner.provider === "x" ? "X" : "Discord"} link failed
              {oauthBanner.reason ? (
                <>
                  {" "}
                  — <code>{oauthBanner.reason}</code>
                  {oauthBanner.reason === "not_in_guild"
                    ? " — join the Rekt CEO server first, then retry."
                    : null}
                  {oauthBanner.reason === "not_following"
                    ? " — follow @rekt_ceo on X first, then retry."
                    : null}
                </>
              ) : null}
              .
            </span>
          )}
          <button
            type="button"
            className="oauth-banner-close"
            onClick={() => {
              setOauthBanner(null);
              clearOAuthBanner();
            }}
          >
            ✕
          </button>
        </div>
      ) : null}

      <motion.section
        className="launch-hero"
        initial={reduceMotion ? false : { opacity: 0.92, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="launch-hero-bg" aria-hidden="true">
          <img src={ceoArt} alt="" className="hero-bg-art" />
          <div className="hero-bg-tint" />
          <div className="hero-bg-scanlines" />
          <div className="hero-bg-rekt-glow" />
        </div>

        <motion.div
          className="launch-hero-grid"
          variants={staggerParent}
          initial="hidden"
          animate="show"
        >
          <div className="launch-hero-copy">
            <motion.div className="hero-stickers" variants={staggerChild}>
              <span className="sticker-pill yellow">SEASON 1</span>
              <span className="sticker-pill blue">CAMPAIGN HUB</span>
              <span className="sticker-pill purple">PRE-LAUNCH</span>
            </motion.div>

            <motion.h1 variants={staggerChild}>
              CLOCK IN.<br />
              MEME HARDER.<br />
              <span className="hero-accent">EARN XP.</span>
            </motion.h1>

            <motion.p variants={staggerChild}>
              {inviteFirstScreen ? (
                <>
                  Launch Hub is invite-only for the flywheel. Enter a code from another degen or a
                  team bootstrap code (operators configure{" "}
                  <code className="launch-inline-code">LAUNCH_HUB_BOOTSTRAP_CODES</code> on the
                  server). Then connect your wallet — that&apos;s when your account is registered.
                </>
              ) : (
                <>
                  The Rekt CEO Launch Hub is where degens grind XP every day — memes on X, GMs on
                  Discord and Telegram, daily check-ins, daily spins, and live campaigns. Bots get
                  filtered. Real degens get rewarded.
                </>
              )}
            </motion.p>

            {inviteFirstScreen ? (
              <motion.div className="launch-invite-first" variants={staggerChild}>
                <p className="launch-invite-first-label">Step 1 — Invite code (before hub access)</p>
                <div className="launch-gate-invite-row launch-invite-first-row">
                  <input
                    className="launch-gate-invite-input"
                    type="text"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="REKT-••••••••"
                    value={inviteField}
                    onChange={(e) => setInviteField(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitPreflightInvite();
                    }}
                  />
                  <button
                    type="button"
                    className="launch-btn cta small"
                    onClick={() => submitPreflightInvite()}
                    disabled={inviteSubmitting || !inviteField.trim()}
                  >
                    {inviteSubmitting ? "CHECKING…" : "VALIDATE INVITE"}
                  </button>
                </div>
                {isConnected ? (
                  <p className="launch-invite-first-walletnote">
                    Wallet is already connected — after you validate, we&apos;ll use this address for
                    Step 2.
                  </p>
                ) : null}
              </motion.div>
            ) : null}

            <motion.div className="launch-hero-actions" variants={staggerChild}>
              {!inviteFirstScreen ? <ConnectWalletButton simple /> : null}
              {!inviteFirstScreen ? (
                <a className="launch-btn ghost" href="#campaigns">
                  JUMP TO CAMPAIGNS
                </a>
              ) : null}
              <a
                className="launch-btn ghost"
                href="https://github.com/rektceo"
                target="_blank"
                rel="noreferrer"
              >
                READ RULEBOOK
              </a>
              <button
                type="button"
                className="launch-btn ghost launch-hero-refresh"
                onClick={() => refreshHub()}
                disabled={loading || refreshing}
                title="Refresh hub data"
              >
                {refreshing ? "SYNCING…" : "↻ SYNC HUB"}
              </button>
            </motion.div>

            {!inviteFirstScreen && isConnected ? (
              <motion.div className="launch-hero-auth" variants={staggerChild}>
                {signing ? (
                  <span className="auth-pill pending">
                    SIGN THE WALLET MESSAGE TO AUTHENTICATE…
                  </span>
                ) : authenticated ? (
                  <span className="auth-pill ok">WALLET AUTHENTICATED</span>
                ) : autoError ? (
                  <span className="auth-pill warn">{autoError}</span>
                ) : (
                  <span className="auth-pill pending">
                    SIWE SIGN-IN PENDING — APPROVE IN YOUR WALLET
                  </span>
                )}
                {inviteWall &&
                !inviteActivation &&
                inviteProof &&
                authenticated &&
                address ? (
                  <p className="launch-invite-register-hint">
                    Step 2 — tying your invite to this wallet…{" "}
                    <button
                      type="button"
                      className="launch-linkish"
                      onClick={() => retryWalletInviteRegistration()}
                      disabled={inviteSubmitting}
                    >
                      Retry
                    </button>
                  </p>
                ) : null}
              </motion.div>
            ) : null}

            <motion.div className="hero-stats-row" variants={staggerChild}>
              {heroStats.map((stat) => (
                <div className="hero-stat" key={stat.label}>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </div>
              ))}
            </motion.div>
          </div>

        
        </motion.div>

        <motion.div
          className="hero-network-strip"
          aria-label="Supported networks and integrations"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.4 }}
        >
          {NETWORK_STRIP.map((net) => (
            <a key={net.label} href={net.url} target="_blank" rel="noreferrer" className="network-chip">
              <img src={net.src} alt={`${net.label} logo`} />
              <span>{net.label}</span>
            </a>
          ))}
        </motion.div>
      </motion.section>

      <div className="launch-below-hero">
        {loading || !layout || !data ? (
          <section className="launch-loading" aria-busy="true" aria-label="Loading launch hub">
            <div className="launch-loading-inner">
              <div className="loading-rekt-mark" aria-hidden="true">
                <span className="loading-rekt-r" />
                <span className="loading-rekt-e" />
              </div>
              <div className="loading-pulse-track">
                <div className="loading-pulse" />
              </div>
              <p>SUMMONING THE LAUNCH HUB…</p>
              <p className="launch-loading-hint">Syncing layout, XP, and eligibility</p>
            </div>
          </section>
        ) : (
          <>
            {!hubCampaignsOpen ? (
              <motion.section
                className="launch-gate"
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
              >
                <div className="launch-gate-icon launch-gate-icon-animated">
                  <FaLock />
                </div>
                <div className="launch-gate-copy">
                  <span className="sticker-pill">CAMPAIGNS LOCKED</span>
                  <h2>
                    {eligibleIdentity && inviteWall && !inviteActivation
                      ? "FINISH INVITE REGISTRATION OR COMPLETE VERIFICATION"
                      : "FINISH IDENTITY VERIFICATION TO UNLOCK CAMPAIGNS"}
                  </h2>
                  <p>
                    {eligibleIdentity && inviteWall && !inviteActivation ? (
                      <>
                        Your checklist is clear, but this hub is invite-gated: we still need to tie
                        your validated invite to this wallet (happens automatically after you sign in),
                        or complete any remaining steps above.
                      </>
                    ) : (
                      <>
                        Daily spin, daily check-in, X mission, live campaigns, the leaderboard, and
                        invite codes (once unlocked) follow the Launch Hub layout from the admin
                        dashboard — reorder blocks there to change what shows first.
                      </>
                    )}
                  </p>
                  {eligibleIdentity && inviteWall && !inviteActivation ? (
                    <p className="launch-gate-invite-hint">
                      If registration didn&apos;t complete, use <strong>Retry</strong> in the hero.
                    </p>
                  ) : null}
                  {!eligibleIdentity && missingChecks.length > 0 ? (
                    <ul className="launch-gate-list">
                      {missingChecks.map((m) => (
                        <li key={m.key}>· {m.label}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </motion.section>
            ) : null}
            <LaunchBlockRenderer
              layout={effectiveLayout}
              data={data}
              onRefresh={refreshHub}
              walletAddress={address}
              siweAuthenticated={siweAuthenticated}
              showInvite={hubCampaignsOpen}
            />
          </>
        )}
      </div>
    </main>
  );
}
