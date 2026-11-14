import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// pi-antigravity-prompt
//
// Google Antigravity answers a false 429 "Resource has been exhausted" to any
// request whose system instruction carries a line it blacklists. For pi that
// line is the first sentence of the default prompt:
//
//   You are a coding assistant running inside pi, a coding agent harness.
//
// This rewrites only the words Google matches and keeps the rest of the prompt
// as written, one step later: on the serialized request, right before it goes
// out (before_provider_request).
//
// Only system-instruction strings are touched. Tools, rules, docs, skills,
// memory blobs and the user's own messages are left exactly as they are, and
// so is everything after the matched words — the sentence still reads as pi's.
//
// Remove this extension once Antigravity stops matching the line.

// "inside pi" followed by anything that is not a letter/digit (so pii, pix,
// pie stay untouched: those are not pi's prompt). Covers CJK punctuation too.
const TARGET = /(inside)([ \t\r\n\u00a0]+)(pi)(?![\p{L}\p{N}_])/giu;

function rewrite(text: string): string {
  return text.includes("inside") ? text.replace(TARGET, (_m, w1, sep) => w1 + sep + "p1") : text;
}

function deepRewrite(value: unknown): unknown {
  if (typeof value === "string") return rewrite(value);
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) value[i] = deepRewrite(value[i]);
    return value;
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    for (const key of Object.keys(obj)) obj[key] = deepRewrite(obj[key]);
    return value;
  }
  return value;
}

export default function (pi: ExtensionAPI) {
  pi.on("before_provider_request", (event: any) => {
    const payload = event?.payload;
    if (!payload || typeof payload !== "object") return;
    // OpenAI-compatible payloads carry the system instruction as the first
    // messages[] entry; Anthropic/Gemini ones carry it as a field.
    for (const key of ["system", "systemInstruction", "instructions"]) {
      if (key in payload) payload[key] = deepRewrite(payload[key]);
    }
    if (Array.isArray(payload.messages)) {
      for (const message of payload.messages) {
        if (message && (message.role === "system" || message.role === "developer")) {
          message.content = deepRewrite(message.content);
        }
      }
    }
    return payload;
  });
}
