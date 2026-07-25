import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const addToast = useCallback((message, type = "info", duration = 4000) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    timers.current[id] = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      delete timers.current[id];
    }, duration);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  // Listen for custom error events
  useEffect(() => {
    const handler = (e) => {
      addToast(e.detail?.message || "Unknown error", "error", 6000);
    };
    window.addEventListener("zes:error", handler);
    window.addEventListener("zes:toast", handler);
    return () => {
      window.removeEventListener("zes:error", handler);
      window.removeEventListener("zes:toast", handler);
    };
  }, [addToast]);

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, []);

  const toast = useCallback(
    (message, type = "info") => addToast(message, type),
    [addToast]
  );

  const typeStyles = {
    info: { bg: "rgba(99,102,241,0.15)", border: "rgba(99,102,241,0.3)", icon: "ℹ️" },
    success: { bg: "rgba(16,185,129,0.15)", border: "rgba(16,185,129,0.3)", icon: "✅" },
    error: { bg: "rgba(239,68,68,0.15)", border: "rgba(239,68,68,0.3)", icon: "❌" },
    warning: { bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.3)", icon: "⚠️" },
  };

  return (
    <ToastContext.Provider value={{ toast, toasts, removeToast }}>
      {children}
      <div className="fixed bottom-20 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => {
          const s = typeStyles[t.type] || typeStyles.info;
          return (
            <div
              key={t.id}
              onClick={() => removeToast(t.id)}
              className="pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-xl shadow-lg max-w-sm cursor-pointer transition-all animate-in slide-in-from-right"
              style={{
                background: s.bg,
                border: `1px solid ${s.border}`,
                backdropFilter: "blur(12px)",
                color: "var(--text-primary)",
                fontSize: 13,
                animation: "slideIn 0.25s ease-out",
              }}
            >
              <span>{s.icon}</span>
              <span className="flex-1 leading-relaxed">{t.message}</span>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
