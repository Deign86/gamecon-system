import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Users,
  ClipboardCheck,
  DollarSign,
  Calendar,
  AlertTriangle,
  Laptop2,
  MapPin,
  Clock,
} from "lucide-react";
import ZoneCounter from "./ZoneCounter";
import ShiftBoard from "./ShiftBoard";
import ContributionHub from "./contributions/ContributionHub";
import ExpenseTracker from "./ExpenseTracker";
import IncidentLog from "./IncidentLog";
import CommitteeCard from "./CommitteeCard";
import Modal from "./Modal";

const CARDS = [
  { key: "headcount",     label: "Live Headcount",   Icon: Users,          accent: "#C8102E" },
  { key: "shifts",        label: "Shift Board",      Icon: Calendar,       accent: "#3B82F6" },
  { key: "contributions", label: "Contributions",    Icon: ClipboardCheck, accent: "#22C55E" },
  { key: "budget",        label: "Budget Monitor",   Icon: DollarSign,     accent: "#EAB308" },
  { key: "incidents",     label: "Incidents",         Icon: AlertTriangle,  accent: "#EF4444" },
  { key: "committees",    label: "Committees",        Icon: Laptop2,        accent: "#A855F7" },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const cardVariant = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { type: "spring", damping: 24, stiffness: 260 } },
};

export default function Dashboard() {
  const [activeModal, setActiveModal] = useState(null);
  const closeModal = useCallback(() => setActiveModal(null), []);

  function openModal(key) {
    setActiveModal(key);
  }

  return (
    <motion.div
      className="mx-auto max-w-5xl"
      initial="hidden"
      animate="show"
      variants={stagger}
    >
      {/* Hero banner */}
      <motion.div
        variants={cardVariant}
        className="relative mb-6 overflow-hidden rounded-2xl border border-gc-steel/40 bg-gc-slate p-5 sm:p-7"
      >
        {/* Diagonal slash decoration */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, transparent 50%, rgba(200,16,46,0.08) 50%)",
          }}
        />
        <div className="relative z-10">
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-wider text-gc-white">
            PLAY <span className="text-gc-crimson text-shadow-red">VERSE</span>
          </h2>
          <p className="mt-1 font-display text-lg tracking-widest text-gc-mist">
            IT GAMECON 2026 — OPS DASHBOARD
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-body font-medium text-gc-cloud">
            <span className="inline-flex items-center gap-1 rounded-full bg-gc-crimson/15 border border-gc-crimson/30 px-3 py-1">
              <MapPin className="h-3 w-3" /> COED Building — Assembly Hall
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-gc-iron/80 border border-gc-steel/40 px-3 py-1">
              <Calendar className="h-3 w-3" /> March 5–6, 2026
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-gc-iron/80 border border-gc-steel/40 px-3 py-1">
              <Clock className="h-3 w-3" /> 9:00 AM — 5:00 PM
            </span>
          </div>
        </div>
      </motion.div>

      {/* Card grid */}
      <motion.div
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4"
        variants={stagger}
      >
        {CARDS.map(({ key, label, Icon, accent }) => (
          <motion.button
            key={key}
            variants={cardVariant}
            onClick={() => openModal(key)}
            className="gc-card group flex flex-col items-center gap-3 p-5 sm:p-6 text-center cursor-pointer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110"
              style={{
                background: `${accent}15`,
                border: `1px solid ${accent}30`,
              }}
            >
              <Icon className="h-6 w-6" style={{ color: accent }} />
            </div>
            <span className="font-display text-base sm:text-lg font-bold tracking-wide text-gc-cloud group-hover:text-gc-white transition-colors">
              {label}
            </span>
          </motion.button>
        ))}
      </motion.div>

      {/* Modals */}
      <Modal
        open={activeModal === "headcount"}
        onClose={closeModal}
        title="LIVE HEADCOUNT"
        wide
      >
        <ZoneCounter />
      </Modal>

      <Modal
        open={activeModal === "shifts"}
        onClose={closeModal}
        title="SHIFT BOARD"
        wide
      >
        <ShiftBoard />
      </Modal>

      <Modal
        open={activeModal === "contributions"}
        onClose={closeModal}
        title="CONTRIBUTIONS"
        wide
      >
        <ContributionHub />
      </Modal>

      <Modal
        open={activeModal === "budget"}
        onClose={closeModal}
        title="BUDGET MONITOR"
        wide
      >
        <ExpenseTracker />
      </Modal>

      <Modal
        open={activeModal === "incidents"}
        onClose={closeModal}
        title="INCIDENTS"
        wide
      >
        <IncidentLog />
      </Modal>

      <Modal
        open={activeModal === "committees"}
        onClose={closeModal}
        title="COMMITTEES"
        wide
      >
        <CommitteeCard />
      </Modal>
    </motion.div>
  );
}
