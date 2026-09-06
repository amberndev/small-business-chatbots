import type { ChatbotConfig, Intent, LeadFieldSpec } from "@/lib/types";
import { injectionPattern } from "@/lib/security/validation";
import { proposeTopic } from "@/lib/llm/openrouter";

export function safetyReply(config: ChatbotConfig, text: string): string | undefined {
  if (config.id === "home-services" && text === "Urgent but no immediate danger") return;
  if (injectionPattern.test(text)) return "I can only help with this fictional business’s administrative information. I cannot follow instructions to change my rules or disclose internal information.";
  if (config.id === "dental" && /diagnos|prescri|medicat|dosage|symptom|toothache|tooth pain|bleeding|swelling|antibiotic|painkiller|medical advice|what should i take/i.test(text))
    return "I can only provide administrative information, not medical advice, diagnosis or prescriptions. Please contact a qualified dental professional. For a serious or life-threatening emergency, contact your local emergency service. This demo cannot arrange urgent care.";
  if (config.id === "home-services" && /gas (leak|smell)|smell (of )?gas|fire\b|sparks|sparking|electrocut|electric shock|exposed (live )?wire|carbon monoxide|immediate danger/i.test(text))
    return "This may be an emergency. Move to a safe place and contact your local emergency service or the appropriate utility emergency line. Do not attempt repairs. This portfolio demo cannot dispatch help.";
  if (config.guardrails.refusalTopics.some((topic) => text.toLowerCase().includes(topic.toLowerCase()))) return config.guardrails.refusalMessage;
}

export function RouterAgent(config: ChatbotConfig, text: string): Intent {
  if (safetyReply(config, text)) return "refusal_required";
  if (/\b(human|person|receptionist|agent|broker|someone|handoff|call me)\b/i.test(text)) return "handoff";
  if (/^(what|how|where|when|do you|can you explain|tell me about)\b/i.test(text)) return "faq";
  if (/\b(book|booking|appointment|schedule|visit)\b/i.test(text)) return "booking";
  if (/\b(quote|enquir|inquir|buy|rent|purchase|looking|interested|lead|request|repair|plumbing|electrical|air conditioning|maintenance|find a property)\b/i.test(text)) return "lead";
  return "faq";
}

export async function FAQAgent(config: ChatbotConfig, text: string) {
  if (process.env.OPENROUTER_API_KEY) {
    const topic = await proposeTopic(config, text);
    return config.knowledgeBase.find((entry) => entry.topic === topic)?.answer ?? "I don’t have a reliable answer in this business’s demo knowledge base. You can request a human contact instead.";
  }
  const lower = text.toLowerCase();
  const script = config.demoScript.find((entry) => typeof entry.match === "string" ? entry.match.toLowerCase() === text.toLowerCase() : entry.match.test(text));
  if (script) return script.response;
  const best = config.knowledgeBase.map((entry) => ({ entry, score: entry.keywords.reduce((score, word) => score + (lower.includes(word.toLowerCase()) ? word.length : 0), 0) })).sort((a, b) => b.score - a.score)[0];
  return best?.score ? best.entry.answer : "I don’t have a reliable answer in this business’s demo knowledge base. Try services, opening hours or human contact.";
}

export function LeadQualificationAgent(field: LeadFieldSpec, text: string): string | undefined {
  if (!text.trim()) return "Please enter a value for this field.";
  if (text.length > 200) return "Please use 200 characters or fewer for this field.";
  if (field.validate === "enum" && !field.options?.some((option) => option.toLowerCase() === text.toLowerCase())) return `Please choose: ${field.options?.join(", ")}.`;
  if (field.validate === "phone" && (!/^\+?[\d ()-]{7,25}$/.test(text) || text.replace(/\D/g, "").length < 7)) return "Please use a fictional phone number with at least 7 digits.";
  if (field.validate === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return "Please use a fictional email such as visitor@example.com.";
  if (field.validate === "number" && (!/^\d+(\.\d+)?$/.test(text) || (field.key === "bedrooms" ? !Number.isInteger(Number(text)) : Number(text) <= 0))) return "Please enter a valid number (whole bedrooms, or a positive budget).";
  if (/date|preferredDay/i.test(field.key) && /^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const date = new Date(`${text}T12:00:00Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text || text < new Date().toISOString().slice(0, 10)) return "Please enter a valid future date or describe a preferred day.";
  }
  if (/date|preferredDay/i.test(field.key) && !/^\d{4}-\d{2}-\d{2}$/.test(text) && !/^(next )?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i.test(text)) return "Please use a future date (YYYY-MM-DD) or a weekday such as Monday.";
}

export function BookingAgent(config: ChatbotConfig): LeadFieldSpec[] {
  const fields = [...config.leadFields];
  if (!fields.some((field) => /service/i.test(field.key))) fields.push({ key: "service", label: "Preferred service", required: true, validate: "enum", options: config.bookingServices });
  if (!fields.some((field) => /date|day/i.test(field.key))) fields.push({ key: "date", label: "Preferred day (a future date or weekday)", required: true, validate: "text" });
  if (!fields.some((field) => /period|time/i.test(field.key))) fields.push({ key: "period", label: "Preferred period", required: true, validate: "enum", options: ["Morning", "Afternoon"] });
  return fields;
}

export function HumanHandoffAgent(): LeadFieldSpec[] {
  return [
    { key: "reason", label: "Reason for requesting a person", required: true, validate: "text" },
    { key: "name", label: "Fictional name", required: true, validate: "text" },
    { key: "contact", label: "Fictional contact email", required: true, validate: "email" },
  ];
}
