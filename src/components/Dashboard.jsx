import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Users,
  ClipboardCheck,
  UserCheck,
  DollarSign,
  Calendar,
  AlertTriangle,
  Laptop2,
  MapPin,
  Clock,
  KanbanSquare,
  WifiOff,
} from "lucide-react";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import ZoneCounter from "./ZoneCounter";
import ShiftBoard from "./ShiftBoard";
import ContributionHub from "./contributions/ContributionHub";
import ExpenseTracker from "./ExpenseTracker";
import IncidentLog from "./IncidentLog";
import CommitteeCard from "./CommitteeCard";
import VenueMapWithStatus from "./venue/VenueMapWithStatus";
import AttendancePage from "./attendance/AttendancePage";
import TaskBoard from "./tasks/TaskBoard";
import Modal from "./Modal";

const CARDS = [
  { key: "headcount",     label: "Live Headcount",   Icon: Users,          accent: "#C8102E", id: "M-01" },
  { key: "shifts",        label: "Shift Board",      Icon: Calendar,       accent: "#3B82F6", id: "M-02" },
  { key: "attendance",    label: "Attendance",       Icon: UserCheck,      accent: "#F59E0B", id: "M-03" },
  { key: "contributions", label: "Contributions",    Icon: ClipboardCheck, accent: "#22C55E", id: "M-04" },
  { key: "budget",        label: "Budget Monitor",   Icon: DollarSign,     accent: "#EAB308", id: "M-05" },
  { key: "incidents",     label: "Incidents",         Icon: AlertTriangle,  accent: "#EF4444", id: "M-06" },
  { key: "committees",    label: "Committees",        Icon: Laptop2,        accent: "#A855F7", id: "M-07" },
  { key: "venuemap",      label: "Venue Map",         Icon: MapPin,         accent: "#14B8A6", id: "M-08" },
  { key: "tasks",         label: "Task Board",        Icon: KanbanSquare,   accent: "#F97316", id: "M-09" },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const cardVariant = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { type: "spring", damping: 24, stiffness: 280 } },
};

export default function Dashboard() {
  const { isOnline } = useOnlineStatus();
  const [activeModal, setActiveModal] = useState(null);
  const [modalData, setModalData] = useState(null);
  const closeModal = useCallback(() => { setActiveModal(null); setModalData(null); }, []);

  function openModal(key, data = null) {
    setActiveModal(key);
    setModalData(data);
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
        className="relative mb-6 overflow-hidden rounded-md border border-gc-steel/30 bg-gc-slate p-5 sm:p-7"
      >
        {/* Grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: `
              linear-gradient(rgb(var(--gc-crimson)) 1px, transparent 1px),
              linear-gradient(90deg, rgb(var(--gc-crimson)) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Corner brackets */}
        <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-gc-crimson/20 pointer-events-none" />
        <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-gc-crimson/20 pointer-events-none" />

        <div className="relative z-10">
          {/* Status line */}
          <div className="mb-3 flex items-center gap-2 text-[9px] font-mono text-gc-hint uppercase tracking-[0.2em]">
            {isOnline ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-gc-success animate-pulse" />
                COMMAND CENTER — LIVE
              </>
            ) : (
              <>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gc-danger opacity-50" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gc-danger" />
                </span>
                <span className="text-gc-danger/80">COMMAND CENTER — CACHED</span>
                <WifiOff className="h-2.5 w-2.5 text-gc-danger/50" />
              </>
            )}
          </div>

          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-wider text-gc-white">
            PLAY <span className="text-gc-crimson text-shadow-red">VERSE</span>
          </h2>
          <p className="mt-1 font-display text-base tracking-[0.2em] text-gc-mist">
            IT GAMECON 2026 — OPS DASHBOARD
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-mono font-medium text-gc-cloud">
            <span className="inline-flex items-center gap-1.5 rounded bg-gc-crimson/10 border border-gc-crimson/25 px-2.5 py-1">
              <MapPin className="h-3 w-3" /> COED — ASSEMBLY HALL
            </span>
            <span className="inline-flex items-center gap-1.5 rounded bg-gc-iron/80 border border-gc-steel/30 px-2.5 py-1">
              <Calendar className="h-3 w-3" /> MAR 5–6, 2026
            </span>
            <span className="inline-flex items-center gap-1.5 rounded bg-gc-iron/80 border border-gc-steel/30 px-2.5 py-1">
              <Clock className="h-3 w-3" /> 9:00 AM – 5:00 PM
            </span>
          </div>
        </div>
      </motion.div>

      {/* Card grid */}
      <motion.div
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4"
        variants={stagger}
      >
        {CARDS.map(({ key, label, Icon, accent, id }) => (
          <motion.button
            key={key}
            variants={cardVariant}
            onClick={() => openModal(key)}
            className="gc-card group relative flex flex-col items-center gap-3 p-5 sm:p-6 text-center cursor-pointer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            {/* Module ID tag */}
            <span className="absolute top-2 right-2 text-[8px] font-mono text-gc-hint/60 tracking-wider">
              {id}
            </span>

            <div
              className="flex h-12 w-12 items-center justify-center rounded transition-all duration-300 group-hover:scale-110"
              style={{
                background: `${accent}12`,
                border: `1px solid ${accent}25`,
              }}
            >
              <Icon className="h-6 w-6" style={{ color: accent }} />
            </div>
            <span className="font-display text-base sm:text-lg font-bold tracking-wider text-gc-cloud group-hover:text-gc-white transition-colors">
              {label}
            </span>

            {/* Dot indicator with glow */}
            <span
              className="h-1 w-1 rounded-full"
              style={{ backgroundColor: accent, boxShadow: `0 0 6px ${accent}80` }}
            />
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
        <ShiftBoard highlightCommittee={modalData?.committeeId} />
      </Modal>

      <Modal
        open={activeModal === "attendance"}
        onClose={closeModal}
        title="STAFF ATTENDANCE"
        wide
      >
        <AttendancePage />
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

      <Modal
        open={activeModal === "venuemap"}
        onClose={closeModal}
        title="VENUE MAP"
        wide
      >
        <VenueMapWithStatus onNavigate={(key, data) => { closeModal(); setTimeout(() => openModal(key, data), 150); }} />
      </Modal>

      <Modal
        open={activeModal === "tasks"}
        onClose={closeModal}
        title="TASK BOARD"
        wide
      >
        <TaskBoard />
      </Modal>
    </motion.div>
  );
}
