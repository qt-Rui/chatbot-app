"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export default function Page() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hey! 👋 I’m your Gemini chatbot. What are we building today?" },
  ]);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const listEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setLoading(true);

    const userMsg: Msg = { role: "user", content: text };
    const next: Msg[] = [...messages, userMsg];
    setMessages(next);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(errText || `Request failed (${res.status})`);
      }

      const data: unknown = await res.json();
      const textResponse =
        typeof (data as any)?.text === "string" ? ((data as any).text as string) : "";

      const assistantMsg: Msg = {
        role: "assistant",
        content: textResponse.trim() || "(no response)",
      };

      setMessages((prev) => [...prev, assistantMsg]);
      inputRef.current?.focus();
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Sorry — something went wrong.\n${e?.message ?? ""}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    setMessages([{ role: "assistant", content: "Cleared ✨ What should we do next?" }]);
    inputRef.current?.focus();
  }

  return (
    <main style={styles.page}>
      {/* soft gradient blobs */}
      <div style={styles.blobA} aria-hidden="true" />
      <div style={styles.blobB} aria-hidden="true" />
      <div style={styles.blobC} aria-hidden="true" />

      <div style={styles.shell}>
        <header style={styles.header}>
          <div style={styles.brand}>
            <div style={styles.logo} aria-hidden="true">
              ✦
            </div>
            <div>
              <h1 style={styles.title}>Gemini Chat</h1>
              <p style={styles.sub}>A simple, vibrant Next.js chatbot</p>
            </div>
          </div>

          <div style={styles.headerActions}>
            <button style={styles.ghostBtn} onClick={clearChat} disabled={loading} title="Clear conversation">
              Clear
            </button>
          </div>
        </header>

        <section style={styles.chat} aria-live="polite">
          {messages.map((m, i) => (
            <ChatBubble key={i} msg={m} />
          ))}

          {loading && (
            <div style={{ ...styles.bubbleBase, ...styles.assistantBubble }}>
              <TypingDots />
            </div>
          )}

          <div ref={listEndRef} />
        </section>

        <footer style={styles.footer}>
          <div style={styles.composer}>
            <input
              ref={inputRef}
              style={styles.input}
              value={input}
              placeholder="Message Gemini…"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              disabled={loading}
              aria-label="Message input"
            />
            <button
              style={{ ...styles.sendBtn, opacity: canSend ? 1 : 0.55 }}
              onClick={send}
              disabled={!canSend}
              aria-label="Send message"
              title="Send"
            >
              <span style={styles.sendIcon} aria-hidden="true">
                ➤
              </span>
              <span style={styles.sendText}>{loading ? "Sending" : "Send"}</span>
            </button>
          </div>

          <div style={styles.hintRow}>
            <span style={styles.hintPill}>Tip: Press Enter to send</span>
            <span style={styles.hintPill}>Try: “Help me plan the app architecture”</span>
          </div>
        </footer>
      </div>
    </main>
  );
}

function ChatBubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";

  return (
    <div style={{ ...styles.row, justifyContent: isUser ? "flex-end" : "flex-start" }}>
      <div
        style={{
          ...styles.bubbleBase,
          ...(isUser ? styles.userBubble : styles.assistantBubble),
        }}
      >
        <div style={styles.bubbleText}>{msg.content}</div>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div style={styles.dotsWrap} aria-label="Assistant typing">
      <span style={{ ...styles.dot, animationDelay: "0ms" }} />
      <span style={{ ...styles.dot, animationDelay: "140ms" }} />
      <span style={{ ...styles.dot, animationDelay: "280ms" }} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: 16,
    display: "grid",
    placeItems: "center",
    position: "relative",
    overflow: "hidden",
    background:
      "radial-gradient(1200px 800px at 20% 10%, rgba(124, 58, 237, 0.22), transparent 60%)," +
      "radial-gradient(1000px 700px at 80% 20%, rgba(59, 130, 246, 0.20), transparent 55%)," +
      "radial-gradient(900px 700px at 50% 90%, rgba(16, 185, 129, 0.14), transparent 55%)," +
      "linear-gradient(180deg, #0b1020 0%, #0a0f1d 55%, #070b14 100%)",
    color: "#e9ecf5",
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
  },

  // background blobs (very subtle)
  blobA: {
    position: "absolute",
    width: 520,
    height: 520,
    left: -180,
    top: -180,
    filter: "blur(28px)",
    opacity: 0.55,
    background: "radial-gradient(circle at 30% 30%, rgba(124,58,237,0.7), transparent 60%)",
    borderRadius: "999px",
    pointerEvents: "none",
  },
  blobB: {
    position: "absolute",
    width: 520,
    height: 520,
    right: -220,
    top: -120,
    filter: "blur(30px)",
    opacity: 0.45,
    background: "radial-gradient(circle at 30% 30%, rgba(59,130,246,0.65), transparent 60%)",
    borderRadius: "999px",
    pointerEvents: "none",
  },
  blobC: {
    position: "absolute",
    width: 620,
    height: 620,
    left: "30%",
    bottom: -320,
    filter: "blur(34px)",
    opacity: 0.35,
    background: "radial-gradient(circle at 30% 30%, rgba(16,185,129,0.55), transparent 60%)",
    borderRadius: "999px",
    pointerEvents: "none",
  },

  shell: {
    width: "min(860px, 100%)",
    height: "min(82vh, 760px)",
    borderRadius: 22,
    overflow: "hidden",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 24px 70px rgba(0,0,0,0.45)",
    backdropFilter: "blur(14px)",
    display: "grid",
    gridTemplateRows: "auto 1fr auto",
    position: "relative",
  },

  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "18px 18px 14px",
    borderBottom: "1px solid rgba(255,255,255,0.10)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
  },
  brand: { display: "flex", alignItems: "center", gap: 12 },
  logo: {
    width: 42,
    height: 42,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
    color: "#0b1020",
    background:
      "linear-gradient(135deg, rgba(236,72,153,1) 0%, rgba(124,58,237,1) 35%, rgba(59,130,246,1) 100%)",
    boxShadow: "0 14px 32px rgba(0,0,0,0.35)",
    userSelect: "none",
  },
  title: { margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: 0.2 },
  sub: { margin: "2px 0 0", fontSize: 13, color: "rgba(233,236,245,0.72)" },

  headerActions: { display: "flex", gap: 10, alignItems: "center" },
  ghostBtn: {
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(233,236,245,0.92)",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 700,
  },

  chat: {
    padding: 18,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    background:
      "radial-gradient(800px 420px at 50% 0%, rgba(255,255,255,0.06), transparent 60%)",
  },

  row: { display: "flex" },

  bubbleBase: {
    maxWidth: "78%",
    borderRadius: 18,
    padding: "12px 14px",
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.22)",
  },

  userBubble: {
    background:
      "linear-gradient(135deg, rgba(236,72,153,0.95) 0%, rgba(124,58,237,0.95) 40%, rgba(59,130,246,0.92) 100%)",
    color: "#0b1020",
    borderTopRightRadius: 10,
  },

  assistantBubble: {
    background: "rgba(255,255,255,0.08)",
    color: "rgba(233,236,245,0.95)",
    borderTopLeftRadius: 10,
  },

  bubbleText: { whiteSpace: "pre-wrap", lineHeight: 1.45, fontSize: 14 },

  footer: {
    padding: 14,
    borderTop: "1px solid rgba(255,255,255,0.10)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.08) 100%)",
  },

  composer: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 10,
    alignItems: "center",
  },

  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(10, 14, 28, 0.55)",
    color: "rgba(233,236,245,0.95)",
    outline: "none",
    fontSize: 14,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
  },

  sendBtn: {
    padding: "12px 14px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.14)",
    background:
      "linear-gradient(135deg, rgba(16,185,129,0.95) 0%, rgba(59,130,246,0.92) 60%, rgba(124,58,237,0.92) 100%)",
    color: "#0b1020",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    gap: 8,
    boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
    userSelect: "none",
  },
  sendIcon: { fontSize: 14, transform: "translateY(-0.5px)" },
  sendText: { letterSpacing: 0.2 },

  hintRow: {
    marginTop: 10,
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  hintPill: {
    fontSize: 12,
    color: "rgba(233,236,245,0.74)",
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    padding: "6px 10px",
    borderRadius: 999,
  },

  // typing dots
  dotsWrap: { display: "flex", gap: 8, alignItems: "center" },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: "rgba(233,236,245,0.75)",
    display: "inline-block",
    animation: "pulse 1s infinite ease-in-out",
  },
};

// Inject keyframes (simple, no external CSS)
if (typeof document !== "undefined") {
  const id = "typing-dots-keyframes";
  if (!document.getElementById(id)) {
    const style = document.createElement("style");
    style.id = id;
    style.innerHTML = `
      @keyframes pulse {
        0%, 100% { transform: translateY(0); opacity: .55; }
        50% { transform: translateY(-3px); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
}
