from flask import Flask, jsonify, request
from flask_cors import CORS
import yaml as _yaml
import subprocess
import os
import socket
import json
from pathlib import Path as _Path
import time as _time

app = Flask(__name__)

DESIGNS_DIR = _Path.home() / ".designs"
DESIGNS_DIR.mkdir(parents=True, exist_ok=True)
CORS(app)

SERVICES_DIR = "/data/data/com.termux/files/usr/var/service"
SV_BIN = "/data/data/com.termux/files/usr/bin/sv"

def run(cmd, timeout=5):
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return r.stdout.strip() or r.stderr.strip()
    except:
        return ""

def get_service_status(name):
    try:
        result = subprocess.run([SV_BIN, "status", f"{SERVICES_DIR}/{name}"], capture_output=True, text=True, timeout=5)
        output = result.stdout.strip()
        # sv status outputs: "run: service: (pid ...)" or "down: service: ..."
        # "down: service: ...; run: log: ..." means service is down, log is up
        if output.startswith("run:"):
            return {"name": name, "status": "running", "raw": output}
        elif output.startswith("down:"):
            return {"name": name, "status": "stopped", "raw": output}
        else:
            return {"name": name, "status": "unknown", "raw": output}
    except Exception as e:
        return {"name": name, "status": "error", "error": str(e)}


# In-memory health event history
import datetime
import json as _json
import os as _os

health_events = []
_previous_health = {}  # Track service state transitions

def log_event(service, status, detail=""):
    health_events.append({
        "time": datetime.datetime.now().isoformat(),
        "service": service,
        "status": status,
        "detail": detail,
    })
    # Keep last 200 events
    while len(health_events) > 200:
        health_events.pop(0)

def check_port(port):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(0.5)
    try:
        result = s.connect_ex(("127.0.0.1", port))
        return result == 0
    except:
        return False
    finally:
        s.close()

# Health check config - persists state to detect transitions
_HEALTH_STATE_FILE = _Path.home() / ".zes" / "health_state.json"

def _load_health_state():
    try:
        if _HEALTH_STATE_FILE.exists():
            with open(_HEALTH_STATE_FILE) as f:
                return _json.load(f)
    except: pass
    return {}

def _save_health_state(state):
    try:
        _HEALTH_STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(_HEALTH_STATE_FILE, "w") as f:
            _json.dump(state, f)
    except: pass

# Log initial state summary when module loads
def _log_startup():
    ports = {
        "ZES Dashboard": 5050, "Flask API": 5002, "Bridge": 5300,
        "Hermes": 9119, "9Router": 20128, "Codex": 5900,
        "amux": 8822, "Claude Proxy": 5905, "Claude Dashboard": 8788, "Terminal": 7173,
    }
    online = sum(1 for p in ports.values() if check_port(p))
    log_event("system", "info", f"Health monitor started — {online}/{len(ports)} services online")

_log_startup()

@app.route("/api/health")
def health_check():
    """System health check endpoint with port checks"""
    checks = []
    ports = {
        "ZES Dashboard": 5050,
        "Flask API": 5002,
        "Bridge": 5300,
        "Hermes": 9119,
        "9Router": 20128,
        "Codex": 5900,
        "amux": 8822,
        "Claude Proxy": 5905,
        "Claude Dashboard": 8788,
        "Terminal": 7173,
    }

    # Load previous state to detect transitions
    prev = _load_health_state()
    is_first_run = not prev  # Empty dict = no previous state
    changed = False

    for name, port in ports.items():
        alive = check_port(port)
        checks.append({"name": name, "port": port, "alive": alive})

        prev_alive = prev.get(name, None)
        if prev_alive is not None and prev_alive != alive:
            changed = True
            if alive:
                log_event(name, "up", f"Service came online on port {port}")
            else:
                log_event(name, "down", f"Service went offline on port {port}")
        elif is_first_run:
            log_event(name, "start", f"Service {'online' if alive else 'offline'} on port {port}")

        prev[name] = alive

    # Always persist state
    _save_health_state(prev)

    return jsonify({
        "status": "ok",
        "checks": checks,
        "timestamp": datetime.datetime.now().isoformat(),
    })

@app.route("/api/health/events")
def health_events_api():
    """Return health event history"""
    return jsonify({"events": health_events[-100:]})

@app.route("/api/health/clear", methods=["POST"])
def health_clear():
    """Clear health event history"""
    health_events.clear()
    return jsonify({"status": "ok", "cleared": True})


SKILLS_DIR = _Path.home() / ".codex" / "skills"


