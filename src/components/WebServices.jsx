import { useWebServices } from "../hooks/useApi";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ExternalLink, Globe } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
export function WebServices() {
  const { services, loading } = useWebServices();
  if (loading) return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">{[...Array(3)].map((_,i) => <Skeleton key={i} className="h-20" />)}</div>;
  const e = Object.entries(services);
  if (!e.length) return <p className="text-[#64748b] text-sm">No web services detected</p>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
      {e.map(([n, info]) => (
        <Card key={n}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs flex items-center gap-2 truncate pr-2"><Globe className="h-3.5 w-3.5 shrink-0 text-[#6366f1]" />{n}</CardTitle>
              <Badge variant={info.running ? "success" : "secondary"} className="shrink-0">{info.running ? "Online" : "Offline"}</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <code className="text-[10px] text-[#64748b] truncate mr-2">{info.url}</code>
            {info.running && <a href={info.url} target="_blank" rel="noopener"><Button size="sm" variant="ghost" className="h-10 w-10"><ExternalLink className="h-3.5 w-3.5" /></Button></a>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
