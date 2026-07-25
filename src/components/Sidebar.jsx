import { Terminal, Activity, Cpu, Globe, Network, Server, MessageSquare, Workflow, LayoutDashboard, ListTree, Users, Bot, BookOpen, Settings, Zap, Shield, Cpu as CpuIcon, HeartPulse } from "lucide-react";

const NAV_ITEMS = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "services", label: "Services", icon: Server },
  { id: "system", label: "System Info", icon: CpuIcon },
  { id: "processes", label: "Processes", icon: Activity },
  { id: "web", label: "Web Services", icon: Globe },
  { id: "network", label: "Network", icon: Network },
  { id: "health", label: "Health", icon: HeartPulse },
  { id: "skills", label: "Skills", icon: BookOpen },
  { id: "hermes", label: "Hermes", icon: MessageSquare },
  { id: "ninerouter", label: "9Router", icon: Zap },
  { id: "design", label: "Design", icon: Settings },
  { id: "workflows", label: "Workflows", icon: Workflow },
  { id: "kanban", label: "Teams", icon: Users },
  { id: "claude", label: "Claude", icon: Bot },
  { id: "architecture", label: "Architecture", icon: ListTree },
];

export function Sidebar({ activeTab, onTabChange }) {
  return (
    <aside className="w-56 flex flex-col border-r" style={{
      background: "var(--bg-sidebar, #020617)",
      borderColor: "rgba(100,116,139,0.15)",
    }}>
      <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "rgba(100,116,139,0.1)" }}>
        <div className="bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-lg p-[2px]">
          <div className="bg-black rounded-md w-7 h-7 flex items-center justify-center">
            <span className="text-white font-extrabold text-sm">Z</span>
          </div>
        </div>
        <span className="font-bold text-sm">ZES System</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => { e.preventDefault(); onTabChange(item.id); }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-all no-underline"
              style={{
                color: isActive ? "var(--accent-color, #818cf8)" : "var(--text-muted, #94a3b8)",
                background: isActive ? "rgba(99,102,241,0.08)" : "transparent",
                borderRight: isActive ? "2px solid var(--accent-color, #818cf8)" : "2px solid transparent",
                cursor: "pointer",
              }}
              role="button"
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>
      <div className="px-4 py-3 text-[10px]" style={{ color: "var(--text-muted, #475569)", borderTop: "1px solid rgba(100,116,139,0.1)" }}>
        ZES v3.4.0
      </div>
    </aside>
  );
}
