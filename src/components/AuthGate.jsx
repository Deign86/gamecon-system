import { useState } from "react";
import { motion } from "framer-motion";
import { LogIn, AlertCircle, Info } from "lucide-react";
import { signIn } from "../hooks/useAuth";
import GCLogo from "./GCLogo";

export default function AuthGate() {
  const [email, setEmail]   = useState("");
  const [pass, setPass]     = useState("");
  const [error, setError]   = useState("");
  const [busy, setBusy]     = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signIn(email, pass);
    } catch (err) {
      setError(err.message?.replace("Firebase: ", "") || "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center gc-diag-bg gc-noise px-4">
      {/* Decorative diagonal slash */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-1/4 -right-1/4 w-[140%] h-[140%] opacity-[0.03]"
          style={{
            background:
              "linear-gradient(135deg, transparent 45%, #C8102E 45%, #C8102E 47%, transparent 47%)",
          }}
        />
      </div>

      <motion.div
        className="relative w-full max-w-sm"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Logo block */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <GCLogo size={72} />
          </div>
          <h1 className="font-display text-4xl font-bold tracking-wider">
            <span className="text-gc-white">PLAY</span>{" "}
            <span className="text-gc-crimson text-shadow-red">VERSE</span>
          </h1>
          <p className="mt-1 font-display text-lg tracking-widest text-gc-mist">
            IT GAMECON 2026
          </p>
          <p className="mt-0.5 text-xs text-gc-mist/60 font-body tracking-wide">
            INTERNAL OPS DASHBOARD
          </p>
        </div>

        {/* Form card */}
        <div className="gc-card-accent p-6">
          {/* Admin-only account notice */}
          <div className="flex items-center justify-center gap-2.5 rounded-lg border border-gc-steel/30 bg-gc-iron/40 px-3.5 py-3 mb-5">
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
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gc-mist"
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
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gc-mist"
              >
                Password
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                className="gc-input"
                placeholder="••••••••"
                autoComplete="current-password"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-gc-danger/10 border border-gc-danger/20 px-3 py-2 text-xs text-gc-danger">
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
                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <>
                  <LogIn className="h-4 w-4" /> Sign In
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-[10px] uppercase tracking-widest text-gc-mist/40 font-body">
          Pamantasan ng Lungsod ng Valenzuela · CEIT · VITS
        </p>
      </motion.div>
    </div>
  );
}
