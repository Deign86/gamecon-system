import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Shield, Users, Calendar, ClipboardCheck, MapPin, Clock, ChevronDown, Check, Loader2, Bell } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import { useCollection } from "../hooks/useFirestore";
import { COMMITTEES } from "../data/seed";
import { fmtDate, initials, cn } from "../lib/utils";
import ChangePasswordForm from "./ChangePasswordForm";
import AdminResetPanel from "./AdminResetPanel";
import IncidentNotificationToggle from "./profile/IncidentNotificationToggle";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { type: "spring", damping: 24, stiffness: 260 } },
};

export default function ProfilePanel() {
  const { user, profile, setProfile } = useAuth();
  const { docs: myContribs } = useCollection("contributions");

  // Derive active committee IDs (support both new `committees` array and legacy `committee` string)
  const myCommitteeIds = Array.isArray(profile?.committees) && profile.committees.length > 0
    ? [...new Set(profile.committees.map((c) => c.committee || c))]
    : profile?.committee
      ? [profile.committee]
      : [];

  const myCommittees = myCommitteeIds
    .map((id) => COMMITTEES.find((c) => c.id === id))
    .filter(Boolean);

  // For the avatar gradient, use first committee color
  const primaryCommittee = myCommittees[0];

  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving]         = useState(false);

  const MAX_COMMITTEES = 3;

  async function handleCommitteeToggle(cid) {
    if (!user || saving) return;
    const isActive = myCommitteeIds.includes(cid);
    if (!isActive && myCommitteeIds.length >= MAX_COMMITTEES) return;
    setSaving(true);
    try {
      const isActive = myCommitteeIds.includes(cid);
      let newIds;
      if (isActive) {
        newIds = myCommitteeIds.filter((id) => id !== cid);
      } else {
        newIds = [...myCommitteeIds, cid];
      }
      // Store as committees array of { committee, day } pairs (matches admin format)
      const newCommittees = newIds.map((id) => ({ committee: id, day: "DAY1/2" }));
      await updateDoc(doc(db, "users", user.uid), {
        committees: newCommittees,
        committee: newIds[0] || "",           // keep legacy field in sync
      });
      setProfile((prev) => ({
        ...prev,
        committees: newCommittees,
        committee: newIds[0] || "",
      }));
    } catch (e) {
      // silently handled — user sees loading state
    } finally {
      setSaving(false);
    }
  }

  // Filter to only my contributions
  const mine = myContribs.filter((c) => c.userId === user?.uid);

  return (
    <motion.div
      className="mx-auto max-w-md space-y-4"
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
    >
      {/* Profile card */}
      <motion.div variants={fadeUp} className="gc-card-accent p-6 text-center">
        <div
          className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-bold text-white"
          style={{ background: `linear-gradient(135deg, ${primaryCommittee?.color || "#C8102E"}, ${primaryCommittee?.color || "#E31837"}dd)` }}
        >
          {initials(profile?.name)}
        </div>
        <h2 className="font-display text-2xl font-bold tracking-wide text-gc-white">
          {profile?.name || "Unknown"}
        </h2>

        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <span className="gc-chip-green">
            <Shield className="h-3 w-3" />
            {profile?.role || "member"}
          </span>
          {myCommittees.map((c) => (
            <span
              key={c.id}
              className="gc-chip"
              style={{
                background: `${c.color}18`,
                color: c.color,
                border: `1px solid ${c.color}30`,
              }}
            >
              <Users className="h-3 w-3" />
              {c.name}
            </span>
          ))}
        </div>

        <div className="mt-4 text-xs text-gc-mist">
          <div className="flex items-center justify-center gap-2">
            <Mail className="h-3 w-3" />
            {profile?.email || user?.email}
          </div>
        </div>
      </motion.div>

      {/* Committee picker */}
      <motion.div variants={fadeUp} className="gc-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-gc-crimson" />
          <h3 className="font-display text-base font-bold tracking-wide text-gc-mist">
            MY COMMITTEES
          </h3>
          <span className="ml-auto font-mono text-xs text-gc-mist">{myCommitteeIds.length}/{MAX_COMMITTEES}</span>
        </div>

        {/* Currently selected pills */}
        {myCommittees.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {myCommittees.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={{
                  background: `${c.color}18`,
                  color: c.color,
                  border: `1px solid ${c.color}30`,
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.color }} />
                {c.name}
              </span>
            ))}
          </div>
        )}

        {/* Toggle picker */}
        <button
          type="button"
          onClick={() => setShowPicker((p) => !p)}
          className={cn(
            "w-full flex items-center justify-center gap-2 rounded-lg border px-3 py-2 transition-colors text-xs",
            "border-gc-steel/30 bg-gc-iron/50 hover:border-gc-steel/60 text-gc-mist",
          )}
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showPicker && "rotate-180")} />
          )}
          {showPicker ? "Close" : "Edit committees"}
        </button>

        {/* Multi-select grid */}
        <AnimatePresence>
          {showPicker && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-2 grid grid-cols-2 gap-1.5 max-h-[260px] overflow-y-auto pr-1">
                {COMMITTEES.map((c) => {
                  const active = myCommitteeIds.includes(c.id);
                  const atMax = !active && myCommitteeIds.length >= MAX_COMMITTEES;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={saving || atMax}
                      onClick={() => handleCommitteeToggle(c.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-all",
                        active
                          ? "border-gc-success/50 bg-gc-success/10 text-gc-success font-semibold"
                          : atMax
                            ? "border-gc-steel/10 bg-gc-iron/20 text-gc-steel/40 cursor-not-allowed"
                            : "border-gc-steel/20 bg-gc-iron/40 text-gc-cloud hover:border-gc-steel/50 hover:bg-gc-iron/70",
                      )}
                    >
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ background: c.color }}
                      />
                      <span className="flex-1 truncate">{c.name}</span>
                      {active && <Check className="h-3 w-3 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Incident Push Notifications */}
      <motion.div variants={fadeUp} className="gc-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="h-4 w-4 text-gc-crimson" />
          <h3 className="font-display text-base font-bold tracking-wide text-gc-mist">
            PUSH NOTIFICATIONS
          </h3>
        </div>
        <IncidentNotificationToggle />
      </motion.div>

      {/* My contributions */}
      <motion.div variants={fadeUp} className="gc-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardCheck className="h-4 w-4 text-gc-success" />
          <h3 className="font-display text-base font-bold tracking-wide text-gc-mist">
            MY CONTRIBUTIONS
          </h3>
          <span className="ml-auto font-mono text-xs text-gc-mist">{mine.length}</span>
        </div>

        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {mine.length === 0 && (
            <p className="text-sm text-gc-mist/60 text-center py-4">
              No contributions yet. Start logging!
            </p>
          )}
          {mine.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-lg bg-gc-iron/50 border border-gc-steel/30 px-3 py-2"
            >
              <div className="h-1.5 w-1.5 rounded-full bg-gc-success shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gc-cloud truncate">{c.task}</p>
                <p className="text-[10px] text-gc-mist/60 font-mono">{fmtDate(c.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Change password */}
      <motion.div variants={fadeUp} className="gc-card p-4">
        <ChangePasswordForm />
      </motion.div>

      {/* Event info */}
      <motion.div variants={fadeUp} className="gc-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-4 w-4 text-gc-crimson" />
          <h3 className="font-display text-base font-bold tracking-wide text-gc-mist">
            EVENT INFO
          </h3>
        </div>
        <div className="space-y-1.5 text-xs text-gc-cloud">
          <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-gc-crimson shrink-0" /> COED Building — Assembly Hall (Main Campus)</p>
          <p className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-gc-crimson shrink-0" /> March 5–6, 2026 (Thursday & Friday)</p>
          <p className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-gc-crimson shrink-0" /> 9:00 AM — 5:00 PM</p>
          <p className="text-gc-mist/50 mt-2 font-mono">#ITLYMPICS2026</p>
        </div>
      </motion.div>

      {/* Admin tools */}
      {profile?.role === "admin" && (
        <motion.div variants={fadeUp} className="gc-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-gc-danger" />
            <h3 className="font-display text-base font-bold tracking-wide text-gc-mist">
              ADMIN TOOLS
            </h3>
          </div>
          <AdminResetPanel />
        </motion.div>
      )}
    </motion.div>
  );
}
