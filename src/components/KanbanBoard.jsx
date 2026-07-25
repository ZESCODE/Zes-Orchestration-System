import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, X, GripVertical, Circle, AlertCircle, CheckCircle2,
  Clock, ArrowRight, Trash2, MessageSquare, User, Edit3,
  Loader2, Columns, List, ChevronDown, ChevronUp, Archive, Brain, Sparkles, ListChecks,
  GitBranch, ExternalLink
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";
import { PlanPanel } from "./PlanPanel";

const API = "http://localhost:5002";

const COLUMNS = [
  { id: "triage",    label: "Triage",   color: "bg-gray-500",   icon: "🔍" },
  { id: "todo",      label: "To Do",    color: "bg-blue-500",   icon: "📋" },
  { id: "scheduled", label: "Scheduled",color: "bg-purple-500", icon: "📅" },
  { id: "ready",     label: "Ready",    color: "bg-emerald-500",icon: "✅" },
  { id: "running",   label: "Running",  color: "bg-amber-500",  icon: "⚡" },
  { id: "blocked",   label: "Blocked",  color: "bg-red-500",    icon: "🚫" },
  { id: "review",    label: "Review",   color: "bg-cyan-500",   icon: "👁" },
  { id: "done",      label: "Done",     color: "bg-green-600",  icon: "✓" },
];

const PRIORITY_LABELS = { 0: "Low", 1: "Medium", 2: "High", 3: "Urgent" };
const PRIORITY_COLORS = { 0: "text-slate-400", 1: "text-blue-400", 2: "text-amber-400", 3: "text-red-400" };

const PACT_TYPE_LABELS = { feature: "Feature", bug: "Bug", task: "Task", architecture: "Architecture" };
const PACT_TYPE_COLORS = { feature: "bg-blue-500", bug: "bg-red-500", task: "bg-amber-500", architecture: "bg-purple-500" };
const PACT_STATUS_LABELS = { pending: "Pending", in_progress: "In Progress", completed: "Completed" };

