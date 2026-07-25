import { useState, useEffect, useCallback } from "react";
import { useToast } from "./ToastContext";
import { apiFetch } from "../hooks/useApi";

const API_BASE = "";

export function SkillsManager() {
  const { toast } = useToast();
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [originFilter, setOriginFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillDesc, setNewSkillDesc] = useState("");
  const [newSkillCategory, setNewSkillCategory] = useState("");

  const loadSkills = useCallback(async () => {
    try {
      const data = await apiFetch("/api/skills");
      setSkills(data.skills || []);
      setLoading(false);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const categories = ["all", ...new Set(skills.map((s) => s.category || "Uncategorized"))].sort();
  const origins = ["all", ...new Set(skills.map((s) => s.origin || "unknown"))].sort();

  const filtered = skills.filter((s) => {
    if (categoryFilter !== "all" && s.category !== categoryFilter) return false;
    if (originFilter !== "all" && s.origin !== originFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const name = (s.name || "").toLowerCase();
      const desc = (s.description || "").toLowerCase();
      const content = (s.content || "").toLowerCase();
      if (!name.includes(q) && !desc.includes(q) && !content.includes(q)) return false;
    }
    return true;
  });

  const handleDelete = async (name) => {
    if (!confirm(`Delete skill "${name}"?`)) return;
    try {
      await apiFetch(`/api/skills/${encodeURIComponent(name)}`, { method: "DELETE" });
      setSkills((prev) => prev.filter((s) => s.name !== name));
      if (selected?.name === name) setSelected(null);
      toast(`Deleted skill "${name}"`, "success");
    } catch (e) {
      toast(`Delete failed: ${e.message}`, "error");
    }
  };

  const handleAddSkill = async (e) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;
    try {
      const data = await apiFetch("/api/skills", {
        method: "POST",
        body: {
          name: newSkillName.trim(),
          description: newSkillDesc.trim(),
          category: newSkillCategory.trim() || "Uncategorized",
        },
      });
      setSkills((prev) => [...prev, data.skill]);
      setAddOpen(false);
      setNewSkillName("");
      setNewSkillDesc("");
      setNewSkillCategory("");
      toast(`Added skill "${newSkillName.trim()}"`, "success");
    } catch (e) {
      toast(`Add failed: ${e.message}`, "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg" style={{ color: "var(--text-muted)" }}>Loading skills...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-400">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4" style={{ color: "var(--text-primary)" }}>
      {/* Header + Add button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Skills Manager</h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {skills.length} skills loaded — {filtered.length} shown
          </p>
        </div>
        <button
          onClick={() => setAddOpen(!addOpen)}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{
            background: "linear-gradient(135deg, #6366f1, #22d3ee)",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          {addOpen ? "Cancel" : "+ Add Skill"}
        </button>
      </div>

      {/* Add form */}
      {addOpen && (
        <form
          onSubmit={handleAddSkill}
          className="p-4 rounded-xl space-y-3"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
        >
          <input
            placeholder="Skill name *"
            value={newSkillName}
            onChange={(e) => setNewSkillName(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{
              background: "var(--bg-base)",
              border: "1px solid var(--border-color)",
              color: "var(--text-primary)",
              outline: "none",
            }}
          />
          <input
            placeholder="Description"
            value={newSkillDesc}
            onChange={(e) => setNewSkillDesc(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{
              background: "var(--bg-base)",
              border: "1px solid var(--border-color)",
              color: "var(--text-primary)",
              outline: "none",
            }}
          />
          <input
            placeholder="Category (optional)"
            value={newSkillCategory}
            onChange={(e) => setNewSkillCategory(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{
              background: "var(--bg-base)",
              border: "1px solid var(--border-color)",
              color: "var(--text-primary)",
              outline: "none",
            }}
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              background: "linear-gradient(135deg, #6366f1, #22d3ee)",
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            Create Skill
          </button>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          placeholder="Search skills..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 rounded-lg text-sm"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            color: "var(--text-primary)",
            outline: "none",
          }}
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            color: "var(--text-primary)",
            outline: "none",
          }}
        >
          {categories.map((c) => (
            <option key={c} value={c}>{c === "all" ? "All Categories" : c}</option>
          ))}
        </select>
        <select
          value={originFilter}
          onChange={(e) => setOriginFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            color: "var(--text-primary)",
            outline: "none",
          }}
        >
          {origins.map((o) => (
            <option key={o} value={o}>{o === "all" ? "All Origins" : o}</option>
          ))}
        </select>
      </div>

      {/* Main layout: list + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Skills list */}
        <div className="lg:col-span-2 space-y-1 overflow-auto max-h-[80vh]">
          {filtered.length === 0 && (
            <div className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>
              No skills match your filters.
            </div>
          )}
          {filtered.map((skill) => (
            <div
              key={skill.name}
              onClick={() => setSelected(skill)}
              className="flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all group"
              style={{
                background: selected?.name === skill.name ? "var(--accent-bg)" : "var(--bg-card)",
                border: selected?.name === skill.name
                  ? "1px solid var(--accent-color)"
                  : "1px solid transparent",
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{skill.name}</div>
                <div className="text-xs leading-relaxed mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {skill.description || "No description"}
                </div>
                <div className="flex gap-2 mt-1">
                  {skill.category && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--tag-bg)", color: "var(--tag-color)" }}>
                      {skill.category}
                    </span>
                  )}
                  {skill.origin && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--tag-bg-alt)", color: "var(--tag-color-alt)" }}>
                      {skill.origin}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(skill.name); }}
                className="ml-2 p-1.5 rounded-lg text-xs opacity-0 group-hover:opacity-100 hover:bg-red-500/20"
                style={{ color: "var(--text-muted)" }}
                title="Delete skill"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-3">
          {selected ? (
            <div
              className="p-4 rounded-xl h-full overflow-auto max-h-[70vh]"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold">{selected.name}</h3>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>{selected.description}</p>
                  <div className="flex gap-2 mt-1">
                    {selected.category && (
                      <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--tag-bg)", color: "var(--tag-color)" }}>
                        {selected.category}
                      </span>
                    )}
                    {selected.origin && (
                      <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--tag-bg-alt)", color: "var(--tag-color-alt)" }}>
                        {selected.origin}{selected.version ? ` v${selected.version}` : ""}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(selected.name)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: "rgba(239,68,68,0.15)",
                    color: "#ef4444",
                    border: "1px solid rgba(239,68,68,0.3)",
                    cursor: "pointer",
                  }}
                >
                  Delete
                </button>
              </div>
              <div
                className="prose prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap"
                style={{ color: "var(--text-secondary)" }}
              >
                {selected.content || "No content"}
              </div>
            </div>
          ) : (
            <div
              className="flex items-center justify-center h-64 rounded-xl text-sm"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", color: "var(--text-muted)" }}
            >
              Select a skill to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
