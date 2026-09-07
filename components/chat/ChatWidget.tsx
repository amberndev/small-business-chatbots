"use client";
import { useEffect, useRef, useState } from "react";
import type { ChatbotClientConfig, ChatRequest, ChatResponse, ChatErrorResponse } from "@/lib/types";
import { DemoModeBadge } from "@/components/ui/DemoModeBadge";
import { BookingCalendar } from "./BookingCalendar";
import { isAvailable, type Property } from "@/content/properties";
import { detectLang, engineCopy, optionLabel, ui, type Lang } from "@/lib/i18n";
type Message = { role: "assistant" | "user"; text: string };
type Contact = { whatsappUrl: string };

function greetingFor(config: ChatbotClientConfig, lang: Lang) {
  return config.id === "dental"
    ? engineCopy[lang].greeting
    : `Welcome to ${config.businessName}! Use fictional details to explore services, make a request, or ask for a person. How can I help?`;
}

export function ChatWidget({ config, property, lang = "en", onLangChange, contact }: { config: ChatbotClientConfig; property?: Property; lang?: Lang; onLangChange?: (lang: Lang) => void; contact?: Contact }) {
  const strings = ui[lang];
  // The greeting is derived from the current language and rendered ahead of the
  // exchange, so it always follows the language without a state-syncing effect.
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [response, setResponse] = useState<ChatResponse | null>(null);
  const [consent, setConsent] = useState(false);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const authorName = config.assistantName ?? strings.assistant;
  useEffect(() => { const log = logRef.current; if (log) log.scrollTop = log.scrollHeight; }, [messages, pending, response]);
  function reset() {
    if (inFlight.current) return;
    setMessages([]); setSessionId(null); setResponse(null); setInput(""); setError("");
    inputRef.current?.focus();
  }
  async function send(text: string) {
    const message = text.trim();
    if (!message || !consent || inFlight.current || message.length > 1000) return;
    // Follow the visitor's language only outside a guided flow, so an English
    // enum value (e.g. "Cleaning") picked mid-booking doesn't flip the UI.
    const flowActive = !!response && (response.stateKind === "lead_qualification" || response.stateKind.endsWith("_confirmation"));
    const detected = detectLang(message);
    if (detected && detected !== lang && !flowActive) onLangChange?.(detected);
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
      requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    }
  }
  const confirmation = response?.stateKind.endsWith("_confirmation") || response?.stateKind === "handoff_pending";
  const dateKey = strings.dateLabelForSummary;
  // Only the dental demo is bilingual; other bots keep their configured chips.
  const initialQuickReplies = config.id === "dental" ? strings.quickReplies : config.quickReplies;
  return <section className={`chat-widget${property ? " property-chat" : ""}`} aria-label={`${config.businessName} chat`}>
    <header className="chat-header"><span className="avatar" aria-hidden="true">{config.theme.avatarEmoji}</span><div><h2>{config.businessName}</h2><span>{config.assistantName ? `${config.assistantName} · ${strings.personaRole}` : strings.personaRole}</span></div><button className="reset-button" onClick={reset} disabled={pending} aria-label={strings.restart}>↻ <span>{strings.restartShort}</span></button></header>
    <div className="chat-mode"><DemoModeBadge demoMode={response?.demoMode ?? null} lang={lang} /><span className="workspace-label">{strings.workspace}</span></div>
    {response?.form && <div className="request-progress"><div><span>{strings.yourRequest}</span><strong>{response.form.label}</strong><small>{strings.step} {response.form.step} {strings.of} {response.form.total}</small></div><progress aria-label="Request progress" value={response.form.step} max={response.form.total} /></div>}
    <div className="messages" tabIndex={0} ref={logRef} role="log" aria-label="Conversation history" aria-live="polite" aria-relevant="additions text">
      <div className="message assistant"><span className="message-author">{authorName}</span><p>{greetingFor(config, lang)}</p></div>
      {messages.map((message, index) => <div key={index} className={`message ${message.role}`}><span className="message-author">{message.role === "user" ? strings.you : authorName}</span><p>{message.text}</p></div>)}
      {pending && <div className="typing" role="status"><span className="typing-dots" aria-hidden="true">● ● ●</span> {strings.typing}</div>}
      {confirmation && <section className="summary-card" aria-label={strings.reviewRegion}><span className="eyebrow">{strings.reviewEyebrow}</span><h3>{strings.reviewHeading}</h3>{response?.summary && <dl>{Object.entries(response.summary).map(([key, value]) => <div key={key}><dt>{key.replaceAll("_", " ")}</dt><dd>{value}</dd></div>)}</dl>}<div className="button-row"><button className="primary-button" disabled={pending || !consent} onClick={() => send("Confirm")}>{strings.confirmButton}</button>{response?.summary?.[dateKey] && <button className="secondary-button" disabled={pending || !consent} onClick={() => send("Change date")}>{strings.changeDateButton}</button>}<button className="secondary-button" disabled={pending || !consent} onClick={() => send("No")}>{strings.correctButton}</button></div></section>}
      {response?.outcome && <section className="success-card" role="status"><h3>{strings.successHeading}</h3><p>{strings.successBody(response.outcome)}</p><button className="secondary-button" onClick={reset}>{strings.successNewButton}</button></section>}
    </div>
    <div className="chat-controls"><label className="consent"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} disabled={pending} /><span>{strings.consent}</span></label>
      {property && !response && config.id === "real-estate" && <div className="selected-viewing"><strong>{property.name}</strong><p>{property.address} · Starts a new viewing request for this home.</p><button type="button" className="primary-button" disabled={!consent || pending || !isAvailable(property)} onClick={() => send(`Visit property ${property.id}`)}>Start this viewing request</button></div>}
      {response?.schedule && <BookingCalendar key={`${sessionId}-${response.form?.key}`} schedule={response.schedule} disabled={!consent || pending} lang={lang} onSelect={value => void send(value)} />}
      {!response?.outcome && !response?.schedule && !confirmation && <div className="quick-replies" aria-label="Suggested messages">{(response?.quickReplies ?? initialQuickReplies).map(option => <button key={option} disabled={!consent || pending} onClick={() => send(option)}>{optionLabel(lang, option)}</button>)}</div>}
      {contact && <a className="whatsapp-cta" href={contact.whatsappUrl} target="_blank" rel="noopener noreferrer"><span aria-hidden="true">💬</span> {strings.whatsappCta}</a>}
      {error && <p className="chat-error" role="alert">{error}</p>}
      <form onSubmit={event => { event.preventDefault(); void send(input); }} className="chat-input"><label htmlFor={`message-${config.id}`} className="sr-only">{strings.messageLabel}</label><input ref={inputRef} id={`message-${config.id}`} value={input} onChange={event => setInput(event.target.value)} maxLength={1000} placeholder={consent ? strings.placeholder : strings.placeholderLocked} disabled={!consent || pending} autoComplete="off" /><button type="submit" disabled={!consent || pending || !input.trim()} aria-label={strings.sendLabel}>↑</button></form>
      <p className="chat-footnote">{strings.footnote} · {input.length}/1000</p>
    </div>
  </section>;
}
