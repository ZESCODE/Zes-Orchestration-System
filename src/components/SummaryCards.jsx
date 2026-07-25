import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Server, Cpu, HardDrive, Clock, Battery } from "lucide-react";

export function SummaryCards() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/summary").then(r => r.json()).then(setSummary).finally(() => setLoading(false));
    const i = setInterval(() => { fetch("/api/summary").then(r => r.json()).then(setSummary); }, 10000);
    return () => clearInterval(i);
  }, []);

  if (loading) return <div className="grid-4">{[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-xl border border-[rgba(100,116,139,0.15)] bg-[rgba(2,6,23,0.4)] animate-pulse" />)}</div>;

  const cards = [
    { title: "Total Trades", icon: Server, value: summary?.services?.running || 0, sub: `${summary?.services?.total || 0} total`, iconBg: "rgba(99,102,241,0.15)", iconClr: "#818cf8" },
    { title: "Memory", icon: HardDrive, value: summary?.memory?.used || "?", sub: `${summary?.memory?.total || "?"} MB`, iconBg: "rgba(6,182,212,0.15)", iconClr: "#22d3ee" },
    { title: "CPU", icon: Cpu, value: summary?.cpu_cores || "?", sub: "cores", desc: summary?.load || "N/A", iconBg: "rgba(99,102,241,0.15)", iconClr: "#818cf8" },
    { title: "Uptime", icon: Clock, value: "", desc: summary?.uptime || "N/A", battery: summary?.battery ? `🔋 ${summary.battery.percentage}%` : null, iconBg: "rgba(16,185,129,0.15)", iconClr: "#34d399" },
  ];

  return (
    <div className="grid-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <Card key={i} className="stat-card">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background: card.iconBg, color: card.iconClr}}><Icon className="h-3.5 w-3.5" /></div>
              <span className="card-title" style={{margin:0}}>{card.title}</span>
            </div>
            {card.value !== "" ? (
              <><div className="stat-value count-up">{card.value}</div><div className="stat-label">{card.sub || card.desc || ""}</div></>
            ) : (
              <><div className="stat-value text-lg">{card.desc}</div>{card.battery && <div className="stat-label">{card.battery}</div>}</>
            )}
          </Card>
        );
      })}
    </div>
  );
}
