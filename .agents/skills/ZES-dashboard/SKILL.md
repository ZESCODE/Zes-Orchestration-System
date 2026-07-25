---
name: ZES-dashboard
description: Build and maintain the ZES System Dashboard — React 19 + shadcn/ui + Vite 8 + Tailwind CSS v4. Service status, memory viewer, design studio, kanban board.
metadata:
  origin: ZES
  version: 1.0.0
---

# ZES Dashboard

Unified web dashboard for controlling and monitoring the ZES system.

## Stack
- React 19.2.7
- shadcn/ui 4.13.0
- Vite 8.1.1
- Tailwind CSS 4.3.2
- Lucide React icons

## Pages
- Home — System summary
- Services — Service status + controls
- Memory — ZES memory viewer
- Kanban — Task board (shared with Hermes)
- Design Studio — Theme editor
- Settings — Configuration

## Commands
```bash
cd ~/Documents/Codex/2026-07-12/system-status
npm run dev    # http://localhost:5173
npm run build  # Production build
```

## Android Device Stats Panel

Add live Android device statistics to the dashboard via the Flask API backend.

### Backend API Endpoint
Add to the Flask API (`services/flask-api/app.py`):
```python
@app.route('/api/device')
def device_stats():
    import subprocess, json
    stats = {}
    
    # Battery
    try:
        result = subprocess.run(['termux-battery-status'], capture_output=True, text=True)
        battery = json.loads(result.stdout)
        stats['battery'] = {
            'level': battery['percentage'],
            'temperature': battery['temperature'],
            'charging': battery['plugged'] == 'true',
            'health': battery.get('health', 'unknown')
        }
    except: stats['battery'] = {'error': 'unavailable'}
    
    # WiFi
    try:
        result = subprocess.run(['termux-wifi-connectioninfo'], capture_output=True, text=True)
        wifi = json.loads(result.stdout)
        stats['wifi'] = {
            'ssid': wifi.get('ssid', 'N/A'),
            'rssi': wifi.get('rssi', 0),
            'frequency': wifi.get('frequency', 0),
            'speed': wifi.get('link_speed', 'N/A')
        }
    except: stats['wifi'] = {'error': 'unavailable'}
    
    # Storage
    try:
        result = subprocess.run(['df', '-h', os.path.expanduser('~')], capture_output=True, text=True)
        lines = result.stdout.strip().split('\n')
        parts = lines[-1].split()
        stats['storage'] = {
            'total': parts[1], 'used': parts[2], 'avail': parts[3], 'usage': parts[4]
        }
    except: stats['storage'] = {'error': 'unavailable'}
    
    # Device info
    try:
        result = subprocess.run(['termux-device-info'], capture_output=True, text=True)
        info = json.loads(result.stdout)
        stats['device'] = {
            'model': info.get('model', 'N/A'),
            'manufacturer': info.get('manufacturer', 'N/A'),
            'android': info.get('os_version', 'N/A'),
            'uptime': subprocess.run(['uptime', '-p'], capture_output=True, text=True).stdout.strip()
        }
    except: stats['device'] = {'error': 'unavailable'}
    
    return json.dumps(stats)
```

### Frontend Component
Create `src/components/DeviceStats.tsx`:
```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Battery, Wifi, HardDrive, Smartphone } from 'lucide-react'
import { useEffect, useState } from 'react'

interface DeviceData {
  battery: { level: number; temperature: number; charging: boolean }
  wifi: { ssid: string; rssi: number }
  storage: { total: string; used: string; avail: string; usage: string }
  device: { model: string; manufacturer: string; android: string; uptime: string }
}

export function DeviceStats() {
  const [data, setData] = useState<DeviceData | null>(null)
  
  useEffect(() => {
    fetch('/api/device')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
    const interval = setInterval(() => {
      fetch('/api/device').then(r => r.json()).then(setData).catch(() => {})
    }, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])
  
  if (!data) return <Card><CardContent>Loading device stats...</CardContent></Card>
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Android Device
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <Battery className={`h-4 w-4 ${data.battery.level < 20 ? 'text-red-500' : ''}`} />
          <span>{data.battery.level}% {data.battery.charging ? '⚡' : ''}</span>
          <span className="text-xs text-muted-foreground">{data.battery.temperature}°C</span>
        </div>
        <div className="flex items-center gap-2">
          <Wifi className="h-4 w-4" />
          <span>{data.wifi.ssid}</span>
          <span className="text-xs text-muted-foreground">{data.wifi.rssi}dBm</span>
        </div>
        <div className="flex items-center gap-2">
          <HardDrive className="h-4 w-4" />
          <span>{data.storage.avail} free</span>
          <span className="text-xs text-muted-foreground">{data.storage.usage}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Smartphone className="h-4 w-4" />
          <span>{data.device.model}</span>
          <span>{data.device.uptime}</span>
        </div>
      </CardContent>
    </Card>
  )
}
```