@app.route("/api/skills")
def list_skills():
    """List all skills with metadata from SKILL.md YAML frontmatter (recursive)"""
    ECC_CATS = {
  "tdd-workflow": "Core Workflow",
  "verification-loop": "Core Workflow",
  "coding-standards": "Core Workflow",
  "error-handling": "Core Workflow",
  "strategic-compact": "Core Workflow",
  "search-first": "Core Workflow",
  "git-workflow": "Core Workflow",
  "browser-qa": "Testing & QA",
  "python-testing": "Testing & QA",
  "e2e-testing": "Testing & QA",
  "benchmark": "Testing & QA",
  "frontend-patterns": "Frontend",
  "react-patterns": "Frontend",
  "react-performance": "Frontend",
  "vite-patterns": "Frontend",
  "frontend-a11y": "Frontend",
  "dashboard-builder": "Frontend",
  "backend-patterns": "Backend",
  "api-design": "Backend",
  "fastapi-patterns": "Backend",
  "postgres-patterns": "Backend",
  "python-patterns": "Backend",
  "database-migrations": "Backend",
  "redis-patterns": "Backend",
  "docker-patterns": "Backend",
  "security-review": "Security",
  "security-scan": "Security",
  "gateguard": "Security",
  "safety-guard": "Security",
  "deep-research": "Research",
  "documentation-lookup": "Research",
  "exa-search": "Research",
  "plan-orchestrate": "Project Workflow",
  "delivery-gate": "Project Workflow",
  "context-budget": "Project Workflow",
  "cost-tracking": "Project Workflow",
  "repo-scan": "Project Workflow",
  "designmd": "Design",
  "freellm": "Free AI",
  "skill-scout": "Discovery",
  "skill-stocktake": "Discovery",
  "agentic-engineering": "Agent",
  "knowledge-ops": "Agent",
  "ecc-integration": "Core Workflow",
  "system-orchestrator": "System",
  "imagegen": "System",
  "openai-docs": "System",
  "plugin-creator": "System",
  "skill-creator": "System",
  "skill-installer": "System",
  "composio-cli": "Integration",
  "flightclaw": "Integration",
  "search-codex-chats": "Integration",
  "telegram-bridge-send": "Integration",
  "twitter-auto-post-shizuku": "Integration",
  "Android Device Access": "System",
  "9router-integration": "Integration"
}
    
    def scan_skills_dir(base_dir, depth=0):
        result = []
        if not base_dir.is_dir():
            return result
        for entry in sorted(base_dir.iterdir()):
            if not entry.is_dir() or entry.name.startswith("."):
                continue
            skill_md = entry / "SKILL.md"
            if skill_md.is_file():
                name = entry.name
                description = ""
                category = ""
                origin = ""
                version = ""
                content = ""
                try:
                    text = skill_md.read_text("utf-8")
                    if text.startswith("---"):
                        parts = text.split("---", 2)
                        if len(parts) >= 3:
                            fm = _yaml.safe_load(parts[1].strip()) or {}
                            name = fm.get("name", name)
                            description = fm.get("description", "")
                            meta = fm.get("metadata", {})
                            if isinstance(meta, dict):
                                category = fm.get("category", meta.get("category", ""))
                                origin = meta.get("origin", "")
                                version = meta.get("version", "")
                            else:
                                category = fm.get("category", "")
                            content = parts[2].strip()
                except Exception as e:
                    content = "Error reading: " + str(e)
                # Infer category from known map or naming pattern
                if not category:
                    category = ECC_CATS.get(name, "")
                if not category:
                    if name.startswith("ZES-") or name.startswith("zes-"):
                        category = "ZES"
                    else:
                        category = "Other"
                if not origin:
                    if name.startswith("ZES-") or name.startswith("zes-"):
                        origin = "ZES"
                    elif name in ECC_CATS:
                        origin = "ECC"
                result.append({
                    "name": name,
                    "path": str(skill_md),
                    "description": description,
                    "category": category,
                    "origin": origin,
                    "version": version,
                    "content": content,
                })
            # Recurse into subdirectories that don't have their own SKILL.md (like shared_skills/)
            elif depth == 0:
                result.extend(scan_skills_dir(entry, depth + 1))
        return result
    
    skills = scan_skills_dir(SKILLS_DIR)
    return jsonify({"skills": skills, "total": len(skills)})





@app.route("/api/services")
def list_services():
    services = []
    if os.path.isdir(SERVICES_DIR):
        for entry in sorted(os.listdir(SERVICES_DIR)):
            srv_path = os.path.join(SERVICES_DIR, entry)
            if os.path.isdir(srv_path) and not entry.startswith("."):
                services.append(get_service_status(entry))
    return jsonify(services)

@app.route("/api/services/<name>/start", methods=["POST"])
def start_service(name):
    try:
        result = subprocess.run([SV_BIN, "up", f"{SERVICES_DIR}/{name}"], capture_output=True, text=True, timeout=10)
        return jsonify({"name": name, "success": result.returncode == 0, "message": result.stdout or result.stderr})
    except Exception as e:
        return jsonify({"name": name, "success": False, "error": str(e)}), 500

@app.route("/api/services/<name>/stop", methods=["POST"])
def stop_service(name):
    try:
        result = subprocess.run([SV_BIN, "down", f"{SERVICES_DIR}/{name}"], capture_output=True, text=True, timeout=10)
        return jsonify({"name": name, "success": result.returncode == 0, "message": result.stdout or result.stderr})
    except Exception as e:
        return jsonify({"name": name, "success": False, "error": str(e)}), 500

@app.route("/api/services/<name>/restart", methods=["POST"])
def restart_service(name):
    try:
        result = subprocess.run([SV_BIN, "restart", f"{SERVICES_DIR}/{name}"], capture_output=True, text=True, timeout=15)
        return jsonify({"name": name, "success": result.returncode == 0, "message": result.stdout or result.stderr})
    except Exception as e:
        return jsonify({"name": name, "success": False, "error": str(e)}), 500

@app.route("/api/system")
def system_info():
    info = {}
    try:
        info["hostname"] = os.uname().nodename
        info["os"] = f"{os.uname().sysname} {os.uname().release}"
        info["termux_version"] = os.environ.get("TERMUX_VERSION", "")
        info["android"] = run(["getprop", "ro.build.version.release"])
        info["android_sdk"] = run(["getprop", "ro.build.version.sdk"])
        info["arch"] = os.uname().machine
        info["device"] = run(["getprop", "ro.product.model"])
        info["manufacturer"] = run(["getprop", "ro.product.manufacturer"])
    except:
        pass
    try:
        mem = run(["free", "-m"]).split("\n")
        info["memory"] = mem
    except:
        pass
    try:
        info["disk"] = run(["df", "-h", "/data"]).split("\n")
    except:
        pass
    try:
        with open("/proc/cpuinfo") as f:
            cores = sum(1 for l in f if l.startswith("processor"))
        info["cpu_cores"] = cores
    except:
        info["cpu_cores"] = 0
    try:
        uptime = run(["uptime"])
        parts = uptime.split("load average:") if "load average:" in uptime else [uptime, ""]
        info["uptime"] = parts[0].strip()
        info["load"] = parts[1].strip() if len(parts) > 1 else ""
    except:
        pass
    try:
        py = run(["python3", "--version"])
        node = run(["node", "--version"])
        npm = run(["npm", "--version"])
        git = run(["git", "--version"])
        info["runtimes"] = {"python": py, "node": node, "npm": npm, "git": git}
    except:
        pass
    try:
        info["uptime_seconds"] = run(["cat", "/proc/uptime"]).split()[0] if run(["cat", "/proc/uptime"]) else ""
    except:
        pass
    return jsonify(info)

