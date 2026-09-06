"use client";
import { useEffect, useRef, useState } from "react";
import type { ChatbotClientConfig, ChatRequest, ChatResponse, ChatErrorResponse } from "@/lib/types";
import { DemoModeBadge } from "@/components/ui/DemoModeBadge";
type Message = { role: "assistant" | "user"; text: string };
export function ChatWidget({ config }: { config: ChatbotClientConfig }) {
  const greeting: Message = { role: "assistant", text: `Welcome to ${config.businessName}! This is a portfolio demonstration. Use fictional details to explore services, make a request, or ask for a person. How can I help?` };
  const [messages, setMessages] = useState<Message[]>([greeting]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [response, setResponse] = useState<ChatResponse | null>(null);
  const [consent, setConsent] = useState(false);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  useEffect(() => { const log = logRef.current; if (log) log.scrollTop = log.scrollHeight; }, [messages, pending, response]);
  function reset() {
    if (inFlight.current) return;
    setMessages([greeting]); setSessionId(null); setResponse(null); setInput(""); setError("");
    inputRef.current?.focus();
  }
  async function send(text: string) {
    const message = text.trim();
    if (!message || !consent || inFlight.current || message.length > 1000) return;
    inFlight.current = true; setPending(true); setError(""); setInput("");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const body: ChatRequest = { chatbotId: config.id, sessionId, message, consentAcknowledged: consent };
      const result = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: controller.signal });
      const data: ChatResponse | ChatErrorResponse = await result.json();
      if (!result.ok || "error" in data) {
        const retry = result.headers.get("Retry-After");
        throw new Error(result.status === 429 ? `Too many messages. Please wait ${retry || "60"} seconds and try again.` : "error" in data ? data.error.message : "We couldn't send this message. Please try again.");
      }
      setSessionId(data.sessionId); setResponse(data);
      setMessages(previous => [...previous, { role: "user", text: message }, data.reply]);
    } catch (failure) {
      setInput(message);
      setError(failure instanceof Error && failure.name !== "AbortError" ? failure.message : "The request timed out. Please try again. If the session has expired, restart the conversation.");
    } finally {
      clearTimeout(timeout); inFlight.current = false; setPending(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }
  const confirmation = response?.stateKind.endsWith("_confirmation") || response?.stateKind === "handoff_pending";
  return <section className="chat-widget" aria-label={`${config.businessName} chat`}>
    <header className="chat-header"><span className="avatar" aria-hidden="true">{config.theme.avatarEmoji}</span><div><h2>{config.businessName}</h2><span>Virtual assistant · portfolio demo</span></div><button className="reset-button" onClick={reset} disabled={pending} aria-label="Restart conversation">↻ <span>Restart</span></button></header>
    <div className="chat-mode"><DemoModeBadge demoMode={response?.demoMode ?? null} /></div>
    <div className="messages" ref={logRef} role="log" aria-label="Conversation history" aria-live="polite" aria-relevant="additions text">
      {messages.map((message, index) => <div key={index} className={`message ${message.role}`}><span className="message-author">{message.role === "user" ? "You" : "Assistant"}</span><p>{message.text}</p></div>)}
      {pending && <div className="typing" role="status"><span className="typing-dots" aria-hidden="true">● ● ●</span> Preparing a reply…</div>}
      {confirmation && <section className="summary-card" aria-label="Review your request"><h3>Review before confirming</h3>{response?.summary && <dl>{Object.entries(response.summary).map(([key, value]) => <div key={key}><dt>{key.replaceAll("_", " ")}</dt><dd>{value}</dd></div>)}</dl>}<p>This is a simulated request. No real booking or human contact will be made.</p><div className="button-row"><button className="primary-button" disabled={pending || !consent} onClick={() => send("Confirm")}>Confirm request</button><button className="secondary-button" disabled={pending || !consent} onClick={() => send("No")}>Correct details</button></div></section>}
      {response?.outcome && <section className="success-card" role="status"><h3>✓ Demo request recorded</h3><p>{response.outcome === "booking" ? "Your simulated booking request is complete. No appointment has been scheduled." : response.outcome === "handoff" ? "Your simulated handoff is complete. No person will contact you." : "Your fictional preferences have been captured for this demo."}</p><button className="secondary-button" onClick={reset}>Start a new conversation</button></section>}
    </div>
    <div className="chat-controls"><label className="consent"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} disabled={pending} /><span>I understand this is a portfolio demo and will use fictional details only.</span></label>
      {!response?.outcome && <div className="quick-replies" aria-label="Suggested messages">{(response?.quickReplies ?? config.quickReplies).map(option => <button key={option} disabled={!consent || pending} onClick={() => send(option)}>{option}</button>)}</div>}
      {error && <p className="chat-error" role="alert">{error}</p>}
      <form onSubmit={event => { event.preventDefault(); void send(input); }} className="chat-input"><label htmlFor={`message-${config.id}`} className="sr-only">Your message</label><input ref={inputRef} id={`message-${config.id}`} value={input} onChange={event => setInput(event.target.value)} maxLength={1000} placeholder={consent ? "Type your message…" : "Acknowledge the demo to begin"} disabled={!consent || pending} autoComplete="off" /><button type="submit" disabled={!consent || pending || !input.trim()} aria-label="Send message">↑</button></form>
      <p className="chat-footnote">Use made-up details · {input.length}/1000 · Session history clears on reload</p>
    </div>
  </section>;
}
