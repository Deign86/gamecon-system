import { Component } from "react";
import { AlertTriangle } from "lucide-react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // In production, consider sending to an error-reporting service
    if (import.meta.env.DEV) console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gc-void px-6 text-center">
          <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-wider text-gc-white">
            SOMETHING <span className="text-gc-crimson">BROKE</span>
          </h1>
          <p className="max-w-md text-sm text-gc-mist font-body">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 rounded-lg bg-gc-crimson px-6 py-2 text-sm font-semibold text-white hover:bg-gc-crimson/80 transition-colors"
          >
            RELOAD APP
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
