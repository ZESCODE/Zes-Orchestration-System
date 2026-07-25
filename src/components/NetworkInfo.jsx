import { useNetwork } from "../hooks/useApi";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
export function NetworkInfo() {
  const { net, loading } = useNetwork();
  if (loading) return <Skeleton className="h-24" />;
  if (!net.length) return <p className="text-[#64748b] text-sm">No network data</p>;
  return (
    <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Network Interfaces</CardTitle></CardHeader>
      <CardContent>{net.map((n,i) => <div key={i} className="flex items-center gap-2 text-xs"><span className="font-mono text-[#64748b]">{n.interface}:</span><span className="font-mono text-[#94a3b8]">{n.address}</span></div>)}</CardContent>
    </Card>
  );
}