function TaskCard({ task, onStatusChange, onDelete, onEdit }) {
  const [dragging, setDragging] = useState(false);

  const handleDragStart = (e) => {
    setDragging(true);
    e.dataTransfer.setData("text/plain", JSON.stringify({ id: task.id, from: task.status }));
    e.dataTransfer.effectAllowed = "move";
  };

  const age = task.created_at ? Math.floor((Date.now() / 1000 - task.created_at) / 3600) : 0;

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={() => setDragging(false)}
      className={cn(
        "bg-card border rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all group",
        "hover:border-primary/30 hover:shadow-sm",
        dragging && "opacity-50 scale-95",
        task.status === "blocked" && "border-red-500/30",
        task.status === "running" && "border-amber-500/30",
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <GripVertical className="h-3 w-3 text-muted-foreground/40 shrink-0" />
            <span className={cn("text-xs font-medium", PRIORITY_COLORS[task.priority] || "text-muted-foreground")}>
              {PRIORITY_LABELS[task.priority] || "?"}
            </span>
            {task.tenant && (
              <Badge variant="outline" className="text-[9px] h-4 px-1">{task.tenant}</Badge>
            )}
          </div>
          <h4 className="text-sm font-medium leading-tight line-clamp-2">{task.title}</h4>
          {task.body && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.body}</p>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={() => onEdit(task)} className="p-1 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity">
            <Edit3 className="h-3 w-3 text-muted-foreground" />
          </button>
          <button onClick={() => onDelete(task.id)} className="p-1 hover:bg-destructive/20 rounded opacity-0 group-hover:opacity-100 transition-opacity">
            <Trash2 className="h-3 w-3 text-destructive/60" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {task.assignee ? (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {task.assignee}
            </span>
          ) : null}
          {age > 0 && <span>{age}h ago</span>}
        </div>
        <div className="flex gap-0.5">
          {COLUMNS.filter(c => c.id !== task.status).slice(0, 3).map(col => (
            <button
              key={col.id}
              onClick={() => onStatusChange(task.id, task.status, col.id)}
              className={cn(
                "h-5 w-5 rounded flex items-center justify-center text-[9px] opacity-0 group-hover:opacity-100 transition-opacity",
                "hover:bg-muted text-muted-foreground"
              )}
              title={`Move to ${col.label}`}
            >
              <ArrowRight className="h-3 w-3" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({ column, tasks, onStatusChange, onDelete, onEdit, onDrop }) {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (data.id) onDrop(data.id, column.id);
    } catch {}
  };

  return (
    <div
      className={cn("flex flex-col min-w-[220px] w-[220px] shrink-0 rounded-lg border transition-colors",
        dragOver ? "bg-primary/5 border-primary/30" : "bg-muted/20 border-border/50"
      )}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
        <div className="flex items-center gap-1.5">
          <span className={cn("w-2 h-2 rounded-full", column.color)} />
          <span className="text-xs font-semibold">{column.label}</span>
        </div>
        <Badge variant="secondary" className="text-[10px] h-4 px-1">{tasks.length}</Badge>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[100px] max-h-[calc(100vh-300px)]">
        {tasks.map(task => (
          <div key={task.id} className="group">
            <TaskCard task={task} onStatusChange={onStatusChange} onDelete={onDelete} onEdit={onEdit} />
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-8 opacity-50">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
}

function CreateTaskModal({ open, onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState(1);
  const [status, setStatus] = useState("todo");

  if (!open) return null;

  const handleSubmit = () => {
    if (!title.trim()) return;
    onCreate({ title: title.trim(), body, priority, status });
    setTitle(""); setBody(""); setPriority(1); setStatus("todo");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border rounded-xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-sm font-semibold">New Task</h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-muted border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/50" placeholder="Task title..." />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Description</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={3} className="w-full bg-muted border rounded-lg px-3 py-2 text-sm resize-none outline-none focus:ring-1 focus:ring-primary/50" placeholder="Optional description..." />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground block mb-1">Priority</label>
              <select value={priority} onChange={e => setPriority(Number(e.target.value))} className="w-full bg-muted border rounded-lg px-3 py-2 text-sm outline-none">
                <option value={0}>Low</option>
                <option value={1}>Medium</option>
                <option value={2}>High</option>
                <option value={3}>Urgent</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground block mb-1">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-muted border rounded-lg px-3 py-2 text-sm outline-none">
                {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit}>Create Task</Button>
        </div>
      </div>
    </div>
  );
}

function TaskDetailModal({ task, open, onClose, onStatusChange, onDelete }) {
  if (!open || !task) return null;

  const colDef = COLUMNS.find(c => c.id === task.status);
  const pri = PRIORITY_LABELS[task.priority] || "?";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn("w-2 h-2 rounded-full shrink-0", colDef?.color)} />
            <h3 className="text-sm font-semibold truncate">{task.title}</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded shrink-0"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4 space-y-4">
          {task.body && (
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Description</label>
              <p className="text-sm">{task.body}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Status</label>
              <Badge variant="outline">{colDef?.label}</Badge>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Priority</label>
              <Badge variant="outline">{pri}</Badge>
            </div>
            {task.assignee && (
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Assignee</label>
                <span className="text-sm flex items-center gap-1"><User className="h-3 w-3" />{task.assignee}</span>
              </div>
            )}
            {task.codex_session_id && (
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Codex Session</label>
                <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{task.codex_session_id}</code>
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-2 border-t">
            {COLUMNS.filter(c => c.id !== task.status).slice(0, 4).map(col => (
              <Button key={col.id} size="sm" variant="outline" onClick={() => { onStatusChange(task.id, task.status, col.id); onClose(); }}>
                Move to {col.label}
              </Button>
            ))}
            <Button size="sm" variant="destructive" onClick={() => { onDelete(task.id); onClose(); }}>Delete</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PactCard({ pact, onLinkTask, onDelete }) {
  const age = pact.created_at ? Math.floor((Date.now() / 1000 - pact.created_at) / 3600) : 0;
  const typeColor = PACT_TYPE_COLORS[pact.pact_type] || "bg-gray-500";
  const statusLabel = PACT_STATUS_LABELS[pact.status] || pact.status;

  return (
    <div className="bg-card border rounded-lg p-3 hover:border-primary/20 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("w-2 h-2 rounded-full shrink-0", typeColor)} />
          <span className="text-xs font-semibold truncate">{pact.head}</span>
          <Badge variant="outline" className="text-[8px] h-3.5 px-1 shrink-0">{pact.pact_type}</Badge>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onDelete(pact.id)} className="p-0.5 hover:bg-destructive/20 rounded opacity-0 group-hover:opacity-100 transition-opacity">
            <Trash2 className="h-3 w-3 text-destructive/60" />
          </button>
        </div>
      </div>
      {pact.architecture_component_title && (
        <div className="flex items-center gap-1.5 mb-2">
          <GitBranch className="h-3 w-3 text-purple-400" />
          <span className="text-[10px] text-purple-400">{pact.architecture_component_title}</span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Badge variant="outline" className="text-[9px] h-3.5">{statusLabel}</Badge>
          {age > 0 && <span>{age}h ago</span>}
        </div>
        {!pact.linked_task_id ? (
          <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => onLinkTask(pact.id)}>
            <LinkIcon className="h-2.5 w-2.5 mr-1" /> Link Task
          </Button>
        ) : (
          <Badge variant="secondary" className="text-[9px] h-3.5">
            <LinkIcon className="h-2.5 w-2.5 mr-0.5" /> Linked
          </Badge>
        )}
      </div>
    </div>
  );
}

function LinkIcon({ className }) {
  return <ExternalLink className={className} />;
}

// ---- Main Component ----

export function KanbanBoard() {
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [detailTask, setDetailTask] = useState(null);
  const [mobileView, setMobileView] = useState("columns");
  const [expandedCol, setExpandedCol] = useState(null);
  const [integrations, setIntegrations] = useState(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [pacts, setPacts] = useState([]);
  const [showPacts, setShowPacts] = useState(false);
  const [pactMessage, setPactMessage] = useState(null);
  const pollRef = useRef(null);

  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/teams/integrations`);
      if (res.ok) setIntegrations(await res.json());
    } catch {}
  }, []);

  const fetchBoard = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/kanban/board`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBoard(data);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPacts = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/pacts`);
      if (res.ok) {
        const data = await res.json();
        setPacts(data.pacts || []);
      }
    } catch {}
  }, []);

  const linkPactToTask = useCallback(async (pactId) => {
    try {
      const res = await fetch(`${API}/api/pacts/${pactId}/link-task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.pact) {
        setPactMessage(`Linked to task ${data.pact.linked_task_id}`);
        fetchPacts();
        fetchBoard();
        setTimeout(() => setPactMessage(null), 3000);
      }
    } catch {
      setPactMessage("Failed to link");
      setTimeout(() => setPactMessage(null), 3000);
    }
  }, [fetchPacts, fetchBoard]);

  const deletePact = useCallback(async (pactId) => {
    try {
      await fetch(`${API}/api/pacts/${pactId}`, { method: "DELETE" });
      fetchPacts();
    } catch {}
  }, [fetchPacts]);

  useEffect(() => {
    fetchBoard();
    fetchIntegrations();
    fetchPacts();
    pollRef.current = setInterval(() => { fetchBoard(); fetchPacts(); }, 5000);
    return () => clearInterval(pollRef.current);
  }, [fetchBoard, fetchIntegrations, fetchPacts]);
  useEffect(() => {
    const c = () => setIsMobile(window.innerWidth < 768);
    c(); window.addEventListener("resize", c); return () => window.removeEventListener("resize", c);
  }, []);

  const handleStatusChange = async (taskId, fromStatus, toStatus) => {
    if (fromStatus === toStatus) return;
    try {
      const res = await fetch(`${API}/api/kanban/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: toStatus }),
      });
      if (res.ok) fetchBoard();
      else {
        const data = await res.json();
        console.error("Status change failed:", data);
      }
    } catch (e) {
      console.error("Status change error:", e);
    }
  };

  const handleDelete = async (taskId) => {
    try {
      await fetch(`${API}/api/kanban/tasks/${taskId}`, { method: "DELETE" });
      fetchBoard();
    } catch (e) {
      console.error("Delete error:", e);
    }
  };

  const handleCreate = async (taskData) => {
    try {
      const res = await fetch(`${API}/api/kanban/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      });
      if (res.ok) fetchBoard();
    } catch (e) {
      console.error("Create error:", e);
    }
  };

  const handleDrop = async (taskId, toStatus) => {
    try {
      const res = await fetch(`${API}/api/kanban/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: toStatus }),
      });
      if (res.ok) fetchBoard();
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">Failed to load board: {error}</p>
        <Button size="sm" onClick={fetchBoard}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 p-3 md:p-4 gap-3">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {isMobile && (
            <div className="flex border rounded-lg overflow-hidden">
              <button
                onClick={() => setMobileView("columns")}
                className={cn("px-2 py-1 text-xs", mobileView === "columns" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
              >
                <Columns className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setMobileView("list")}
                className={cn("px-2 py-1 text-xs", mobileView === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button size="sm" variant={showPacts ? "default" : "outline"} className="h-8 gap-1.5" onClick={() => setShowPacts(!showPacts)}>
              <GitBranch className="h-4 w-4" /> PACTs
              {pacts.length > 0 && <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-0.5">{pacts.length}</Badge>}
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setPlanOpen(true)}>
              <Brain className="h-4 w-4" /> Plan
            </Button>
            <Button size="sm" className="h-8 gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New Task
            </Button>
          </div>
        </div>
      </div>

      {/* PACT message */}
      {pactMessage && (
        <div className="text-xs text-center py-1.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
          {pactMessage}
        </div>
      )}

      {/* PACT Panel */}
      {showPacts && (
        <div className="shrink-0 border rounded-lg bg-muted/10 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <span className="text-xs font-semibold flex items-center gap-1.5">
              <GitBranch className="h-3.5 w-3.5 text-purple-400" />
              Architecture PACTs
            </span>
            <span className="text-[10px] text-muted-foreground">{pacts.length} total</span>
          </div>
          <div className="p-2 max-h-[200px] overflow-y-auto">
            {pacts.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No PACTs yet. Create from the Architecture Topology page.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {pacts.map(pact => (
                  <div key={pact.id} className="group">
                    <PactCard pact={pact} onLinkTask={linkPactToTask} onDelete={deletePact} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Integrations bar */}
      {integrations && (
        <div className="flex gap-2 mb-0 overflow-x-auto pb-1 shrink-0">
          {Object.entries(integrations).map(([name, info]) => (
            <div key={name} className="flex items-center gap-1.5 bg-muted/30 rounded-lg px-2.5 py-1.5 whitespace-nowrap border border-border/30">
              <span className={`w-1.5 h-1.5 rounded-full ${info.running ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]' : 'bg-red-400/50'}`} />
              <span className="text-[10px] font-medium capitalize">{name}</span>
              <span className="text-[9px] text-muted-foreground">{info.url?.replace('http://localhost:', '')}</span>
            </div>
          ))}
        </div>
      )}

      {/* Stats bar */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 shrink-0">
        {board?.columns?.map(col => (
          <div key={col.name} className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-2.5 py-1.5 whitespace-nowrap">
            <span className={cn("w-2 h-2 rounded-full", COLUMNS.find(c => c.id === col.name)?.color)} />
            <span className="text-[10px] font-medium">{COLUMNS.find(c => c.id === col.name)?.label}</span>
            <span className="text-[10px] text-muted-foreground">{col.tasks.length}</span>
          </div>
        ))}
      </div>

      {/* Board */}
      {isMobile && mobileView === "list" ? (
        <div className="flex-1 overflow-y-auto space-y-1">
          {board?.columns?.map(col => {
            if (col.tasks.length === 0) return null;
            const colDef = COLUMNS.find(c => c.id === col.name);
            const isExpanded = expandedCol === col.name;
            return (
              <div key={col.name} className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedCol(isExpanded ? null : col.name)}
                  className="flex items-center justify-between w-full px-3 py-2 bg-muted/30 text-sm font-medium"
                >
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", colDef?.color)} />
                    <span>{colDef?.label}</span>
                    <Badge variant="secondary" className="text-[10px] h-4">{col.tasks.length}</Badge>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {isExpanded && (
                  <div className="p-2 space-y-2">
                    {col.tasks.map(task => (
                      <TaskCard key={task.id} task={task} onStatusChange={handleStatusChange} onDelete={handleDelete} onEdit={setDetailTask} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex gap-3 overflow-x-auto pb-4">
          {board?.columns?.map(col => (
            <KanbanColumn
              key={col.name}
              column={COLUMNS.find(c => c.id === col.name) || { id: col.name, label: col.name, color: "bg-gray-500" }}
              tasks={col.tasks}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              onEdit={setDetailTask}
              onDrop={handleDrop}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateTaskModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={handleCreate} />
      <TaskDetailModal
        task={detailTask}
        open={!!detailTask}
        onClose={() => setDetailTask(null)}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
      />
      <PlanPanel open={planOpen} onClose={() => setPlanOpen(false)} onCreateTasks={() => fetchBoard()} />
    </div>
  );
}
