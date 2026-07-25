import { useState } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";
import {
  Brain, Loader2, Sparkles, CheckCircle2, Clock,
  ArrowRight, X, AlertCircle, Plus, ListChecks
} from "lucide-react";

const PRIORITY_MAP = {
  0: { label: "Low", color: "text-slate-400", bg: "bg-slate-500/10" },
  1: { label: "Medium", color: "text-blue-400", bg: "bg-blue-500/10" },
  2: { label: "High", color: "text-amber-400", bg: "bg-amber-500/10" },
  3: { label: "Urgent", color: "text-red-400", bg: "bg-red-500/10" },
};

export function PlanPanel({ open, onClose, onCreateTasks }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState(null);

  const generatePlan = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    setPlan(null);
    try {
      const res = await fetch("http://localhost:5002/api/teams/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model: "groq/llama-3.3-70b-versatile",
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setPlan(data);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTasks = async () => {
    if (!plan?.steps) return;
    try {
      const res = await fetch("http://localhost:5002/api/teams/plan/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps: plan.steps }),
      });
      const data = await res.json();
      if (data.tasks) {
        onCreateTasks?.(data.tasks);
        setPlan(null);
        setPrompt("");
        onClose?.();
      }
    } catch (e) {
      setError(e.message);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#020617] border-l border-[rgba(100,116,139,0.2)] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(100,116,139,0.15)]">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">AI Plan Generator</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Prompt Input */}
        <div className="p-4 border-b border-[rgba(100,116,139,0.1)]">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what you want to build or fix..."
            disabled={loading}
            rows={3}
            className="w-full bg-muted border rounded-lg px-3 py-2 text-sm resize-none outline-none focus:ring-1 focus:ring-primary/50 mb-2 text-foreground placeholder:text-muted-foreground/50"
          />
          <Button
            onClick={generatePlan}
            disabled={!prompt.trim() || loading}
            className="w-full gap-2"
            size="sm"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Generate Plan</>
            )}
          </Button>
        </div>

        {/* Plan Results */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {error && (
            <div className="flex items-start gap-2 text-destructive text-xs p-3 bg-destructive/10 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loading && !plan && (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
              <p className="text-sm text-muted-foreground">Analyzing your request...</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Generating structured plan via Llama 3.3</p>
            </div>
          )}

          {plan && (
            <>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium">{plan.steps?.length || 0} steps</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>~{plan.total_estimated_minutes}m</span>
                </div>
              </div>

              {plan.steps?.map((step, i) => {
                const pri = PRIORITY_MAP[step.priority] || PRIORITY_MAP[0];
                return (
                  <div key={i} className="glow-border rounded-lg p-3 bg-muted/20 border">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-primary shrink-0">#{i + 1}</span>
                        <h4 className="text-sm font-medium truncate">{step.title}</h4>
                      </div>
                      <Badge variant="outline" className={cn("text-[9px] h-4 shrink-0", pri.color)}>
                        {pri.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">{step.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="h-3 w-3 text-muted-foreground/60" />
                      <span className="text-[10px] text-muted-foreground/60">{step.estimated_minutes}m</span>
                      <Badge variant="secondary" className="text-[9px] h-4 ml-auto">Todo</Badge>
                    </div>
                  </div>
                );
              })}

              <Button
                onClick={handleCreateTasks}
                className="w-full gap-2 mt-2"
                variant="default"
              >
                <Plus className="h-4 w-4" />
                Create {plan.steps?.length || 0} Tasks in Board
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
