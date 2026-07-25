import { useProcesses } from "../hooks/useApi";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
export function ProcessList() {
  const { procs, loading } = useProcesses();
  if (loading) return <Skeleton className="h-48" />;
  if (!procs.length) return <p className="text-[#64748b] text-sm">No process data</p>;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Top Processes</CardTitle></CardHeader>
      <CardContent>
        {procs.map((p, i) => (
          <div key={i} className="flex items-center gap-2 text-[10px] md:text-xs py-1 border-b border-[rgba(100,116,139,0.08)] last:border-0">
            <span className="w-8 text-right text-[#64748b] shrink-0 font-mono">{p.cpu}%</span>
            <span className="w-10 text-right text-[#64748b] shrink-0 font-mono">{p.mem}%</span>
            <span className="truncate font-mono text-[#94a3b8]">{p.cmd}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
