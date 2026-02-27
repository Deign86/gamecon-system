import { useState, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Eye,
  EyeOff,
  ShieldCheck,
  RefreshCw,
  X,
  Check,
  CircleDot,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { COMMITTEE_NAMES } from "../../lib/roleConfig";
import { createUserAccount } from "../../lib/adminApi";

/* ── Password policy (mirrors Firebase Auth settings) ── */
const PASSWORD_RULES = [
  { key: "minLen",    label: "At least 6 characters",       test: (pw) => pw.length >= 6 },
  { key: "maxLen",    label: "No more than 4 096 characters", test: (pw) => pw.length <= 4096 },
  { key: "uppercase", label: "Uppercase letter (A-Z)",       test: (pw) => /[A-Z]/.test(pw) },
  { key: "lowercase", label: "Lowercase letter (a-z)",       test: (pw) => /[a-z]/.test(pw) },
  { key: "numeric",   label: "Number (0-9)",                 test: (pw) => /[0-9]/.test(pw) },
  { key: "special",   label: "Special character (!@#$…)",    test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

/* ── Client-side strong password generator ── */
function generateStrongPassword(length = 16) {
  const upper   = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower   = "abcdefghijklmnopqrstuvwxyz";
  const digits  = "0123456789";
  const special = "!@#$%^&*_+-=";
  const all     = upper + lower + digits + special;

  const rng = (max) => {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] % max;
  };

  // Guarantee at least one from each category
  const required = [
    upper[rng(upper.length)],
    lower[rng(lower.length)],
    digits[rng(digits.length)],
    special[rng(special.length)],
  ];
  const rest = Array.from({ length: length - required.length }, () => all[rng(all.length)]);
  const chars = [...required, ...rest];
  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rng(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

/**
 * Admin form to create a new user account.
 * New users always start as "proctor". Admin sets or randomizes the password.
 */
export default function CreateUserForm({ onCreated }) {
  const [name, setName]           = useState("");
  const [email, setEmail]         = useState("");
  const [committee, setCommittee] = useState("");
  const [password, setPassword]   = useState("");
  const [showFormPass, setShowFormPass] = useState(false);
  const [creating, setCreating]   = useState(false);
  const [error, setError]         = useState("");

  // Password modal state
  const [showModal, setShowModal]         = useState(false);
  const [generatedPass, setGeneratedPass] = useState("");
  const [createdName, setCreatedName]     = useState("");
  const [copied, setCopied]               = useState(false);
  const [showPass, setShowPass]           = useState(false);
  const passRef = useRef(null);

  // Password validation state
  const passwordChecks = useMemo(
    () => PASSWORD_RULES.map((r) => ({ ...r, passed: password ? r.test(password) : false })),
    [password]
  );
  const allPasswordChecksPassed = password.length > 0 && passwordChecks.every((c) => c.passed);

  const handleRandomize = useCallback(() => {
    const pw = generateStrongPassword(16);
    setPassword(pw);
    setShowFormPass(true); // reveal so admin can see it
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password || !allPasswordChecksPassed) return;

    setCreating(true);
    setError("");
    try {
      const result = await createUserAccount(
        name.trim(),
        email.trim().toLowerCase(),
        committee || undefined,
        password
      );
      setCreatedName(name.trim());
      setGeneratedPass(result.password);
      setShowModal(true);
      setCopied(false);
      setShowPass(false);
      // Reset form
      setName("");
      setEmail("");
      setCommittee("");
      setPassword("");
      setShowFormPass(false);
      onCreated?.();
    } catch (err) {
      setError(err.message || "Failed to create account.");
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedPass);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      passRef.current?.select();
      document.execCommand("copy");
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <>
      {/* ── Create user form ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 280 }}
        className="gc-card-accent p-5 mb-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: "linear-gradient(135deg, #14B8A6, #0D9488)" }}
          >
            <UserPlus className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold tracking-wide text-gc-white leading-none">
              CREATE NEW USER
            </h2>
            <p className="text-[11px] font-body text-gc-mist mt-0.5">
              New accounts start as <span className="text-gc-success font-semibold">Proctor</span> — change roles later
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Name */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gc-mist">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="gc-input"
                placeholder="Juan Dela Cruz"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gc-mist">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="gc-input"
                placeholder="user@plv.edu.ph"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gc-mist">
                Password
              </label>
              <div className="relative">
                <input
                  type={showFormPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="gc-input pr-[5.5rem] font-mono"
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
                  maxLength={4096}
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setShowFormPass(!showFormPass)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-gc-mist hover:text-gc-white hover:bg-gc-steel/40 transition-colors"
                    title={showFormPass ? "Hide" : "Show"}
                  >
                    {showFormPass ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleRandomize}
                    className="flex h-7 items-center gap-1 rounded-md px-1.5 text-[10px] font-bold text-gc-crimson hover:bg-gc-crimson/15 transition-colors"
                    title="Generate random password"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Random
                  </button>
                </div>
              </div>

              {/* Password requirements checklist */}
              <AnimatePresence>
                {password.length > 0 && !allPasswordChecksPassed && (
                  <motion.ul
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 overflow-hidden"
                  >
                    {passwordChecks.map((c) => (
                      <li
                        key={c.key}
                        className={cn(
                          "flex items-center gap-1.5 text-[10px] font-body transition-colors duration-150",
                          c.passed ? "text-gc-success" : "text-gc-mist/60"
                        )}
                      >
                        {c.passed ? (
                          <Check className="h-3 w-3 shrink-0" />
                        ) : (
                          <CircleDot className="h-3 w-3 shrink-0 opacity-40" />
                        )}
                        {c.label}
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>

            {/* Committee */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gc-mist">
                Initial Committee <span className="text-gc-steel">(optional)</span>
              </label>
              <select
                value={committee}
                onChange={(e) => setCommittee(e.target.value)}
                className="gc-input appearance-none"
              >
                <option value="">— None —</option>
                {COMMITTEE_NAMES.filter((c) => c !== "Proctors").map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="flex items-center gap-2 rounded-lg bg-gc-danger/10 border border-gc-danger/20 px-3 py-2 text-xs text-gc-danger font-body"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={creating || !name.trim() || !email.trim() || !allPasswordChecksPassed}
              className={cn(
                "gc-btn-primary",
                (creating || !name.trim() || !email.trim() || !allPasswordChecksPassed) && "opacity-50 pointer-events-none"
              )}
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Create Account
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>

      {/* ── Password reveal modal ── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="relative w-full max-w-md gc-card-accent p-6 shadow-2xl shadow-black/60"
            >
              {/* Close button */}
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg text-gc-mist hover:text-gc-white hover:bg-gc-steel/40 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)" }}
                >
                  <ShieldCheck className="h-5.5 w-5.5 text-white" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold tracking-wide text-gc-white">
                    ACCOUNT CREATED
                  </h3>
                  <p className="text-xs font-body text-gc-mist mt-0.5">
                    {createdName}
                  </p>
                </div>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-2.5 rounded-lg border border-gc-warning/25 bg-gc-warning/8 px-4 py-3 mb-4">
                <AlertCircle className="h-4 w-4 text-gc-warning shrink-0 mt-0.5" />
                <p className="text-xs text-gc-warning font-body leading-relaxed">
                  <strong>Save this password now.</strong> It will not be shown again.
                  Share it securely with the user so they can sign in and change it.
                </p>
              </div>

              {/* Password display */}
              <div className="relative">
                <input
                  ref={passRef}
                  type={showPass ? "text" : "password"}
                  value={generatedPass}
                  readOnly
                  className="gc-input pr-20 font-mono text-base tracking-wider text-gc-white"
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    onClick={() => setShowPass(!showPass)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-gc-mist hover:text-gc-white hover:bg-gc-steel/40 transition-colors"
                    title={showPass ? "Hide" : "Show"}
                  >
                    {showPass ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={handleCopy}
                    className={cn(
                      "flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold transition-all duration-200",
                      copied
                        ? "bg-gc-success/15 text-gc-success"
                        : "bg-gc-crimson/15 text-gc-crimson hover:bg-gc-crimson/25"
                    )}
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Close CTA */}
              <button
                onClick={() => setShowModal(false)}
                className="gc-btn-ghost w-full mt-4"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
