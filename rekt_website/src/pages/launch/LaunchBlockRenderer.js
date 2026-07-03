import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import toast from "react-hot-toast";
import {
  FaRegCopy,
  FaTwitter,
  FaDiscord,
  FaTelegramPlane,
  FaWallet,
  FaTrophy,
  FaMedal,
  FaCalendarCheck,
  FaShieldAlt,
  FaBolt,
  FaGift,
  FaArrowRight,
  FaExternalLinkAlt,
  FaInfoCircle,
  FaCheckCircle,
  FaTimesCircle,
  FaQuestionCircle,
  FaLock,
  FaSyncAlt,
  FaImage,
  FaClock,
} from "react-icons/fa";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { campaignApi } from "../../services/campaign_api";
import { campaignIcon, providerMeta, socialJoinUrls, sticker } from "./launchAssets";
import { readLastReward, writeLastReward, xMissionMemoryKind } from "./launchRewardMemory";
import { useSiweAuth } from "../../hooks/useSiweAuth";

function utcCalendarDayString() {
  return new Date().toISOString().slice(0, 10);
}

function msUntilNextUtcMidnight() {
  const now = Date.now();
  const u = new Date(now);
  const nextMid = Date.UTC(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate() + 1, 0, 0, 0, 0);
  return Math.max(0, nextMid - now);
}

