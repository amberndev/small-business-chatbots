/**
 * lib/i18n.ts — Bilingual (PT-BR + EN) helpers shared by the engine (server)
 * and the chat UI (client). Pure and isomorphic: no server-only imports.
 *
 * Language policy (owner decision):
 * - The visitor's message language decides the reply language.
 * - Chat chrome and the demo page copy follow the browser language, defaulting
 *   to PT-BR when the browser gives no clear signal.
 */

export type Lang = "pt" | "en";
export const DEFAULT_LANG: Lang = "pt";

// Accented characters are an unambiguous Portuguese signal.
const PT_ACCENTS = /[áàâãéêíóôõúüç]/i;
// Words that only appear in Portuguese requests for this domain.
const PT_WORDS = /\b(ola|oi|bom dia|boa tarde|boa noite|quero|gostaria|preciso|voce|voces|agendar|agendamento|marcar|marcacao|horario|horarios|atendimento|endereco|onde fica|quanto custa|quanto|preco|precos|valor|valores|convenio|convenios|limpeza|dente|dentes|clareamento|avaliacao|consulta|urgencia|obrigado|obrigada|por favor|sim|nao|servico|servicos|telefone|falar com|recepcao|pessoa|atendente)\b/i;
// Words that only appear in English requests for this domain.
const EN_WORDS = /\b(hello|hi|hey|good morning|thanks|please|i want|i would like|book|booking|appointment|schedule|opening|hours|address|where are you|how much|price|cost|insurance|whitening|cleaning|clean|checkup|assessment|emergency|urgent|contact|reception|person|someone|human|service|services|yes|no)\b/i;

/** Returns "pt"/"en" when confident, otherwise null (ambiguous). */
export function detectLang(text: string): Lang | null {
  const t = (text || "").toLowerCase();
  if (PT_ACCENTS.test(text) || PT_WORDS.test(t)) return "pt";
  if (EN_WORDS.test(t)) return "en";
  return null;
}

/** Detection with a fallback for ambiguous input (e.g. numbers, "ok"). */
export function resolveLang(text: string, fallback: Lang = DEFAULT_LANG): Lang {
  return detectLang(text) ?? fallback;
}

/** Maps a browser language tag (navigator.language) to a supported language. */
export function langFromBrowser(tag: string | undefined | null): Lang {
  if (!tag) return DEFAULT_LANG;
  return /^pt\b/i.test(tag) ? "pt" : /^en\b/i.test(tag) ? "en" : DEFAULT_LANG;
}

// ---------------------------------------------------------------------------
// Field labels — shared by the engine (summary keys / form labels) and the UI.
// The English "date" label MUST stay "Preferred date" (asserted by tests and
// used by the ChatWidget to render the "change date" button).
// ---------------------------------------------------------------------------

export const fieldLabels: Record<Lang, Record<string, string>> = {
  en: { name: "Your name", phone: "Phone number", service: "Service", date: "Preferred date", period: "Preferred time", reason: "Reason for contact", contact: "Email" },
  pt: { name: "Seu nome", phone: "Telefone", service: "Serviço", date: "Data preferida", period: "Horário preferido", reason: "Motivo do contato", contact: "E-mail" },
};

// Display translations for enum quick-replies (value sent stays the config value).
export const optionLabels: Record<Lang, Record<string, string>> = {
  en: {},
  pt: { Morning: "Manhã", Afternoon: "Tarde", Cleaning: "Limpeza", Assessment: "Avaliação", Whitening: "Clareamento", "Urgent dental enquiry": "Urgência odontológica" },
};

export function optionLabel(lang: Lang, value: string): string {
  return optionLabels[lang][value] ?? value;
}

// ---------------------------------------------------------------------------
// UI copy (client) — chat chrome + dental demo page.
// ---------------------------------------------------------------------------

