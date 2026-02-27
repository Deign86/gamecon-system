import { useState } from "react";
import { motion } from "framer-motion";
import { UserPlus, ChevronDown, Loader2, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { COMMITTEE_NAMES, DAY_SLOTS } from "../../lib/roleConfig";
import { createNewPerson } from "../../lib/rolesEditor";
import Modal from "../Modal";

/**
 * AddPersonDialog
 *
 * Modal to create a brand-new PersonRoles entry manually.
 * Lets admin enter a name and an optional initial committee/day.
 */
export default function AddPersonDialog({ open, onClose, userId }) {
  const [name, setName] = useState("");
  const [committee, setCommittee] = useState("");
  const [day, setDay] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  function reset() {
    setName("");
    setCommittee("");
    setDay("");
    setError(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    // Validate: if committee is set, day must be too (and vice-versa)
    const hasComm = !!committee;
    const hasDay = !!day;
    if (hasComm !== hasDay) {
      setError("Select both a committee and a day, or leave both empty.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await createNewPerson(trimmed, committee || null, day || null, userId);
      reset();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create person");
    } finally {
      setBusy(false);
    }
  }

  function handleClose() {
    if (!busy) {
      reset();
      onClose();
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="ADD NEW PERSON">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-gc-mist">
            Full Name <span className="text-gc-crimson">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Juan Dela Cruz"
            className="gc-input"
            autoFocus
            required
          />
        </div>

        {/* Optional initial assignment */}
        <div className="rounded border border-gc-steel/50 bg-gc-iron p-3 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gc-mist">
            Initial Assignment <span className="text-gc-hint">(optional)</span>
          </p>

          {/* Committee */}
          <div className="relative">
            <select
              value={committee}
              onChange={(e) => setCommittee(e.target.value)}
              className="gc-input appearance-none pr-8 text-xs cursor-pointer"
            >
              <option value="">— No committee —</option>
              {COMMITTEE_NAMES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gc-mist" />
          </div>

          {/* Day */}
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setDay("")}
              className={cn(
                "rounded px-3 py-1.5 text-[10px] font-bold border transition-all duration-200",
                !day
                  ? "bg-gc-steel/30 text-gc-cloud border-gc-steel/50"
                  : "bg-gc-iron text-gc-mist border-gc-steel/50 hover:text-gc-cloud"
              )}
            >
              None
            </button>
            {DAY_SLOTS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDay(d)}
                className={cn(
                  "rounded px-3 py-1.5 text-[10px] font-bold border transition-all duration-200",
                  day === d
                    ? "bg-gc-crimson/15 text-gc-crimson border-gc-crimson/30"
                    : "bg-gc-iron text-gc-mist border-gc-steel/50 hover:text-gc-cloud"
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-gc-danger bg-gc-danger/10 border border-gc-danger/20 rounded px-3 py-2"
          >
            {error}
          </motion.p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={!name.trim() || busy}
            className="gc-btn-primary text-xs gap-1.5 flex-1 disabled:opacity-40"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <UserPlus className="h-3.5 w-3.5" />
            )}
            {busy ? "Creating…" : "Create Person"}
          </button>
          <button
            type="button"
            onClick={handleClose}
            disabled={busy}
            className="gc-btn-ghost text-xs px-4"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
