import { LayoutDashboard, Server, Activity, Globe, BookOpen, HeartPulse } from "lucide-react";

const MOBILE_ITEMS = [
  { id: "overview", label: "Home", icon: LayoutDashboard },
  { id: "services", label: "Services", icon: Server },
  { id: "system", label: "System", icon: Activity },
  { id: "health", label: "Health", icon: HeartPulse },
  { id: "web", label: "Web", icon: Globe },
  { id: "skills", label: "Skills", icon: BookOpen },
];

export function MobileNav({ activeTab, onTabChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 py-1 border-t" style={{
      background: "var(--bg-sidebar-mobile, rgba(2,6,23,0.95))",
      borderColor: "rgba(100,116,139,0.15)",
      backdropFilter: "blur(12px)",
    }}>
      {MOBILE_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={(e) => { e.preventDefault(); onTabChange(item.id); }}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] transition-all rounded-lg no-underline"
            style={{
              color: isActive ? "var(--accent-color, #818cf8)" : "var(--text-muted, #94a3b8)",
              background: isActive ? "rgba(99,102,241,0.1)" : "transparent",
              cursor: "pointer",
            }}
            role="button"
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="w-5 h-5" />
            <span>{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
