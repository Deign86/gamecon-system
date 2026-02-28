import { Component } from "react";
import { AlertTriangle, WifiOff, RefreshCw } from "lucide-react";

/**
 * Detect if an error is network/offline related.
 */
function isOfflineError(error) {
  if (!error) return false;
  const msg = (error.message || "").toLowerCase();
  const code = error.code || "";
  return (
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("offline") ||
    msg.includes("unavailable") ||
    code === "unavailable" ||
    code === "resource-exhausted" ||
    !navigator.onLine
  );
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) console.error("ErrorBoundary caught:", error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const offline = isOfflineError(this.state.error);

      if (offline) {
        /* ── Offline-specific error view ── */
        return (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="relative mb-5">
              <div className="absolute inset-0 rounded-full bg-gc-danger/10 blur-xl animate-pulse" />
              <div className="relative flex items-center justify-center h-14 w-14 rounded-full border border-gc-danger/20 bg-gc-danger/[0.06]">
                <WifiOff className="h-6 w-6 text-gc-danger" />
              </div>
            </div>
            <h2 className="font-display text-xl tracking-[0.15em] uppercase text-gc-danger mb-2">
              Connection Lost
            </h2>
            <p className="font-body text-sm text-gc-mist leading-relaxed max-w-xs mb-1">
              This feature failed to load because the server is unreachable.
            </p>
            <p className="font-body text-xs text-gc-mist/50 max-w-xs mb-5">
              Cached data may still be available. Try again when signal returns.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center gap-1.5 rounded border border-gc-crimson/30 bg-gc-crimson/10 px-4 py-2 font-display text-xs tracking-[0.12em] uppercase text-gc-crimson hover:bg-gc-crimson hover:text-white transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </button>
            </div>
            <p className="mt-4 text-[9px] font-mono text-gc-hint tracking-wider">
              ERR_NETWORK_OFFLINE
            </p>
          </div>
        );
      }

      /* ── Generic error view ── */
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gc-void gc-noise px-6 text-center">
          {/* Corner brackets */}
          <div className="fixed top-6 left-6 w-12 h-12 border-t-2 border-l-2 border-gc-crimson/15 pointer-events-none" />
          <div className="fixed bottom-6 right-6 w-12 h-12 border-b-2 border-r-2 border-gc-crimson/15 pointer-events-none" />

          <div className="h-16 w-16 rounded bg-red-500/10 border border-red-500/25 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-wider text-gc-white">
            SYSTEM <span className="text-gc-crimson text-shadow-red">ERROR</span>
          </h1>
          <p className="max-w-md text-sm text-gc-mist font-body">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <p className="text-[9px] font-mono text-gc-hint tracking-wider">
            ERR_BOUNDARY_CATCH
          </p>
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={this.handleRetry}
              className="rounded border border-gc-steel bg-gc-iron/50 px-5 py-2 font-display text-xs tracking-[0.12em] uppercase text-gc-cloud hover:bg-gc-iron transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => window.location.reload()}
              className="gc-btn-primary text-sm px-6 py-2"
            >
              RELOAD SYSTEM
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
