#!/usr/bin/env node
const http = require("http");
const fs = require("fs");
const path = require("path");
const net = require("net");

const PORT = 19996;
const ROOT = __dirname;
const FILE = path.join(ROOT, "index.html");
const LIBS = path.join(ROOT, "libs");

// Ports probed for /api/health — keep in sync with SERVICES in index.html.
// Port 0 entries (bin-only services) are skipped by probe() and count as alive.
const PROBE_PORTS = [
  20128, 8083, 9119, 8084, 8788, 5905, 19997, 5901, 8767, 8002, 8080, 8003,
  8000, 8001, 7173, 9222, 9050, 8090, 8085, 8082, 5002, 8299, 8822, 18923
];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function probe(port) {
  return new Promise((resolve) => {
    if (!port || port <= 0) return resolve(true);
    const sock = net.connect({ port: port, host: "127.0.0.1" });
    let done = false;
    const finish = (ok) => {
      if (!done) { done = true; sock.destroy(); resolve(ok); }
    };
    sock.setTimeout(400);
    sock.once("connect", () => finish(true));
    sock.once("error", () => finish(false));
    sock.once("timeout", () => finish(false));
  });
}

async function health() {
  const results = await Promise.all(PROBE_PORTS.map(probe));
  const alive = {};
  PROBE_PORTS.forEach((p, i) => { alive[p] = results[i]; });
  return { alive: alive, checkedAt: new Date().toISOString() };
}

http.createServer(async (req, res) => {
  const url = (req.url || "/").split("?")[0];

  if (url === "/api/health") {
    try {
      const data = await health();
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      });
      res.end(JSON.stringify(data));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String((e && e.message) || e) }));
    }
    return;
  }

  let filePath;
  if (url === "/" || url === "/index.html") {
    filePath = FILE;
  } else if (url.startsWith("/libs/")) {
    // basename guards against path traversal; libs dir only
    filePath = path.join(LIBS, path.basename(url));
  } else {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  fs.readFile(filePath, (err, buf) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const isLib = filePath.indexOf(LIBS) === 0;
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": isLib ? "public, max-age=86400" : "no-store",
      "X-Content-Type-Options": "nosniff"
    });
    res.end(buf);
  });
}).listen(PORT, "127.0.0.1", () => {
  console.log("ZES 3D Topology at http://127.0.0.1:" + PORT + "/");
});
