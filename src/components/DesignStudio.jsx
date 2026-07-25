import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  Save, Download, Upload, Palette, Type, Code, Eye, Copy, Check,
  RotateCcw, Sparkles, Sun, Moon, Trash2, FileJson, Images
} from "lucide-react";

// ── Preset themes ──
const PRESETS = {
  "ZES Dark": {
    colors: { primary: "#008cff", background: "#080c14", text: "#eef5ff", cardBg: "rgba(15,20,35,0.6)", accent: "#22d68c" },
    typography: { fontFamily: "Inter, system-ui, sans-serif", headingFont: "Inter, system-ui, sans-serif", baseSize: "14px", headingWeight: "700" }
  },
  "Deep Indigo": {
    colors: { primary: "#6366f1", background: "#0b0d1a", text: "#e8eeff", cardBg: "rgba(15,18,40,0.6)", accent: "#22d3ee" },
    typography: { fontFamily: "Sora, system-ui, sans-serif", headingFont: "Sora, system-ui, sans-serif", baseSize: "14px", headingWeight: "800" }
  },
  "Cyber Green": {
    colors: { primary: "#00e679", background: "#0a140e", text: "#e0ffe8", cardBg: "rgba(10,25,15,0.6)", accent: "#38bdf8" },
    typography: { fontFamily: "Space Grotesk, monospace", headingFont: "Space Grotesk, monospace", baseSize: "13px", headingWeight: "700" }
  },
  "Warm Amber": {
    colors: { primary: "#f59e0b", background: "#14100a", text: "#ffedd5", cardBg: "rgba(25,18,10,0.6)", accent: "#f472b6" },
    typography: { fontFamily: "Manrope, system-ui, sans-serif", headingFont: "Manrope, system-ui, sans-serif", baseSize: "14px", headingWeight: "800" }
  },
  "Minimal Light": {
    colors: { primary: "#2563eb", background: "#f8fafc", text: "#0f172a", cardBg: "rgba(255,255,255,0.8)", accent: "#10b981" },
    typography: { fontFamily: "Inter, system-ui, sans-serif", headingFont: "Inter, system-ui, sans-serif", baseSize: "14px", headingWeight: "600" }
  },
};

const FONT_PAIRS = [
  { label: "Inter + JetBrains Mono", display: "Inter", mono: "JetBrains Mono" },
  { label: "Sora + Fira Code", display: "Sora", mono: "Fira Code" },
  { label: "Space Grotesk + JetBrains Mono", display: "Space Grotesk", mono: "JetBrains Mono" },
  { label: "Manrope + IBM Plex Mono", display: "Manrope", mono: "IBM Plex Mono" },
  { label: "IBM Plex Sans + IBM Plex Mono", display: "IBM Plex Sans", mono: "IBM Plex Mono" },
];

function loadGoogleFont(font) {
  if (!font || font === "system-ui") return;
  const id = `gf-${font.replace(/\s+/g, "-").toLowerCase()}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/\s+/g, "+")}:wght@400;500;600;700;800&display=swap`;
  document.head.appendChild(link);
}

function injectTheme(colors, typography) {
  const root = document.documentElement;
  root.style.setProperty("--primary", colors.primary);
  root.style.setProperty("--background", colors.background);
  root.style.setProperty("--text", colors.text);
  root.style.setProperty("--card-bg", colors.cardBg);
  root.style.setProperty("--accent", colors.accent);
  root.style.setProperty("--font-family", typography.fontFamily);
  root.style.setProperty("--heading-font", typography.headingFont);
  root.style.setProperty("--base-size", typography.baseSize);
  root.style.setProperty("--heading-weight", typography.headingWeight);
  root.style.setProperty("--bg-base", colors.background);
  root.style.color = colors.text;
  root.style.backgroundColor = colors.background;
}

function ColorInput({ label, value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-8 h-8 rounded border cursor-pointer shrink-0" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono text-xs h-8" />
      <span className="text-xs text-muted-foreground w-16 shrink-0">{label}</span>
    </div>
  );
}

