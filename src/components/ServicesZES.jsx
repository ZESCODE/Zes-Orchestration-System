import { useState, useEffect } from "react";

const API_BASE = "";

export function ServicesZES() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/services`)
      .then(r => r.json())
      .then(d => { setServices(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const toggleService = (name, action) => {
    fetch(`${API_BASE}/api/services/${name}/${action}`, { method: "POST" })
      .then(r => r.json())
      .then(d => {
        setServices(prev => prev.map(s => s.name === name ? { ...s, status: action === "start" ? "running" : "stopped" } : s));
      });
  };

  if (loading) return <div className="p-4" style={{ color: "var(--text-muted)" }}>Loading services...</div>;

  return (
    <div className="p-4 md:p-6 space-y-3">
      <h2 className="text-lg font-bold">Termux Services</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {services.map(s => (
          <div key={s.name} className="p-3 rounded-lg flex items-center justify-between" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
            <div>
              <div className="text-sm font-medium">{s.name}</div>
              <div className="text-xs" style={{ color: s.status === "running" ? "#22c55e" : "#ef4444" }}>{s.status}</div>
            </div>
            <div className="flex gap-1">
              {s.status === "running" ? (
                <button onClick={() => toggleService(s.name, "stop")} className="px-2 py-1 text-xs rounded" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>Stop</button>
              ) : (
                <button onClick={() => toggleService(s.name, "start")} className="px-2 py-1 text-xs rounded" style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>Start</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
