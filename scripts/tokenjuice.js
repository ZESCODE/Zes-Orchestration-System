#!/usr/bin/env node
/**
 * TokenJuice — Multi-stage compression engine for LLM context.
 *
 * Classifies tool/output text → applies specialized compressor → tracks savings.
 * Port of the OpenHuman TokenJuice concept for ZES DeepSeek proxy.
 *
 * Compressors:
 *   - json     → minify (remove whitespace)
 *   - log      → truncate to last N lines, keep errors/warnings
 *   - git_diff → summarize to file list + stats
 *   - code     → dedent + remove comments
 *   - error    → extract key message + stack trace (1st frame)
 *   - text     → smart truncation preserving first/last paragraphs
 *   - table    → keep header + N rows, append count
 */

const COMPRESSORS = {

  // ── JSON output — minify ────────────────────────────────────────────
  json(text) {
    try {
      const parsed = JSON.parse(text);
      const minified = JSON.stringify(parsed);
      return {
        compressed: minified,
        saved: text.length - minified.length,
        ratio: (minified.length / text.length * 100).toFixed(1),
      };
    } catch { return null; }
  },

  // ── Log output — keep last N lines, preserve ERROR/WARN ────────────
  log(text, opts = {}) {
    const maxLines = opts.maxLines || 60;
    const lines = text.split('\n');
    if (lines.length <= maxLines) return null;

    const important = lines.filter(l =>
      /error|warn|fail|exception|traceback|killed|exit\s+code/i.test(l)
    );
    const tail = lines.slice(-maxLines);
    const compressed = [
      `[TokenJuice] Log truncated from ${lines.length} to ${tail.length} lines.`,
      `[TokenJuice] ${important.length} important lines preserved.`,
      ...(important.length > 0 ? ['', '── Important lines ──', ...important.map(l => '  ' + l), ''] : []),
      '',
      '── Last output ──',
      ...tail,
    ].join('\n');

    return {
      compressed,
      saved: text.length - compressed.length,
      ratio: (compressed.length / text.length * 100).toFixed(1),
    };
  },

  // ── Git diff — summarize ────────────────────────────────────────────
  git_diff(text) {
    if (!text.includes('diff --git') && !text.startsWith('diff --git')) return null;

    const fileHeaders = text.match(/^diff --git a\/(.+) b\/(.+)$/gm) || [];
    const files = fileHeaders.map(h => {
      const m = h.match(/diff --git a\/(.+) b\/(.+)$/);
      return m ? m[1] : '?';
    });

    const added = (text.match(/^\+/gm) || []).length;
    const removed = (text.match(/^-/gm) || []).length;
    const lines = files.length > 15
      ? files.slice(0, 15).map(f => `  ${f}`).join('\n') + `\n  ... and ${files.length - 15} more`
      : files.map(f => `  ${f}`).join('\n');

    const compressed = [
      `[TokenJuice] Git diff summary: ${files.length} files, +${added}/-${removed} lines.`,
      '',
      lines,
    ].join('\n');

    return {
      compressed,
      saved: text.length - compressed.length,
      ratio: (compressed.length / text.length * 100).toFixed(1),
    };
  },

  // ── Error output — extract message + first stack frame ─────────────
  error(text) {
    const lines = text.split('\n');
    const firstLine = lines[0] || '';
    const stackFrame = lines.find(l => /at\s/.test(l) && l.includes('('));
    const relevant = lines.filter(l =>
      /error|exception|fail|fatal|killed|signal|exit|oom/i.test(l)
    );

    const compressed = [
      firstLine,
      ...(stackFrame ? ['  ' + stackFrame.trim()] : []),
      ...(relevant.length > 1 ? ['', '── Related lines ──', ...relevant.slice(0, 8).map(l => '  ' + l)] : []),
      ...(lines.length > 20 ? [`[TokenJuice] ${lines.length - 20} lines omitted.`] : []),
    ].join('\n');

    return {
      compressed,
      saved: text.length - compressed.length,
      ratio: (compressed.length / text.length * 100).toFixed(1),
    };
  },

  // ── Code output — dedent + strip comments ──────────────────────────
  code(text, opts = {}) {
    const maxLines = opts.maxLines || 100;
    const lines = text.split('\n');

    // Detect if it's code (starts with common code patterns)
    const codePatterns = /^(import|export|const|let|var|function|class|def|#include|using|package|module|fn\s|pub\s)/;
    if (!codePatterns.test(lines[0] || '') && lines.length < 10) return null;

    // Dedent
    const indent = lines.filter(l => l.trim()).reduce((min, l) => {
      const m = l.match(/^(\s*)\S/);
      return m ? Math.min(min, m[1].length) : min;
    }, Infinity);
    const dedented = lines.map(l => l.slice(indent === Infinity ? 0 : indent));

    // Strip comments (single-line // and # only)
    const stripped = dedented.map(l => {
      const trimmed = l.trimStart();
      if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*'))
        return '';
      return l;
    }).filter(l => l.trim());

    if (stripped.length <= maxLines) return null;

    const compressed = stripped.slice(0, maxLines).join('\n') +
      `\n// [TokenJuice] ${stripped.length - maxLines} lines omitted\n`;

    return {
      compressed,
      saved: text.length - compressed.length,
      ratio: (compressed.length / text.length * 100).toFixed(1),
    };
  },

  // ── Table/grid output — header + N rows ────────────────────────────
  table(text) {
    if (!/^\s*(\+[-+]+\+|\||┌|└|[─┬┐┘┴┤├|a-zA-Z])/.test(text) && !text.includes('───')) {
      // Check for aligned columns
      const lines = text.split('\n');
      const colCounts = lines.slice(0, 5).map(l => (l.match(/\s{2,}/g) || []).length);
      if (!colCounts.some(c => c >= 2)) return null;
    }

    const lines = text.split('\n');
    const maxRows = 20;
    if (lines.length <= maxRows + 5) return null;

    const header = lines.slice(0, Math.min(3, lines.length));
    const tail = lines.slice(-maxRows);
    const compressed = [
      ...header,
      `[TokenJuice] ${lines.length - maxRows - header.length} rows omitted`,
      ...tail,
    ].join('\n');

    return {
      compressed,
      saved: text.length - compressed.length,
      ratio: (compressed.length / text.length * 100).toFixed(1),
    };
  },

  // ── Generic text — truncate preserving first & last ────────────────
  text(text, opts = {}) {
    const maxLen = opts.maxLength || 4000;
    if (text.length <= maxLen) return null;

    const headLen = Math.floor(maxLen * 0.6);
    const tailLen = maxLen - headLen - 50;

    const head = text.slice(0, headLen);
    const tail = text.slice(-tailLen);

    const compressed = head +
      `\n\n[... TokenJuice truncated ${text.length - maxLen} chars (${((maxLen / text.length) * 100).toFixed(0)}%) ...]\n\n` +
      tail;

    return {
      compressed,
      saved: text.length - compressed.length,
      ratio: (compressed.length / text.length * 100).toFixed(1),
    };
  },
};

/**
 * Classify text into a content type.
 * Returns type string: 'json', 'log', 'git_diff', 'code', 'error', 'table', 'text'
 */
function classify(text) {
  if (!text || text.length < 10) return 'text';

  const firstLine = text.split('\n')[0] || '';
  const lower = text.toLowerCase();

  // Error patterns
  if (/error|exception|traceback|failed|killed|signal \d+|oom killer|out of memory/i.test(firstLine) &&
      text.length < 20000)
    return 'error';

  // JSON
  if ((text.startsWith('{') || text.startsWith('[')) && text.length < 50000) {
    try { JSON.parse(text.slice(0, 1000)); return 'json'; } catch {}
  }

  // Git diff
  if (text.startsWith('diff --git') || text.includes('\ndiff --git'))
    return 'git_diff';

  // Log (timestamp patterns)
  if (/^\d{4}[-\/]\d{2}[-\/]\d{2}/.test(firstLine) || /^\w{3}\s+\d{1,2}\s/.test(firstLine) ||
      lower.includes('[info]') || lower.includes('[warn]') || lower.includes('[debug]') ||
      lower.includes('[error]') || lower.includes('[verbose]'))
    return 'log';

  // Code
  if (/^(import |export |const |let |var |function |class |def |#include|using |package |module |fn |pub )/.test(firstLine))
    return 'code';

  // Table (has separator lines)
  if (/^\s*[+|┌└├─]/.test(firstLine) && text.split('\n').length > 5)
    return 'table';

  return 'text';
}

/**
 * Apply TokenJuice compression to text.
 *
 * @param {string} text - The output text to compress
 * @param {object} opts - Options (maxLines, maxLength, etc.)
 * @returns {{ compressed: string, saved: number, ratio: string, type: string, original?: string }}
 *   Returns original with null savings if compression not beneficial.
 */
function compress(text, opts = {}) {
  if (!text || text.length < 100) {
    return { compressed: text, saved: 0, ratio: '100', type: 'skip-too-short' };
  }

  const type = classify(text);
  const compressor = COMPRESSORS[type];

  if (!compressor) {
    return { compressed: text, saved: 0, ratio: '100', type: 'no-compressor' };
  }

  const result = compressor(text, opts);

  if (!result || result.compressed.length >= text.length * 0.9) {
    // Compression didn't help — return original
    return { compressed: text, saved: 0, ratio: '100', type: `${type}-no-gain` };
  }

  return {
    compressed: result.compressed,
    saved: result.saved,
    ratio: result.ratio,
    type,
  };
}

/**
 * Statistics collector — tracks total savings across calls.
 */
function createStatsCollector() {
  let totalOriginalChars = 0;
  let totalCompressedChars = 0;
  const typeCounts = {};

  return {
    record(original, result) {
      totalOriginalChars += original.length;
      totalCompressedChars += result.compressed.length;
      typeCounts[result.type] = (typeCounts[result.type] || 0) + 1;
    },
    stats() {
      const saved = totalOriginalChars - totalCompressedChars;
      return {
        totalOriginalChars,
        totalCompressedChars,
        savedChars: saved,
        savingsPercent: totalOriginalChars > 0
          ? ((1 - totalCompressedChars / totalOriginalChars) * 100).toFixed(1)
          : '0',
        typeCounts,
        estimatedTokens: Math.round(saved / 4),  // rough: ~4 chars per token
      };
    },
    format() {
      const s = this.stats();
      return [
        `[TokenJuice] Stats: ${s.savingsPercent}% saved (${s.savedChars.toLocaleString()} chars, ~${s.estimatedTokens.toLocaleString()} tokens)`,
        `  Types: ${Object.entries(s.typeCounts).map(([t, n]) => `${t}:${n}`).join(', ')}`,
      ].join('\n');
    },
  };
}

export default { compress, classify, COMPRESSORS, createStatsCollector };