## Pair With
- `shared_skills/android` — Full Android device access reference
- `ZES-service-orchestrator` — Battery-aware service management
- `ZES-safety` — Device health pre-flight checks

## Design System
- `DESIGN.md` — Polybot theme variables
- `src/components/ui/` — shadcn components
- Blue glowing borders (Polybot theme)

## QA & Testing (browser-qa)

After building or modifying the dashboard, run browser-based verification using **browser-qa** and **cdp-audit** skills.

### Smoke Test
```bash
browser-harness <<'PY'
new_tab("http://localhost:5050")
import time; time.sleep(2)
info = page_info()
print(f"Title: {info['title']}")
print(f"Size: {info['w']}x{info['h']}")
capture_screenshot("/tmp/dash-smoke.png")
PY
```


### Mobile Viewport Testing
Use CDP device emulation to verify the dashboard on mobile viewports (375x812 = iPhone X/12+): 
```bash
browser-harness <<'PY'
cdp("Emulation.setDeviceMetricsOverride", width=375, height=812, deviceScaleFactor=3, mobile=True)
cdp("Emulation.setUserAgentOverride", userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)")
new_tab("http://localhost:5050")
import time; time.sleep(2)
info = page_info()
print(f"Mobile: {info['title']} @ {info['w']}x{info['h']}")
capture_screenshot("/tmp/dash-mobile.png")
# Reset viewport
cdp("Emulation.clearDeviceMetricsOverride")
cdp("Emulation.setUserAgentOverride", userAgent="")
PY
```

Supported breakpoints: `375x812` (iPhone), `390x844` (iPhone 14/15), `414x896` (iPhone Plus/Max), `360x800` (Galaxy S), `768x1024` (iPad).

### CDP Performance Audit
```bash
# Check console errors, network, performance metrics
python3 -c "
import asyncio, json, websockets, urllib.request
async def audit():
    resp = urllib.request.urlopen('http://127.0.0.1:9222/json')
    targets = json.loads(resp.read())
    tab = next(t for t in targets if t['type'] == 'page' and '5050' in t['url'])
    async with websockets.connect(tab['webSocketDebuggerUrl']) as ws:
        for d in ['Page','Console','Network','Performance']:
            await ws.send(json.dumps({'id':1,'method':d+'.enable'}))
            await ws.recv()
        await ws.send(json.dumps({'id':2,'method':'Page.navigate','params':{'url':'http://localhost:5050'}}))
        await ws.recv(); await asyncio.sleep(2)
        await ws.send(json.dumps({'id':3,'method':'Performance.getMetrics'}))
        r = await ws.recv()
        m = {i['name']:i['value'] for i in json.loads(r)['result']['metrics']}
        print(f'DOM Nodes: {m["DOMNodes"]} | JS Heap: {m["JSHeapUsedSize"]/1024:.0f}KB | Layouts: {m["LayoutCount"]}')
asyncio.run(audit())
"
```

### Visual Regression
When modifying UI components, verify no visual breakage:
```bash
browser-harness <<'PY'
# Check each page loads without console errors
for page in ["/", "/services", "/memory", "/kanban"]:
    new_tab(f"http://localhost:5050{page}")
    import time; time.sleep(1.5)
    info = page_info()
    print(f"{page}: {info['title']} — {info['w']}x{info['h']}")
PY
```

### Required Tools
- `browser-harness` (pip3) — direct CDP browser control
- `cdp-audit` skill — deep CDP diagnostics
- `browser-qa` skill — structured QA workflow