const DEFAULT_COLORS = { primary: "#008cff", background: "#080c14", text: "#eef5ff", cardBg: "rgba(15,20,35,0.6)", accent: "#22d68c" };
const DEFAULT_TYPOGRAPHY = { fontFamily: "Inter, system-ui, sans-serif", headingFont: "Inter, system-ui, sans-serif", baseSize: "14px", headingWeight: "700" };

export function DesignStudio() {
  const [activeTab, setActiveTab] = useState("theme");
  const [designs, setDesigns] = useState([]);
  const [currentDesign, setCurrentDesign] = useState(null);
  const [designName, setDesignName] = useState("");
  const [colors, setColors] = useState(DEFAULT_COLORS);
  const [typography, setTypography] = useState(DEFAULT_TYPOGRAPHY);
  const [exportCode, setExportCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [themeActive, setThemeActive] = useState(false);

  // Load saved designs from API and localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("zes-theme");
    if (stored) {
      try {
        const t = JSON.parse(stored);
        setColors(t.colors || DEFAULT_COLORS);
        setTypography(t.typography || DEFAULT_TYPOGRAPHY);
        setDesignName(t.name || "");
        setCurrentDesign(t);
        injectTheme(t.colors || DEFAULT_COLORS, t.typography || DEFAULT_TYPOGRAPHY);
        setThemeActive(true);
      } catch {}
    }
    fetch("/api/designs").then((r) => r.json()).then(setDesigns).catch(() => {});
  }, []);

  // Load fonts when they change
  useEffect(() => {
    loadGoogleFont(typography.fontFamily.split(",")[0].trim());
    loadGoogleFont(typography.headingFont.split(",")[0].trim());
  }, [typography.fontFamily, typography.headingFont]);

  const showMsg = useCallback((text) => { setMessage(text); setTimeout(() => setMessage(""), 3000); }, []);

  const applyTheme = useCallback(() => {
    injectTheme(colors, typography);
    setThemeActive(true);
    showMsg("Theme applied");
  }, [colors, typography, showMsg]);

  const toggleTheme = useCallback(() => {
    if (themeActive) {
      document.documentElement.style.cssText = "";
      setThemeActive(false);
      showMsg("Theme reset to default");
    } else {
      applyTheme();
    }
  }, [themeActive, applyTheme, showMsg]);

  const saveDesign = useCallback(async () => {
    if (!designName.trim()) return;
    setSaving(true);
    try {
      const resp = await fetch(`/api/designs/${encodeURIComponent(designName)}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: designName, colors, typography }),
      });
      const data = await resp.json();
      if (data.status === "ok") {
        showMsg("Design saved!");
        const list = await fetch("/api/designs").then((r) => r.json());
        setDesigns(list);
        localStorage.setItem("zes-theme", JSON.stringify({ name: designName, colors, typography }));
      }
    } catch (e) {
      showMsg("Save failed: " + e.message);
    }
    setSaving(false);
  }, [designName, colors, typography, showMsg]);

  const loadDesign = useCallback(async (id) => {
    try {
      const resp = await fetch(`/api/designs/${encodeURIComponent(id)}`);
      const data = await resp.json();
      if (data.colors) setColors(data.colors);
      if (data.typography) setTypography(data.typography);
      setDesignName(data.name || id);
      setCurrentDesign(data);
      showMsg(`Loaded: ${data.name || id}`);
    } catch (e) { showMsg("Load failed"); }
  }, [showMsg]);

  const loadPreset = useCallback((name) => {
    const p = PRESETS[name];
    if (!p) return;
    setColors({ ...p.colors });
    setTypography({ ...p.typography });
    setDesignName(name);
    showMsg(`Preset loaded: ${name}`);
  }, [showMsg]);

  const deleteDesign = useCallback(async (id) => {
    try {
      await fetch(`/api/designs/${encodeURIComponent(id)}`, { method: "DELETE" });
      const list = await fetch("/api/designs").then((r) => r.json());
      setDesigns(list);
      if (currentDesign?.name === id) { setCurrentDesign(null); setDesignName(""); }
      showMsg("Design deleted");
    } catch (e) { showMsg("Delete failed"); }
  }, [currentDesign, showMsg]);

  const exportJSON = useCallback(() => {
    const data = JSON.stringify({ name: designName || "Untitled", colors, typography }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${designName || "zes-theme"}.json`; a.click();
    URL.revokeObjectURL(url);
    showMsg("Theme exported as JSON");
  }, [designName, colors, typography, showMsg]);

  const importJSON = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json";
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const d = JSON.parse(ev.target?.result);
          if (d.colors) setColors(d.colors);
          if (d.typography) setTypography(d.typography);
          setDesignName(d.name || "Imported");
          showMsg("Theme imported from JSON");
        } catch { showMsg("Invalid JSON file"); }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [showMsg]);

  const exportDesign = useCallback(() => {
    const code = generateCode(colors, typography, designName);
    setExportCode(code);
    setActiveTab("export");
  }, [colors, typography, designName]);

  const copyCode = useCallback(() => {
    navigator.clipboard?.writeText(exportCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [exportCode]);

  const resetDesign = useCallback(() => {
    setColors(DEFAULT_COLORS);
    setTypography(DEFAULT_TYPOGRAPHY);
    setDesignName("");
    setCurrentDesign(null);
    setThemeActive(false);
    document.documentElement.style.cssText = "";
    showMsg("Reset to defaults");
  }, [showMsg]);

  return (
    <div className="space-y-4 glow-border rounded-xl p-4 md:p-5">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Input placeholder="Design name..." value={designName} onChange={(e) => setDesignName(e.target.value)} className="max-w-xs h-9 text-sm" />
        <Button size="sm" onClick={saveDesign} disabled={saving || !designName.trim()}><Save className="h-3.5 w-3.5 mr-1" /> Save</Button>
        <Button size="sm" variant="outline" onClick={applyTheme}><Palette className="h-3.5 w-3.5 mr-1" /> Apply</Button>
        <Button size="sm" variant="outline" onClick={exportDesign}><Code className="h-3.5 w-3.5 mr-1" /> Export CSS</Button>
        <Button size="sm" variant="outline" onClick={exportJSON}><Download className="h-3.5 w-3.5 mr-1" /> JSON</Button>
        <Button size="sm" variant="outline" onClick={importJSON}><Upload className="h-3.5 w-3.5 mr-1" /> Import</Button>
        <Button size="sm" variant="ghost" onClick={resetDesign}><RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset</Button>
        {message && <Badge variant="outline" className="text-xs">{message}</Badge>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sidebar: Design List + Presets */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2 px-3 pt-3">
            <CardTitle className="text-sm flex items-center gap-2"><Palette className="h-3.5 w-3.5" /> Designs</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-3">
            {/* Theme toggle */}
            <Button size="sm" variant={themeActive ? "default" : "outline"} className="w-full h-8 text-xs" onClick={toggleTheme}>
              {themeActive ? <Sun className="h-3 w-3 mr-1" /> : <Moon className="h-3 w-3 mr-1" />}
              {themeActive ? "Theme Active" : "Theme Inactive"}
            </Button>

            {/* Presets */}
            <div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Presets</span>
              <div className="flex flex-col gap-1 mt-1">
                {Object.keys(PRESETS).map((name) => (
                  <button key={name} onClick={() => loadPreset(name)}
                    className="text-xs text-left px-2 py-1.5 rounded hover:bg-accent/10 transition-colors flex items-center gap-2">
                    <Sparkles className="h-3 w-3 shrink-0 text-muted-foreground" />
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Saved designs */}
            <div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Saved</span>
              <div className="flex flex-col gap-1 mt-1 max-h-40 overflow-y-auto">
                {designs.length === 0 && <p className="text-xs text-muted-foreground">No saved designs</p>}
                {designs.map((d) => (
                  <div key={d.id || d.name} className="flex items-center gap-1">
                    <button onClick={() => loadDesign(d.id || d.name)}
                      className="text-xs flex-1 text-left px-2 py-1.5 rounded hover:bg-accent/10 transition-colors truncate">
                      {d.name}
                    </button>
                    <button onClick={() => deleteDesign(d.id || d.name)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main area */}
        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-3">
              <TabsTrigger value="theme" className="text-xs"><Palette className="h-3.5 w-3.5 mr-1" /> Colors</TabsTrigger>
              <TabsTrigger value="typography" className="text-xs"><Type className="h-3.5 w-3.5 mr-1" /> Typography</TabsTrigger>
              <TabsTrigger value="preview" className="text-xs"><Eye className="h-3.5 w-3.5 mr-1" /> Preview</TabsTrigger>
              <TabsTrigger value="export" className="text-xs"><Code className="h-3.5 w-3.5 mr-1" /> Export</TabsTrigger>
            </TabsList>

            <TabsContent value="theme">
              <Card>
                <CardHeader className="pb-2 px-3 pt-3">
                  <CardTitle className="text-sm">Color Palette</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <ColorInput label="Primary" value={colors.primary} onChange={(v) => setColors({ ...colors, primary: v })} />
                    <ColorInput label="Background" value={colors.background} onChange={(v) => setColors({ ...colors, background: v })} />
                    <ColorInput label="Text" value={colors.text} onChange={(v) => setColors({ ...colors, text: v })} />
                    <ColorInput label="Card BG" value={colors.cardBg} onChange={(v) => setColors({ ...colors, cardBg: v })} />
                    <ColorInput label="Accent" value={colors.accent} onChange={(v) => setColors({ ...colors, accent: v })} />
                  </div>
                  {/* Swatch preview */}
                  <div className="flex gap-2 pt-2">
                    {Object.entries(colors).map(([k, v]) => (
                      <div key={k} className="flex flex-col items-center gap-1">
                        <div className="w-8 h-8 rounded-lg border" style={{ background: v }} />
                        <span className="text-[9px] text-muted-foreground">{k}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="typography">
              <Card>
                <CardHeader className="pb-2 px-3 pt-3">
                  <CardTitle className="text-sm">Typography</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-4">
                  {/* Font pair presets */}
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Font Pair</span>
                    <Select onValueChange={(v) => {
                      const pair = FONT_PAIRS.find((f) => f.label === v);
                      if (pair) setTypography({ ...typography, fontFamily: `${pair.display}, system-ui, sans-serif`, headingFont: `${pair.display}, system-ui, sans-serif` });
                    }}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Choose a font pair..." /></SelectTrigger>
                      <SelectContent>
                        {FONT_PAIRS.map((f) => <SelectItem key={f.label} value={f.label} className="text-xs">{f.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><span className="text-xs text-muted-foreground block mb-1">Display Font</span>
                      <Input value={typography.fontFamily} onChange={(e) => setTypography({ ...typography, fontFamily: e.target.value })} className="font-mono text-xs" /></div>
                    <div><span className="text-xs text-muted-foreground block mb-1">Heading Font</span>
                      <Input value={typography.headingFont} onChange={(e) => setTypography({ ...typography, headingFont: e.target.value })} className="font-mono text-xs" /></div>
                    <div><span className="text-xs text-muted-foreground block mb-1">Base Size</span>
                      <Input value={typography.baseSize} onChange={(e) => setTypography({ ...typography, baseSize: e.target.value })} className="font-mono text-xs" /></div>
                    <div><span className="text-xs text-muted-foreground block mb-1">Heading Weight</span>
                      <Input value={typography.headingWeight} onChange={(e) => setTypography({ ...typography, headingWeight: e.target.value })} className="font-mono text-xs" /></div>
                  </div>
                  <div className="pt-2 space-y-1 p-4 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-bold" style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight }}>Heading Sample</p>
                    <p className="text-sm" style={{ fontFamily: typography.fontFamily, fontSize: typography.baseSize }}>Body text sample with the configured font settings applied. The quick brown fox jumps over the lazy dog.</p>
                    <p className="text-xs font-mono mt-2" style={{ color: colors.accent }}>const status = "operational"; // code sample</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preview">
              <Card>
                <CardHeader className="pb-2 px-3 pt-3">
                  <CardTitle className="text-sm">Live Preview</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="rounded-xl p-6 space-y-4" style={{ background: colors.background, color: colors.text, fontFamily: typography.fontFamily }}>
                    {/* Header */}
                    <div className="flex items-center gap-3 pb-3 border-b" style={{ borderColor: `${colors.primary}22` }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-sm" style={{ background: colors.primary, color: "#fff" }}>Z</div>
                      <div><div className="font-bold" style={{ fontWeight: typography.headingWeight }}>System Status</div><div className="text-xs" style={{ color: `${colors.text}88` }}>All services operational</div></div>
                      <Badge className="ml-auto" style={{ background: colors.accent, color: "#000" }}>Live</Badge>
                    </div>
                    {/* Stats grid */}
                    <div className="grid grid-cols-3 gap-3">
                      {[{ label: "Uptime", val: "99.98%" }, { label: "Latency", val: "42ms" }, { label: "Requests", val: "1.2k/s" }].map((s, i) => (
                        <div key={s.label} className="rounded-xl p-3" style={{ background: colors.cardBg }}>
                          <div className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: `${colors.text}66` }}>{s.label}</div>
                          <div className="text-xl font-extrabold mt-1" style={{ color: i === 1 ? colors.accent : colors.text }}>{s.val}</div>
                        </div>
                      ))}
                    </div>
                    {/* Buttons */}
                    <div className="flex gap-2">
                      <button className="flex-1 py-2 px-4 rounded-lg text-xs font-bold border-none cursor-pointer" style={{ background: colors.primary, color: "#fff" }}>Primary</button>
                      <button className="flex-1 py-2 px-4 rounded-lg text-xs font-bold border-none cursor-pointer" style={{ background: colors.accent, color: "#000" }}>Accent</button>
                    </div>
                    {/* Card */}
                    <div className="rounded-xl p-4 space-y-2" style={{ background: colors.cardBg, border: `1px solid ${colors.primary}22` }}>
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ background: colors.accent }} /><span className="text-xs font-semibold">Card with data</span></div>
                      <p className="text-xs" style={{ color: `${colors.text}99` }}>This preview shows how your design tokens render in context across different component types.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="export">
              <Card>
                <CardHeader className="pb-2 px-3 pt-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Code className="h-3.5 w-3.5" /> Generated Code
                    <Button size="sm" variant="outline" className="ml-auto h-7 text-xs" onClick={copyCode}>
                      {copied ? <><Check className="h-3 w-3 mr-1" /> Copied</> : <><Copy className="h-3 w-3 mr-1" /> Copy</>}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <pre className="text-xs font-mono bg-black/20 p-4 rounded-lg overflow-auto max-h-96 whitespace-pre-wrap">{exportCode || "Click 'Export CSS' to generate code"}</pre>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function generateCode(colors, typography, name) {
  return `/* ${name || "Design Studio"} Theme */
:root {
  --primary: ${colors.primary};
  --background: ${colors.background};
  --text: ${colors.text};
  --card-bg: ${colors.cardBg};
  --accent: ${colors.accent};
  --font-family: ${typography.fontFamily};
  --heading-font: ${typography.headingFont};
  --base-size: ${typography.baseSize};
  --heading-weight: ${typography.headingWeight};
}

body {
  font-family: var(--font-family);
  font-size: var(--base-size);
  background: var(--background);
  color: var(--text);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--heading-font);
  font-weight: var(--heading-weight);
}

.card {
  background: var(--card-bg);
  border: 1px solid color-mix(in srgb, var(--primary) 20%, transparent);
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-accent {
  background: var(--accent);
  color: black;
}`;
}
