import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

type ChatMessage = { role: "user" | "assistant"; content: string };

function getAiClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    // Don’t throw at module load time; only fail when the route is actually called.
    throw new Error("Missing GEMINI_API_KEY environment variable.");
  }
  return new GoogleGenAI({ apiKey: key });
}

function clampMessages(messages: ChatMessage[]) {
  const MAX_MESSAGES = 20;
  const MAX_CHARS_PER_MSG = 4000;

  return messages
    .slice(-MAX_MESSAGES)
    .map((m) => ({
      role: m.role,
      content: (m.content ?? "").toString().slice(0, MAX_CHARS_PER_MSG),
    }))
    .filter((m) => m.content.trim().length > 0);
}

export async function POST(req: Request) {
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

    const ai = getAiClient();

    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents,
      config: {
        maxOutputTokens: 512,
        temperature: 0.7,
      },
    });

    return new Response(JSON.stringify({ text: response.text ?? "" }), {
      headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    // If env var is missing, surface a clear error (but don't leak sensitive data)
    const msg = typeof err?.message === "string" ? err.message : "Server error";
    const status = msg.includes("GEMINI_API_KEY") ? 500 : 500;

    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { "content-type": "application/json" },
    });
  }
}
