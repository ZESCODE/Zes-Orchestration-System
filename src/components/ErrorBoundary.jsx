import { Component } from "react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
    // Dispatch custom event so toast system can pick it up
    window.dispatchEvent(
      new CustomEvent("zes:error", {
        detail: { message: error.message, stack: errorInfo?.componentStack },
      })
    );
  }

  render() {
    if (this.state.hasError) {
      const fallback = this.props.fallback;
      if (fallback) return typeof fallback === "function" ? fallback(this.state.error, () => this.setState({ hasError: false, error: null })) : fallback;
      return (
        <div className="flex flex-col items-center justify-center h-64 p-6" style={{ color: "var(--text-primary)" }}>
          <div className="text-3xl mb-3">⚠️</div>
          <h3 className="text-lg font-bold mb-1">Something went wrong</h3>
          <p className="text-sm text-center max-w-md" style={{ color: "var(--text-muted)" }}>
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: "linear-gradient(135deg, #6366f1, #22d3ee)",
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
