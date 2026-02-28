import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { LogIn, AlertCircle, Info, Eye, EyeOff } from "lucide-react";
import { signIn } from "../hooks/useAuth";
import GCLogo from "./GCLogo";

const AUTH_ERROR_MESSAGES = {
  "auth/invalid-credential":    "Incorrect email or password. Please try again.",
  "auth/invalid-email":         "Please enter a valid email address.",
  "auth/user-disabled":         "This account has been disabled. Contact your admin.",
  "auth/user-not-found":        "No account found with this email.",
  "auth/wrong-password":        "Incorrect password. Please try again.",
  "auth/too-many-requests":     "Too many failed attempts. Please wait a moment and try again.",
  "auth/network-request-failed":"Network error. Check your connection and try again.",
  "auth/internal-error":        "An internal error occurred. Please try again later.",
  "auth/missing-password":      "Please enter your password.",
  "auth/missing-email":         "Please enter your email address.",
};

function getFriendlyAuthError(err) {
  const code = err?.code || "";
  if (AUTH_ERROR_MESSAGES[code]) return AUTH_ERROR_MESSAGES[code];
  // Fallback: try to extract code from message
  const match = err?.message?.match(/\(([^)]+)\)/);
  if (match && AUTH_ERROR_MESSAGES[match[1]]) return AUTH_ERROR_MESSAGES[match[1]];
  return "Something went wrong. Please try again.";
}

export default function AuthGate() {
  const [email, setEmail]       = useState("");
  const [pass, setPass]         = useState("");
  const [error, setError]       = useState("");
  const [busy, setBusy]         = useState(false);
  const [showPass, setShowPass] = useState(false);
  const videoRef = useRef(null);
  const [videoReady, setVideoReady] = useState(false);

  /* Ensure the video stays in sync after tab/visibility changes */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const play = () => v.play().catch(() => {});
    const onVisible = () => { if (!document.hidden) play(); };
    document.addEventListener("visibilitychange", onVisible);
    play();
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signIn(email, pass);
    } catch (err) {
      setError(getFriendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gc-void">
      {/* ── Video background layer ── */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        onCanPlayThrough={() => setVideoReady(true)}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
          videoReady ? "opacity-40" : "opacity-0"
        }`}
      >
        <source src="/login-bg.mp4" type="video/mp4" />
        <source src="/login-bg.webm" type="video/webm" />
      </video>

      {/* ── Dark gradient overlay for readability ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(8,8,8,0.55) 0%, rgba(8,8,8,0.85) 70%, rgba(8,8,8,0.95) 100%)",
        }}
      />

      {/* ── Content layer (gc-noise grain sits on top via ::before z-9999) ── */}
      <div className="relative z-[1] flex min-h-screen items-center justify-center gc-noise px-4">
        {/* Corner brackets */}
        <div className="fixed top-4 left-4 w-14 h-14 border-t-2 border-l-2 border-gc-crimson/15 pointer-events-none" />
        <div className="fixed bottom-4 right-4 w-14 h-14 border-b-2 border-r-2 border-gc-crimson/15 pointer-events-none" />
        <div className="fixed top-4 right-4 w-14 h-14 border-t-2 border-r-2 border-gc-steel/10 pointer-events-none" />
        <div className="fixed bottom-4 left-4 w-14 h-14 border-b-2 border-l-2 border-gc-steel/10 pointer-events-none" />

      {/* Grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `
            linear-gradient(rgb(var(--gc-crimson)) 1px, transparent 1px),
            linear-gradient(90deg, rgb(var(--gc-crimson)) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />

      <motion.div
        className="relative w-full max-w-sm"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* System status line */}
        <div className="mb-6 flex items-center justify-center gap-2 text-[10px] font-mono text-gc-hint uppercase tracking-[0.2em]">
          <span className="h-1.5 w-1.5 rounded-full bg-gc-success animate-pulse" />
          SYS.ONLINE — AUTH GATEWAY
        </div>

        {/* Logo block */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex justify-center relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-24 w-24 rounded-full bg-gc-crimson/5 animate-pulse" />
            </div>
            <GCLogo size={72} />
          </div>
          <h1 className="font-display text-4xl font-bold tracking-wider">
            <span className="text-gc-white">PLAY</span>{" "}
            <span className="text-gc-crimson text-shadow-red">VERSE</span>
          </h1>
          <p className="mt-1 font-display text-base tracking-[0.2em] text-gc-mist">
            IT GAMECON 2026
          </p>
          <p className="mt-1 text-[10px] text-gc-hint font-mono tracking-[0.15em]">
            [ INTERNAL OPS DASHBOARD ]
          </p>
        </div>

        {/* Form card */}
        <div className="gc-card-accent p-6 relative">
          {/* Corner accents */}
          <div className="absolute top-2 left-2 w-3 h-3 border-t border-l border-gc-crimson/25 pointer-events-none" />
          <div className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-gc-crimson/25 pointer-events-none" />

          {/* Admin-only account notice */}
          <div className="flex items-center justify-center gap-2.5 rounded border border-gc-steel/50 bg-gc-iron/50 px-3.5 py-3 mb-5">
            <Info className="h-4 w-4 text-gc-mist shrink-0" />
            <p className="text-[11px] text-gc-mist font-body leading-relaxed text-justify">
              Accounts are created by the GameCon admin. If you're a proctor
              or staff member, please request an account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="mb-1.5 block text-[10px] font-display font-semibold uppercase tracking-[0.2em] text-gc-mist"
              >
                Email
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="gc-input"
                placeholder="you@plv.edu.ph"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="mb-1.5 block text-[10px] font-display font-semibold uppercase tracking-[0.2em] text-gc-mist"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type={showPass ? "text" : "password"}
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  className="gc-input pr-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gc-mist hover:text-gc-cloud transition-colors"
                  tabIndex={-1}
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded bg-gc-danger/10 border border-gc-danger/20 px-3 py-2 text-xs text-gc-danger">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="gc-btn-primary w-full disabled:opacity-50"
            >
              {busy ? (
                <span className="h-4 w-4 rounded-sm border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <>
                  <LogIn className="h-4 w-4" /> Access System
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-[10px] uppercase tracking-[0.2em] text-gc-faded font-mono">
          PLV · CEIT · VITS
        </p>
        <p className="mt-1 text-center text-[9px] text-gc-faded/50 font-mono tracking-wider">
          v2.0 — PLAYVERSE OPS
        </p>
      </motion.div>
      </div>
    </div>
  );
}