@app.route("/api/web-services")
def web_services():
    checks = {
        "9Router (LLM Gateway)": {"port": 20128, "url": "http://localhost:20128"},
        "Hermes Dashboard": {"port": 9119, "url": "http://localhost:9119"},
        "Dev Dashboard": {"port": 5173, "url": "http://localhost:5173"},
        "Flask API": {"port": 5002, "url": "http://localhost:5002"},
        "Codex CLI": {"port": 5900, "url": "http://localhost:5900"},
        "OpenClaude Bridge": {"port": 5300, "url": "http://localhost:5300"},
        "ZES Core": {"port": 8082, "url": "http://localhost:8082"},
        "Polybot": {"port": 8080, "url": "http://localhost:8080"},
        "Cloudflared": {"port": 0, "url": ""},
    }
    results = {}
    for name, cfg in checks.items():
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(1)
        try:
            result = s.connect_ex(("127.0.0.1", cfg["port"]))
            results[name] = {"running": result == 0, "url": cfg["url"]}
        except:
            results[name] = {"running": False, "url": cfg["url"]}
        finally:
            s.close()
    return jsonify(results)

@app.route("/api/processes")
def running_processes():
    try:
        ps = run(["ps", "aux"]).split("\n")
        notable = []
        for line in ps[1:]:
            if not line:
                continue
            parts = line.split()
            if len(parts) < 11:
                continue
            cmd = " ".join(parts[10:])
            cpu = parts[2]
            mem = parts[3]
            pid = parts[1]
            notable.append({"pid": pid, "cpu": cpu, "mem": mem, "cmd": cmd[:80]})
        return jsonify(notable[:30])
    except:
        return jsonify([])

@app.route("/api/network")
def network_info():
    try:
        ifconfig = run(["ifconfig"]).split("\n")
        interfaces = []
        current = None
        for line in ifconfig:
            if line and not line.startswith(" "):
                name = line.split(":")[0] if ":" in line else line.split()[0]
                current = {"interface": name, "address": ""}
                interfaces.append(current)
            elif current and "inet " in line:
                parts = line.strip().split()
                if len(parts) > 1:
                    current["address"] = parts[1]
        return jsonify(interfaces)
    except:
        return jsonify([])

@app.route("/api/battery")
def battery_status():
    try:
        data = run(["termux-battery-status"], timeout=2)
        if data:
            return jsonify({"raw": data})
        return jsonify({"error": "No battery data"})
    except:
        return jsonify({"error": "Battery check failed"})

@app.route("/api/summary")
def summary():
    """Quick summary stats for dashboard overview"""
    summary_data = {}
    try:
        running = 0
        stopped = 0
        if os.path.isdir(SERVICES_DIR):
            for entry in os.listdir(SERVICES_DIR):
                srv_path = os.path.join(SERVICES_DIR, entry)
                if os.path.isdir(srv_path) and not entry.startswith("."):
                    status = get_service_status(entry)
                    if status["status"] == "running":
                        running += 1
                    else:
                        stopped += 1
        summary_data["services"] = {"running": running, "stopped": stopped, "total": running + stopped}

        mem = run(["free", "-m"])
        lines = mem.split("\n")
        if len(lines) > 1:
            parts = lines[1].split()
            if len(parts) > 3:
                summary_data["memory"] = {"total": parts[1], "used": parts[2], "free": parts[3]}

        uptime_str = run(["uptime"])
        if "load average:" in uptime_str:
            uptime_str = uptime_str.split("load average:")[0].strip()
        summary_data["uptime"] = uptime_str

        with open("/proc/cpuinfo") as f:
            summary_data["cpu_cores"] = sum(1 for l in f if l.startswith("processor"))

        batt = run(["termux-battery-status"], timeout=2)
        if batt:
            try:
                import json as j
                batt_data = j.loads(batt)
                summary_data["battery"] = batt_data
            except:
                summary_data["battery"] = {"percentage": "?"}
    except:
        pass
    return jsonify(summary_data)


@app.route("/api/health/all", methods=["GET"])
def health_all_v2():
    """ZES-compatible health endpoint - checks all running web services by port"""
    checks = {
        "9router": {"port": 20128},
        "hermes": {"port": 9119},
        "zes": {"port": 8082},
        "openclaw": {"port": 5000},
        "dashboard": {"port": 5173},
        "hermes-gw": {"port": 0, "pid": "hermes.*gateway"},
    }
    services = {}
    for svc_id, cfg in checks.items():
        if cfg.get("pid"):
            try:
                import subprocess as sp
                r = sp.run(["pgrep", "-f", cfg["pid"]], capture_output=True, text=True, timeout=2)
                services[svc_id] = "online" if r.returncode == 0 else "offline"
            except Exception:
                services[svc_id] = "error"
        else:
            import socket as sock
            s = sock.socket(sock.AF_INET, sock.SOCK_STREAM)
            s.settimeout(1)
            try:
                services[svc_id] = "online" if s.connect_ex(("127.0.0.1", cfg["port"])) == 0 else "offline"
            except Exception:
                services[svc_id] = "error"
            finally:
                s.close()
    return jsonify({
        "services": services,
        "count": len(services),
        "online": sum(1 for v in services.values() if v == "online")
    })


