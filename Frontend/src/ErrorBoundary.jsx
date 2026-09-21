import React from "react";

/**
 * Top-level error boundary. Catches render-phase exceptions in the entire
 * React tree and shows a friendly fallback UI instead of a blank screen.
 *
 * Reporting today: console only. The reportError() seam is here so a real
 * provider (Sentry, Datadog, custom endpoint) can be wired in without
 * touching call sites — see EmployeePortal/* if a portal-specific channel
 * is needed later.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    reportError(error, info);
  }

  handleReload = () => {
    // Full reload clears any corrupted in-memory state (router, axios queue,
    // toast portals) that a soft retry would otherwise drag forward.
    window.location.assign("/");
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#f9fafb",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          color: "#111827",
        }}
      >
        <div
          style={{
            maxWidth: 480,
            width: "100%",
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: "32px 28px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          }}
        >
          <h1 style={{ fontSize: 20, margin: "0 0 8px", fontWeight: 600 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: "#4b5563", margin: "0 0 20px" }}>
            We hit an unexpected error and couldn't render the page. Reloading
            usually clears it. If it keeps happening, please contact support.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              background: "#111827",
              color: "#ffffff",
              border: "none",
              borderRadius: 8,
              padding: "10px 18px",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Reload application
          </button>
        </div>
      </div>
    );
  }
}

function reportError(error, info) {
  // Console for now; swap for Sentry.captureException(error, { extra: info })
  // once the reporting provider is provisioned.
  console.error("[ErrorBoundary]", error, info?.componentStack);
}
