export function ArchitectureTopology() {
  return (
    <div className="p-4 md:p-6" style={{ color: "var(--text-primary)" }}>
      <h2 className="text-lg font-bold mb-3">System Architecture</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { title: "Codex CLI", desc: "Primary coding agent", color: "#818cf8" },
          { title: "Hermes Agent", desc: "Memory & orchestration", color: "#22d3ee" },
          { title: "Claude Code", desc: "Secondary coding agent", color: "#f472b6" },
          { title: "9Router", desc: "AI Gateway (port 20128)", color: "#fbbf24" },
          { title: "amux", desc: "Agent Control Plane (port 8822)", color: "#34d399" },
          { title: "ZES Dashboard", desc: "System UI (port 5050)", color: "#a78bfa" },
        ].map(item => (
          <div key={item.title} className="p-4 rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
            <div className="text-lg mb-1" style={{ color: item.color }}>●</div>
            <div className="font-semibold text-sm">{item.title}</div>
            <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
