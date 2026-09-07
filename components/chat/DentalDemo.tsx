"use client";
import { useEffect, useState } from "react";
import type { ChatbotClientConfig } from "@/lib/types";
import { ChatWidget } from "./ChatWidget";
import { dentalClinic } from "@/content/chatbots/dental-clinic";
import { DEFAULT_LANG, langFromBrowser, ui, type Lang } from "@/lib/i18n";

export function DentalDemo({ config }: { config: ChatbotClientConfig }) {
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG);
  // Adopt the browser language once on the client (SSR has no navigator).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setLang(langFromBrowser(navigator.language)); }, []);
  const intro = ui[lang].demoIntro;
  return <div className="demo-grid">
    <section className="demo-intro">
      <div className="intro-top">
        <span className="eyebrow">{intro.eyebrow}</span>
        <div className="lang-toggle" role="group" aria-label="Language">
          <button type="button" aria-pressed={lang === "pt"} onClick={() => setLang("pt")}>PT</button>
          <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>EN</button>
        </div>
      </div>
      <div className="business-mark" aria-hidden="true">{config.theme.avatarEmoji}</div>
      <h1>{intro.title}</h1>
      <p className="lead">{intro.lead}</p>

      <section className="service-menu" aria-label={intro.servicesTitle}>
        <h2 className="block-title">{intro.servicesTitle}</h2>
        <ul>{dentalClinic.services.map(service => <li key={service.value}>
          <span className="service-name">{lang === "pt" ? service.pt : service.en}</span>
          <span className="service-desc">{lang === "pt" ? service.descPt : service.descEn}</span>
          <strong className="service-price">{service.from ? `${intro.from} ` : ""}{service.price}</strong>
        </li>)}</ul>
        <p className="block-note">{intro.servicesNote}</p>
      </section>

      <section className="clinic-info">
        <div>
          <h3 className="block-title">{intro.hoursTitle}</h3>
          <p>{intro.hoursValue}</p>
        </div>
        <div>
          <h3 className="block-title">{intro.addressTitle}</h3>
          <p>{dentalClinic.address}</p>
          <a className="map-link" href={dentalClinic.mapUrl} target="_blank" rel="noopener noreferrer">{intro.mapLink}</a>
        </div>
      </section>

      <section className="clinic-contact">
        <h3 className="block-title">{intro.contactTitle}</h3>
        <a className="whatsapp-cta" href={dentalClinic.whatsappUrl} target="_blank" rel="noopener noreferrer">
          <span aria-hidden="true">💬</span> {intro.whatsappLabel}: {dentalClinic.phoneDisplay}
        </a>
      </section>
    </section>

    <ChatWidget config={config} lang={lang} onLangChange={setLang} contact={{ whatsappUrl: dentalClinic.whatsappUrl }} />
  </div>;
}
