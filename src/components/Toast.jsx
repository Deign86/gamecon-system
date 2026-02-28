import { createContext, useContext, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle, AlertTriangle, XCircle, Info, X } from "lucide-react";

/* ── Toast Context ── */
const ToastCtx = createContext(null);

let _toastId = 0;

const ICONS = {
  success: CheckCircle,
  warning: AlertTriangle,
  error:   XCircle,
  info:    Info,
};

const COLORS = {
  success: {
    bg:     "bg-gc-success/10",
    border: "border-gc-success/30",
    text:   "text-gc-success",
    icon:   "text-gc-success",
  },
  warning: {
    bg:     "bg-gc-warning/10",
    border: "border-gc-warning/30",
    text:   "text-gc-warning",
    icon:   "text-gc-warning",
  },
  error: {
    bg:     "bg-gc-danger/10",
    border: "border-gc-danger/30",
    text:   "text-gc-danger",
    icon:   "text-gc-danger",
  },
  info: {
    bg:     "bg-blue-500/10",
    border: "border-blue-500/30",
    text:   "text-blue-400",
    icon:   "text-blue-400",
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message, type = "info", duration = 3500) => {
      const id = ++_toastId;
      setToasts((prev) => [...prev.slice(-4), { id, message, type }]);
      timers.current[id] = setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  return (
    <ToastCtx.Provider value={toast}>
      {children}

      {/* Toast container — fixed bottom-center */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9998] flex flex-col items-center gap-2 pointer-events-none w-full max-w-md px-4">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = ICONS[t.type] || Info;
            const color = COLORS[t.type] || COLORS.info;
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className={`pointer-events-auto flex items-center gap-3 rounded border ${color.bg} ${color.border} px-4 py-3 shadow-lg shadow-black/40 backdrop-blur-sm w-full`}
              >
                <Icon className={`h-4.5 w-4.5 shrink-0 ${color.icon}`} />
                <span className={`text-sm font-body font-medium ${color.text} flex-1`}>
                  {t.message}
                </span>
                <button
                  onClick={() => dismiss(t.id)}
                  className="shrink-0 rounded p-1 text-gc-mist hover:text-gc-white transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

/** Hook — returns a `toast(message, type?, duration?)` function */
export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be inside <ToastProvider>");
  return ctx;
}