export const ui: Record<Lang, {
  personaRole: string;
  assistant: string;
  restart: string;
  restartShort: string;
  you: string;
  typing: string;
  consent: string;
  placeholder: string;
  placeholderLocked: string;
  footnote: string;
  reviewHeading: string;
  reviewEyebrow: string;
  reviewRegion: string;
  confirmButton: string;
  changeDateButton: string;
  correctButton: string;
  successHeading: string;
  successNewButton: string;
  successBody: (outcome: "lead" | "booking" | "handoff") => string;
  sendLabel: string;
  messageLabel: string;
  workspace: string;
  yourRequest: string;
  step: string;
  of: string;
  dateLabelForSummary: string;
  demoMode: string;
  liveMode: string;
  modePending: string;
  quickReplies: string[];
  whatsappCta: string;
  demoIntro: {
    eyebrow: string; title: string; lead: string;
    servicesTitle: string; servicesNote: string;
    hoursTitle: string; hoursValue: string;
    addressTitle: string; mapLink: string;
    contactTitle: string; whatsappLabel: string; phoneLabel: string;
    from: string;
  };
}> = {
  en: {
    personaRole: "virtual assistant",
    assistant: "Assistant",
    restart: "Restart conversation",
    restartShort: "Restart",
    you: "You",
    typing: "Typing…",
    consent: "I understand this is a portfolio demo and I'll use fictional details only.",
    placeholder: "Type your message…",
    placeholderLocked: "Acknowledge the demo to begin",
    footnote: "Fictional details only · history clears on reload",
    reviewHeading: "Review before confirming",
    reviewEyebrow: "READY FOR YOUR REVIEW",
    reviewRegion: "Review your request",
    confirmButton: "Confirm request",
    changeDateButton: "Change date or time",
    correctButton: "Correct details",
    successHeading: "✓ Demo request recorded",
    successNewButton: "Start a new conversation",
    successBody: (outcome) => outcome === "booking" ? "Your booking request is complete. No appointment has been scheduled." : outcome === "handoff" ? "Your request for a person is complete. No one will contact you." : "Your details have been captured for this demo.",
    sendLabel: "Send message",
    messageLabel: "Your message",
    workspace: "CUSTOMER EXPERIENCE",
    yourRequest: "YOUR REQUEST",
    step: "Step",
    of: "of",
    dateLabelForSummary: "Preferred date",
    demoMode: "Demo mode — scripted replies",
    liveMode: "Live AI · demonstration",
    modePending: "Mode verified on first reply",
    quickReplies: ["What services do you offer?", "What are your opening hours?", "Book an appointment", "Speak to a person"],
    whatsappCta: "Talk to us on WhatsApp",
    demoIntro: {
      eyebrow: "01 / DENTAL CARE",
      title: "A little less admin.\nA lot more care.",
      lead: "Meet BrightSmile Dental, a fictional neighbourhood clinic. Ask about services, prices and hours, or book a visit in a guided step-by-step flow — in English or Portuguese.",
      servicesTitle: "Services & prices",
      servicesNote: "Illustrative prices for this fictional clinic.",
      hoursTitle: "Opening hours",
      hoursValue: "Mon–Fri 9am–5pm · Sat 9am–1pm · Closed Sunday",
      addressTitle: "Where to find us",
      mapLink: "Open in Google Maps ↗",
      contactTitle: "Talk to reception",
      whatsappLabel: "WhatsApp",
      phoneLabel: "Phone",
      from: "from",
    },
  },
  pt: {
    personaRole: "assistente virtual",
    assistant: "Assistente",
    restart: "Reiniciar conversa",
    restartShort: "Reiniciar",
    you: "Você",
    typing: "Digitando…",
    consent: "Entendi que é uma demonstração de portfólio e vou usar apenas dados fictícios.",
    placeholder: "Escreva sua mensagem…",
    placeholderLocked: "Aceite a demonstração para começar",
    footnote: "Apenas dados fictícios · o histórico é apagado ao recarregar",
    reviewHeading: "Confira antes de confirmar",
    reviewEyebrow: "TUDO PRONTO PARA CONFERIR",
    reviewRegion: "Confira seu pedido",
    confirmButton: "Confirmar pedido",
    changeDateButton: "Trocar data ou horário",
    correctButton: "Corrigir dados",
    successHeading: "✓ Pedido de demonstração registrado",
    successNewButton: "Iniciar uma nova conversa",
    successBody: (outcome) => outcome === "booking" ? "Seu pedido de agendamento foi concluído. Nenhuma consulta foi realmente marcada." : outcome === "handoff" ? "Seu pedido para falar com uma pessoa foi concluído. Ninguém entrará em contato." : "Seus dados foram registrados nesta demonstração.",
    sendLabel: "Enviar mensagem",
    messageLabel: "Sua mensagem",
    workspace: "EXPERIÊNCIA DO CLIENTE",
    yourRequest: "SEU PEDIDO",
    step: "Passo",
    of: "de",
    dateLabelForSummary: "Data preferida",
    demoMode: "Modo demo — respostas roteirizadas",
    liveMode: "IA ao vivo · demonstração",
    modePending: "Modo verificado na primeira resposta",
    quickReplies: ["Quais serviços vocês oferecem?", "Qual o horário de atendimento?", "Quero agendar", "Falar com uma pessoa"],
    whatsappCta: "Falar no WhatsApp",
    demoIntro: {
      eyebrow: "01 / ODONTOLOGIA",
      title: "Menos burocracia.\nMais cuidado.",
      lead: "Conheça a BrightSmile Dental, uma clínica de bairro fictícia. Pergunte sobre serviços, preços e horários, ou agende uma consulta em um passo a passo guiado — em português ou inglês.",
      servicesTitle: "Serviços e preços",
      servicesNote: "Preços ilustrativos desta clínica fictícia.",
      hoursTitle: "Horário de atendimento",
      hoursValue: "Seg–Sex 9h–17h · Sáb 9h–13h · Domingo fechado",
      addressTitle: "Onde nos encontrar",
      mapLink: "Abrir no Google Maps ↗",
      contactTitle: "Falar com a recepção",
      whatsappLabel: "WhatsApp",
      phoneLabel: "Telefone",
      from: "a partir de",
    },
  },
};

