import { useState, useEffect, useCallback } from "react";
import { useToast } from "./ToastContext";
import { apiFetch } from "../hooks/useApi";

const API_BASE = "";

export function HealthPanel() {
  const { toast } = useToast();
  const [health, setHealth] = useState(null);
  const [serviceStatus, setServiceStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchHealth = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    try {
      const [healthData, servicesData] = await Promise.all([
        apiFetch("/api/health"),
        apiFetch("/api/services"),
      ]);
      setHealth(healthData);
      setServiceStatus(servicesData);

      // Build history from health data heartbeat timestamps
      const entries = [];
      if (healthData?.checks) {
        const ts = new Date().toLocaleTimeString();
        healthData.checks.forEach((c) => {
          entries.push({
            time: ts,
            service: c.name || c.port || "unknown",
            status: c.status || (c.alive ? "up" : "down"),
          });
        });
      }
      setHistory((prev) => {
        const merged = [...entries, ...prev].slice(0, 100);
        return merged;
      });
      if (!quiet) toast("Health check complete", "success");
    } catch (err) {
      if (!quiet) toast("Health check failed: " + err.message, "error");
      setHistory((prev) => [
        { time: new Date().toLocaleTimeString(), service: "system", status: "error", error: err.message },
        ...prev,
      ].slice(0, 100));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchHealth(true);
  }, [fetchHealth]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => fetchHealth(true), 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchHealth]);

  const handleRestart = async (name) => {
    try {
      await apiFetch(`/api/services/${name}/restart`, { method: "POST" });
      toast(`${name} restart initiated`, "info");
      setTimeout(() => fetchHealth(true), 2000);
    } catch (err) {
      toast(`Restart ${name} failed: ${err.message}`, "error");
    }
  };

  const handleRestartAll = async () => {
    if (!serviceStatus?.services) return;
    const down = serviceStatus.services.filter((s) => s.status !== "running");
    if (down.length === 0) {
      toast("All services are running", "success");
      return;
    }
    let count = 0;
    for (const svc of down) {
      try {
        await apiFetch(`/api/services/${svc.name}/restart`, { method: "POST" });
        count++;
      } catch {}
    }
    toast(`Restarted ${count} down services`, count > 0 ? "info" : "warning");
    setTimeout(() => fetchHealth(true), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg" style={{ color: "var(--text-muted)" }}>Running health checks...</div>
      </div>
    );
  }

  const statusColor = (s) => {
    if (s === "running" || s === "up" || s === true || s === "ok") return "#10b981";
    if (s === "stopped" || s === "down" || s === false) return "#ef4444";
    if (s === "error") return "#f59e0b";
    return "#64748b";
  };

  // Derive overall health
  const checks = health?.checks || [];
  const services = serviceStatus?.services || [];
  const allOk = services.every((s) => s.status === "running") && checks.every((c) => c.status !== "error");

  return (
    <div className="p-4 md:p-6 space-y-4" style={{ color: "var(--text-primary)" }}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">Health Panel</h2>
            <span
              className="px-2.5 py-0.5 rounded-full text-xs font-medium"
              style={{
                background: allOk ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                color: allOk ? "#10b981" : "#f59e0b",
                border: `1px solid ${allOk ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}`,
              }}
            >
              {allOk ? "All Healthy" : "Issues Detected"}
            </span>
          </div>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            QC diagnostics — {services.length} services, {checks.length} port checks
          </p>
        </div>
        <div className="flex gap-2">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: "var(--text-muted)" }}>
            <input type="checkbox" checked={autoRefresh} onChange={() => setAutoRefresh(!autoRefresh)} />
            Auto-refresh
          </label>
          <button
            onClick={() => fetchHealth(false)}
            disabled={refreshing}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
            style={{
              background: refreshing ? "rgba(99,102,241,0.1)" : "linear-gradient(135deg, #6366f1, #22d3ee)",
              color: refreshing ? "var(--text-muted)" : "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            {refreshing ? "Checking..." : "Refresh"}
          </button>
          <button
            onClick={handleRestartAll}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: "rgba(245,158,11,0.15)",
              color: "#f59e0b",
              border: "1px solid rgba(245,158,11,0.3)",
              cursor: "pointer",
            }}
          >
            Restart Down
          </button>
        </div>
      </div>

      {/* Service Status Grid */}
      <div
        className="p-4 rounded-xl space-y-3"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
      >
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
          Service Status
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {services.map((svc) => (
            <div
              key={svc.name}
              className="flex items-center justify-between p-3 rounded-lg"
              style={{
                background: svc.status === "running" ? "rgba(16,185,129,0.05)" : "rgba(239,68,68,0.05)",
                border: `1px solid ${
                  svc.status === "running" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)"
                }`,
              }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: statusColor(svc.status) }}
                />
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate">{svc.name}</div>
                  <div
                    className="text-[10px] truncate"
                    style={{ color: statusColor(svc.status) }}
                  >
                    {svc.status}
                  </div>
                </div>
              </div>
              {svc.status !== "running" && (
                <button
                  onClick={() => handleRestart(svc.name)}
                  className="px-2 py-1 rounded text-[10px] font-medium flex-shrink-0"
                  style={{
                    background: "rgba(99,102,241,0.15)",
                    color: "#818cf8",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Restart
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Port Check Results */}
      {checks.length > 0 && (
        <div
          className="p-4 rounded-xl space-y-3"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
        >
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            Port Checks
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {checks.map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: statusColor(c.alive || c.status === "ok" ? "up" : "down") }}
                />
                <span style={{ color: "var(--text-secondary)" }}>{c.name || c.port || `check-${i}`}</span>
                <span style={{ color: "var(--text-muted)" }}>:{c.port}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Health History Timeline */}
      <div
        className="p-4 rounded-xl space-y-3"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
      >
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
          Event History
          <span className="ml-2 font-normal text-[10px]" style={{ color: "var(--text-muted)" }}>
            Last {history.length} events
          </span>
        </h3>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {history.length === 0 && (
            <div className="text-xs py-4 text-center" style={{ color: "var(--text-muted)" }}>
              No health events yet
            </div>
          )}
          {history.map((h, i) => (
            <div key={i} className="flex items-center gap-2 text-xs py-1">
              <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 10 }}>
                {h.time}
              </span>
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: statusColor(h.status) }}
              />
              <span style={{ color: "var(--text-secondary)" }}>{h.service}</span>
              <span
                className="text-[10px] px-1 py-0.5 rounded"
                style={{
                  background:
                    h.status === "up" || h.status === "running"
                      ? "rgba(16,185,129,0.1)"
                      : "rgba(239,68,68,0.1)",
                  color:
                    h.status === "up" || h.status === "running"
                      ? "#10b981"
                      : "#ef4444",
                }}
              >
                {h.status}
              </span>
              {h.error && (
                <span className="text-[10px]" style={{ color: "#f59e0b" }}>
                  {h.error}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