function formatUtcCountdownHms(totalMs) {
  const s = Math.max(0, Math.floor(totalMs / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/**
 * While Launch Hub is open, detects crossing midnight UTC and prompts a reload so daily claim state matches the server.
 */
export function UtcDayRolloverWatcher() {
  const [open, setOpen] = useState(false);
  const lastUtcDayRef = useRef(utcCalendarDayString());
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const id = window.setInterval(() => {
      const today = utcCalendarDayString();
      if (today !== lastUtcDayRef.current) {
        lastUtcDayRef.current = today;
        setOpen(true);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="utc-reset-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.24 }}
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <motion.div
            className="utc-reset-modal-shell"
            role="dialog"
            aria-modal="true"
            aria-labelledby="utc-reset-modal-title"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
            transition={
              prefersReducedMotion ? { duration: 0.14 } : { type: "spring", stiffness: 360, damping: 26 }
            }
            onClick={(e) => e.stopPropagation()}
          >
            <div className="utc-reset-modal-glow" aria-hidden />
            <button
              type="button"
              className="utc-reset-modal-close"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
            <h2 id="utc-reset-modal-title" className="utc-reset-modal-title">
              Daily rewards reset
            </h2>
            <p className="utc-reset-modal-body">
              It&apos;s a new UTC day — check-in, spin, and X mission windows have refreshed. Complete today&apos;s
              rewards to keep earning XP. <strong>Reload the page</strong> so claim buttons and streaks match the
              server; the countdown timer will restart after reload.
            </p>
            <div className="utc-reset-modal-actions">
              <button type="button" className="launch-btn ghost small" onClick={() => setOpen(false)}>
                Not now
              </button>
              <button
                type="button"
                className="launch-btn cta small utc-reset-modal-reload"
                onClick={() => window.location.reload()}
              >
                <FaSyncAlt aria-hidden /> Reload page
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

function SectionCard({
  title,
  subtitle,
  subtitleFullWidth,
  children,
  right,
  id,
  sticker: stickerSrc,
  accent,
}) {
  return (
    <section className={`launch-card${accent ? ` accent-${accent}` : ""}`} id={id}>
      <div className={`launch-card-head${subtitleFullWidth ? " launch-card-head--subtitle-below" : ""}`}>
        <div className="launch-card-titlewrap">
          {stickerSrc ? (
            <img src={stickerSrc} alt="" className="launch-card-sticker" />
          ) : null}
          <div>
            <h3>{title}</h3>
            {subtitle && !subtitleFullWidth ? <p>{subtitle}</p> : null}
          </div>
        </div>
        {right}
      </div>
      {subtitle && subtitleFullWidth ? (
        <p className="launch-card-subtitle-full">{subtitle}</p>
      ) : null}
      <div>{children}</div>
    </section>
  );
}

function SeasonStripBlock({ data }) {
  const season = data.season || { title: "Season 1", endsInDays: "—", focus: "" };
  const [untilUtcMidnightMs, setUntilUtcMidnightMs] = useState(() => msUntilNextUtcMidnight());

  useEffect(() => {
    const id = window.setInterval(() => setUntilUtcMidnightMs(msUntilNextUtcMidnight()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const liveTimer = formatUtcCountdownHms(untilUtcMidnightMs);

  return (
    <section className="season-strip">
      <div className="season-strip-left">
        <span className="sticker-pill yellow">{season.id?.toUpperCase() || "SEASON"}</span>
        <h2>{season.title}</h2>
        <p>{season.focus}</p>
      </div>
      <div className="season-strip-right">
        <div className="season-daily-reset" role="timer" aria-live="polite" aria-atomic="true">
          <span className="season-daily-reset-label">Daily Rewards reset in:</span>
          <span className="season-daily-reset-time" title="Time until midnight UTC">
            {liveTimer}
          </span>
        </div>
        <img src={sticker.controller} alt="" className="season-sticker" />
      </div>
    </section>
  );
}

function EligibilityBannerBlock({ data, walletAddress, onRefresh }) {
  const { identity, eligibility } = data;
  const [refreshing, setRefreshing] = useState(false);
  const eligible = !!eligibility?.eligible;
  const requirements = eligibility?.requirements || [];

  const refreshBalance = async () => {
    if (!walletAddress) return;
    setRefreshing(true);
    const res = await campaignApi.refreshBaseBalance(walletAddress);
    if (res?.ok) {
      toast.success("Base balance refreshed.");
    } else {
      toast.error(res?.message || "Could not refresh balance.");
    }
    await onRefresh();
    setRefreshing(false);
  };

  return (
    <div className={`eligibility-banner ${eligible ? "ok" : "warn"}`}>
      <div className="eligibility-banner-head">
        <div className="eligibility-banner-left">
          {eligible ? <FaShieldAlt className="eb-icon" /> : <FaLock className="eb-icon" />}
          <div>
            <span className="sticker-pill">{eligible ? "ELIGIBLE" : "VERIFY TO UNLOCK"}</span>
            <p>
              {eligible
                ? "Campaign access unlocked. Daily loops and active campaigns are live."
                : "Finish the verification checklist to unlock daily spin, check-in, and campaigns."}
            </p>
          </div>
        </div>
        <div className="eligibility-actions">
          <span className="eb-balance">
            BASE BAL: <strong>${(identity.baseBalanceUsd || 0).toFixed(2)}</strong>
          </span>
          <button
            className="launch-btn ghost small"
            onClick={refreshBalance}
            disabled={!walletAddress || refreshing}
          >
            {refreshing ? "CHECKING…" : "RE-CHECK"}
          </button>
        </div>
      </div>

      {requirements.length > 0 ? (
        <ul className="eligibility-checks">
          {requirements.map((req) => (
            <li
              key={req.key}
              className={`eligibility-check ${req.passed ? "passed" : "pending"}${
                req.optional ? " optional" : ""
              }`}
            >
              {req.passed ? (
                <FaCheckCircle className="ec-icon ok" />
              ) : (
                <FaTimesCircle
                  className={`ec-icon ${req.optional ? "neutral" : "warn"}`}
                />
              )}
              <span>
                {req.label}
                {req.optional ? (
                  <span className="eligibility-optional-tag">OPTIONAL</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function gateRow(gateConfig, key) {
  const row = gateConfig?.[key];
  if (!row) return { required: true, enabled: true };
  return {
    required: row.required !== false,
    enabled: row.enabled !== false,
    label: row.label,
    description: row.description,
  };
}

function VerifiedBadge({ status, okLabel, failLabel, unknownLabel }) {
  if (status === true) {
    return (
      <span className="verified-chip ok">
        <FaCheckCircle /> {okLabel}
      </span>
    );
  }
  if (status === false) {
    return (
      <span className="verified-chip warn">
        <FaTimesCircle /> {failLabel}
      </span>
    );
  }
  return (
    <span className="verified-chip neutral">
      <FaQuestionCircle /> {unknownLabel}
    </span>
  );
}

function LinkRowShell({
  provider,
  linked,
  handleValue,
  busy,
  onUnlink,
  onConnect,
  statusBadge,
  optional,
  emailValue,
  linkXpReward,
  children,
}) {
  const meta = providerMeta[provider];
  return (
    <div className={`link-row ${linked ? "linked" : ""}${optional ? " optional" : ""}`}>
      <div className="link-row-left">
        <span className="link-icon" style={{ background: `${meta.accent}22`, color: meta.accent }}>
          {provider === "x" ? <FaTwitter /> : null}
          {provider === "discord" ? <FaDiscord /> : null}
          {provider === "telegram" ? <FaTelegramPlane /> : null}
          {provider === "solana" ? <FaWallet /> : null}
        </span>
        <div>
          <div className="link-row-title">
            <strong>{meta.label}</strong>
            {optional ? <span className="link-optional-pill">OPTIONAL</span> : null}
          </div>
          {typeof linkXpReward === "number" && linkXpReward > 0 ? (
            <span className="link-xp-hint">+{linkXpReward} XP · first time you link</span>
          ) : null}
          {linked && handleValue ? (
            <span className="link-handle">{handleValue}</span>
          ) : (
            <span className="link-handle">NOT LINKED</span>
          )}
          {linked && emailValue ? (
            <span className="link-email" title={emailValue}>
              {emailValue}
            </span>
          ) : null}
          {statusBadge ? <div className="link-status-row">{statusBadge}</div> : null}
        </div>
      </div>
      <div className="link-row-right">
        {linked ? (
          <button className="launch-btn ghost small" disabled={busy} onClick={onUnlink}>
            UNLINK
          </button>
        ) : (
          onConnect && (
            <button className="launch-btn cta small" onClick={onConnect} disabled={busy}>
              CONNECT
            </button>
          )
        )}
      </div>
      {children ? <div className="link-row-extra">{children}</div> : null}
    </div>
  );
}

function XLinkRow({ identity, walletAddress, onRefresh, optional, linkXpReward }) {
  const linked = !!identity.xLinked;
  const handleValue = identity?.handles?.x;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const { ensureToken } = useSiweAuth();

  const verifySocialStatus = useCallback(async () => {
    if (!walletAddress) return;
    setBusy(true);
    setError(null);
    try {
      const token = await ensureToken();
      let res = await campaignApi.refreshSocialMembership(walletAddress, {
        token,
        force: true,
      });
      if (!res.ok && res.status === 401) {
        const fresh = await ensureToken();
        res = await campaignApi.refreshSocialMembership(walletAddress, {
          token: fresh,
          force: true,
        });
      }
      if (res.ok) await onRefresh();
      else setError(res.message || "Could not refresh follow status.");
    } catch (err) {
      setError(err?.message || "Could not refresh follow status.");
    } finally {
      setBusy(false);
    }
  }, [walletAddress, ensureToken, onRefresh]);

  const connect = async () => {
    if (!walletAddress) return;
    setBusy(true);
    setError(null);
    try {
      const token = await ensureToken();
      let result = await campaignApi.getXOAuthUrl(walletAddress, { token });
      if (!result.ok && result.status === 401) {
        const fresh = await ensureToken();
        result = await campaignApi.getXOAuthUrl(walletAddress, { token: fresh });
      }
      if (result.ok && result.url) {
        window.location.href = result.url;
        return;
      }
      setError(
        result.message ||
          "X OAuth is not configured. Set X_CLIENT_ID on the backend.",
      );
    } catch (err) {
      setError(
        err?.message?.includes("User rejected")
          ? "You declined the wallet signature. Sign in to connect X."
          : err?.message || "Could not start X OAuth.",
      );
    } finally {
      setBusy(false);
    }
  };

  const unlink = async () => {
    if (!walletAddress) return;
    setBusy(true);
    await campaignApi.unlinkIdentity(walletAddress, "x");
    await onRefresh();
    setBusy(false);
  };

  const followBadge = linked ? (
    <VerifiedBadge
      status={identity.xFollowsRektCeo}
      okLabel="FOLLOWS @REKT_CEO"
      failLabel="NOT FOLLOWING @REKT_CEO"
      unknownLabel="FOLLOW CHECK SKIPPED"
    />
  ) : null;

  return (
    <LinkRowShell
      provider="x"
      linked={linked}
      handleValue={handleValue}
      emailValue={identity.xEmail || null}
      busy={busy}
      onUnlink={unlink}
      onConnect={!linked && walletAddress ? connect : null}
      statusBadge={followBadge}
      optional={!!optional}
      linkXpReward={linkXpReward}
    >
      {error ? <p className="link-form-error">{error}</p> : null}
      {!linked ? (
        <p className="link-form-copy muted">
          Sign in with X — we verify your handle, check that you follow
          @rekt_ceo, and (when X grants the scope) capture your email so we
          can send airdrop and reward updates.
        </p>
      ) : null}
      {linked && identity.xFollowsRektCeo !== true ? (
        <>
          <div className="social-status-actions">
            <a
              className="launch-btn cta small"
              href={socialJoinUrls.xRektCeo}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaTwitter /> OPEN @REKT_CEO ON X
            </a>
            <button
              type="button"
              className="launch-btn ghost small"
              disabled={busy}
              onClick={verifySocialStatus}
            >
              <FaSyncAlt /> VERIFY AGAIN
            </button>
          </div>
          {identity.xFollowsRektCeo === false ? (
            <p className="link-form-copy">
              You aren&apos;t following @rekt_ceo yet. Follow on X, then tap Verify
              again — we refresh status daily when you load Launch Hub too.
            </p>
          ) : (
            <p className="link-form-copy muted">
              Automated follow-check isn&apos;t available or was skipped. Ensure{" "}
              <code>TWITTERAPI_IO_KEY</code> is set on campaigns, follow @rekt_ceo,
              then tap Verify again.
            </p>
          )}
        </>
      ) : null}
    </LinkRowShell>
  );
}

function DiscordLinkRow({ identity, walletAddress, onRefresh, optional, linkXpReward }) {
  const linked = !!identity.discordLinked;
  const handleValue = identity?.handles?.discord;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const { ensureToken } = useSiweAuth();

  const verifySocialStatus = useCallback(async () => {
    if (!walletAddress) return;
    setBusy(true);
    setError(null);
    try {
      const token = await ensureToken();
      let res = await campaignApi.refreshSocialMembership(walletAddress, {
        token,
        force: true,
      });
      if (!res.ok && res.status === 401) {
        const fresh = await ensureToken();
        res = await campaignApi.refreshSocialMembership(walletAddress, {
          token: fresh,
          force: true,
        });
      }
      if (res.ok) await onRefresh();
      else setError(res.message || "Could not refresh Discord status.");
    } catch (err) {
      setError(err?.message || "Could not refresh Discord status.");
    } finally {
      setBusy(false);
    }
  }, [walletAddress, ensureToken, onRefresh]);

  const connect = async () => {
    if (!walletAddress) return;
    setBusy(true);
    setError(null);
    try {
      const token = await ensureToken();
      let result = await campaignApi.getDiscordOAuthUrl(walletAddress, {
        token,
      });
      if (!result.ok && result.status === 401) {
        const fresh = await ensureToken();
        result = await campaignApi.getDiscordOAuthUrl(walletAddress, {
          token: fresh,
        });
      }
      if (result.ok && result.url) {
        window.location.href = result.url;
        return;
      }
      setError(
        result.message ||
          "Discord OAuth is not configured. Check backend env vars.",
      );
    } catch (err) {
      setError(
        err?.message?.includes("User rejected")
          ? "You declined the wallet signature. Sign in to connect Discord."
          : err?.message || "Could not start Discord OAuth.",
      );
    } finally {
      setBusy(false);
    }
  };

  const unlink = async () => {
    if (!walletAddress) return;
    setBusy(true);
    await campaignApi.unlinkIdentity(walletAddress, "discord");
    await onRefresh();
    setBusy(false);
  };

  const guildBadge = linked ? (
    <VerifiedBadge
      status={identity.discordInGuild}
      okLabel="IN REKT CEO SERVER"
      failLabel="NOT IN SERVER"
      unknownLabel="GUILD CHECK SKIPPED"
    />
  ) : null;

  return (
    <LinkRowShell
      provider="discord"
      linked={linked}
      handleValue={handleValue}
      emailValue={
        identity.discordEmail
          ? `${identity.discordEmail}${
              identity.discordEmailVerified === false ? " (unverified)" : ""
            }`
          : null
      }
      busy={busy}
      onUnlink={unlink}
      onConnect={!linked && walletAddress ? connect : null}
      statusBadge={guildBadge}
      optional={!!optional}
      linkXpReward={linkXpReward}
    >
      {error ? <p className="link-form-error">{error}</p> : null}
      {!linked ? (
        <p className="link-form-copy muted">
          Sign in to Discord — we&apos;ll verify you&apos;re in the Rekt CEO server.
        </p>
      ) : null}
      {linked && identity.discordInGuild !== true ? (
        <>
          <div className="social-status-actions">
            <a
              className="launch-btn cta small"
              href={socialJoinUrls.discordInvite}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaDiscord /> JOIN REKT CEO DISCORD
            </a>
            <button
              type="button"
              className="launch-btn ghost small"
              disabled={busy}
              onClick={verifySocialStatus}
            >
              <FaSyncAlt /> VERIFY AGAIN
            </button>
          </div>
          {identity.discordInGuild === false ? (
            <p className="link-form-copy">
              You&apos;re not in the Rekt CEO Discord server yet. Join via the link, then tap
              Verify again. Launch Hub also re-checks periodically.
            </p>
          ) : (
            <p className="link-form-copy muted">
              We couldn&apos;t confirm server membership (configure{" "}
              <code>DISCORD_BOT_TOKEN</code> + <code>DISCORD_GUILD_ID</code> on campaigns). Join
              Discord, then Verify again.
            </p>
          )}
        </>
      ) : null}
    </LinkRowShell>
  );
}

function TelegramLinkRow({ identity, walletAddress, onRefresh, optional = true, linkXpReward }) {
  const linked = !!identity.telegramLinked;
  const handleValue = identity?.handles?.telegram;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [config, setConfig] = useState(null);
  const [widgetFailed, setWidgetFailed] = useState(false);
  const widgetRef = useRef(null);
  const { ensureToken } = useSiweAuth();

  useEffect(() => {
    let mounted = true;
    campaignApi.getTelegramConfig().then((c) => mounted && setConfig(c));
    return () => {
      mounted = false;
    };
  }, []);

  // Telegram Login Widget needs a global callback. Mount once.
  useEffect(() => {
    if (linked) return;
    if (!config?.configured || !config?.botUsername) return;
    const mountEl = widgetRef.current;
    if (!mountEl) return;
    if (!walletAddress) return;

    window.__rektOnTelegramAuth = async (payload) => {
      setBusy(true);
      setError(null);
      try {
        const token = await ensureToken();
        let result = await campaignApi.verifyTelegramLogin(walletAddress, payload, {
          token,
        });
        if (!result.ok && result.status === 401) {
          const fresh = await ensureToken();
          result = await campaignApi.verifyTelegramLogin(walletAddress, payload, {
            token: fresh,
          });
        }
        if (result.ok) {
          await onRefresh();
        } else {
          setError(result.message || "Telegram verification failed.");
        }
      } catch (err) {
        setError(
          err?.message?.includes("User rejected")
            ? "You declined the wallet signature. Sign in to verify Telegram."
            : err?.message || "Telegram verification failed.",
        );
      } finally {
        setBusy(false);
      }
    };

    setWidgetFailed(false);
    mountEl.innerHTML = "";
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", config.botUsername);
    script.setAttribute("data-size", "medium");
    script.setAttribute("data-radius", "8");
    script.setAttribute("data-onauth", "__rektOnTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    mountEl.appendChild(script);

    // Telegram's widget refuses to render when the page origin isn't
    // registered with the bot via @BotFather → /setdomain. The script
    // silently logs "Bot domain invalid" and never injects an iframe.
    // Probe after a short delay and surface a helpful hint instead of
    // leaving an empty space the user can't debug.
    const probe = setTimeout(() => {
      if (!mountEl.isConnected) return;
      const hasIframe = !!mountEl.querySelector("iframe");
      setWidgetFailed(!hasIframe);
    }, 2000);

    return () => {
      clearTimeout(probe);
      try {
        delete window.__rektOnTelegramAuth;
      } catch (_) {
        window.__rektOnTelegramAuth = undefined;
      }
      mountEl.innerHTML = "";
    };
  }, [config, walletAddress, linked, onRefresh, ensureToken]);

  const verifySocialStatus = useCallback(async () => {
    if (!walletAddress) return;
    setBusy(true);
    setError(null);
    try {
      const token = await ensureToken();
      let res = await campaignApi.refreshSocialMembership(walletAddress, {
        token,
        force: true,
      });
      if (!res.ok && res.status === 401) {
        const fresh = await ensureToken();
        res = await campaignApi.refreshSocialMembership(walletAddress, {
          token: fresh,
          force: true,
        });
      }
      if (res.ok) await onRefresh();
      else setError(res.message || "Could not refresh Telegram group status.");
    } catch (err) {
      setError(err?.message || "Could not refresh Telegram group status.");
    } finally {
      setBusy(false);
    }
  }, [walletAddress, ensureToken, onRefresh]);

  const revealTelegramWidget = useCallback(() => {
    widgetRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const unlink = async () => {
    if (!walletAddress) return;
    setBusy(true);
    await campaignApi.unlinkIdentity(walletAddress, "telegram");
    await onRefresh();
    setBusy(false);
  };

  const groupBadge = linked ? (
    <VerifiedBadge
      status={identity.telegramInGroup}
      okLabel="IN REKT CEO GROUP"
      failLabel="NOT IN GROUP"
      unknownLabel="GROUP CHECK SKIPPED"
    />
  ) : null;

  const currentHost =
    typeof window !== "undefined" ? window.location.host : "<host>";

  return (
    <LinkRowShell
      provider="telegram"
      linked={linked}
      handleValue={handleValue}
      busy={busy}
      onUnlink={unlink}
      onConnect={
        linked ||
        !walletAddress ||
        !config?.configured ||
        !config?.botUsername
          ? null
          : revealTelegramWidget
      }
      statusBadge={groupBadge}
      optional={!!optional}
      linkXpReward={linkXpReward}
    >
      {!linked ? (
        <div className="link-form column">
          {config && !config.configured ? (
            <p className="link-form-copy muted">
              {optional ? "Telegram is optional, and t" : "T"}he Login
              Widget isn't configured yet (set{" "}
              <code>TELEGRAM_BOT_USERNAME</code> and{" "}
              <code>TELEGRAM_BOT_TOKEN</code> on the backend).
            </p>
          ) : (
            <p className="link-form-copy muted">
              {optional
                ? "Telegram is optional. "
                : "Telegram is required. "}
              Tap <strong>Connect</strong> to jump to Telegram&apos;s official
              button, sign in there, then we attach it to this wallet{" "}
              {optional ? "(same unlink flow as other social rows)." : "."}{" "}
              Join the Rekt CEO group first if your campaign requires it.
            </p>
          )}
          <div ref={widgetRef} className="telegram-widget-mount" />
          {widgetFailed ? (
            <div className="telegram-widget-fallback">
              <strong>Telegram widget didn't render.</strong>
              <p>
                The current origin <code>{currentHost}</code> isn't in your
                bot's allow-list. In Telegram, open <code>@BotFather</code>{" "}
                → <code>/setdomain</code> → pick{" "}
                <code>@{config?.botUsername || "yourBot"}</code> → send the
                hostname (no <code>https://</code>, no port).
              </p>
              <p className="muted">
                Note: Telegram does not accept <code>localhost</code> or IP
                addresses. For local dev, tunnel via{" "}
                <code>ngrok http 3001</code> and register the
                <code>*.ngrok-free.app</code> host instead.
              </p>
            </div>
          ) : null}
          {error ? <p className="link-form-error">{error}</p> : null}
        </div>
      ) : (
        <div className="link-form column">
          {error ? <p className="link-form-error">{error}</p> : null}
          {!identity.telegramUserId ? (
            <p className="link-form-copy muted">
              Unlink and connect Telegram once more so we can store your Telegram id for automatic
              group checks.
            </p>
          ) : null}
          {!identity.telegramUserId ? (
            <div className="social-status-actions">
              <a
                className="launch-btn ghost small"
                href={socialJoinUrls.telegramGroup}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaTelegramPlane /> OPEN REKT CEO TELEGRAM
              </a>
            </div>
          ) : null}
          {identity.telegramUserId && identity.telegramInGroup !== true ? (
            <>
              <div className="social-status-actions">
                <a
                  className="launch-btn cta small"
                  href={socialJoinUrls.telegramGroup}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaTelegramPlane /> OPEN REKT CEO TELEGRAM
                </a>
                <button
                  type="button"
                  className="launch-btn ghost small"
                  disabled={busy}
                  onClick={verifySocialStatus}
                >
                  <FaSyncAlt /> VERIFY AGAIN
                </button>
              </div>
              {identity.telegramInGroup === false ? (
                <p className="link-form-copy">
                  You&apos;re not in the public Rekt CEO group yet. Join, then Verify again (Launch Hub also
                  re-checks periodically when you reload).
                </p>
              ) : (
                <p className="link-form-copy muted">
                  Configure <code>TELEGRAM_CHAT_ID</code> + bot in the group so we can confirm membership, then Verify
                  again.
                </p>
              )}
            </>
          ) : null}
        </div>
      )}
    </LinkRowShell>
  );
}

function SolanaLinkRow({ identity, walletAddress, onRefresh, linkXpReward }) {
  const linked = !!identity.solanaLinked;
  const handleValue = identity?.handles?.solana;
  const { setVisible } = useWalletModal();
  const { connected, publicKey, disconnect } = useWallet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const { ensureToken } = useSiweAuth();

  const solanaAddress = useMemo(
    () => (publicKey ? publicKey.toBase58() : null),
    [publicKey],
  );
  const linkedAddress = handleValue || null;
  const sameWallet =
    linked && solanaAddress && linkedAddress
      ? linkedAddress.toLowerCase() === solanaAddress.toLowerCase()
      : false;

  // Auto-link the moment the Solana wallet connects, as long as we already
  // have an authenticated EVM address. The user signed once via SIWE — we
  // don't ask them to sign again. Re-runs only when the connected address
  // changes.
  useEffect(() => {
    if (!walletAddress) return;
    if (!connected || !solanaAddress) return;
    if (linked && sameWallet) return;
    let cancelled = false;
    (async () => {
      setBusy(true);
      setError(null);
      try {
        const token = await ensureToken();
        let result = await campaignApi.linkIdentity(
          walletAddress,
          "solana",
          solanaAddress,
          { token },
        );
        if (!result?.ok && result?.status === 401) {
          const fresh = await ensureToken();
          result = await campaignApi.linkIdentity(
            walletAddress,
            "solana",
            solanaAddress,
            { token: fresh },
          );
        }
        if (cancelled) return;
        if (result?.ok || result === undefined) {
          await onRefresh();
        } else {
          setError(result?.message || "Could not link Solana wallet.");
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.message?.includes("User rejected")
              ? "You declined the wallet signature. Sign in to link Solana."
              : err?.message || "Could not link Solana wallet.",
          );
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    walletAddress,
    connected,
    solanaAddress,
    linked,
    sameWallet,
    onRefresh,
    ensureToken,
  ]);

  const connect = () => {
    setError(null);
    setVisible(true);
  };

  const unlink = async () => {
    if (!walletAddress) return;
    setBusy(true);
    await campaignApi.unlinkIdentity(walletAddress, "solana");
    try {
      if (connected) await disconnect();
    } catch (_) {
      /* swallow — user might already be disconnected */
    }
    await onRefresh();
    setBusy(false);
  };

  // Show short address if linked, else nothing.
  const displayHandle = linkedAddress
    ? `${linkedAddress.slice(0, 4)}…${linkedAddress.slice(-4)}`
    : null;

  return (
    <LinkRowShell
      provider="solana"
      linked={linked}
      handleValue={displayHandle}
      busy={busy}
      onUnlink={unlink}
      onConnect={!linked && walletAddress ? connect : null}
      optional
      linkXpReward={linkXpReward}
    >
      {!linked ? (
        <p className="link-form-copy muted">
          Optional. Link a Solana wallet (Phantom / Solflare) to unlock
          pump.fun buy + bridge tasks. Uses the same wallet picker as the
          Buy CEO page — no manual address entry.
        </p>
      ) : !sameWallet && solanaAddress ? (
        <p className="link-form-copy">
          A different Solana wallet is now connected (
          <code>{solanaAddress.slice(0, 4)}…{solanaAddress.slice(-4)}</code>).
          Re-linking automatically.
        </p>
      ) : null}
      {error ? <p className="link-form-error">{error}</p> : null}
    </LinkRowShell>
  );
}

function IdentityChecklistBlock({ data, walletAddress, onRefresh }) {
  const { identity, gateConfig } = data;
  const xr = data?.xpRewards;
  const xRow = gateRow(gateConfig, "xLinked");
  const discordRow = gateRow(gateConfig, "discordLinked");
  const telegramRow = gateRow(gateConfig, "telegramLinked");

  const evmLine = (
    <div className={`link-row linked`} key="evm">
      <div className="link-row-left">
        <span className="link-icon" style={{ background: "#F8C82622", color: "#F8C826" }}>
          <FaWallet />
        </span>
        <div>
          <strong>EVM WALLET (PRIMARY)</strong>
          <span className="link-handle">
            {walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : "NOT CONNECTED"}
          </span>
        </div>
      </div>
      <div className="link-row-right">
        {identity.evmConnected ? (
          <span className="phase-chip ok">CONNECTED</span>
        ) : (
          <span className="phase-chip warn">CONNECT WALLET</span>
        )}
      </div>
    </div>
  );

  return (
    <SectionCard
      title="Identity Stack"
      subtitle="Bind your degen identities. Required to access campaign tasks."
      sticker={sticker.ceoBadge}
      accent="yellow"
    >
      <div className="identity-stack">
        {evmLine}
        {xRow.enabled ? (
          <XLinkRow
            identity={identity}
            walletAddress={walletAddress}
            onRefresh={onRefresh}
            optional={!xRow.required}
            linkXpReward={xr?.linkXp?.x}
          />
        ) : null}
        {discordRow.enabled ? (
          <DiscordLinkRow
            identity={identity}
            walletAddress={walletAddress}
            onRefresh={onRefresh}
            optional={!discordRow.required}
            linkXpReward={xr?.linkXp?.discord}
          />
        ) : null}
        {telegramRow.enabled ? (
          <TelegramLinkRow
            identity={identity}
            walletAddress={walletAddress}
            onRefresh={onRefresh}
            optional={!telegramRow.required}
            linkXpReward={xr?.linkXp?.telegram}
          />
        ) : null}
        <SolanaLinkRow
          identity={identity}
          walletAddress={walletAddress}
          onRefresh={onRefresh}
          linkXpReward={xr?.linkXp?.solana}
        />
      </div>
    </SectionCard>
  );
}

function XPSummaryBlock({ data }) {
  const { xp } = data;
  const pct = Math.max(0, Math.min(100, (xp.lifetime / xp.nextLevelAt) * 100));
  return (
    <SectionCard
      title="XP & Level"
      subtitle="Lifetime XP unlocks perks. Season XP drives rewards."
      right={<span className="phase-chip">LEVEL {xp.level}</span>}
      sticker={sticker.wagmSticker}
      accent="purple"
    >
      <div className="xp-grid">
        <div className="xp-cell">
          <span>Lifetime XP</span>
          <strong>{xp.lifetime.toLocaleString()}</strong>
        </div>
        <div className="xp-cell">
          <span>Season XP</span>
          <strong>{xp.season.toLocaleString()}</strong>
        </div>
        <div className="xp-progress-wrap">
          <div className="xp-progress-label">
            {xp.lifetime.toLocaleString()} / {xp.nextLevelAt.toLocaleString()} XP to next level
          </div>
          <div className="xp-progress-bar">
            <div className="xp-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function StreakStrip({ count }) {
  const days = Array.from({ length: 7 }, (_, i) => i);
  return (
    <div className="streak-strip">
      {days.map((i) => {
        const filled = i < count;
        return (
          <div key={i} className={`streak-dot ${filled ? "on" : ""}`}>
            <FaCalendarCheck />
            <span>D{i + 1}</span>
          </div>
        );
      })}
    </div>
  );
}

const REWARD_KIND_CHECKIN = "checkin";
const REWARD_KIND_SPIN = "spin";

function useAnimatedXp(target, active, prefersReducedMotion) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    if (prefersReducedMotion) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const duration = 820;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, prefersReducedMotion]);
  return value;
}

function RewardCelebrationModal({ open, onClose, variant, xp, breakdown, credits }) {
  const prefersReducedMotion = useReducedMotion();
  const animatedXp = useAnimatedXp(xp || 0, open, prefersReducedMotion);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const title =
    variant === "checkin" ? "Daily check-in" : variant === "spin" ? "Daily spin" : "Daily X mission";
  const eyebrow =
    variant === "checkin"
      ? "Streak secured — XP credited"
      : variant === "spin"
        ? "Wheel payout locked in"
        : "Verification payout";

  const detailLines = [];
  if (variant === "checkin" && breakdown && typeof breakdown === "object") {
    const base = breakdown.base;
    const sb = breakdown.streakBonus;
    const sd = breakdown.streakDays;
    if (Number.isFinite(Number(base))) detailLines.push(`${Number(base)} XP base`);
    if (Number.isFinite(Number(sb))) detailLines.push(`+${Number(sb)} XP streak bonus`);
    if (Number.isFinite(Number(sd))) detailLines.push(`${Number(sd)}-day streak`);
  }
  if (variant === "x_mission" && Array.isArray(credits) && credits.length) {
    credits.slice(0, 8).forEach((c) => {
      if (c && Number.isFinite(Number(c.xp))) detailLines.push(`+${c.xp} XP · ${c.taskId || "task"}`);
    });
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="reward-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.24 }}
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            className="reward-modal-shell"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reward-modal-title"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 32 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 14 }}
            transition={
              prefersReducedMotion ? { duration: 0.14 } : { type: "spring", stiffness: 360, damping: 26 }
            }
            onClick={(e) => e.stopPropagation()}
          >
            <div className="reward-modal-glow" aria-hidden />
            <div className="reward-modal-sparkles" aria-hidden />
            <button type="button" className="reward-modal-close" onClick={onClose} aria-label="Close dialog">
              ×
            </button>
            <p className="reward-modal-eyebrow">{eyebrow}</p>
            <h2 id="reward-modal-title" className="reward-modal-title">
              {title}
            </h2>
            <div className="reward-modal-xp-wrap">
              <span className="reward-modal-xp-label">You earned</span>
              <motion.div
                className="reward-modal-xp-hero"
                initial={prefersReducedMotion ? false : { scale: 0.88, opacity: 0.85 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={
                  prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 22 }
                }
              >
                +{animatedXp.toLocaleString()}
                <span className="reward-modal-xp-suffix"> XP</span>
              </motion.div>
            </div>
            {detailLines.length ? (
              <ul className="reward-modal-detail">
                {detailLines.map((line, i) => (
                  <motion.li
                    key={`${line}-${i}`}
                    initial={prefersReducedMotion ? false : { opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: prefersReducedMotion ? 0 : 0.1 + i * 0.045 }}
                  >
                    {line}
                  </motion.li>
                ))}
              </ul>
            ) : null}
            <button type="button" className="launch-btn cta reward-modal-cta" onClick={onClose}>
              Continue
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

function LastRewardHighlight({ prefix, record, className }) {
  if (!record || typeof record.xp !== "number") return null;
  return (
    <div className={["last-reward-highlight", className].filter(Boolean).join(" ")} role="status">
      <span className="last-reward-highlight-prefix">{prefix}</span>
      <span className="last-reward-highlight-xp">+{record.xp.toLocaleString()} XP</span>
      {record.dateUtc ? <span className="last-reward-highlight-date">UTC {record.dateUtc}</span> : null}
    </div>
  );
}

function DailyCheckinBlock({ data, onRefresh, walletAddress }) {
  const [loading, setLoading] = useState(false);
  const [lastAward, setLastAward] = useState(null);
  const [lastWinRecord, setLastWinRecord] = useState(null);
  const [celebrate, setCelebrate] = useState(null);
  const claimed = data?.daily?.checkinClaimed;
  const streak = data?.daily?.streak?.count || 0;
  const xr = data?.xpRewards;
  const baseXp = xr?.dailyCheckinBase ?? 10;
  const streakCap = xr?.dailyCheckinStreakBonusMax ?? 20;

  useEffect(() => {
    setLastWinRecord(walletAddress ? readLastReward(walletAddress, REWARD_KIND_CHECKIN) : null);
  }, [walletAddress]);

  const handleClaim = async () => {
    if (!walletAddress) return;
    setLoading(true);
    const result = await campaignApi.claimDailyCheckin(walletAddress);
    if (result.ok && result.claimed && (result.awarded ?? 0) > 0) {
      const xp = result.awarded ?? 0;
      setLastAward(xp);
      writeLastReward(walletAddress, REWARD_KIND_CHECKIN, xp, result.breakdown ?? null);
      setLastWinRecord(readLastReward(walletAddress, REWARD_KIND_CHECKIN));
      setCelebrate({ variant: "checkin", xp, breakdown: result.breakdown ?? null });
    } else if (result.ok) {
      toast.error(result.reason || result.message || "Check-in already claimed or unavailable today.");
    } else {
      toast.error(result.message || "Check-in failed.");
    }
    await onRefresh();
    setLoading(false);
  };

  return (
    <>
      <RewardCelebrationModal
        open={Boolean(celebrate)}
        onClose={() => setCelebrate(null)}
        variant={celebrate?.variant || "checkin"}
        xp={celebrate?.xp ?? 0}
        breakdown={celebrate?.breakdown}
        credits={celebrate?.credits}
      />
      <SectionCard
        title="Daily Check-In"
        subtitle={`Once per UTC day · ${baseXp} XP base + up to ${streakCap} streak bonus (+1 per day in streak, capped).`}
        sticker={sticker.beer}
        accent="green"
        right={<span className="phase-chip">STREAK {streak}D</span>}
      >
        <LastRewardHighlight prefix="Last check-in win" record={lastWinRecord} />
        <p className="daily-checkin-formula daily-checkin-formula--compact">
          After claim: <strong>{baseXp}</strong> + min(streak−1, {streakCap}) XP today.
        </p>
        <StreakStrip count={Math.min(7, streak)} />
        <div className="daily-row spaced">
          <button
            className="launch-btn cta"
            disabled={loading || claimed || !walletAddress}
            onClick={handleClaim}
          >
            {claimed ? "CLAIMED FOR TODAY" : loading ? "CLAIMING…" : "CLAIM CHECK-IN"}
          </button>
          {lastAward !== null ? (
            <p className="award-text award-text--prominent">Just now · +{lastAward.toLocaleString()} XP</p>
          ) : null}
        </div>
      </SectionCard>
    </>
  );
}

function spinWheelConicStops(buckets) {
  const n = buckets.length;
  if (!n) return "var(--color-magenta) 0deg 360deg";
  const parts = [];
  for (let i = 0; i < n; i += 1) {
    const start = (i / n) * 360;
    const end = ((i + 1) / n) * 360;
    const c = i % 2 === 0 ? "var(--color-yellow)" : "var(--color-magenta)";
    parts.push(`${c} ${start}deg ${end}deg`);
  }
  return parts.join(", ");
}

function SpinWheel({ busy, rotationDeg, buckets, lastAward }) {
  const list = buckets?.length ? buckets : [10];
  const n = list.length;
  const sliceAngle = 360 / n;
  const conic = spinWheelConicStops(list);

  return (
    <div className={`spin-wheel-wrap${busy ? " spin-wheel-wrap--busy" : ""}`}>
      <div className="spin-wheel">
        <div
          className="spin-wheel-disk"
          style={{
            transform: `rotate(${rotationDeg}deg)`,
            background: `conic-gradient(${conic})`,
          }}
        >
          {list.map((value, i) => {
            const mid = (i + 0.5) * sliceAngle;
            const alt = i % 2 === 0;
            return (
              <span
                key={i}
                className={`wheel-label ${alt ? "wheel-label--on-yellow" : "wheel-label--on-magenta"}`}
                style={{
                  transform: `rotate(${mid}deg) translateY(-76px) rotate(${-mid}deg)`,
                }}
              >
                {value}
              </span>
            );
          })}
        </div>
      </div>
      <div className="spin-wheel-pin" aria-hidden />
      <div
        className={`spin-wheel-center${lastAward !== null ? " spin-wheel-center--has-win" : ""}`}
      >
        {lastAward !== null ? <span>+{lastAward.toLocaleString()}</span> : <span>SPIN</span>}
      </div>
    </div>
  );
}

function DailySpinBlock({ data, onRefresh, walletAddress }) {
  const [loading, setLoading] = useState(false);
  const [lastAward, setLastAward] = useState(null);
  const [lastWinRecord, setLastWinRecord] = useState(null);
  const [celebrate, setCelebrate] = useState(null);
  const prefersReducedMotion = useReducedMotion();
  const spinRevealTimerRef = useRef(null);
  const claimed = data?.daily?.spinClaimed;
  const xr = data?.xpRewards;
  const buckets = useMemo(() => {
    const b = xr?.dailySpinBuckets;
    return Array.isArray(b) && b.length ? b : [5, 10, 15, 20, 25, 35, 50, 75];
  }, [xr]);
  const angleRef = useRef(0);
  const [wheelTurn, setWheelTurn] = useState(0);

  useEffect(() => {
    setLastWinRecord(walletAddress ? readLastReward(walletAddress, REWARD_KIND_SPIN) : null);
  }, [walletAddress]);

  useEffect(() => {
    return () => {
      if (spinRevealTimerRef.current) window.clearTimeout(spinRevealTimerRef.current);
    };
  }, []);

  const handleSpin = async () => {
    if (!walletAddress) return;
    setLoading(true);
    try {
      const result = await campaignApi.claimDailySpin(walletAddress);
      if (result.ok && result.claimed && (result.awarded ?? 0) > 0) {
        const xp = result.awarded ?? 0;
        setLastAward(xp);
        if (typeof result.bucketIndex === "number" && buckets.length) {
          const slice = 360 / buckets.length;
          const mid = (result.bucketIndex + 0.5) * slice;
          const cur = ((angleRef.current % 360) + 360) % 360;
          const need = ((360 - mid) % 360 + 360) % 360;
          let delta = (need - cur + 360) % 360;
          if (delta === 0) delta = 360;
          const fullSpins = 6;
          angleRef.current += fullSpins * 360 + delta;
          setWheelTurn(angleRef.current);
        }
        writeLastReward(walletAddress, REWARD_KIND_SPIN, xp, {
          bucketIndex: result.bucketIndex ?? null,
        });
        setLastWinRecord(readLastReward(walletAddress, REWARD_KIND_SPIN));
        if (spinRevealTimerRef.current) window.clearTimeout(spinRevealTimerRef.current);
        const delayMs = prefersReducedMotion ? 350 : 2600;
        spinRevealTimerRef.current = window.setTimeout(() => {
          setCelebrate({ variant: "spin", xp });
        }, delayMs);
      } else if (result.ok) {
        toast.error(result.reason || result.message || "Spin already used today.");
      } else {
        toast.error(result.message || "Spin failed.");
      }
    } finally {
      await onRefresh();
      setLoading(false);
    }
  };

  return (
    <>
      <RewardCelebrationModal
        open={Boolean(celebrate)}
        onClose={() => setCelebrate(null)}
        variant={celebrate?.variant || "spin"}
        xp={celebrate?.xp ?? 0}
        breakdown={celebrate?.breakdown}
        credits={celebrate?.credits}
      />
      <SectionCard
        title="Daily Spin"
        subtitle="One spin per UTC day · wedges are XP."
        sticker={sticker.degenSticker}
        accent="red"
        right={<span className="phase-chip phase-chip--subtle">UTC DAY</span>}
      >
        <div className="spin-block-grid">
          <SpinWheel busy={loading} rotationDeg={wheelTurn} buckets={buckets} lastAward={lastAward} />
          <div className="spin-actions">
            <ul className="spin-rules" aria-label="Daily spin rules">
              <li>One spin each UTC calendar day · resets midnight UTC.</li>
              <li>The pin settles on a wedge — that XP is credited to your Launch Hub balance.</li>
              <li>Connect and sign in (SIWE) with your Launch Hub wallet to spin.</li>
            </ul>
            <LastRewardHighlight
              prefix="Last spin win"
              record={lastWinRecord}
              className="last-reward-highlight--spin-column"
            />
            <button
              className="launch-btn cta spin-actions-btn"
              disabled={loading || claimed || !walletAddress}
              onClick={handleSpin}
            >
              {claimed ? "USED TODAY" : loading ? "SPINNING…" : "SPIN NOW"}
            </button>
            {lastAward !== null ? (
              <p className="award-text award-text--prominent spin-actions-win">+{lastAward.toLocaleString()} XP</p>
            ) : null}
          </div>
        </div>
      </SectionCard>
    </>
  );
}

/** In-app CTA between “mention” and “attach meme” mission rows — distinct from static rule chips. */
function XMissionMemeMakerLink() {
  return (
    <Link
      to="/memes"
      className="x-rule x-rule--meme-maker-link"
      aria-label="Make Rekt CEO Meme — opens the meme generator"
    >
      <span className="x-rule-icon x-rule-icon--meme-maker">
        <FaImage aria-hidden />
      </span>
      <span className="x-rule-meme-maker-copy">
        <strong>Make Rekt CEO Meme</strong>
        <span className="x-rule-meme-maker-sub">
          On-site meme studio <FaArrowRight className="x-rule-meme-maker-arrow" aria-hidden />
        </span>
      </span>
      <span className="x-rule-meme-maker-go" aria-hidden>
        Open
      </span>
    </Link>
  );
}

function XShareTaskBlock({ data, walletAddress, onRefresh }) {
  const X_VERIFY_COOLDOWN_MS = 1 * 60 * 1000;
  const xTaskRules = data?.xTaskRules || {};
  const xMission = data?.xMission || {};
  const missionTasks = xMission.tasks || [];
  const delayMin = Number(xMission.rules?.delayBeforeCreditMinutes ?? xTaskRules.delayBeforeCreditMinutes) || 0;
  const minLikes24h = Number(xMission.rules?.minLikesAfter24h ?? xTaskRules.minLikesAfter24h) || 0;
  const totalAvail = xMission.totalXpAvailable ?? missionTasks.reduce((s, t) => s + (t.xp || 0), 0);
  const earned = xMission.totalXpEarnedToday ?? missionTasks.filter((t) => t.creditedToday).reduce((s, t) => s + (t.xp || 0), 0);


  const allDone = !!xMission.allTasksCredited;
  const [verifying, setVerifying] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [verifyPanel, setVerifyPanel] = useState(null);

  const [autoRedeemSecsLeft, setAutoRedeemSecsLeft] = useState(0);
  const pendingTasks = verifyPanel?.verification?.tasks?.filter(t => t.outcome === "pending_cooldown") || [];
  const pendingXp = pendingTasks.reduce((sum, t) => sum + t.xp, 0);
  const maxUnlocksAt = pendingTasks.length > 0 ? Math.max(...pendingTasks.map(t => t.unlocksAt)) : null;


  const [missionCelebrate, setMissionCelebrate] = useState(null);
  const [lastMissionWin, setLastMissionWin] = useState(null);
  /** Timestamp (ms); verify throttled server + client except skip when mission already credited. */
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [nowTs, setNowTs] = useState(() => Date.now());
  const missionMemoryKind = useMemo(() => xMissionMemoryKind(xTaskRules.presetId), [xTaskRules.presetId]);

  const cooldownStorageKey =
    walletAddress && typeof walletAddress === "string"
      ? `rekt_launch_x_verify_cd_${walletAddress.toLowerCase()}`
      : null;

  useEffect(() => {
    if (!cooldownStorageKey || typeof sessionStorage === "undefined") return;
    const raw = sessionStorage.getItem(cooldownStorageKey);
    const until = raw ? Number.parseInt(raw, 10) : 0;
    if (Number.isFinite(until) && until > Date.now()) {
      setCooldownUntil(until);
    }
  }, [cooldownStorageKey]);

  useEffect(() => {
    setLastMissionWin(walletAddress ? readLastReward(walletAddress, missionMemoryKind) : null);
  }, [walletAddress, missionMemoryKind]);

  useEffect(() => {
    if (!(cooldownUntil > Date.now())) return;
    const id = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [cooldownUntil]);

  const cooldownSecsLeft =
    cooldownUntil > nowTs ? Math.max(0, Math.ceil((cooldownUntil - nowTs) / 1000)) : 0;

  const persistCooldownUntil = useCallback(
    (untilMs) => {
      setCooldownUntil(untilMs);
      if (cooldownStorageKey && typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(cooldownStorageKey, String(untilMs));
      }
    },
    [cooldownStorageKey],
  );

  const formatCooldown = useCallback((sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, []);

  const taskIcon = (kind) => {
    if (kind === "mention") return <FaTwitter />;
    if (kind === "meme_image") return <FaBolt />;
    if (kind === "friend_tags") return <FaInfoCircle />;
    if (kind === "hashtags") return <FaInfoCircle />;
    return <FaInfoCircle />;
  };

  const outcomeRowMeta = (outcome) => {
    if (outcome === "credited_now") {
      return {
        Icon: FaCheckCircle,
        label: "Credited now",
        rowClass: "x-verify-task--passed",
      };
    }
    if (outcome === "already_credited") {
      return {
        Icon: FaCheckCircle,
        label: "Already credited · UTC today",
        rowClass: "x-verify-task--done",
      };
    }
    if (outcome === "pending_cooldown") {
      return {
        Icon: FaClock,
        label: "Auto-crediting soon",
        rowClass: "x-verify-task--done",
      };
    }
    return {
      Icon: FaTimesCircle,
      label: "Still open",
      rowClass: "x-verify-task--pending",
    };
  };

  const tagStr = (xTaskRules.hashtags || []).join(" ");
  const compose = [`Getting rekt with ${xTaskRules.mention || "@rekt_ceo"}`, tagStr].filter(Boolean).join("\n");
  const text = encodeURIComponent(compose);

  const handleVerify = async () => {
    if (!walletAddress) {
      toast.error("Connect and sign in with your wallet first.", { id: "x-verify-auth", duration: 12000 });
      return;
    }
    if (cooldownSecsLeft > 0) {
      toast.error(`Verify cooldown — ${formatCooldown(cooldownSecsLeft)} left.`, {
        id: "x-verify-cooldown",
        duration: 5000,
      });
      return;
    }
    setVerifying(true);
    let applyCooldownAfter = false;
    try {
      const res = await campaignApi.verifyXMission(walletAddress, xTaskRules.presetId);
      if (!res.ok) {
        applyCooldownAfter = true;
        const msg = res.message || "Could not verify yet.";
        setVerifyPanel({
          kind: "error",
          status: res.status,
          detail: msg,
        });
        toast.error(`${msg}`, {
          id: "x-verify-fail",
          duration: 20000,
        });
        return;
      }

      const v = res.verification;
      const verification =
        v && typeof v === "object" && Array.isArray(v.tasks)
          ? v
          : {
              todayUtc: xMission.today || "—",
              tweetsFetched: 0,
              postsTodayUtc: 0,
              postsEligibleAfterGuards: 0,
              globalHints: [
                "This response did not include a task-by-task breakdown. Update the campaigns service to pick up richer verify responses.",
              ],
              tasks: missionTasks.map((t) => ({
                taskId: t.id,
                label: t.label,
                kind: t.kind || "",
                required: !!t.required,
                xp: t.xp || 0,
                outcome: res.allTasksComplete ? "already_credited" : "pending",
                detail: "",
              })),
            };

      applyCooldownAfter = !verification?.skippedTweetFetch;

      setVerifyPanel({
        kind: "result",
        verification,
        awarded: res.awarded ?? 0,
        allTasksComplete: !!res.allTasksComplete,
      });

      if ((res.awarded ?? 0) > 0) {
        const credits = Array.isArray(res.credits) ? res.credits : [];
        writeLastReward(walletAddress, missionMemoryKind, res.awarded, { credits });
        setLastMissionWin(readLastReward(walletAddress, missionMemoryKind));
        setMissionCelebrate({
          variant: "x_mission",
          xp: res.awarded,
          credits,
        });
        toast.success(`+${res.awarded} XP credited! Check the breakdown below.`, {
          id: "x-verify-ok",
          duration: 4000,
        });
      } else if (res.allTasksComplete) {
        toast.success("All tasks complete for today — nice work!", {
          id: "x-verify-ok",
          duration: 8000,
        });
      } else if (res.pendingCredits && res.pendingCredits.length > 0) {
        const pendingXp = res.pendingCredits.reduce((s, c) => s + c.xp, 0);
        toast.success(`Valid post! ${pendingXp} XP will auto-credit when the cooldown finishes.`, {
          id: "x-verify-ok",
          duration: 8000,
        });
      } else {
        toast(`Some tasks are still open — check the results below. Post again to cover the rest!`, {
          id: "x-verify-hint",
          duration: 16000,
          icon: "ℹ️",
        });
      }

      await onRefresh();
    } finally {
      setVerifying(false);
      if (applyCooldownAfter) {
        persistCooldownUntil(Date.now() + X_VERIFY_COOLDOWN_MS);
      }
    }
  };

  useEffect(() => {
    if (!maxUnlocksAt) {
      setAutoRedeemSecsLeft(0);
      return;
    }
    const tick = () => {
      const left = Math.max(0, Math.ceil((maxUnlocksAt - Date.now()) / 1000));
      setAutoRedeemSecsLeft(left);
      if (left <= 0 && pendingTasks.length > 0 && !verifying) {
         void handleVerify();
      }
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxUnlocksAt, pendingTasks.length, verifying]);


  const headRight = (
    <div className="launch-card-head-aside">
      <button
        type="button"
        className="launch-card-infobtn"
        aria-expanded={rulesOpen}
        aria-controls="x-mission-rules-explainer"
        title="Mission rules · required vs optional"
        onClick={() => setRulesOpen((v) => !v)}
      >
        <FaInfoCircle aria-hidden />
        <span className="launch-card-infobtn-label">RULES</span>
      </button>
      {allDone ? (
        <span className="phase-chip phase-chip--xp-hero ok">
          <span className="phase-chip-xp-earned">{earned}</span>
          <span className="phase-chip-xp-sep">/</span>
          <span className="phase-chip-xp-cap">{totalAvail}</span>
          <span className="phase-chip-xp-suffix"> XP</span>
        </span>
      ) : (
        <span className="phase-chip phase-chip--xp-hero">
          <span className="phase-chip-xp-earned">{earned}</span>
          <span className="phase-chip-xp-sep">/</span>
          <span className="phase-chip-xp-cap">{totalAvail}</span>
          <span className="phase-chip-xp-suffix"> XP</span>
        </span>
      )}
    </div>
  );

  return (
    <>
      <RewardCelebrationModal
        open={Boolean(missionCelebrate)}
        onClose={() => setMissionCelebrate(null)}
        variant={missionCelebrate?.variant || "x_mission"}
        xp={missionCelebrate?.xp ?? 0}
        breakdown={missionCelebrate?.breakdown}
        credits={missionCelebrate?.credits}
      />
      <SectionCard
        title="Daily X Mission"
        subtitleFullWidth
        subtitle={`Earn up to ${totalAvail} XP · UTC day ${xMission.today || "today"}. Post on X, then tap "Task Completed" — XP is auto-credited after the cooldown.`}
        sticker={sticker.bottle}
        accent="blue"
        right={headRight}
      >
      {/* ── Prominent cooldown banner ── */}
      {!allDone && pendingTasks.length > 0 && maxUnlocksAt ? (
        <div className="x-cooldown-hero x-cooldown-hero--pending" role="status">
          <div className="x-cooldown-hero-icon"><FaClock aria-hidden /></div>
          <div className="x-cooldown-hero-copy">
            <span className="x-cooldown-hero-time">{formatCooldown(autoRedeemSecsLeft)}</span>
            <span className="x-cooldown-hero-label">until +{pendingXp} XP unlocks</span>
          </div>
          <p className="x-cooldown-hero-explain">
            We found a valid post! Keep this tab open or come back later. 
            Once the timer ends, your <strong>{pendingXp} XP</strong> will auto-credit.
          </p>
        </div>
      ) : !allDone && delayMin > 0 ? (
        <div className="x-cooldown-hero" role="status">
          <div className="x-cooldown-hero-icon"><FaClock aria-hidden /></div>
          <div className="x-cooldown-hero-copy">
            <span className="x-cooldown-hero-time">{delayMin} min</span>
            <span className="x-cooldown-hero-label">auto-credit cooldown</span>
          </div>
          <p className="x-cooldown-hero-explain">
            After you post on X, your XP is <strong>automatically credited</strong> once the {delayMin}-minute cooldown passes.
            No need to keep checking — we'll verify your post and notify you.
            {minLikes24h ? ` Posts older than 24h need ${minLikes24h}+ likes.` : ""}
          </p>
        </div>
      ) : null}
      {allDone ? (
        <div className="x-cooldown-hero x-cooldown-hero--done" role="status">
          <div className="x-cooldown-hero-icon x-cooldown-hero-icon--done"><FaCheckCircle aria-hidden /></div>
          <div className="x-cooldown-hero-copy">
            <span className="x-cooldown-hero-time">All done!</span>
            <span className="x-cooldown-hero-label">every task credited for today</span>
          </div>
          <p className="x-cooldown-hero-explain">
            You've earned <strong>{earned} / {totalAvail} XP</strong> from today's X mission. Come back tomorrow for another round!
          </p>
        </div>
      ) : null}

      {rulesOpen ? (
        <div className="x-mission-explainer" id="x-mission-rules-explainer" role="region" aria-label="Mission rules">
          <p className="x-mission-explainer-lead">
            We read recent posts via metadata (text, timestamps, attachments). Posts must be from your <strong>linked</strong>{" "}
            X handle after you authenticate.
          </p>
          <ul className="x-mission-explainer-list">
            <li>
              <strong>Required</strong> rows must each match some qualifying UTC-today tweet. They do <em>not</em> need to live on one post unless you&apos;re stacking optional bonuses.
            </li>
            <li>
              <strong>Optional</strong> rows only grant XP when they match a post <em>that also satisfies every required row on that same tweet</em>.
            </li>
            <li>If the mission defines a cooldown, posts younger than that window are skipped until they age in.</li>
          </ul>
          <div className="x-mission-explainer-rows" aria-hidden="false">
            {missionTasks.length ? (
              missionTasks.map((task) => (
                <div
                  key={task.id}
                  className={`x-mission-explainer-row ${task.required ? "is-required" : "is-optional"}`}
                >
                  <span className={`x-mission-badge ${task.required ? "req" : "opt"}`}>
                    {task.required ? "REQUIRED" : "OPTIONAL"}
                  </span>
                  <strong>{task.label}</strong>
                  <span className="x-mission-explainer-xp">+{task.xp} XP</span>
                </div>
              ))
            ) : (
              <p>No task rows configured for this preset in bootstrap.</p>
            )}
          </div>
          <button type="button" className="x-mission-explainer-dismiss" onClick={() => setRulesOpen(false)}>
            CLOSE
          </button>
        </div>
      ) : null}

      <LastRewardHighlight prefix="Last verify payout (this mission)" record={lastMissionWin} />

      <div className="x-task-grid">
        <div className="x-task-rules">
          {(() => {
            const isMemeAttach = (t) => t.kind === "meme_image" || t.id === "meme_image";
            const hasMemeImage = missionTasks.some(isMemeAttach);
            const mentionIdx = missionTasks.findIndex((t) => t.kind === "mention" || t.id === "mention");
            const rows = [];
            let promoInserted = false;
            missionTasks.forEach((task, index) => {
              if (!promoInserted && hasMemeImage && isMemeAttach(task)) {
                rows.push(<XMissionMemeMakerLink key="x-mission-meme-maker" />);
                promoInserted = true;
              }
              rows.push(
                <div className={`x-rule${task.creditedToday ? " x-rule--done" : ""}`} key={task.id}>
                  <span className="x-rule-icon">{taskIcon(task.kind)}</span>
                  <span>
                    <strong>{task.label}</strong>
                    <span className="x-rule-xp-note">
                      {" "}
                      <span className="x-rule-xp-value">+{task.xp} XP</span>
                      {" · "}
                      {task.required ? "required" : "optional"}
                      {task.creditedToday ? " · credited" : ""}
                    </span>
                  </span>
                </div>,
              );
              if (!promoInserted && !hasMemeImage && index === mentionIdx) {
                rows.push(<XMissionMemeMakerLink key="x-mission-meme-maker" />);
                promoInserted = true;
              }
            });
            if (!promoInserted && missionTasks.length > 0) {
              rows.unshift(<XMissionMemeMakerLink key="x-mission-meme-maker" />);
            }
            return rows;
          })()}
        </div>
        <div className="x-task-cta">
          <div className="x-task-cta-howto">
            <strong className="x-task-cta-howto-title">How it works</strong>
            <ol className="x-task-cta-steps">
              <li><strong>Post on X</strong> — include the required items from the checklist.</li>
              <li><strong>Tap "Task Completed"</strong> — we check which tasks your post satisfies.</li>
              <li><strong>XP auto-credits after {delayMin || 30} min</strong> — no need to re-check. We'll notify you when it's done.</li>
            </ol>
            <p className="x-task-cta-note">
              Incomplete? No worries — post again to cover remaining tasks. Only uncredited rows are checked.
            </p>
          </div>
          <div className="x-task-cta-actions">
            <a
              className="launch-btn cta inline x-task-cta-composer"
              href={`https://twitter.com/intent/tweet?text=${text}`}
              target="_blank"
              rel="noreferrer"
            >
             POST MEME ON X (Twitter) <FaArrowRight />
            </a>
            <div className="x-mission-toolbar">
              <button
                type="button"
                className={`launch-btn ${allDone ? "ghost" : "cta"} small x-mission-verify-btn`}
                disabled={verifying || !walletAddress || cooldownSecsLeft > 0}
                onClick={() => void handleVerify()}
              >
                {allDone
                  ? <><FaSyncAlt className={verifying ? "spin-icon-busy" : ""} /> REFRESH STATUS</>
                  : verifying
                    ? <><FaSyncAlt className="spin-icon-busy" /> CHECKING…</>
                    : cooldownSecsLeft > 0
                      ? <><FaClock /> WAIT {formatCooldown(cooldownSecsLeft)}</>
                      : <><FaCheckCircle /> TASK COMPLETED</>}
              </button>
              {!walletAddress ? (
                <span className="link-handle x-mission-verify-hint">Connect your wallet to submit.</span>
              ) : cooldownSecsLeft > 0 ? (
                <span className="link-handle x-mission-verify-hint">
                  Cooldown active — {formatCooldown(cooldownSecsLeft)} left.
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {verifyPanel?.kind === "error" ? (
        <div className="x-verify-feedback x-verify-feedback--error" role="alert">
          <div className="x-verify-feedback-head">
            <strong>Could not check your post yet</strong>
            {verifyPanel.status ? <span className="x-verify-feedback-code">HTTP {verifyPanel.status}</span> : null}
          </div>
          <p className="x-verify-feedback-body">{verifyPanel.detail}</p>
          <p className="x-verify-feedback-hint">Fix the issue, then tap "Task Completed" again. XP will auto-credit once your post passes all checks.</p>
        </div>
      ) : null}

      {verifyPanel?.kind === "result" && verifyPanel.verification ? (
        <div className="x-verify-feedback x-verify-feedback--result" aria-live="polite">
          <div className="x-verify-feedback-head">
            <strong>Task check results</strong>
            <span className="x-verify-feedback-meta">
              UTC {verifyPanel.verification.todayUtc}&nbsp;&middot;&nbsp;posts scanned {verifyPanel.verification.tweetsFetched}
              {" · "}UTC-today posts {verifyPanel.verification.postsTodayUtc}&nbsp;&middot;&nbsp;
              qualify after timers {verifyPanel.verification.postsEligibleAfterGuards}
            </span>
          </div>
          {verifyPanel.verification.skippedTweetFetch ? (
            <p className="x-verify-feedback-note">Tweet fetch skipped — missions already credited for today.</p>
          ) : null}
          {(verifyPanel.verification.globalHints || []).filter(Boolean).length ? (
            <ul className="x-verify-global-hints">
              {verifyPanel.verification.globalHints.map((hint, hi) =>
                hint ? (
                  <li key={hi}>
                    <FaInfoCircle className="x-verify-global-hints-icon" aria-hidden /> {hint}
                  </li>
                ) : null,
              )}
            </ul>
          ) : null}
          <div className="x-verify-task-list">
            {verifyPanel.verification.tasks.map((row) => {
              const { Icon, label, rowClass } = outcomeRowMeta(row.outcome);
              return (
                <div className={`x-verify-task-row ${rowClass}`} key={row.taskId}>
                  <span className="x-verify-task-ic">
                    <Icon aria-hidden />
                  </span>
                  <div className="x-verify-task-copy">
                    <strong>{row.label}</strong>
                    <span className="x-verify-task-id">
                      {row.required ? "(required)" : "(optional)"} · +{row.xp} XP &middot;{" "}
                      <span className="x-verify-outcome-chip">{label}</span>
                    </span>
                    {row.detail ? <p className="x-verify-task-detail">{row.detail}</p> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </SectionCard>
    </>
  );
}

function formatHoldRemain(isoStarted, secTotal) {
  if (!isoStarted || !secTotal) return null;
  const started = Date.parse(isoStarted);
  if (!Number.isFinite(started)) return null;
  const end = started + Number(secTotal) * 1000;
  const left = Math.max(0, end - Date.now());
  if (left <= 0) return null;
  const d = Math.floor(left / 86400000);
  const h = Math.floor((left % 86400000) / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

function CampaignCard({ campaign, eligible, walletAddress, verifyingId, onVerify }) {
  const icon = campaignIcon[campaign.iconKey] || sticker.logo3D;
  const vp = campaign.viewerProgress || {};
  const mode =
    vp.verificationMode ??
    campaign.verificationMode ??
    (campaign.schemaVersion === 2 ? campaign.verificationMode : "none") ??
    "none";
  const verifiableBackend = vp.verifiable === true;
  const completed = vp.completed === true;
  const primary = String(campaign.ctaLabel || campaign.cta || "OPEN").trim();
  const actionUrl = typeof campaign.actionUrl === "string" ? campaign.actionUrl.trim() : "";
  const canTryVerify = eligible && verifiableBackend && !completed && Boolean(walletAddress);
  const verifying = verifyingId === campaign.id;
  let holdHint = null;
  if (
    mode === "held_window" &&
    vp.holdStartedAt &&
    !completed &&
    !vp.elapsedMinHold &&
    vp.minHoldSeconds
  ) {
    holdHint = formatHoldRemain(vp.holdStartedAt, vp.minHoldSeconds);
  }

  return (
    <article className={`campaign-card color-${campaign.color || "yellow"}`}>
      <div className="campaign-card-top">
        <img src={icon} alt="" />
        <span className="sticker-pill">{campaign.status}</span>
      </div>
      <h4>{campaign.title}</h4>
      {campaign.subtitle ? <p className="campaign-card-sub">{campaign.subtitle}</p> : null}
      <p>{campaign.rewardText}</p>

      {verifiableBackend && !eligible ? (
        <p className="campaign-card-gate-note">Unlock Launch Hub eligibility to run on-chain verification.</p>
      ) : null}

      {holdHint ? <p className="campaign-card-hold">Hold: ~{holdHint}</p> : null}

      <div className="campaign-card-meta">
        {verifiableBackend && !completed ? (
          <span className="campaign-xp-pill">+{(vp.xpReward ?? campaign.xpReward ?? 0).toLocaleString()} XP</span>
        ) : null}
        {completed ? (
          <span className="campaign-done-pill">
            <FaCheckCircle /> Done
          </span>
        ) : null}
      </div>

      <div className="campaign-card-actions">
        {actionUrl ? (
          <a
            className="launch-btn ghost small"
            href={actionUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {primary || "OPEN"} <FaExternalLinkAlt />
          </a>
        ) : null}
        {!actionUrl ? (
          <span className="launch-btn cta small campaign-card-static-cta">
            {primary} <FaArrowRight />
          </span>
        ) : null}
        {canTryVerify ? (
          <button
            type="button"
            className={`launch-btn cta small${verifying ? " is-busy" : ""}`}
            disabled={verifying}
            onClick={() => onVerify(campaign.id)}
          >
            {verifying ? "CHECKING…" : "VERIFY / REFRESH"}
            {" "}
            <FaSyncAlt className={verifying ? "spin-icon-busy" : ""} />
          </button>
        ) : null}
      </div>
    </article>
  );
}

function CampaignListBlock({ data, walletAddress, onRefresh }) {
  const campaigns = Array.isArray(data?.campaigns) ? data.campaigns : [];
  const eligible = data?.eligibility?.eligible === true;
  const [verifyingId, setVerifyingId] = useState(null);

  const handleVerify = async (campaignId) => {
    if (!walletAddress) {
      toast.error("Connect your EVM wallet and sign in (SIWE) first.");
      return;
    }
    if (!eligible) {
      toast.error("Complete Launch Hub eligibility to verify campaigns.");
      return;
    }
    setVerifyingId(campaignId);
    try {
      const res = await campaignApi.verifyOnchainCampaign(campaignId, walletAddress);
      if (res.ok) {
        if (res.already) {
          toast.success("Already credited for this campaign.");
        } else {
          toast.success("Verified — XP updated.");
        }
        await onRefresh?.();
        return;
      }
      const code = res.code;
      if (code === "hold_started") {
        toast.success(
          res.holdStartedAt
            ? `Hold timer started. First eligible check: ${new Date(res.holdStartedAt).toLocaleString()}`
            : "Hold timer started — come back after the minimum hold.",
        );
        await onRefresh?.();
        return;
      }
      if (code === "hold_pending") {
        toast("Minimum hold period not reached yet — try again later.", { icon: "⏳" });
        await onRefresh?.();
        return;
      }
      toast.error(res.message || "Could not verify.");
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <SectionCard
      title="Live Campaigns"
      subtitle="Independent. Concurrent. Configured by the Rekt admin."
      sticker={sticker.controller}
      accent="yellow"
      id="campaigns"
    >
      <div className="campaign-grid">
        {campaigns.map((campaign) => (
          <CampaignCard
            campaign={campaign}
            key={campaign.id}
            eligible={eligible}
            walletAddress={walletAddress}
            verifyingId={verifyingId}
            onVerify={handleVerify}
          />
        ))}
      </div>
    </SectionCard>
  );
}

function rankAccent(rank) {
  if (rank === 1) return "gold";
  if (rank === 2) return "silver";
  if (rank === 3) return "bronze";
  return "default";
}

function LeaderboardConnections({ connections }) {
  const c = connections || {};
  const labels = [];
  if (c.x) labels.push("X");
  if (c.discord) labels.push("Discord");
  if (c.telegram) labels.push("Telegram");
  if (c.solana) labels.push("Solana");
  if (!labels.length) return null;
  return (
    <div className="leaderboard-conn-pills">
      {labels.map((label) => (
        <span key={label} className="leaderboard-conn-pill">
          {label}
        </span>
      ))}
    </div>
  );
}

function LeaderboardBlock({ data }) {
  const rows = Array.isArray(data?.leaderboard) ? data.leaderboard : [];
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    if (!detail) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setDetail(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detail]);

  const copyAddr = async (addr) => {
    if (!addr) return;
    try {
      await navigator.clipboard.writeText(addr);
      toast.success("Address copied.");
    } catch {
      toast.error("Could not copy.");
    }
  };

  const rowKey = (entry, idx) =>
    entry.address ? `${entry.rank}-${entry.address}` : `rank-${entry.rank}-${idx}`;

  const openDetail = (entry) => {
    if (!entry?.address) return;
    setDetail(entry);
  };

  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <SectionCard
      title="Season Leaderboard"
      subtitle="Top degens of the season. Tap a row for wallet, links, and connections."
      sticker={sticker.logo3D}
      accent="purple"
      right={<FaTrophy className="trophy-icon" />}
    >
      <div className="podium">
        {top3.map((entry, idx) => (
          <button
            type="button"
            className={`podium-slot rank-${entry.rank} leaderboard-row-interactive`}
            key={rowKey(entry, idx)}
            onClick={() => openDetail(entry)}
          >
            <FaMedal className={`podium-medal rank-${rankAccent(entry.rank)}`} />
            <strong>{entry.handle}</strong>
            <span>{Number(entry.points || 0).toLocaleString()} XP</span>
            <em>#{entry.rank}</em>
            {entry.address ? (
              <span className="podium-address-hint">{shortAddr(entry.address)}</span>
            ) : null}
            <LeaderboardConnections connections={entry.connections} />
          </button>
        ))}
      </div>
      {rest.length > 0 ? (
        <div className="leaderboard-wrap">
          {rest.map((entry, idx) => (
            <button
              type="button"
              className="leader-row leaderboard-row-interactive"
              key={rowKey(entry, idx)}
              onClick={() => openDetail(entry)}
            >
              <span>#{entry.rank}</span>
              <span className="leader-row-main">
                <span className="leader-row-handle">{entry.handle}</span>
                {entry.address ? (
                  <span className="leader-row-sub">{shortAddr(entry.address)}</span>
                ) : null}
                <LeaderboardConnections connections={entry.connections} />
              </span>
              <strong>{Number(entry.points || 0).toLocaleString()} XP</strong>
            </button>
          ))}
        </div>
      ) : null}

      {detail ? (
        <div className="leaderboard-modal-overlay" role="presentation" onClick={() => setDetail(null)}>
          <div
            className="leaderboard-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="leaderboard-detail-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="leaderboard-modal-close"
              aria-label="Close"
              onClick={() => setDetail(null)}
            >
              ×
            </button>
            <h4 id="leaderboard-detail-title">{detail.handle}</h4>
            <p className="leaderboard-modal-xp">
              {Number(detail.points || 0).toLocaleString()} season XP · #{detail.rank}
            </p>
            <LeaderboardConnections connections={detail.connections} />
            <div className="leaderboard-modal-addr-row">
              <code title={detail.address}>{detail.address}</code>
              <button type="button" className="launch-btn ghost small" onClick={() => copyAddr(detail.address)}>
                <FaRegCopy /> Copy
              </button>
              <a
                className="launch-btn ghost small"
                href={`https://basescan.org/address/${detail.address}`}
                target="_blank"
                rel="noreferrer"
              >
                BaseScan <FaExternalLinkAlt />
              </a>
            </div>
            {detail.baseBalanceEligible ? (
              <p className="leaderboard-modal-meta">
                <FaCheckCircle style={{ marginRight: 6, verticalAlign: "middle" }} />
                Base balance gate passed
              </p>
            ) : (
              <p className="leaderboard-modal-meta subtle">Base balance gate not shown as eligible</p>
            )}
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
}

function shortAddr(a) {
  if (!a || typeof a !== "string" || !a.startsWith("0x")) return a || "—";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function InviteCodeBlock({ data, walletAddress, siweAuthenticated = false, onRefresh }) {
  const pack = data?.invite || {};
  const xr = data?.xpRewards;
  const inviterXp = xr?.inviteXpInviter ?? 200;
  const inviteeXp = xr?.inviteXpInvitee ?? 75;
  const batch = pack.batch;
  const activation = pack.activation;
  const canRotate = !!pack.canRotate;

  const primaryCode = useMemo(() => {
    const open = batch?.codes?.find((c) => c.status === "open");
    return open?.code || batch?.codes?.[0]?.code || null;
  }, [batch]);

  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [ledger, setLedger] = useState(null);

  useEffect(() => {
    if (!walletAddress) {
      setLedger(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await campaignApi.getInviteHistory(walletAddress);
      if (!cancelled && res.ok) setLedger(res.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [walletAddress, batch?.batchId, activation?.code]);

  const copyCode = async (code) => {
    const c = code || primaryCode;
    if (!c) {
      toast.error("No invite code loaded — refresh or sign in with this wallet.");
      return;
    }
    try {
      await navigator.clipboard.writeText(c);
      setCopied(true);
      toast.success("Invite code copied.");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Could not copy — try selecting the code manually.");
    }
  };

  const shareUrl = primaryCode
    ? `${window.location.origin}/launch?code=${encodeURIComponent(primaryCode)}`
    : `${window.location.origin}/launch`;
  const shareText = encodeURIComponent(
    primaryCode
      ? `degens — get rekt with me on Rekt CEO Launch Hub. use code ${primaryCode}\n${shareUrl}`
      : `degens — get rekt on Rekt CEO Launch Hub.\n${shareUrl}`,
  );

  const onRotate = async () => {
    if (!walletAddress || !onRefresh) return;
    setRotating(true);
    try {
      const res = await campaignApi.rotateInviteBatch(walletAddress);
      if (!res.ok) {
        toast.error(res.message || "Could not mint new codes.");
        return;
      }
      toast.success("New invite batch minted — three fresh codes ready.");
      await onRefresh();
    } finally {
      setRotating(false);
    }
  };

  return (
    <SectionCard
      title="Invite Codes"
      subtitle={`Each live code can onboard one wallet. They get +${inviteeXp} XP on unlock; you earn +${inviterXp} XP per qualifying redemption.`}
      sticker={sticker.hodlBubble}
      accent="green"
    >
      {activation ? (
        <div className="invite-activation-card">
          <h4 className="invite-activation-title">Your access</h4>
          <p className="invite-activation-line">
            <span>Activated with</span> <code>{activation.code}</code>
          </p>
          <p className="invite-activation-line">
            <span>XP from unlock</span> <strong>+{activation.xpInvitee}</strong>
          </p>
          {activation.bootstrap ? (
            <p className="invite-activation-meta">Team / bootstrap code</p>
          ) : activation.adminMint ? (
            <p className="invite-activation-meta">Operator on-demand code</p>
          ) : activation.inviterAddress ? (
            <p className="invite-activation-meta">
              Invited by <code>{shortAddr(activation.inviterAddress)}</code>
            </p>
          ) : null}
          <p className="invite-activation-meta subtle">
            {activation.activatedAt
              ? new Date(activation.activatedAt).toLocaleString()
              : null}
          </p>
        </div>
      ) : null}

      {!batch ? (
        !walletAddress ? (
          <p className="invite-no-batch-hint">
            Connect the wallet shown in the hub header — then complete the one-time signature so we can load
            your personal invite codes.
          </p>
        ) : !siweAuthenticated ? (
          <p className="invite-no-batch-hint">
            Complete the <strong>Sign in with Ethereum</strong> request in your wallet (SIWE). The campaigns
            API requires the same session token as campaigns and daily actions before it can show your codes.
          </p>
        ) : (
          <p className="invite-no-batch-hint">
            Your wallet is connected and signed in, but invite codes did not load. Ensure{" "}
            <code className="invite-inline-code">JWT_SECRET</code> matches between the main backend (
            <code className="invite-inline-code">REACT_APP_BACKEND_API_URL</code>) and the campaigns API (
            <code className="invite-inline-code">REACT_APP_CAMPAIGN_API_URL</code>), and that Redis is available
            — then refresh the page.
          </p>
        )
      ) : (
        <ul className="invite-batch-list">
          {batch.codes.map((slot) => (
            <li key={slot.code} className={`invite-slot invite-slot--${slot.status}`}>
              <code>{slot.code}</code>
              <span className="invite-slot-status">
                {slot.status === "open" ? "Open" : "Redeemed"}
              </span>
              {slot.redeemedBy ? (
                <span className="invite-slot-by">by {shortAddr(slot.redeemedBy)}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <div className="invite-wrap invite-wrap--actions">
        <button
          className="launch-btn ghost small"
          type="button"
          onClick={() => copyCode()}
          disabled={!primaryCode}
        >
          <FaRegCopy /> {copied ? "COPIED" : "COPY PRIMARY"}
        </button>
        <a
          className="launch-btn cta small inline"
          href={`https://twitter.com/intent/tweet?text=${shareText}`}
          target="_blank"
          rel="noreferrer"
        >
          <FaTwitter /> SHARE ON X
        </a>
        {canRotate ? (
          <button
            type="button"
            className="launch-btn ghost small"
            onClick={() => onRotate()}
            disabled={rotating}
          >
            {rotating ? "MINTING…" : "NEW BATCH (3/3 USED)"}
          </button>
        ) : null}
      </div>

      {ledger != null ? (
        <div className="invite-ledger-card">
          <h4 className="invite-ledger-title">Your invite flywheel (history)</h4>
          {ledger.ledgerEnabled === false ? (
            <p className="invite-ledger-hint">
              Full history is stored when the API uses Postgres — Redis-only dev mode may show empty
              tables until you run migrations.
            </p>
          ) : null}
          {ledger.ledgerEnabled &&
          !ledger.issued?.length &&
          !ledger.joiners?.length &&
          !ledger.rotations?.length ? (
            <p className="invite-ledger-meta">No ledger rows yet — share a code to start the chain.</p>
          ) : null}
          {ledger.issued?.length > 0 ? (
            <>
              <p className="invite-ledger-sub">Codes ever issued to your wallet (never deleted)</p>
              <ul className="invite-ledger-list">
                {ledger.issued.slice(0, 25).map((row) => (
                  <li key={row.id}>
                    <code>{row.code}</code>
                    <span className="invite-ledger-meta">
                      {row.source}
                      {row.batchId ? ` · batch ${row.batchId.slice(0, 8)}…` : ""}
                      {row.createdAt ? ` · ${new Date(row.createdAt).toLocaleDateString()}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {ledger.joiners?.length > 0 ? (
            <>
              <p className="invite-ledger-sub">Wallets that joined via your codes</p>
              <ul className="invite-ledger-list">
                {ledger.joiners.slice(0, 25).map((row) => (
                  <li key={row.id}>
                    <code>{shortAddr(row.inviteeWallet)}</code>
                    <span className="invite-ledger-meta">
                      {row.code}
                      {row.wasBootstrap ? " · bootstrap" : ""}
                      {row.wasAdminMint ? " · admin" : ""}
                      {row.redeemedAt
                        ? ` · ${new Date(row.redeemedAt).toLocaleString()}`
                        : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {ledger.rotations?.length > 0 ? (
            <>
              <p className="invite-ledger-sub">Batch rotations (old codes stay in history)</p>
              <ul className="invite-ledger-list">
                {ledger.rotations.slice(0, 10).map((row) => (
                  <li key={row.id}>
                    <span className="invite-ledger-meta">
                      {row.previousBatchId.slice(0, 8)}… → {row.newBatchId.slice(0, 8)}…
                      {row.rotatedAt ? ` · ${new Date(row.rotatedAt).toLocaleString()}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}
    </SectionCard>
  );
}

function ConnectGuideBlock() {
  const cards = [
    {
      icon: <FaTwitter />,
      title: "X (TWITTER)",
      copy: "Bind your @handle. We verify daily posts via twitterapi.io and run organic checks.",
      help: providerMeta.x.helpUrl,
    },
    {
      icon: <FaDiscord />,
      title: "DISCORD",
      copy: "Join the Rekt CEO Discord and link your Discord ID. Bot verifies role + activity.",
      help: providerMeta.discord.helpUrl,
    },
    {
      icon: <FaTelegramPlane />,
      title: "TELEGRAM",
      copy: "Link via Telegram Login Widget. Bot verifies group join + GM streak.",
      help: providerMeta.telegram.helpUrl,
    },
    {
      icon: <FaGift />,
      title: "PUMP.FUN / SOLANA",
      copy: "Link your Solana wallet to qualify for pump.fun campaigns and bridges.",
      help: providerMeta.solana.helpUrl,
    },
  ];

  return (
    <SectionCard
      title="Connect & Verify Guide"
      subtitle="One link card per provider. Manual flow now, OAuth + bot adapters dropping next."
      sticker={sticker.degenActivated}
      accent="blue"
    >
      <div className="connect-guide-grid">
        {cards.map((card) => (
          <article className="connect-guide-card" key={card.title}>
            <div className="cg-icon">{card.icon}</div>
            <h4>{card.title}</h4>
            <p>{card.copy}</p>
            <a className="launch-btn ghost small" href={card.help} target="_blank" rel="noreferrer">
              OPEN DOCS <FaArrowRight />
            </a>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}

/** Manual gap filler: image + dimensions from Launch Hub layout (admin). */
function GapCreativeBlock({
  enabled = true,
  src = "",
  alt = "",
  minHeightPx = 280,
  maxHeightPx = 0,
  objectFit = "cover",
  href = "",
}) {
  if (enabled === false) return null;
  const mh = Math.min(2000, Math.max(48, Number(minHeightPx) || 280));
  const mx =
    maxHeightPx != null && Number(maxHeightPx) > 0
      ? Math.min(2400, Math.max(mh, Number(maxHeightPx)))
      : null;
  const fit = objectFit === "contain" ? "contain" : "cover";

  const img =
    src && typeof src === "string" && src.trim() ? (
      <img
        src={src.trim()}
        alt={alt || "Launch creative"}
        className={`launch-gap-creative-img launch-gap-creative-img--${fit}`}
        style={{
          width: "100%",
          minHeight: mh,
          ...(mx ? { maxHeight: mx } : {}),
          objectFit: fit,
        }}
      />
    ) : (
      <div className="launch-gap-creative-placeholder" style={{ minHeight: mh }}>
        Creative slot — set image URL and height in Campaigns → Launch Hub Layout (admin).
      </div>
    );

  const frame = (
    <div className="launch-gap-creative-frame" style={{ minHeight: mh, ...(mx ? { maxHeight: mx } : {}) }}>
      {img}
    </div>
  );

  const link = typeof href === "string" && href.trim();
  return link ? (
    <a href={href.trim()} target="_blank" rel="noopener noreferrer" className="launch-gap-creative-link">
      {frame}
    </a>
  ) : (
    frame
  );
}

const blockMap = {
  SeasonStripBlock,
  EligibilityBannerBlock,
  IdentityChecklistBlock,
  XPSummaryBlock,
  DailyCheckinBlock,
  DailySpinBlock,
  XShareTaskBlock,
  CampaignListBlock,
  LeaderboardBlock,
  ConnectGuideBlock,
  InviteCodeBlock,
  GapCreativeBlock,
};

function blockSpansFullWidth(block) {
  return Number(block?.colSpan) === 2;
}

function inviteSpansFullWidth(layout) {
  const v = layout?.inviteColSpan;
  /* Only explicit 1 is narrow; missing key (legacy) defaults to full width. */
  return Number(v) !== 1;
}

/** Legacy layouts omit InviteCodeBlock from `blocks`; prepend once campaigns unlock (matches old pinned-first strip). */
function buildHubDisplayBlocks(layout, showInvite) {
  const blocks = Array.isArray(layout?.blocks) ? layout.blocks : [];
  if (blocks.some((b) => b.type === "InviteCodeBlock")) {
    return blocks;
  }
  if (!showInvite) return blocks;
  const colSpan = layout?.inviteColSpan === 1 ? 1 : 2;
  return [{ type: "InviteCodeBlock", props: {}, colSpan }, ...blocks];
}

function hubSlotSpansFullWidth(block, layout) {
  if (block?.type === "InviteCodeBlock") {
    if (block.colSpan === 2) return true;
    if (block.colSpan === 1) return false;
    return inviteSpansFullWidth(layout);
  }
  return blockSpansFullWidth(block);
}

const stackListVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
};

/* Opacity-only enter: avoids translateY fighting JS masonry `top` on desktop. */
const stackItemVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] },
  },
};

const stackItemReduced = {
  hidden: { opacity: 1 },
  show: { opacity: 1 },
};

const HUB_MASONRY_MIN_PX = 900;
const HUB_MASONRY_GAP = 16;
const HUB_MASONRY_STAGGER_REMEASURE_MS = 480;

function measureSlotHeight(slot) {
  const r = slot.getBoundingClientRect();
  return Math.max(Math.round(r.height), slot.offsetHeight, slot.scrollHeight);
}

function clearSlotInlineLayout(root) {
  if (!root) return;
  root.classList.remove("launch-block-stack-masonry-active");
  root.style.height = "";
  root.style.minHeight = "";
  root.querySelectorAll(":scope > .launch-stack-slot").forEach((slot) => {
    slot.style.position = "";
    slot.style.left = "";
    slot.style.top = "";
    slot.style.width = "";
    slot.style.right = "";
    slot.style.zIndex = "";
  });
}

/**
 * Packs slots into two columns by shortest-column stacking (masonry-style),
 * so uneven card heights don't leave dead space beside shorter siblings.
 */
function useLaunchHubMasonry(containerRef, layout, data, showInvite, walletAddress) {
  const runLayout = useCallback(() => {
    const root = containerRef.current;
    if (!root || typeof window === "undefined") return;

    const wide = window.matchMedia(`(min-width: ${HUB_MASONRY_MIN_PX}px)`).matches;
    const slots = [...root.querySelectorAll(":scope > .launch-stack-slot")];
    const gap = HUB_MASONRY_GAP;

    if (!wide || slots.length === 0) {
      clearSlotInlineLayout(root);
      return;
    }

    const width = root.clientWidth;
    if (width < 1) return;

    const colW = (width - gap) / 2;

    root.classList.add("launch-block-stack-masonry-active");

    const placeAll = () => {
      let colH = [0, 0];
      slots.forEach((slot, i) => {
        slot.style.zIndex = String(10 + i);
        const isWide = slot.classList.contains("launch-stack-slot-wide");
        if (isWide) {
          const y = Math.max(colH[0], colH[1]);
          slot.style.position = "absolute";
          slot.style.left = "0px";
          slot.style.top = `${y}px`;
          slot.style.width = `${width}px`;
          slot.style.right = "auto";
          const h = measureSlotHeight(slot);
          const bottom = y + h;
          colH[0] = colH[1] = bottom + gap;
        } else {
          const col = colH[0] <= colH[1] ? 0 : 1;
          const y = colH[col];
          slot.style.position = "absolute";
          slot.style.left = `${col * (colW + gap)}px`;
          slot.style.top = `${y}px`;
          slot.style.width = `${colW}px`;
          slot.style.right = "auto";
          const h = measureSlotHeight(slot);
          const bottom = y + h;
          colH[col] = bottom + gap;
        }
      });
      const bottom = Math.max(colH[0], colH[1]);
      const innerH = Math.max(0, bottom - gap);
      root.style.height = `${innerH}px`;
    };

    /* First pass establishes widths; second pass re-reads heights (invite/cards often
       measure short on the first paint while Framer opacity stagger finishes). */
    placeAll();
    placeAll();
  }, [containerRef]);

  useLayoutEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        runLayout();
        requestAnimationFrame(() => {
          runLayout();
        });
      });
    };

    schedule();
    const staggerTimer = window.setTimeout(schedule, HUB_MASONRY_STAGGER_REMEASURE_MS);

    const ro = new ResizeObserver(schedule);
    ro.observe(root);
    root.querySelectorAll(":scope > .launch-stack-slot").forEach((el) => ro.observe(el));

    const mq = window.matchMedia(`(min-width: ${HUB_MASONRY_MIN_PX}px)`);
    mq.addEventListener("change", schedule);

    return () => {
      window.clearTimeout(staggerTimer);
      mq.removeEventListener("change", schedule);
      ro.disconnect();
      cancelAnimationFrame(raf);
      clearSlotInlineLayout(root);
    };
  }, [runLayout, layout, data, showInvite, walletAddress, containerRef]);
}

export default function LaunchBlockRenderer({
  layout,
  data,
  onRefresh,
  walletAddress,
  siweAuthenticated = false,
  showInvite = true,
}) {
  const reduceMotion = useReducedMotion();
  const itemMotion = reduceMotion ? stackItemReduced : stackItemVariants;
  const listMotion = reduceMotion ? { hidden: {}, show: {} } : stackListVariants;
  const stackRef = useRef(null);

  const displayBlocks = useMemo(() => buildHubDisplayBlocks(layout, showInvite), [layout, showInvite]);

  useLaunchHubMasonry(stackRef, layout, data, showInvite, walletAddress);

  return (
    <motion.div
      ref={stackRef}
      className="launch-block-stack launch-block-stack-2col"
      variants={listMotion}
      initial="hidden"
      animate="show"
    >
      {displayBlocks.map((block, index) => {
        const Component = blockMap[block.type];
        if (!Component) return null;

        if (block.type === "InviteCodeBlock" && !showInvite) return null;

        if (block.type === "GapCreativeBlock" && block.props?.enabled === false) return null;

        const wide = hubSlotSpansFullWidth(block, layout);
        const inviteSlot = block.type === "InviteCodeBlock";
        return (
          <motion.div
            key={`${block.type}-${index}`}
            className={`launch-stack-slot${inviteSlot ? " launch-stack-slot--invite" : ""}${wide ? " launch-stack-slot-wide" : ""}`}
            variants={itemMotion}
          >
            <Component
              data={data}
              onRefresh={onRefresh}
              walletAddress={walletAddress}
              siweAuthenticated={siweAuthenticated}
              {...(block.props || {})}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}
