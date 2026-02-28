import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { parseRoleSheet } from "../lib/parseRoleSheet";
import { importRoleData } from "../lib/roleFirestore";
import { logActivity } from "../lib/auditLog";
import { useAuth } from "../hooks/useAuth";
import { cn } from "../lib/utils";

/**
 * Import Role & Tasking Sheet — modal body content.
 * Accepts an .xlsx, parses it, previews counts, then writes to Firestore.
 */
export default function ImportRoleSheet({ onDone }) {
  const { user, profile } = useAuth();
  const [stage, setStage]     = useState("idle"); // idle | parsing | preview | writing | done | error
  const [file, setFile]       = useState(null);
  const [parsed, setParsed]   = useState(null);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState(null);
  const [dragOver, setDragOver] = useState(false);

  /* ── file pick / drop ── */
  const handleFile = useCallback(async (f) => {
    if (!f) return;
    setFile(f);
    setError(null);
    setStage("parsing");

    try {
      const buf = await f.arrayBuffer();
      const data = parseRoleSheet(buf);
      setParsed(data);
      setStage("preview");
    } catch (err) {
      setError(err.message || "Failed to parse the Excel file.");
      setStage("error");
    }
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f && f.name.endsWith(".xlsx")) handleFile(f);
      else setError("Please drop an .xlsx file.");
    },
    [handleFile]
  );

  const onInputChange = (e) => {
    handleFile(e.target.files?.[0]);
  };

  /* ── write to Firestore ── */
  const doImport = async () => {
    if (!parsed) return;
    setStage("writing");
    try {
      const res = await importRoleData(parsed);
      logActivity({
        action: "role.import",
        category: "role",
        details: `Imported role sheet: ${parsed.personRoles?.length ?? 0} persons, ${committeeCount} committees`,
        meta: { persons: parsed.personRoles?.length, committees: committeeCount, fileName: file?.name },
        userId: user?.uid || "admin",
        userName: profile?.name || "Admin",
      });
      setResult(res);
      setStage("done");
      onDone?.();
    } catch (err) {
      setError(err.message || "Firestore write failed.");
      setStage("error");
    }
  };

  /* ── reset ── */
  const reset = () => {
    setStage("idle");
    setFile(null);
    setParsed(null);
    setResult(null);
    setError(null);
  };

  /* ── unique committees in parsed data ── */
  const committeeCount = parsed
    ? new Set(parsed.committeeSchedules.map((c) => c.committee)).size
    : 0;

  return (
    <div className="space-y-5">
      <AnimatePresence mode="wait">
        {/* ──────── IDLE: Drop zone ──────── */}
        {(stage === "idle" || stage === "error") && (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <label
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={cn(
                "flex flex-col items-center justify-center gap-3 rounded border-2 border-dashed p-10 cursor-pointer transition-all duration-300",
                dragOver
                  ? "border-gc-crimson bg-gc-crimson/10 scale-[1.01]"
                  : "border-gc-steel/50 bg-gc-iron/30 hover:border-gc-crimson/50 hover:bg-gc-iron/50"
              )}
            >
              <input
                type="file"
                accept=".xlsx"
                onChange={onInputChange}
                className="hidden"
              />
              <div className="flex h-14 w-14 items-center justify-center rounded-md bg-gc-crimson/15 text-gc-crimson">
                <Upload className="h-7 w-7" />
              </div>
              <div className="text-center">
                <p className="font-body text-sm font-semibold text-gc-cloud">
                  Drop your <span className="text-gc-crimson">.xlsx</span> here or click to browse
                </p>
                <p className="mt-1 text-xs text-gc-mist">
                  GameCon 2026 — Role &amp; Tasking Sheet
                </p>
              </div>
            </label>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 flex items-start gap-2 rounded border border-gc-danger/30 bg-gc-danger/10 p-3 text-sm text-gc-danger"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ──────── PARSING ──────── */}
        {stage === "parsing" && (
          <motion.div
            key="parsing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3 py-10 text-gc-mist"
          >
            <Loader2 className="h-8 w-8 animate-spin text-gc-crimson" />
            <p className="text-sm font-medium">Parsing spreadsheet…</p>
          </motion.div>
        )}

        {/* ──────── PREVIEW ──────── */}
        {stage === "preview" && parsed && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-4"
          >
            {/* File badge */}
            <div className="flex items-center gap-3 rounded border border-gc-steel/40 bg-gc-iron/40 px-4 py-3">
              <FileSpreadsheet className="h-5 w-5 text-gc-success" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-gc-cloud">
                  {file?.name}
                </p>
                <p className="text-xs text-gc-mist">
                  {(file?.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Students",   value: parsed.personRoles.length,        accent: "#C8102E" },
                { label: "Committees", value: committeeCount,                   accent: "#3B82F6" },
                { label: "Schedules",  value: parsed.committeeSchedules.length, accent: "#22C55E" },
              ].map(({ label, value, accent }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-1 rounded border border-gc-steel/30 bg-gc-slate p-3"
                >
                  <span
                    className="font-display text-2xl font-bold"
                    style={{ color: accent }}
                  >
                    {value}
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-gc-mist">
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {/* Sample names */}
            <div className="rounded border border-gc-steel/30 bg-gc-iron/40 p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gc-mist">
                Sample names
              </p>
              <div className="flex flex-wrap gap-1.5">
                {parsed.personRoles.slice(0, 8).map((pr) => (
                  <span
                    key={pr.name}
                    className="rounded bg-gc-steel/40 px-2.5 py-0.5 text-xs text-gc-cloud"
                  >
                    {pr.name}
                  </span>
                ))}
                {parsed.personRoles.length > 8 && (
                  <span className="rounded bg-gc-crimson/15 px-2.5 py-0.5 text-xs text-gc-crimson">
                    +{parsed.personRoles.length - 8} more
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-1">
              <button onClick={reset} className="gc-btn-ghost flex-1">
                Cancel
              </button>
              <button onClick={doImport} className="gc-btn-primary flex-1">
                Import &amp; Overwrite
              </button>
            </div>
          </motion.div>
        )}

        {/* ──────── WRITING ──────── */}
        {stage === "writing" && (
          <motion.div
            key="writing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3 py-10 text-gc-mist"
          >
            <Loader2 className="h-8 w-8 animate-spin text-gc-scarlet" />
            <p className="text-sm font-medium">Writing to Firestore…</p>
          </motion.div>
        )}

        {/* ──────── DONE ──────── */}
        {stage === "done" && result && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 py-8"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded bg-gc-success/15">
              <CheckCircle2 className="h-8 w-8 text-gc-success" />
            </div>
            <div className="text-center">
              <p className="font-display text-xl font-bold text-gc-white">
                IMPORT COMPLETE
              </p>
              <p className="mt-1 text-sm text-gc-mist">
                {result.personsWritten} students &middot; {result.schedulesWritten} schedules written
              </p>
            </div>
            <button onClick={reset} className="gc-btn-ghost mt-2">
              Import Another
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
