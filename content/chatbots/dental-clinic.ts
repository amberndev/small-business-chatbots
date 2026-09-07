/**
 * content/chatbots/dental-clinic.ts — Client-safe display data for the fictional
 * BrightSmile Dental clinic. No system prompt or knowledge base here, so it can
 * be imported by client components without leaking engine internals.
 *
 * Everything below is FICTIONAL. Links use valid public formats (wa.me / Google
 * Maps query) pointing at made-up values — never real third-party data.
 */

export type ClinicService = {
  /** Booking value — must match the enum options in the dental config. */
  value: string;
  en: string;
  pt: string;
  price: string;
  /** true when `price` is a "from" starting price. */
  from?: boolean;
  descEn: string;
  descPt: string;
};

export const dentalClinic = {
  name: "BrightSmile Dental",
  assistantName: "Bia",
  neighbourhood: "Jardim Aurora",
  address: "Av. das Palmeiras, 128 — Jardim Aurora, São Paulo – SP",
  phoneDisplay: "+55 11 91234-5678",
  // Valid wa.me format, fictional number.
  whatsappUrl: "https://wa.me/5511912345678",
  // Valid Google Maps search query, fictional address.
  mapUrl: "https://www.google.com/maps/search/?api=1&query=Av.+das+Palmeiras+128+Jardim+Aurora+Sao+Paulo",
  services: [
    { value: "Cleaning", en: "Cleaning", pt: "Limpeza", price: "R$ 180", descEn: "Professional cleaning, about 40 min.", descPt: "Limpeza profissional, cerca de 40 min." },
    { value: "Assessment", en: "Check-up", pt: "Avaliação", price: "R$ 120", descEn: "Full oral health assessment.", descPt: "Avaliação completa da saúde bucal." },
    { value: "Whitening", en: "Whitening", pt: "Clareamento", price: "R$ 650", descEn: "In-clinic teeth whitening.", descPt: "Clareamento dental feito na clínica." },
    { value: "Urgent dental enquiry", en: "Urgent care", pt: "Urgência", price: "R$ 200", from: true, descEn: "Same-week urgent slots.", descPt: "Horários de urgência na mesma semana." },
  ] as ClinicService[],
};
