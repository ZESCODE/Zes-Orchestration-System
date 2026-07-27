#!/usr/bin/env node
/**
 * ZES Claude Proxy v4 — Claude Code → AI-Proxy (OpenAI) translator
 * WITH TokenJuice output compression engine.
 *
 * Receives Anthropic Messages API from Claude Code, compresses tool output
 * via TokenJuice, translates to OpenAI Chat Completions format, forwards
 * to AI-Proxy at :20129.
 *
 * Default model: opencode/deepseek-v4-flash-free
 */
import http from "http";
import tj from "./tokenjuice.js";

const PORT = 5905;
const AI_PROXY_HOST = "127.0.0.1";
const AI_PROXY_PORT = 20129;
const DEFAULT_MODEL = "opencode/deepseek-v4-flash-free";
const TIMEOUT = 120000;

// TokenJuice stats collector — reports savings on shutdown
const stats = tj.createStatsCollector();

/**
 * Apply TokenJuice compression to all content blocks in a message.
 * Targets tool_result blocks (bulky output) and long text blocks.
 */
function compressMessageContent(content) {
  if (!Array.isArray(content)) return content;

  return content.map(block => {
    // ── Compress tool_result content ────────────────
    if (block.type === "tool_result" && block.content) {
      const original = typeof block.content === "string"
        ? block.content
        : block.content.map(c => typeof c === "string" ? c : c.text || "").join("");

      if (original.length >= 100) {
        const result = tj.compress(original, {
          maxLines: 60,       // log: keep last 60 lines
          maxLength: 4000,    // text: keep 60% head + 40% tail within 4k
        });
        stats.record(original, result);

        if (result.compressed !== original && result.compressed.length > 0) {
          return { ...block, content: result.compressed, _compressed: true, _type: result.type, _saved: original.length - result.compressed.length };
        }
      }
      return block;
    }

    // ── Compress long text blocks ───────────────────
    if (block.type === "text" && typeof block.text === "string" && block.text.length >= 1000) {
      const result = tj.compress(block.text, {
        maxLength: 4000,
        maxLines: 80,
      });
      stats.record(block.text, result);
      if (result.compressed !== block.text && result.compressed.length > 0) {
        return { ...block, text: result.compressed, _compressed: true, _type: result.type, _saved: result.saved };
      }
    }

    return block;
  });
}

function anthropicToOpenAI(body) {
  // Compress all messages before translation
  const messages = (body.messages || []).map(m => ({
    ...m,
    content: compressMessageContent(m.content),
  }));

  // Convert to OpenAI format
  const msgs = messages.map(m => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: typeof m.content === "string" ? m.content :
      (m.content || []).map(c => {
        if (typeof c === "string") return c;
        if (c.type === "text") return c.text || "";
        if (c.type === "tool_result") return c.content || "";
        return "";
      }).join(""),
  }));

  // System prompt
  if (body.system) {
    const sys = typeof body.system === "string" ? body.system : body.system.text || "";
    msgs.unshift({ role: "system", content: sys });
  }

  return {
    model: DEFAULT_MODEL,
    messages: msgs,
    max_tokens: body.max_tokens || 4096,
    temperature: body.temperature ?? 0.7,
    stream: body.stream || false,
  };
}

function chunkToAnthropicSSE(chunk, msgId) {
  if (!chunk) return "";
  const choice = chunk.choices?.[0];
  if (!choice) return "";
  const delta = choice.delta || {};
  const lines = [];

  if (choice.finish_reason) {
    lines.push("event: message_delta");
    lines.push("data: " + JSON.stringify({
      type: "message_delta",
      delta: { stop_reason: choice.finish_reason, stop_sequence: null },
      usage: { output_tokens: 0, input_tokens: 0 }
    }));
    return lines.join("\n") + "\n\n";
  }

  // DeepSeek sends content in reasoning_content or content
  const token = delta.content || delta.reasoning_content || "";
  if (token) {
    lines.push("event: content_block_delta");
    lines.push("data: " + JSON.stringify({
      type: "content_block_delta",
      index: 0,
      delta: { type: "text_delta", text: token }
    }));
  }

  return lines.length ? lines.join("\n") + "\n\n" : "";
}