@app.route("/api/designs", methods=["GET"])
def list_designs():
    """List all saved designs"""
    designs = []
    if DESIGNS_DIR.exists():
        for f in sorted(DESIGNS_DIR.iterdir()):
            if f.suffix == ".json":
                try:
                    data = json.loads(f.read_text())
                    designs.append({
                        "id": f.stem,
                        "name": data.get("name", f.stem),
                        "updated": data.get("updated", ""),
                        "preview": data.get("preview", ""),
                    })
                except:
                    pass
    return jsonify(designs)

@app.route("/api/designs/<name>", methods=["GET"])
def get_design(name):
    """Get a specific design"""
    safe = name.replace("/", "_").replace("..", "_")
    path = DESIGNS_DIR / f"{safe}.json"
    if path.exists():
        return jsonify(json.loads(path.read_text()))
    return jsonify({"error": "Design not found"}), 404

@app.route("/api/designs/<name>", methods=["POST"])
def save_design(name):
    """Save/update a design"""
    data = request.get_json() or {}
    import time; data["updated"] = data.get("updated", time.strftime("%Y-%m-%dT%H:%M:%S"))
    safe = name.replace("/", "_").replace("..", "_")
    path = DESIGNS_DIR / f"{safe}.json"
    path.write_text(json.dumps(data, indent=2))
    return jsonify({"status": "ok", "id": safe})

@app.route("/api/designs/<name>", methods=["DELETE"])
def delete_design(name):
    """Delete a design"""
    safe = name.replace("/", "_").replace("..", "_")
    path = DESIGNS_DIR / f"{safe}.json"
    if path.exists():
        path.unlink()
    return jsonify({"status": "ok"})

@app.route("/api/designs/export", methods=["POST"])
def export_design():
    """Export a design as React + Tailwind code"""
    data = request.get_json() or {}
    name = data.get("name", "Component")
    colors = data.get("colors", {})
    typography = data.get("typography", {})
    
    primary = colors.get("primary", "#008cff")
    bg = colors.get("background", "#080c14")
    text = colors.get("text", "#eef5ff")
    card_bg = colors.get("cardBg", "rgba(15,20,35,0.6)")
    
    code = f'''// Generated Design: {name}
// Paste into your React + Tailwind + shadcn/ui project

// tailwind.config extension:
const extend = {{
  colors: {{
    primary: "{primary}",
    "bg-primary": "{bg}",
    "text-primary": "{text}",
    "bg-card": {card_bg},
  }},
  borderRadius: {{
    xl: "12px",
    "2xl": "16px",
  }},
  backdropBlur: {{
    xs: "4px",
  }},
}};

// Theme variables (add to your CSS):
// :root {{
//   --primary: {primary};
//   --bg-primary: {bg};
//   --text-primary: {text};
// }}

export {{ extend as themeConfig }};
'''
    return jsonify({"code": code, "format": "tailwind-config"})


# ---- OpenClaude & Generic Service Management ----
@app.route("/api/health/openclaude")
def openclaude_health():
    """Check if the OpenClaude gRPC service is reachable"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2)
        result = sock.connect_ex(("127.0.0.1", 50051))
        sock.close()
        if result == 0:
            return jsonify({"name": "openclaude", "status": "running", "pid": 0})
        return jsonify({"name": "openclaude", "status": "stopped"}), 503
    except Exception as e:
        return jsonify({"name": "openclaude", "status": "error", "error": str(e)}), 503

@app.route("/api/service/start", methods=["POST"])
def service_start():
    """Start a generic service by running a script"""
    data = request.get_json() or {}
    service = data.get("service", "")
    script = data.get("script", "")
    proj = "/data/data/com.termux/files/home/Documents/Codex/2026-07-12/system-status"
    script_path = os.path.join(proj, script) if script else ""
    
    if not os.path.exists(script_path):
        return jsonify({"service": service, "success": False, "message": f"Script not found: {script_path}"}), 404
    
    try:
        subprocess.Popen(["bash", script_path], start_new_session=True,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return jsonify({"service": service, "success": True, "message": f"Started {service}"})
    except Exception as e:
        return jsonify({"service": service, "success": False, "error": str(e)}), 500

@app.route("/api/service/stop", methods=["POST"])
def service_stop():
    """Stop a service by name (kills matching pids)"""
    data = request.get_json() or {}
    service = data.get("service", "")
    try:
        result = subprocess.run(["pkill", "-f", service], capture_output=True, text=True, timeout=5)
        return jsonify({"service": service, "success": True, "message": f"Stopped {service} (or no process found)"})
    except Exception as e:
        return jsonify({"service": service, "success": False, "error": str(e)}), 500

@app.route("/api/services/all")
def all_services():
    """Comprehensive service status including custom services"""
    services = {}
    
    checks = {
        "dashboard": (5173, "React Dashboard"),
        "api": (5002, "Flask API"),
        "zes": (8082, "ZES Core"),
        "openclaw": (5000, "OpenClaw"),
        "hermes": (9119, "Hermes Agent"),
        "ninerouter": (20128, "9Router AI Gateway"),
        "codex": (5900, "Codex CLI"),
        "openclaude_grpc": (50051, "OpenClaude gRPC"),
    }
    
    for name, (port, label) in checks.items():
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1)
            result = sock.connect_ex(("127.0.0.1", port))
            sock.close()
            services[name] = {"label": label, "port": port, "status": "online" if result == 0 else "offline"}
        except:
            services[name] = {"label": label, "port": port, "status": "error"}
    
    return jsonify({"services": services, "count": len(services)})


# ---- OpenClaude Bridge Management ----

@app.route("/api/health/openclaude-bridge")
def openclaude_bridge_health():
    """Check if the Node.js gRPC bridge is reachable"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2)
        result = sock.connect_ex(("127.0.0.1", 5300))
        sock.close()
        if result == 0:
            return jsonify({"name": "openclaude-bridge", "status": "running", "port": 5300})
        return jsonify({"name": "openclaude-bridge", "status": "stopped", "port": 5300}), 503
    except Exception as e:
        return jsonify({"name": "openclaude-bridge", "status": "error", "error": str(e)}), 503

