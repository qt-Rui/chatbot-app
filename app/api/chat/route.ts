import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

const ai = new GoogleGenAI({});

type ChatMessage = { role: "user" | "assistant"; content: string };

// --- very simple in-memory rate limit (works on a single Node instance) ---
const hits = new Map<string, { count: number; resetAt: number }>();
function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const cur = hits.get(key);
  if (!cur || now > cur.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (cur.count >= limit) return { ok: false, retryAfterMs: cur.resetAt - now };
  cur.count += 1;
  return { ok: true };
}

function clampMessages(messages: ChatMessage[]) {
  // basic guardrails
  const MAX_MESSAGES = 20;
  const MAX_CHARS_PER_MSG = 4000;

  const trimmed = messages.slice(-MAX_MESSAGES).map((m) => ({
    role: m.role,
    content: (m.content ?? "").toString().slice(0, MAX_CHARS_PER_MSG),
  }));

  return trimmed.filter((m) => m.content.trim().length > 0);
}

export async function POST(req: Request) {
  // Basic IP keying: works on many hosts, but may be absent locally
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const rl = rateLimit(ip, 30, 60_000); // 30 req/min/IP
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers: {
        "content-type": "application/json",
        "retry-after": String(Math.ceil((rl.retryAfterMs ?? 0) / 1000)),
      },
    });
  }

  try {
    const body = (await req.json()) as { messages?: ChatMessage[] };
    if (!Array.isArray(body.messages)) {
      return new Response(JSON.stringify({ error: "Missing messages[]" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const messages = clampMessages(body.messages);
    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "No usable messages" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    // Convert to structured Gemini contents:
    // Gemini "Content" supports role + parts; role should be 'user' or 'model'. :contentReference[oaicite:3]{index=3}
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents,
      config: {
        // keep costs and latency reasonable
        maxOutputTokens: 512,
        temperature: 0.7,
      },
      // Some SDK versions support systemInstruction here; if yours errors,
      // remove it and instead prepend a system-like instruction message.
      systemInstruction: "You are a helpful assistant. Be concise and accurate.",
    } as any);

    return new Response(JSON.stringify({ text: response.text ?? "" }), {
      headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    // Don’t leak internal details; log server-side if you want.
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
