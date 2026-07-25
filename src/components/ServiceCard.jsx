import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Play, Square, RotateCcw, Loader2 } from "lucide-react";

const statusCfg = {
  running: { label: "Running", badge: "success", dotClr: "#10b981" },
  stopped: { label: "Stopped", badge: "destructive", dotClr: "#ef4444" },
  error: { label: "Error", badge: "warning", dotClr: "#f59e0b" },
  unknown: { label: "Unknown", badge: "secondary", dotClr: "#64748b" },
};

export function ServiceCard({ service, onControl }) {
  const [loading, setLoading] = useState(null);
  const cfg = statusCfg[service.status] || statusCfg.unknown;
  const act = async (a) => { setLoading(a); await onControl(service.name, a); setLoading(null); };
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium truncate pr-2">{service.name}</CardTitle>
          <Badge variant={cfg.badge}><span className="live-dot" style={{background:cfg.dotClr,boxShadow:`0 0 4px ${cfg.dotClr}`}} />{cfg.label}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-[10px] text-[#64748b] mb-3 truncate font-mono">{service.raw || service.error || "No status info"}</p>
        <div className="flex gap-1.5">
          <Button size="sm" onClick={() => act("start")} disabled={loading || service.status === "running"} className="h-9 text-xs px-3">{loading==="start"?<Loader2 className="h-3.5 w-3.5 animate-spin" />:<Play className="h-3.5 w-3.5" />}Start</Button>
          <Button size="sm" variant="outline" onClick={() => act("stop")} disabled={loading || service.status === "stopped"} className="h-9 text-xs px-3">{loading==="stop"?<Loader2 className="h-3.5 w-3.5 animate-spin" />:<Square className="h-3.5 w-3.5" />}Stop</Button>
          <Button size="sm" variant="outline" onClick={() => act("restart")} disabled={loading} className="h-9 w-9 p-0">{loading==="restart"?<Loader2 className="h-3.5 w-3.5 animate-spin" />:<RotateCcw className="h-3.5 w-3.5" />}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
