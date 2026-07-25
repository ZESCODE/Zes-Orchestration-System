import { useState, useEffect, useCallback } from "react";
import { ArchitectureTopology } from "./ArchitectureTopology";
import { GitBranch } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { SummaryCards } from "./SummaryCards";
import { ServiceGrid } from "./ServiceGrid";
import { SystemInfo } from "./SystemInfo";
import { WebServices } from "./WebServices";
import { ProcessList } from "./ProcessList";
import { NetworkInfo } from "./NetworkInfo";
import { ZESDashboard } from "./ZESDashboard";
import { IFramePage } from "./IFramePage";
import { DesignStudio } from "./DesignStudio";
import { KanbanBoard } from "./KanbanBoard";
import { ServicesZES } from "./ServicesZES";
import { HermesChat } from "./HermesChat";
import { SkillsManager } from "./SkillsManager";
import { HealthPanel } from "./HealthPanel";
import { ErrorBoundary } from "./ErrorBoundary";
import { ToastProvider } from "./ToastContext";
import { Menu } from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";

export const VALID_TABS = [
  "overview","processes","system","web","network",
  "services","hermes","ninerouter","design","workflows","codexweb",
  "skills","kanban","claude","architecture","health",
];

function LayoutInner() {
  const [activeTab, setActiveTab] = useState(() => { const h = window.location.hash.slice(1); return VALID_TABS.includes(h) ? h : "overview"; });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const c = () => setIsMobile(window.innerWidth < 768);
    c(); window.addEventListener("resize", c); return () => window.removeEventListener("resize", c);
  }, []);
  const handleTabChange = useCallback((t) => { setActiveTab(t); setSheetOpen(false); window.location.hash = t; }, []);
  useEffect(() => {
    const o = () => { const h = window.location.hash.slice(1); if (VALID_TABS.includes(h) && h !== activeTab) setActiveTab(h); };
    window.addEventListener("hashchange", o); return () => window.removeEventListener("hashchange", o);
  }, [activeTab]);

  const tabs = {
    overview: { title: "Dashboard", subtitle: "Real-time system performance", component: SummaryCards },
    processes: { title: "Processes", subtitle: "Running processes", component: ProcessList },
    system: { title: "System Info", subtitle: "Device and OS details", component: SystemInfo },
    web: { title: "Web Services", subtitle: "Access your web UIs", component: WebServices },
    network: { title: "Network", subtitle: "Network interfaces", component: NetworkInfo },
    services: { title: "Services & ZES", subtitle: "Termux services and system health", component: ServicesZES },
    hermes: { title: "Hermes Chat", subtitle: "", component: HermesChat, noPadding: true },
    ninerouter: { title: "9Router", subtitle: "", component: () => <IFramePage url="http://localhost:20128/dashboard" /> },
    design: { title: "Design Studio", subtitle: "Customize your theme", component: DesignStudio },
    workflows: { title: "Workflows", subtitle: "", component: () => <IFramePage url="http://localhost:8083" /> },
    codexweb: { title: "Codex Web", subtitle: "", component: () => <IFramePage url="http://localhost:5900" /> },
    kanban: { title: "Teams", subtitle: "Task management", component: KanbanBoard, noPadding: true },
    skills: { title: "Skills Manager", subtitle: "Browse and manage agent skills", component: SkillsManager },
    claude: { title: "Claude", subtitle: "", component: () => <IFramePage url="http://localhost:5900" />, noPadding: true },
    architecture: { title: "Architecture", subtitle: "ZES system topology", component: ArchitectureTopology, noPadding: true },
    health: { title: "Health Panel", subtitle: "System QC and diagnostics", component: HealthPanel },
  };

  const Tab = tabs[activeTab];
  const Content = Tab?.component || SummaryCards;

  const content = (
    <main className="flex-1 overflow-auto" style={{background:"var(--bg-base)"}}>
      {!Tab?.noPadding && (
        <div className="sticky top-0 z-[var(--z-sticky)] bg-[rgba(2,6,23,0.85)] backdrop-blur-[16px] border-b border-[rgba(100,116,139,0.1)]">
          <div className="flex items-center justify-between px-4 md:px-6 py-3">
            <div className="toolbar" style={{marginBottom:0}}>
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-lg p-[2px]">
                  <div className="bg-black rounded-md w-7 h-7 flex items-center justify-center">
                    <span className="text-white font-extrabold text-sm">Z</span>
                  </div>
                </div>
                <div>
                  <h1 className="page-title" style={{fontSize:22}}>{Tab?.title || "Dashboard"}</h1>
                  {Tab?.subtitle && <p className="page-subtitle">{Tab.subtitle}</p>}
                </div>
              </div>
            </div>
            {isMobile && (
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="h-10 w-10"><Menu className="h-5 w-5" /></Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0 border-r border-[rgba(100,116,139,0.15)] bg-[#020617]">
                  <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>
      )}
      <div className={Tab?.noPadding ? "flex-1 flex flex-col min-h-0" : "p-3 md:p-6" + (isMobile ? " pb-16" : "")}>
        <ErrorBoundary key={activeTab}>
          <Content />
        </ErrorBoundary>
      </div>
    </main>
  );

  if (isMobile) return <div className="flex flex-col h-screen" style={{background:"var(--bg-base)"}}>{content}<MobileNav activeTab={activeTab} onTabChange={handleTabChange} /></div>;
  return <div className="flex h-screen" style={{background:"var(--bg-base)"}}><Sidebar activeTab={activeTab} onTabChange={handleTabChange} />{content}</div>;
}

export function DashboardLayout() {
  return (
    <ToastProvider>
      <LayoutInner />
    </ToastProvider>
  );
}