// ---------------------------------------------------------------------------
// Engine reply copy (server). English strings keep substrings asserted by the
// test-suite (e.g. "No appointment is booked", "unavailable", "phone").
// ---------------------------------------------------------------------------

export const engineCopy: Record<Lang, {
  cleared: string;
  reviewReady: string;
  reviewFallback: string;
  recorded: string;
  changeDateExpired: string;
  changeDateKeep: string;
  editUpdate: (label: string) => string;
  startFlow: (kind: "lead" | "booking" | "handoff", label: string) => string;
  nextField: (label: string) => string;
  greeting: string;
}> = {
  en: {
    cleared: "No problem — I've cleared that request. What would you like to explore?",
    reviewReady: "Here are your details — please review and confirm, or edit anything that's not right.",
    reviewFallback: "Please review the details above, then choose Confirm or Edit.",
    recorded: "All set — your request has been recorded and your details cleared for privacy. No appointment is booked and no one will call you, since this is a demonstration. Thanks for trying it out!",
    changeDateExpired: "That slot is no longer available in the demo calendar. Please pick a new date and time.",
    changeDateKeep: "Sure — pick a new date and time. I'll keep your other details.",
    editUpdate: (label) => `Let's update your details. ${label}?`,
    startFlow: (kind, label) => `Great — let's ${kind === "handoff" ? "get you to a person" : kind === "booking" ? "book your visit" : "get this started"}. ${label}?`,
    nextField: (label) => `${label}?`,
    greeting: "Hi! I'm Bia, the assistant at BrightSmile Dental. I can help with services, prices, opening hours, our address, or booking a visit. How can I help?",
  },
  pt: {
    cleared: "Sem problema — limpei esse pedido. Como posso ajudar?",
    reviewReady: "Aqui estão seus dados — confira e confirme, ou edite o que precisar.",
    reviewFallback: "Confira os dados acima e escolha Confirmar ou Editar.",
    recorded: "Prontinho — seu pedido foi registrado e seus dados foram apagados por privacidade. Como esta é uma demonstração, nenhuma consulta foi realmente marcada e ninguém vai te ligar. Obrigado por testar! 😊",
    changeDateExpired: "Esse horário não está mais disponível na agenda da demonstração. Escolha uma nova data e horário.",
    changeDateKeep: "Claro — escolha uma nova data e horário. Vou manter seus outros dados.",
    editUpdate: (label) => `Vamos atualizar seus dados. ${label}?`,
    startFlow: (kind, label) => `Ótimo — vamos ${kind === "handoff" ? "te encaminhar para uma pessoa" : kind === "booking" ? "agendar sua consulta" : "começar"}. ${label}?`,
    nextField: (label) => `${label}?`,
    greeting: "Oi! Eu sou a Bia, assistente da BrightSmile Dental. Posso ajudar com serviços, preços, horário de atendimento, endereço ou com o agendamento de uma consulta. Como posso ajudar?",
  },
};