@app.route("/api/openclaude/bridge/start", methods=["POST"])
def openclaude_bridge_start():
    """Start the OpenClaude gRPC-to-SSE bridge"""
    proj = "/data/data/com.termux/files/home/Documents/Codex/2026-07-12/system-status"
    script_path = os.path.join(proj, "bridge", "start.sh")
    if not os.path.exists(script_path):
        return jsonify({"success": False, "message": "Bridge script not found"}), 404
    try:
        subprocess.Popen(["bash", script_path], start_new_session=True,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return jsonify({"success": True, "message": "Bridge started on port 5300"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/openclaude/bridge/stop", methods=["POST"])
def openclaude_bridge_stop():
    """Stop the OpenClaude bridge"""
    try:
        subprocess.run(["pkill", "-f", "bridge/server.js"], capture_output=True, timeout=5)
        return jsonify({"success": True, "message": "Bridge stopped"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ---- Kanban Board Integration (Hermes) ----

import sys as _kanban_sys
_kanban_sys.path.insert(0, "/data/data/com.termux/files/home/hermes-agent")
try:
    from hermes_cli import kanban_db as _kanban_db
    _KANBAN_AVAILABLE = True
except Exception:
    _KANBAN_AVAILABLE = False


def _kanban_conn(board=None):
    if not _KANBAN_AVAILABLE:
        return None
    try:
        return _kanban_db.connect(board=board)
    except Exception:
        return None


def _task_dict(row):
    if not row:
        return None
    return dict(row)


_KANBAN_COLUMNS = ["triage", "todo", "scheduled", "ready", "running", "blocked", "review", "done"]


@app.route("/api/kanban/board")
def kanban_board():
    """Get the full kanban board state with all columns"""
    conn = _kanban_conn()
    if not conn:
        return jsonify({"error": "Kanban not available"}), 503
    try:
        columns = []
        for col in _KANBAN_COLUMNS:
            rows = conn.execute(
                "SELECT * FROM tasks WHERE status = ? AND status != 'archived' ORDER BY priority DESC, created_at ASC",
                (col,)
            ).fetchall()
            columns.append({"name": col, "tasks": [_task_dict(r) for r in rows]})
        return jsonify({"columns": columns})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route("/api/kanban/tasks", methods=["GET"])
def kanban_list_tasks():
    conn = _kanban_conn()
    if not conn:
        return jsonify({"error": "Kanban not available"}), 503
    try:
        status = request.args.get("status")
        if status:
            rows = conn.execute(
                "SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC", (status,)
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM tasks WHERE status != 'archived' ORDER BY created_at DESC"
            ).fetchall()
        return jsonify({"tasks": [_task_dict(r) for r in rows]})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route("/api/kanban/tasks", methods=["POST"])
def kanban_create_task():
    conn = _kanban_conn()
    if not conn:
        return jsonify({"error": "Kanban not available"}), 503
    try:
        data = request.get_json() or {}
        title = data.get("title", "Untitled")
        body = data.get("body", "")
        target_status = data.get("status", "todo")
        created_by = data.get("created_by", "dashboard")

        # kanban_db.create_task requires initial_status='running' or 'blocked'
        # so we create and then set the desired status
        priority = data.get("priority", 0)
        task_id = _kanban_db.create_task(
            conn,
            title=title,
            body=body or "",
            created_by=created_by,
            priority=priority,
            initial_status="blocked" if target_status == "blocked" else "running",
        )

        if target_status not in ("running", "blocked"):
            conn.execute(
                "UPDATE tasks SET status = ? WHERE id = ?",
                (target_status, task_id),
            )
            conn.commit()

        row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        return jsonify({"task": _task_dict(row), "id": task_id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route("/api/kanban/tasks/<task_id>", methods=["GET"])
def kanban_get_task(task_id):
    conn = _kanban_conn()
    if not conn:
        return jsonify({"error": "Kanban not available"}), 503
    try:
        row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        if not row:
            return jsonify({"error": "Not found"}), 404
        return jsonify({"task": _task_dict(row)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route("/api/kanban/tasks/<task_id>", methods=["PATCH"])
def kanban_update_task(task_id):
    """Update task fields (status, assignee, title, body, priority)"""
    conn = _kanban_conn()
    if not conn:
        return jsonify({"error": "Kanban not available"}), 503
    try:
        data = request.get_json() or {}
        allowed = {"status", "assignee", "title", "body", "priority", "tenant"}
        updates = {k: v for k, v in data.items() if k in allowed}

        if not updates:
            return jsonify({"error": "No valid fields to update"}), 400

        set_parts = []
        params = []
        for key, val in updates.items():
            set_parts.append(f"{key} = ?")
            params.append(val)

        params.append(task_id)
        conn.execute(
            f"UPDATE tasks SET {', '.join(set_parts)} WHERE id = ?",
            params,
        )
        conn.commit()

        row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        return jsonify({"task": _task_dict(row)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route("/api/kanban/tasks/<task_id>", methods=["DELETE"])
def kanban_delete_task(task_id):
    conn = _kanban_conn()
    if not conn:
        return jsonify({"error": "Kanban not available"}), 503
    try:
        conn.execute("UPDATE tasks SET status = 'archived' WHERE id = ?", (task_id,))
        conn.commit()
        return jsonify({"status": "archived"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route("/api/kanban/stats")
def kanban_stats():
    conn = _kanban_conn()
    if not conn:
        return jsonify({"error": "Kanban not available"}), 503
    try:
        by_status = {}
        for col in _KANBAN_COLUMNS:
            count = conn.execute(
                "SELECT COUNT(*) as c FROM tasks WHERE status = ?", (col,)
            ).fetchone()
            by_status[col] = count["c"] if count else 0
        total = sum(by_status.values())
        return jsonify({"by_status": by_status, "total": total})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# ---- Hermes Chat Proxy ----

_HERMES_TOKEN = None
_HERMES_TOKEN_AT = 0
_HERMES_BASE = "http://127.0.0.1:9119"


def _hermes_token():
    global _HERMES_TOKEN, _HERMES_TOKEN_AT
    import time
    if time.time() - _HERMES_TOKEN_AT > 300:
        try:
            import urllib.request
            resp = urllib.request.urlopen(f"{_HERMES_BASE}/chat", timeout=5)
            html = resp.read().decode()
            import re
            m = re.search(r'__HERMES_SESSION_TOKEN__="([^"]+)"', html)
            if m:
                _HERMES_TOKEN = m.group(1)
                _HERMES_TOKEN_AT = time.time()
        except:
            pass
    return _HERMES_TOKEN


def _hermes_headers():
    token = _hermes_token()
    if token:
        return {"Authorization": f"Bearer {token}"}
    return {}


@app.route("/api/hermes/sessions")
def hermes_list_sessions():
    """List Hermes chat sessions"""
    import urllib.request, json as _json
    try:
        req = urllib.request.Request(f"{_HERMES_BASE}/api/sessions", headers=_hermes_headers())
        resp = urllib.request.urlopen(req, timeout=5)
        data = _json.loads(resp.read())
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e), "sessions": []}), 500


@app.route("/api/hermes/sessions/<session_id>/messages")
def hermes_session_messages(session_id):
    """Get messages for a Hermes session"""
    import urllib.request, json as _json
    try:
        req = urllib.request.Request(
            f"{_HERMES_BASE}/api/sessions/{session_id}/messages",
            headers=_hermes_headers(),
        )
        resp = urllib.request.urlopen(req, timeout=5)
        data = _json.loads(resp.read())
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e), "messages": []}), 500


@app.route("/api/hermes/sessions/stats")
def hermes_session_stats():
    """Get session stats"""
    import urllib.request, json as _json
    try:
        req = urllib.request.Request(f"{_HERMES_BASE}/api/sessions/stats", headers=_hermes_headers())
        resp = urllib.request.urlopen(req, timeout=5)
        data = _json.loads(resp.read())
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ═══ Codex Integration ═══

_CODEX_BASE = "http://localhost:5900"


def _codex_headers():
    return {
        "Content-Type": "application/json",
        "Authorization": "Bearer zen-proxy-token",
    }


@app.route("/api/codex/status")
def codex_status():
    """Check if Codex CLI is running and healthy"""
    import urllib.request, json as _json
    try:
        req = urllib.request.Request(f"{_CODEX_BASE}/", headers=_codex_headers())
        resp = urllib.request.urlopen(req, timeout=3)
        return jsonify({
            "running": True,
            "status_code": resp.status,
            "url": _CODEX_BASE,
        })
    except Exception as e:
        return jsonify({
            "running": False,
            "error": str(e),
            "url": _CODEX_BASE,
        })


@app.route("/api/teams/link", methods=["POST"])
def teams_link_codex():
    """Link a Teams task to a Codex or Hermes session"""
    data = request.get_json() or {}
    task_id = data.get("task_id")
    codex_session_id = data.get("codex_session_id")
    hermes_session_id = data.get("hermes_session_id")

    if not task_id:
        return jsonify({"error": "task_id required"}), 400

    conn = _kanban_conn()
    if not conn:
        return jsonify({"error": "Kanban not available"}), 503

    try:
        updates = {}
        if codex_session_id:
            updates["codex_session_id"] = codex_session_id
        if hermes_session_id:
            updates["hermes_session_id"] = hermes_session_id

        if updates:
            set_clauses = ", ".join(f"{k} = ?" for k in updates)
            params = list(updates.values()) + [task_id]
            conn.execute(f"UPDATE tasks SET {set_clauses} WHERE id = ?", params)
            conn.commit()

        row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        return jsonify({"task": _task_dict(row), "linked": bool(updates)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route("/api/teams/integrations")
def teams_integrations():
    """Get integration status for all connected systems"""
    import urllib.request, json as _json

    result = {
        "codex": {"running": False, "url": _CODEX_BASE},
        "hermes": {"running": False, "url": "http://localhost:9119"},
        "bridge": {"running": False, "url": "http://localhost:5300"},
        "ninerouter": {"running": False, "url": "http://localhost:20128"},
    }

    # Check Codex
    try:
        req = urllib.request.Request(f"{_CODEX_BASE}/", headers=_codex_headers())
        urllib.request.urlopen(req, timeout=2)
        result["codex"]["running"] = True
    except:
        pass

    # Check Hermes
    try:
        resp = urllib.request.urlopen(f"http://localhost:9119/", timeout=2)
        result["hermes"]["running"] = resp.status == 200
    except:
        pass

    # Check Bridge
    try:
        resp = urllib.request.urlopen("http://localhost:5300/api/health", timeout=2)
        if resp.status == 200:
            result["bridge"]["running"] = True
    except:
        pass

    # Check 9Router
    try:
        resp = urllib.request.urlopen("http://localhost:20128/", timeout=2)
        result["ninerouter"]["running"] = resp.status == 200
    except:
        pass

    return jsonify(result)


# ═══ Teams Plan Generator ═══
import urllib.request as _plan_req
import json as _plan_json
import uuid as _plan_uuid

NINEROUTER_URL = "http://localhost:20128/v1/chat/completions"
NINEROUTER_KEY = "sk-5aca86dcf572ec2c-i1sljt-f3f84e11"

# LLM7 provider (free tier)
LLM7_URL = "https://api.llm7.io/v1/chat/completions"
LLM7_KEY = "v+hvUot0GC0jBu6J7yomqBvMItaLYHeMnmLf7V3cGqxOjNiLCETrcimVGQ8tqWfHbakRSApXzr8WJILB/VCxJiUcmN3fsAT7CDx7vYq9QVsK40Uyn7l96obB6MPKVGJ5t6bCLnMAMKSmLKp6Sw=="
LLM7_FREE_MODEL = "gemma3:27b"

PLAN_SYSTEM_PROMPT = """You are a technical planning assistant. Given a task description, produce a structured plan as a JSON array of steps.

Each step must have:
- "title": short action title (max 60 chars)
- "description": 1-2 sentence explanation of what to do
- "priority": 0 (low), 1 (medium), 2 (high), or 3 (urgent)
- "status": "todo" (always)
- "estimated_minutes": estimated time in minutes (number)

Respond ONLY with the JSON array. No markdown, no explanation, no code fences. Example:
[{"title":"Setup CI/CD pipeline","description":"Configure GitHub Actions for automated testing and deployment","priority":2,"status":"todo","estimated_minutes":60}]
"""


@app.route("/api/teams/plan", methods=["POST"])
def teams_plan():
    """Generate a plan from a prompt using 9Router (Claude Opus 4.8)"""
    data = request.get_json() or {}
    prompt = data.get("prompt", "").strip()
    model = data.get("model", "groq/llama-3.3-70b-versatile")

    if not prompt:
        return jsonify({"error": "Prompt required"}), 400

    try:
        # Route to correct provider
        if model.startswith("llm7/"):
            actual_model = model.replace("llm7/", "")
            api_url = LLM7_URL
            api_key = LLM7_KEY
        elif model.startswith("groq/"):
            actual_model = model
            api_url = NINEROUTER_URL
            api_key = NINEROUTER_KEY
        else:
            actual_model = model
            api_url = NINEROUTER_URL
            api_key = NINEROUTER_KEY

        body = _plan_json.dumps({
            "model": actual_model,
            "messages": [
                {"role": "system", "content": PLAN_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.3,
            "max_tokens": 4096,
        }).encode()

        req = _plan_req.Request(
            api_url,
            data=body,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
        )

        resp = _plan_req.urlopen(req, timeout=120)
        raw_response = resp.read().decode()
        # Strip any trailing SSE data: [DONE] markers
        if "data: [DONE]" in raw_response:
            raw_response = raw_response.split("data: [DONE]")[0].strip()
        # Handle case where there might be multiple data: lines
        if raw_response.startswith("data: "):
            raw_response = raw_response[6:]
        result = _plan_json.loads(raw_response)

        content = result["choices"][0]["message"]["content"]

        # Try to parse as JSON
        cleaned = content.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[-1]
            cleaned = cleaned.rsplit("```", 1)[0]
        cleaned = cleaned.strip()

        steps = _plan_json.loads(cleaned)

        return jsonify({
            "steps": steps,
            "model": model,
            "total_estimated_minutes": sum(s.get("estimated_minutes", 0) for s in steps),
        })
    except _plan_json.JSONDecodeError as e:
        return jsonify({"error": f"Failed to parse plan: {e}", "raw": content}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/teams/plan/apply", methods=["POST"])
def teams_plan_apply():
    """Create kanban tasks from a generated plan"""
    data = request.get_json() or {}
    steps = data.get("steps", [])

    if not steps:
        return jsonify({"error": "No steps provided"}), 400

    conn = _kanban_conn()
    if not conn:
        return jsonify({"error": "Kanban not available"}), 503

    created = []
    try:
        for step in steps:
            task_id = f"t_{_plan_uuid.uuid4().hex[:8]}"
            conn.execute(
                """INSERT INTO tasks (id, title, body, status, priority, created_by, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (
                    task_id,
                    step.get("title", "Untitled"),
                    step.get("description", ""),
                    step.get("status", "todo"),
                    step.get("priority", 0),
                    "plan-generator",
                    int(_time.time()),
                ),
            )
            created.append(task_id)

        conn.commit()

        # Fetch the created tasks
        rows = conn.execute(
            f"SELECT * FROM tasks WHERE id IN ({','.join('?' * len(created))})",
            created,
        ).fetchall()

        return jsonify({"tasks": [_task_dict(r) for r in rows], "count": len(created)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()



# ---- PACT System (Architecture ↔ Kanban) ----
import uuid as _pact_uuid


PACTS_DIR = _Path.home() / ".zes" / "pacts"
PACTS_DIR.mkdir(parents=True, exist_ok=True)

def _pacts_file():
    return PACTS_DIR / "pacts.json"

def _load_pacts():
    f = _pacts_file()
    if f.exists():
        try:
            return json.loads(f.read_text())
        except Exception:
            return []
    return []

def _save_pacts(pacts):
    _pacts_file().write_text(json.dumps(pacts, indent=2, default=str))


@app.route("/api/pacts", methods=["GET"])
def pacts_list():
    """List all PACTs, optionally filtered by type or component"""
    pacts = _load_pacts()
    pact_type = request.args.get("type")
    component = request.args.get("component")
    status = request.args.get("status")
    if pact_type:
        pacts = [p for p in pacts if p.get("pact_type") == pact_type]
    if component:
        pacts = [p for p in pacts if p.get("architecture_component") == component]
    if status:
        pacts = [p for p in pacts if p.get("status") == status]
    return jsonify({"pacts": pacts})


@app.route("/api/pacts", methods=["POST"])
def pacts_create():
    """Create a new PACT linked to an architecture component"""
    data = request.get_json() or {}
    pact_type = data.get("pact_type", "feature")
    if pact_type not in ("feature", "bug", "task", "architecture"):
        return jsonify({"error": "Invalid pact_type"}), 400

    pact_id = f"pact_{_pact_uuid.uuid4().hex[:8]}"
    pact = {
        "id": pact_id,
        "pact_type": pact_type,
        "head": data.get("head", "Untitled PACT"),
        "body": data.get("body", {}),
        "architecture_component": data.get("architecture_component", ""),
        "architecture_component_title": data.get("architecture_component_title", ""),
        "status": "pending",
        "linked_task_id": None,
        "created_at": _time.time(),
        "updated_at": _time.time(),
    }
    pacts = _load_pacts()
    pacts.append(pact)
    _save_pacts(pacts)
    return jsonify({"pact": pact}), 201


@app.route("/api/pacts/<pact_id>", methods=["GET"])
def pacts_get(pact_id):
    pacts = _load_pacts()
    pact = next((p for p in pacts if p["id"] == pact_id), None)
    if not pact:
        return jsonify({"error": "PACT not found"}), 404
    return jsonify({"pact": pact})


@app.route("/api/pacts/<pact_id>", methods=["PATCH"])
def pacts_update(pact_id):
    data = request.get_json() or {}
    pacts = _load_pacts()
    pact = next((p for p in pacts if p["id"] == pact_id), None)
    if not pact:
        return jsonify({"error": "PACT not found"}), 404
    for field in ("head", "body", "status", "pact_type", "linked_task_id", "architecture_component", "architecture_component_title"):
        if field in data:
            pact[field] = data[field]
    pact["updated_at"] = _time.time()
    _save_pacts(pacts)
    return jsonify({"pact": pact})


@app.route("/api/pacts/<pact_id>", methods=["DELETE"])
def pacts_delete(pact_id):
    pacts = _load_pacts()
    pacts = [p for p in pacts if p["id"] != pact_id]
    _save_pacts(pacts)
    return jsonify({"status": "ok"})


@app.route("/api/pacts/<pact_id>/link-task", methods=["POST"])
def pacts_link_task(pact_id):
    """Link a PACT to an existing kanban task (creates task if needed)"""
    data = request.get_json() or {}
    pacts = _load_pacts()
    pact = next((p for p in pacts if p["id"] == pact_id), None)
    if not pact:
        return jsonify({"error": "PACT not found"}), 404

    task_id = data.get("task_id")
    if not task_id and _KANBAN_AVAILABLE:
        try:
            conn = _kanban_conn()
            task_id = f"t_{_pact_uuid.uuid4().hex[:8]}"
            conn.execute(
                """INSERT INTO tasks (id, title, body, status, priority, created_by, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (task_id, f"[{pact['pact_type'].upper()}] {pact['head']}",
                 json.dumps(pact.get("body", {}), default=str),
                 "todo", 1, "pact-system", int(_time.time())),
            )
            conn.commit()
            conn.close()
        except Exception as e:
            return jsonify({"error": f"Failed to create task: {e}"}), 500

    pact["linked_task_id"] = task_id
    pact["status"] = "in_progress"
    pact["updated_at"] = _time.time()
    _save_pacts(pacts)
    return jsonify({"pact": pact})


@app.route("/api/pacts/from-architecture", methods=["POST"])
def pacts_from_architecture():
    """Bulk-create PACTs from architecture components"""
    data = request.get_json() or {}
    components = data.get("components", [])
    if not components:
        return jsonify({"error": "No components provided"}), 400

    created = []
    pacts = _load_pacts()
    for comp in components:
        pact_id = f"pact_{_pact_uuid.uuid4().hex[:8]}"
        pact = {
            "id": pact_id,
            "pact_type": "architecture",
            "head": comp.get("title", "Untitled"),
            "body": {"purpose": comp.get("purpose", ""),
                     "technologies": comp.get("technologies", {}),
                     "connections": comp.get("connections", []),
                     "dataFlow": comp.get("dataFlow", {})},
            "architecture_component": comp.get("id", ""),
            "architecture_component_title": comp.get("title", ""),
            "status": "pending",
            "linked_task_id": None,
            "created_at": _time.time(),
            "updated_at": _time.time(),
        }
        pacts.append(pact)
        created.append(pact)
    _save_pacts(pacts)
    return jsonify({"pacts": created, "count": len(created)})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5002, debug=False, threaded=True)

@app.route("/api/skills/<path:skill_name>", methods=["DELETE"])
def delete_skill(skill_name):
    """Delete a skill by name (removes the directory)"""
    import shutil as _shutil
    skill_dir = SKILLS_DIR / skill_name
    if not skill_dir.is_dir():
        return jsonify({"error": "Skill '{}' not found".format(skill_name)}), 404
    try:
        _shutil.rmtree(str(skill_dir))
        return jsonify({"status": "ok", "deleted": skill_name})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/skills", methods=["POST"])
def create_skill():
    """Create a new skill with SKILL.md"""
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"error": "name is required"}), 400
    safe_name = name.replace(" ", "-").replace("/", "-").replace("\\", "-")
    skill_dir = SKILLS_DIR / safe_name
    if skill_dir.exists():
        return jsonify({"error": "Skill '{}' already exists".format(safe_name)}), 409
    description = data.get("description", "No description provided.")
    category = data.get("category", "Uncategorized")
    try:
        skill_dir.mkdir(parents=True, exist_ok=True)
        md_lines = [
            "---",
            "name: " + safe_name,
            'description: "' + description + '"',
            "category: " + category,
            "metadata:",
            "  origin: custom",
            "---",
            "",
            "# " + safe_name,
            "",
            description,
            "",
            "## Usage",
            "",
            "Describe when and how to use this skill.",
            "",
        ]
        md_content = "\n".join(md_lines)
        (skill_dir / "SKILL.md").write_text(md_content, "utf-8")
        return jsonify({
            "skill": {
                "name": safe_name,
                "path": str(skill_dir / "SKILL.md"),
                "description": description,
                "category": category,
                "origin": "custom",
                "version": "",
                "content": md_content,
            }
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

