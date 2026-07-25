import { useSystemInfo } from "../hooks/useApi";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
export function SystemInfo() {
  const { info, loading } = useSystemInfo();
  if (loading) return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">{[...Array(4)].map((_,i) => <Skeleton key={i} className="h-28" />)}</div>;
  if (!info) return <p className="text-[#64748b] text-sm">Failed to load</p>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">System</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-1">
          {[["OS",info.os],["Host",info.hostname],["Android",info.android],["Arch",info.arch],["Termux",info.termux_version]].map(([l,v]) => <p key={l} className="truncate"><span className="text-[#64748b]">{l}:</span> <span className="text-[#94a3b8]">{v}</span></p>)}
        </CardContent>
      </Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Memory & Disk</CardTitle></CardHeader>
        <CardContent><pre className="text-[10px] whitespace-pre-wrap font-mono text-[#94a3b8] leading-tight">{info.memory}</pre><pre className="text-[10px] whitespace-pre-wrap font-mono text-[#94a3b8] leading-tight mt-1">{info.disk}</pre></CardContent>
      </Card>
    </div>
  );
}
