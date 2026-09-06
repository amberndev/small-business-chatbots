import Link from "next/link";
import type { CSSProperties } from "react";
import { chatbots } from "@/content/chatbots";
import type { ChatbotClientConfig, ChatbotId } from "@/lib/types";
import { ChatWidget } from "@/components/chat/ChatWidget";
const copy = {
  dental: { label: "01 / DENTAL CARE", title: "A little less admin.\nA lot more care.", description: "Meet BrightSmile Dental, a fictional neighbourhood clinic. Explore how an assistant handles everyday questions and guides a patient through a simulated appointment request.", features: ["Explore services and opening hours", "Try an appointment request", "Ask for a human handoff"], note: "Administrative information only. This assistant does not provide diagnosis, prescriptions, or medical advice." },
  "real-estate": { label: "02 / REAL ESTATE", title: "Find the right questions.\nBefore the right home.", description: "Meet Harbor Homes, a fictional property agency. Try a conversation that turns buying or renting preferences into a clear brief for a broker.", features: ["Learn about buying and renting", "Build a fictional property brief", "Request a broker conversation"], note: "There are no live property listings. Property availability, prices, and broker contact are not provided by this demonstration." },
  "home-services": { label: "03 / HOME SERVICES", title: "From a home problem\nto a clear next step.", description: "Meet FixRight Home Services, a fictional maintenance business. Explore service questions, describe a repair, and build a simulated request for the team.", features: ["Explore maintenance services", "Try a quote request", "Describe timing and urgency"], note: "No real callout, quote, or repair is arranged. This assistant is not an emergency service; for immediate danger, contact local emergency services." },
};
export function DemoPage({ id }: { id: ChatbotId }) {
  const config = chatbots[id];
  const safeConfig: ChatbotClientConfig = { id: config.id, businessName: config.businessName, tagline: config.tagline, theme: config.theme, quickReplies: config.quickReplies };
  const content = copy[id];
  const style = { "--bot-primary": config.theme.primary, "--bot-soft": config.theme.primarySoft, "--bot-accent": config.theme.accent } as CSSProperties;
  return <main id="main" className={`demo-shell theme-${id}`} style={style}><nav className="demo-nav"><Link href="/selected-work/small-business-chatbots">← Back to the case</Link><Link className="wordmark" href="/"><img src="/ambern-logo.svg" alt="Ambern" /></Link></nav><div className="demo-grid"><section className="demo-intro"><span className="eyebrow">{content.label}</span><div className="business-mark" aria-hidden="true">{config.theme.avatarEmoji}</div><h1>{content.title}</h1><p className="lead">{content.description}</p><ul className="feature-list">{content.features.map(feature => <li key={feature}><span aria-hidden="true">↗</span>{feature}</li>)}</ul><p className="demo-note">{content.note}</p><span className="fiction-label">FICTIONAL BUSINESS · WORKING DEMONSTRATION</span></section><ChatWidget config={safeConfig} /></div></main>;
}
