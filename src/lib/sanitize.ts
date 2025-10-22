export function sanitizeText(input: string, options?: { maxLen?: number }) {
  const maxLen = options?.maxLen ?? 2000;
  // Remove control chars, trim, collapse whitespace
  let out = input.replace(/[\u0000-\u001F\u007F]/g, "");
  out = out.replace(/\s+/g, " ").trim();
  // Basic escaping to prevent accidental HTML injection when rendered
  out = out.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  if (out.length > maxLen) out = out.slice(0, maxLen);
  return out;
}

export function sanitizeCSVList(input: string, options?: { maxItems?: number }) {
  const maxItems = options?.maxItems ?? 25;
  return input
    .split(",")
    .map((s) => sanitizeText(s).slice(0, 64))
    .filter(Boolean)
    .slice(0, maxItems);
}

export function safeIlikeQueryTerm(term: string) {
  // Escape % and _ which are wildcards in LIKE
  const escaped = term.replace(/[%_]/g, (m) => `\\${m}`);
  // Limit length
  return sanitizeText(escaped, { maxLen: 64 });
}