function proxy(req, res) {
  let buf = "";
  req.on("data", c => { buf += c; if (buf.length > 5e6) req.destroy(); });
  req.on("end", () => {
    let body;
    try { body = JSON.parse(buf); } catch { body = null; }
    if (!body) {
      res.writeHead(400, {"Content-Type":"application/json"});
      res.end(JSON.stringify({error:"Invalid JSON"}));
      return;
    }

    const isStream = body.stream !== false;
    const openaiReq = anthropicToOpenAI(body);
    const openaiBody = JSON.stringify(openaiReq);

    const opts = {
      hostname: AI_PROXY_HOST, port: AI_PROXY_PORT,
      path: "/v1/chat/completions", method: "POST",
      timeout: TIMEOUT,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(openaiBody),
      }
    };

    const pr = http.request(opts, (pr2) => {
      const isStreamResp = isStream && (pr2.headers["content-type"] || "").includes("event-stream");

      if (isStreamResp) {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "Access-Control-Allow-Origin": "*",
        });

        const msgId = "msg_" + Date.now();
        res.write("event: message_start\ndata: " + JSON.stringify({
          type: "message_start",
          message: { id: msgId, type: "message", role: "assistant",
            content: [], model: DEFAULT_MODEL,
            stop_reason: null, stop_sequence: null,
            usage: { input_tokens: 0, output_tokens: 0 } }
        }) + "\n\n");
        res.write("event: content_block_start\ndata: " + JSON.stringify({
          type: "content_block_start", index: 0,
          content_block: { type: "text", text: "" }
        }) + "\n\n");

        let buffer = "";
        pr2.on("data", chunk => {
          const text = chunk.toString();
          buffer += text;
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const json = line.slice(6).trim();
              if (json === "[DONE]") continue;
              try {
                const parsed = JSON.parse(json);
                const sse = chunkToAnthropicSSE(parsed, msgId);
                if (sse) res.write(sse);
              } catch {}
            }
          }
        });
        pr2.on("end", () => {
          res.write("event: message_stop\ndata: {}\n\n");
          res.end();
        });
        pr2.on("error", e => {
          try { res.write("event: error\ndata: " + JSON.stringify({error:e.message}) + "\n\n"); res.end(); } catch {}
        });
      } else {
        let d = "";
        pr2.on("data", c => d += c);
        pr2.on("end", () => {
          try {
            const oai = JSON.parse(d);
            const choice = oai.choices?.[0];
            const msg = choice?.message || {};
            // DeepSeek puts reasoning in reasoning_content, content may be empty
            const text = msg.content || msg.reasoning_content || "";
            const anthropicResp = {
              id: "msg_" + Date.now(),
              type: "message",
              role: "assistant",
              content: [{ type: "text", text }],
              model: DEFAULT_MODEL,
              stop_reason: choice?.finish_reason || "end_turn",
              stop_sequence: null,
              usage: { input_tokens: oai.usage?.prompt_tokens || 0, output_tokens: oai.usage?.completion_tokens || 0 }
            };
            res.writeHead(200, {"Content-Type":"application/json","Access-Control-Allow-Origin":"*"});
            res.end(JSON.stringify(anthropicResp));
          } catch (e) {
            res.writeHead(502, {"Content-Type":"application/json"});
            res.end(JSON.stringify({error:"Upstream parse error: "+e.message}));
          }
        });
      }
    });

    pr.on("timeout", () => {
      pr.destroy();
      if (!res.headersSent) {
        res.writeHead(504, {"Content-Type":"application/json"});
        res.end(JSON.stringify({error:"Upstream timeout"}));
      }
    });
    pr.on("error", e => {
      if (!res.headersSent) {
        res.writeHead(502, {"Content-Type":"application/json"});
        res.end(JSON.stringify({error:"Proxy error: "+e.message}));
      }
    });

    pr.write(openaiBody);
    pr.end();
  });
}

http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, "http://" + (req.headers.host || "localhost"));
  const path = url.pathname;

  // Health/me endpoint (includes TokenJuice stats)
  if (req.method === "GET" && (path === "/v1/me" || path === "/me")) {
    res.writeHead(200, {"Content-Type":"application/json"});
    res.end(JSON.stringify({
      id: "zes-deepseek",
      isAuthenticated: true,
      model: DEFAULT_MODEL,
      tokenjuice: stats.stats(),
    }));
    return;
  }

  // Models list
  if (req.method === "GET" && path === "/v1/models") {
    res.writeHead(200, {"Content-Type":"application/json"});
    res.end(JSON.stringify({data:[{id:DEFAULT_MODEL, object:"model"}]}));
    return;
  }

  // Proxy messages
  if (path === "/v1/messages" && req.method === "POST") {
    return proxy(req, res);
  }

  res.writeHead(404); res.end();
}).listen(PORT, "127.0.0.1", () => {
  console.log(`ZES Claude Proxy v4 (DeepSeek + TokenJuice) on :${PORT} → AI-Proxy :${AI_PROXY_PORT}`);
  console.log(`  Model: ${DEFAULT_MODEL} · Timeout: ${TIMEOUT/1000}s`);
  console.log(`  TokenJuice compressors: json, log, git_diff, code, error, table, text`);
  console.log(`  Stats endpoint: GET /me`);
});
