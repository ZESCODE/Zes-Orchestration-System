import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { ExternalLink, Server, Activity, Layout, Router } from "lucide-react";

const ICONS = {
  router: Router,
  activity: Activity,
  layout: Layout,
  "bar-chart": Activity,
  terminal: Server,
  chat: Activity,
  code: Activity,
  "trending-up": Activity,
};

const SERVICE_LINKS = {
  ninerouter: "http://localhost:20128/dashboard",
  "hermes-dash": "http://localhost:9119",
  zes: "http://localhost:8083",
  dashboard: "http://localhost:5050",
  openclaw: "http://localhost:5900",
  hermes: "http://localhost:7070",
};

export function ZESDashboard() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState(null);

  useEffect(() => {
    const fetchHealth = () => {
      fetch("/api/health/all")
        .then(r => r.json())
        .then(data => {
          setHealth(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
      fetch("/api/services")
        .then(r => r.json())
        .then(data => {
          if (data.services) setServices(data.services);
        })
        .catch(() => {});
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  if (!health) {
    return <p className="text-sm text-muted-foreground">Could not fetch ZES health data</p>;
  }

  const svcList = services || [];
  const svcMap = {};
  svcList.forEach(s => { svcMap[s.id] = s; });

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2 px-3 pt-3">
            <CardTitle className="text-xs flex items-center gap-2">
              <Server className="h-3.5 w-3.5" /> Online
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-lg font-bold text-green-400">{health.online}
              <span className="text-xs text-muted-foreground font-normal">/{health.count}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Object.entries(health.services || {}).map(([id, status]) => {
          const info = svcMap[id] || {};
          const Icon = ICONS[info.icon] || Activity;
          const isOnline = status === "online";
          const link = SERVICE_LINKS[id];

          return (
            <Card key={id} className={isOnline ? "border-green-500/20" : "border-red-500/10"}>
              <CardHeader className="pb-2 px-3 pt-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs flex items-center gap-2 truncate pr-2">
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {info.name || id}
                  </CardTitle>
                  <Badge variant={isOnline ? "default" : "secondary"} className="shrink-0 text-[10px]">
                    {isOnline ? "Online" : "Offline"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="flex items-center justify-between">
                  {info.port && (
                    <code className="text-[10px] text-muted-foreground">port {info.port}</code>
                  )}
                  {isOnline && link && (
                    <a href={link} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </a>
                  )}
                </div>
                {info.desc && (
                  <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{info.desc}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
